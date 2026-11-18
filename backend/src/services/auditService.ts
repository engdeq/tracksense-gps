import type { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';

const SENSITIVE_KEYS = /password|token|secret|authorization|api[_-]?key|refresh|cookie|credential/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export async function writeAuditLog(
  req: Request | null,
  action: string,
  entity: string,
  entityId = '',
  metadata: Record<string, unknown> = {},
  options: {
    status?: 'success' | 'failure' | 'info';
    description?: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  } = {},
) {
  try {
    await AuditLog.create({
      actorId: req?.user?.id ?? null,
      actorRole: req?.user?.role ?? '',
      action,
      entity,
      entityId,
      description: options.description || `${action} ${entity}`.trim(),
      status: options.status ?? 'success',
      metadata: sanitize(metadata) as Record<string, unknown>,
      before: options.before ? (sanitize(options.before) as Record<string, unknown>) : null,
      after: options.after ? (sanitize(options.after) as Record<string, unknown>) : null,
      requestId: req?.requestId ?? '',
      ipAddress: req?.ip ?? '',
      userAgent: req?.get?.('user-agent') ?? '',
    });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}
