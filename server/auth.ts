import { Request } from 'express';

const FALLBACK_OWNER_ID = 'guest_legacy';

export function getOwnerId(req: Request): string {
  const raw = req.header('X-Karma-Guest-ID') || req.query.ownerId;
  const ownerId = Array.isArray(raw) ? raw[0] : raw;

  if (typeof ownerId !== 'string') return FALLBACK_OWNER_ID;

  const normalized = ownerId.trim();
  if (!/^guest_[a-zA-Z0-9_-]{6,80}$/.test(normalized)) {
    return FALLBACK_OWNER_ID;
  }

  return normalized;
}
