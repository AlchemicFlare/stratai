import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { validate } from '../middleware/errors.js';

function p(val: string | string[]): string { return Array.isArray(val) ? val[0] : val; }

const router = Router();

// ── Schemas ─────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  projectCode: z.string().min(1).max(50),
  locationName: z.string().max(255).optional(),
  targetCommodity: z.string().max(100).optional(),
  coordinateSystem: z.string().max(50).default('EPSG:4326'),
});

const updateProjectSchema = createProjectSchema.partial();

// ── GET /projects ───────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT id, name, project_code, location_name, target_commodity, status,
              coordinate_system, metadata, created_at, updated_at
       FROM projects WHERE org_id = $1 AND status != 'archived'
       ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [orgId, limit, offset],
    ),
    queryOne<{ count: string }>('SELECT COUNT(*) FROM projects WHERE org_id = $1 AND status != \'archived\'', [orgId]),
  ]);

  res.json({
    data: rows.rows,
    pagination: { page, limit, total: parseInt(countResult?.count ?? '0') },
  });
});

// ── POST /projects ──────────────────────────────────────────────────────

router.post('/', validate(createProjectSchema), async (req: Request, res: Response) => {
  const { name, projectCode, locationName, targetCommodity, coordinateSystem } = req.body;
  const orgId = req.user!.orgId;
  const userId = req.user!.userId;

  const project = await queryOne(
    `INSERT INTO projects (org_id, name, project_code, location_name, target_commodity, coordinate_system, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [orgId, name, projectCode, locationName, targetCommodity, coordinateSystem, userId],
  );

  res.status(201).json(project);
});

// ── GET /projects/:id ───────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  const project = await queryOne(
    `SELECT p.*, u.full_name AS created_by_name
     FROM projects p LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = $1 AND p.org_id = $2`,
    [p(req.params.id), req.user!.orgId],
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

// ── PATCH /projects/:id ─────────────────────────────────────────────────

router.patch('/:id', validate(updateProjectSchema), async (req: Request, res: Response) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    name: 'name', projectCode: 'project_code', locationName: 'location_name',
    targetCommodity: 'target_commodity', coordinateSystem: 'coordinate_system',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(req.body[key]);
    }
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(p(req.params.id), req.user!.orgId);
  const project = await queryOne(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx++} AND org_id = $${idx}  RETURNING *`,
    values,
  );

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

// ── DELETE /projects/:id (soft delete → archive) ────────────────────────

router.delete('/:id', async (req: Request, res: Response) => {
  const result = await query(
    "UPDATE projects SET status = 'archived' WHERE id = $1 AND org_id = $2",
    [p(req.params.id), req.user!.orgId],
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.status(204).send();
});

export default router;
