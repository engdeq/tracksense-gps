import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import type { AuthUser } from '../types/express.js';
import { AppError } from '../utils/AppError.js';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 1000);
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      countryId: user.countryId,
      cityId: user.cityId,
      permissions: user.permissions,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );
}

export async function issueRefreshToken(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<string> {
  const token = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN));

  await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent: meta?.userAgent ?? '',
    ipAddress: meta?.ipAddress ?? '',
  });

  return token;
}

export async function rotateRefreshToken(
  rawToken: string,
  meta?: { userAgent?: string; ipAddress?: string },
) {
  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
    throw new AppError('Invalid refresh token', 401);
  }

  existing.revokedAt = new Date();
  const newToken = await issueRefreshToken(String(existing.userId), meta);
  existing.replacedByTokenHash = hashToken(newToken);
  await existing.save();

  return { userId: String(existing.userId), refreshToken: newToken };
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    return {
      id: String(payload.sub),
      username: String(payload.username),
      email: String(payload.email),
      role: payload.role as AuthUser['role'],
      customerId: payload.customerId ? String(payload.customerId) : undefined,
      countryId: payload.countryId ? String(payload.countryId) : undefined,
      cityId: payload.cityId ? String(payload.cityId) : undefined,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    };
  } catch {
    throw new AppError('Invalid or expired access token', 401);
  }
}
