import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ── Global error handler ────────────────────────────────────────────────
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  const status = (err as any)?.status ?? 500;
  res.status(status).json({ error: message });
}

// ── Zod validation middleware ───────────────────────────────────────────
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      throw parsed.error;
    }
    req[source] = parsed.data;
    next();
  };
}
