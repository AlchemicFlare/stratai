import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { checkConnection } from './db/pool.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import holesRoutes from './routes/holes.js';
import annotationRoutes from './routes/annotations.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// ── Global Middleware ────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

// ── Health Check (unauthenticated) ──────────────────────────────────────

app.get('/health', async (_req, res) => {
  const dbOk = await checkConnection();
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    database: dbOk ? 'connected' : 'unreachable',
  });
});

// ── Public Routes ───────────────────────────────────────────────────────

app.use('/v1/auth', authRoutes);

// ── Protected Routes (JWT required) ─────────────────────────────────────

app.use('/v1/projects', authenticate, projectRoutes);
app.use('/v1', authenticate, holesRoutes);
app.use('/v1', authenticate, annotationRoutes);

// ── 404 ─────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Error Handler ───────────────────────────────────────────────────────

app.use(errorHandler);

// ── Start ───────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', async () => {
  const dbOk = await checkConnection();
  console.log(`
  ┌──────────────────────────────────────────┐
  │  stratAI API v0.1.0                      │
  │  Port: ${PORT}                              │
  │  Database: ${dbOk ? '✅ connected' : '❌ unreachable'}              │
  │  Environment: ${process.env.NODE_ENV || 'development'}            │
  └──────────────────────────────────────────┘
  `);
});

export default app;
