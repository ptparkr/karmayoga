import { app, ensureDbReady } from '../server/app';

interface VercelLikeRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
  end: (body?: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  await ensureDbReady();
  return app(req as never, res as never);
}