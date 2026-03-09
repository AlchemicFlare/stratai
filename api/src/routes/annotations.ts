import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { validate } from '../middleware/errors.js';

function p(val: string | string[]): string { return Array.isArray(val) ? val[0] : val; }

const router = Router();

// ── Schemas ─────────────────────────────────────────────────────────────

const createAnnotationSchema = z.object({
  coreImageId: z.string().uuid(),
  drillHoleId: z.string().uuid(),
  layer: z.enum(['lithology', 'structure', 'alteration', 'mineralization', 'rqd', 'hyperspectral', 'custom']),
  annotationType: z.enum(['point', 'line', 'polygon', 'interval']),
  geometry: z.record(z.unknown()),
  depthFrom: z.number().min(0).optional(),
  depthTo: z.number().positive().optional(),
  label: z.string().max(255).optional(),
  rockType: z.string().max(100).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  alphaAngle: z.number().min(0).max(90).optional(),
  betaAngle: z.number().min(0).max(360).optional(),
  confidence: z.number().min(0).max(1).optional(),
  aiGenerated: z.boolean().default(false),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateAnnotationSchema = createAnnotationSchema.partial().omit({
  coreImageId: true,
  drillHoleId: true,
});

const validateAnnotationSchema = z.object({
  status: z.enum(['approved', 'rejected', 'modified']),
  notes: z.string().optional(),
});

// ── GET /images/:imageId/annotations ────────────────────────────────────

router.get('/images/:imageId/annotations', async (req: Request, res: Response) => {
  const layer = req.query.layer as string | undefined;
  const validated = req.query.validated as string | undefined;

  let sql = `
    SELECT a.*, u.full_name AS created_by_name, v.full_name AS validated_by_name
    FROM annotations a
    LEFT JOIN users u ON a.created_by = u.id
    LEFT JOIN users v ON a.validated_by = v.id
    WHERE a.core_image_id = $1`;
  const params: unknown[] = [p(req.params.imageId)];

  if (layer) {
    params.push(layer);
    sql += ` AND a.layer = $${params.length}`;
  }
  if (validated === 'true') {
    sql += ` AND a.validation_status = 'approved'`;
  } else if (validated === 'false') {
    sql += ` AND a.validation_status = 'pending'`;
  }

  sql += ' ORDER BY a.depth_from NULLS LAST, a.created_at';

  const rows = await query(sql, params);
  res.json(rows.rows);
});

// ── POST /images/:imageId/annotations ───────────────────────────────────

router.post('/images/:imageId/annotations', validate(createAnnotationSchema), async (req: Request, res: Response) => {
  const {
    coreImageId, drillHoleId, layer, annotationType, geometry,
    depthFrom, depthTo, label, rockType, colorHex,
    alphaAngle, betaAngle, confidence, aiGenerated, notes, tags,
  } = req.body;

  const annotation = await queryOne(
    `INSERT INTO annotations (
      core_image_id, drill_hole_id, layer, annotation_type, geometry,
      depth_from, depth_to, label, rock_type, color_hex,
      alpha_angle, beta_angle, confidence, ai_generated, notes, tags, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    [
      coreImageId, drillHoleId, layer, annotationType, JSON.stringify(geometry),
      depthFrom, depthTo, label, rockType, colorHex,
      alphaAngle, betaAngle, confidence, aiGenerated, notes, tags, req.user!.userId,
    ],
  );

  // Write audit log
  await query(
    `INSERT INTO audit_log (user_id, org_id, action, entity_type, entity_id, changes)
     VALUES ($1, $2, 'create', 'annotation', $3, $4)`,
    [req.user!.userId, req.user!.orgId, annotation!.id, JSON.stringify({ annotation: req.body })],
  );

  res.status(201).json(annotation);
});

// ── GET /annotations/:id ────────────────────────────────────────────────

router.get('/annotations/:id', async (req: Request, res: Response) => {
  const annotation = await queryOne(
    `SELECT a.*, u.full_name AS created_by_name, v.full_name AS validated_by_name
     FROM annotations a
     LEFT JOIN users u ON a.created_by = u.id
     LEFT JOIN users v ON a.validated_by = v.id
     WHERE a.id = $1`,
    [p(req.params.id)],
  );

  if (!annotation) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }
  res.json(annotation);
});

// ── PATCH /annotations/:id ──────────────────────────────────────────────

router.patch('/annotations/:id', validate(updateAnnotationSchema), async (req: Request, res: Response) => {
  const allowed: Record<string, string> = {
    layer: 'layer', annotationType: 'annotation_type', geometry: 'geometry',
    depthFrom: 'depth_from', depthTo: 'depth_to', label: 'label',
    rockType: 'rock_type', colorHex: 'color_hex', alphaAngle: 'alpha_angle',
    betaAngle: 'beta_angle', confidence: 'confidence', notes: 'notes', tags: 'tags',
  };

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      const val = key === 'geometry' ? JSON.stringify(req.body[key]) : req.body[key];
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(p(req.params.id));
  const annotation = await queryOne(
    `UPDATE annotations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );

  if (!annotation) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }

  await query(
    `INSERT INTO audit_log (user_id, org_id, action, entity_type, entity_id, changes)
     VALUES ($1, $2, 'update', 'annotation', $3, $4)`,
    [req.user!.userId, req.user!.orgId, p(req.params.id), JSON.stringify({ updates: req.body })],
  );

  res.json(annotation);
});

// ── DELETE /annotations/:id ─────────────────────────────────────────────

router.delete('/annotations/:id', async (req: Request, res: Response) => {
  const result = await query('DELETE FROM annotations WHERE id = $1', [p(req.params.id)]);

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }

  await query(
    `INSERT INTO audit_log (user_id, org_id, action, entity_type, entity_id)
     VALUES ($1, $2, 'delete', 'annotation', $3)`,
    [req.user!.userId, req.user!.orgId, p(req.params.id)],
  );

  res.status(204).send();
});

// ── POST /annotations/:id/validate ──────────────────────────────────────

router.post('/annotations/:id/validate', validate(validateAnnotationSchema), async (req: Request, res: Response) => {
  const { status, notes } = req.body;

  const annotation = await queryOne(
    `UPDATE annotations
     SET validation_status = $1, validated_by = $2, validated_at = NOW(),
         notes = COALESCE($3, notes)
     WHERE id = $4 RETURNING *`,
    [status, req.user!.userId, notes, p(req.params.id)],
  );

  if (!annotation) {
    res.status(404).json({ error: 'Annotation not found' });
    return;
  }

  await query(
    `INSERT INTO audit_log (user_id, org_id, action, entity_type, entity_id, changes)
     VALUES ($1, $2, 'validate', 'annotation', $3, $4)`,
    [req.user!.userId, req.user!.orgId, p(req.params.id), JSON.stringify({ status, notes })],
  );

  res.json(annotation);
});

export default router;
