import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { validate } from '../middleware/errors.js';

const router = Router();

// ── Schemas ─────────────────────────────────────────────────────────────

const createHoleSchema = z.object({
  holeId: z.string().min(1).max(100),
  collarX: z.number().optional(),
  collarY: z.number().optional(),
  collarZ: z.number().optional(),
  azimuth: z.number().min(0).max(360).optional(),
  dip: z.number().min(-90).max(90).optional(),
  endDepth: z.number().positive().optional(),
  drillType: z.enum(['diamond', 'RC', 'RAB', 'air_core', 'percussion']).optional(),
  coreDiameterMm: z.number().positive().optional(),
});

const createBoxSchema = z.object({
  boxNumber: z.number().int().positive(),
  depthFrom: z.number().min(0),
  depthTo: z.number().positive(),
  coreRecovery: z.number().min(0).max(100).optional(),
  rqd: z.number().min(0).max(100).optional(),
  rqdMethod: z.enum(['manual', 'ai_calculated', 'verified']).default('manual'),
});

const createSurveySchema = z.object({
  depth: z.number().min(0),
  azimuth: z.number().min(0).max(360),
  dip: z.number().min(-90).max(90),
  surveyMethod: z.string().max(50).optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────

function p(val: string | string[]): string { return Array.isArray(val) ? val[0] : val; }

async function verifyHoleAccess(holeId: string, orgId: string): Promise<boolean> {
  const row = await queryOne(
    `SELECT dh.id FROM drill_holes dh
     JOIN projects p ON dh.project_id = p.id
     WHERE dh.id = $1 AND p.org_id = $2`,
    [holeId, orgId],
  );
  return !!row;
}

// ── GET /projects/:projectId/holes ──────────────────────────────────────

router.get('/projects/:projectId/holes', async (req: Request, res: Response) => {
  const rows = await query(
    `SELECT dh.*, COUNT(cb.id)::int AS box_count
     FROM drill_holes dh
     JOIN projects p ON dh.project_id = p.id
     LEFT JOIN core_boxes cb ON dh.id = cb.drill_hole_id
     WHERE dh.project_id = $1 AND p.org_id = $2
     GROUP BY dh.id ORDER BY dh.hole_id`,
    [p(req.params.projectId), req.user!.orgId],
  );
  res.json(rows.rows);
});

// ── POST /projects/:projectId/holes ─────────────────────────────────────

router.post('/projects/:projectId/holes', validate(createHoleSchema), async (req: Request, res: Response) => {
  const { holeId, collarX, collarY, collarZ, azimuth, dip, endDepth, drillType, coreDiameterMm } = req.body;

  // Verify project belongs to org
  const project = await queryOne(
    'SELECT id FROM projects WHERE id = $1 AND org_id = $2',
    [p(req.params.projectId), req.user!.orgId],
  );
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const hole = await queryOne(
    `INSERT INTO drill_holes (project_id, hole_id, collar_x, collar_y, collar_z, azimuth, dip, end_depth, drill_type, core_diameter_mm)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [p(req.params.projectId), holeId, collarX, collarY, collarZ, azimuth, dip, endDepth, drillType, coreDiameterMm],
  );
  res.status(201).json(hole);
});

// ── GET /holes/:id ──────────────────────────────────────────────────────

router.get('/holes/:id', async (req: Request, res: Response) => {
  if (!(await verifyHoleAccess(p(req.params.id), req.user!.orgId))) {
    res.status(404).json({ error: 'Drill hole not found' });
    return;
  }

  const [hole, surveys, boxes] = await Promise.all([
    queryOne('SELECT * FROM drill_holes WHERE id = $1', [p(req.params.id)]),
    query('SELECT * FROM surveys WHERE drill_hole_id = $1 ORDER BY depth', [p(req.params.id)]),
    query(
      `SELECT cb.*, COUNT(ci.id)::int AS image_count
       FROM core_boxes cb LEFT JOIN core_images ci ON cb.id = ci.core_box_id
       WHERE cb.drill_hole_id = $1 GROUP BY cb.id ORDER BY cb.depth_from`,
      [p(req.params.id)],
    ),
  ]);

  res.json({ ...hole, surveys: surveys.rows, boxes: boxes.rows });
});

// ── PATCH /holes/:id ────────────────────────────────────────────────────

router.patch('/holes/:id', async (req: Request, res: Response) => {
  if (!(await verifyHoleAccess(p(req.params.id), req.user!.orgId))) {
    res.status(404).json({ error: 'Drill hole not found' });
    return;
  }

  const allowed: Record<string, string> = {
    azimuth: 'azimuth', dip: 'dip', endDepth: 'end_depth',
    status: 'status', drillType: 'drill_type',
  };

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(req.body[key]);
    }
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(p(req.params.id));
  const hole = await queryOne(`UPDATE drill_holes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
  res.json(hole);
});

// ── POST /holes/:id/surveys ─────────────────────────────────────────────

router.post('/holes/:id/surveys', validate(createSurveySchema), async (req: Request, res: Response) => {
  if (!(await verifyHoleAccess(p(req.params.id), req.user!.orgId))) {
    res.status(404).json({ error: 'Drill hole not found' });
    return;
  }

  const { depth, azimuth, dip, surveyMethod } = req.body;
  const survey = await queryOne(
    `INSERT INTO surveys (drill_hole_id, depth, azimuth, dip, survey_method)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [p(req.params.id), depth, azimuth, dip, surveyMethod],
  );
  res.status(201).json(survey);
});

// ── GET /holes/:id/boxes ────────────────────────────────────────────────

router.get('/holes/:id/boxes', async (req: Request, res: Response) => {
  if (!(await verifyHoleAccess(p(req.params.id), req.user!.orgId))) {
    res.status(404).json({ error: 'Drill hole not found' });
    return;
  }

  const rows = await query(
    `SELECT cb.*, COUNT(ci.id)::int AS image_count, COUNT(a.id)::int AS annotation_count
     FROM core_boxes cb
     LEFT JOIN core_images ci ON cb.id = ci.core_box_id
     LEFT JOIN annotations a ON ci.id = a.core_image_id
     WHERE cb.drill_hole_id = $1
     GROUP BY cb.id ORDER BY cb.depth_from`,
    [p(req.params.id)],
  );
  res.json(rows.rows);
});

// ── POST /holes/:id/boxes ───────────────────────────────────────────────

router.post('/holes/:id/boxes', validate(createBoxSchema), async (req: Request, res: Response) => {
  if (!(await verifyHoleAccess(p(req.params.id), req.user!.orgId))) {
    res.status(404).json({ error: 'Drill hole not found' });
    return;
  }

  const { boxNumber, depthFrom, depthTo, coreRecovery, rqd, rqdMethod } = req.body;
  const box = await queryOne(
    `INSERT INTO core_boxes (drill_hole_id, box_number, depth_from, depth_to, core_recovery, rqd, rqd_method, logged_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [p(req.params.id), boxNumber, depthFrom, depthTo, coreRecovery, rqd, rqdMethod, req.user!.userId],
  );
  res.status(201).json(box);
});

// ── GET /holes/:id/lithology ────────────────────────────────────────────

router.get('/holes/:id/lithology', async (req: Request, res: Response) => {
  if (!(await verifyHoleAccess(p(req.params.id), req.user!.orgId))) {
    res.status(404).json({ error: 'Drill hole not found' });
    return;
  }

  const rows = await query(
    'SELECT * FROM lithology_intervals WHERE drill_hole_id = $1 ORDER BY depth_from',
    [p(req.params.id)],
  );
  res.json(rows.rows);
});

export default router;
