import { Router, Request, Response } from 'express';
import { getCurrentTimeInfo } from '../utils/time';
import { runRustAnalytics } from '../utils/rustCore';

const router = Router();

/**
 * GET /api/utils/time
 * Returns standardized time information from the server.
 * This can be used to synchronize clients and ensure consistent "Today" definitions.
 */
router.get('/time', (_req: Request, res: Response) => {
  try {
    const timeInfo = getCurrentTimeInfo();
    res.json(timeInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve time information' });
  }
});

/**
 * POST /api/utils/rust-analytics
 * Executes analytics and data transforms in the Rust core binary.
 */
router.post('/rust-analytics', async (req: Request, res: Response) => {
  try {
    const result = await runRustAnalytics(req.body);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rust core unavailable';
    res.status(503).json({ error: message });
  }
});

export default router;
