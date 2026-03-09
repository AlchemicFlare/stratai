import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, queryOne } from '../db/pool.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { validate } from '../middleware/errors.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── Schemas ─────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
  orgSlug: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── POST /auth/register ─────────────────────────────────────────────────

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  const { email, password, fullName, orgSlug } = req.body;

  // Check if user exists
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  // Find or create organization
  let org = await queryOne<{ id: string }>('SELECT id FROM organizations WHERE slug = $1', [orgSlug]);
  if (!org) {
    const orgResult = await queryOne<{ id: string }>(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
      [orgSlug, orgSlug],
    );
    org = orgResult!;
  }

  // Hash password and create user
  const hash = await bcrypt.hash(password, 12);
  const user = await queryOne<{ id: string; role: string }>(
    `INSERT INTO users (org_id, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4) RETURNING id, role`,
    [org.id, email, hash, fullName],
  );

  const payload = { userId: user!.id, orgId: org.id, role: user!.role };

  res.status(201).json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user!.id, email, fullName, role: user!.role, orgId: org.id },
  });
});

// ── POST /auth/login ────────────────────────────────────────────────────

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await queryOne<{
    id: string; org_id: string; password_hash: string;
    full_name: string; role: string;
  }>(
    'SELECT id, org_id, password_hash, full_name, role FROM users WHERE email = $1 AND is_active = true',
    [email],
  );

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const payload = { userId: user.id, orgId: user.org_id, role: user.role };

  res.json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, email, fullName: user.full_name, role: user.role, orgId: user.org_id },
  });
});

// ── POST /auth/refresh ──────────────────────────────────────────────────

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [payload.userId],
    );
    if (!user) {
      res.status(401).json({ error: 'User not found or deactivated' });
      return;
    }

    res.json({
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── GET /auth/me ────────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await queryOne(
    `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.preferences,
            o.name AS org_name, o.slug AS org_slug, o.tier AS org_tier
     FROM users u JOIN organizations o ON u.org_id = o.id
     WHERE u.id = $1`,
    [req.user!.userId],
  );

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

export default router;
