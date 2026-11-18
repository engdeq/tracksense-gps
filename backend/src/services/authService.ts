import crypto from 'crypto';
import type { Request } from 'express';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { RolePermission } from '../models/RolePermission.js';
import { AppError } from '../utils/AppError.js';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './tokenService.js';
import type { AuthUser } from '../types/express.js';
import { writeAuditLog } from './auditService.js';

async function loadPermissions(roleKey: string): Promise<string[]> {
  const role = await Role.findOne({ key: roleKey });
  if (!role) return [];
  const links = await RolePermission.find({ roleId: role._id }).populate('permissionId');
  return links
    .map((link) => {
      const perm = link.permissionId as unknown as { key?: string } | null;
      return perm?.key;
    })
    .filter((key): key is string => Boolean(key));
}

export async function buildAuthUser(userId: string): Promise<AuthUser> {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError('Account is locked', 403);
  }

  const permissions = await loadPermissions(user.roleKey);
  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.roleKey as AuthUser['role'],
    customerId: user.customerId ? String(user.customerId) : undefined,
    countryId: user.countryId ? String(user.countryId) : undefined,
    cityId: user.cityId ? String(user.cityId) : undefined,
    permissions,
  };
}

export async function login(username: string, password: string, req: Request) {
  const user = await User.findOne({ username: username.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
        user.lockReason = 'Too many failed login attempts';
      }
      await user.save();
    }
    await writeAuditLog(req, 'login_failed', 'user', user ? String(user._id) : '', { username }, {
      status: 'failure',
      description: 'Login failed',
    });
    throw new AppError('Invalid username or password', 401);
  }
  if (!user.isActive) {
    await writeAuditLog(req, 'login_failed', 'user', String(user._id), {}, {
      status: 'failure',
      description: 'Inactive account login attempt',
    });
    throw new AppError('Account is inactive', 403);
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    await writeAuditLog(req, 'login_failed', 'user', String(user._id), {}, {
      status: 'failure',
      description: 'Locked account login attempt',
    });
    throw new AppError('Account is locked', 403);
  }

  user.lastLoginAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lockReason = '';
  await user.save();

  const authUser = await buildAuthUser(String(user._id));
  const accessToken = signAccessToken(authUser);
  const refreshToken = await issueRefreshToken(authUser.id, {
    userAgent: req.get('user-agent') ?? '',
    ipAddress: req.ip ?? '',
  });

  await writeAuditLog(req, 'login', 'user', authUser.id, {}, { description: 'Login success' });

  return {
    user: {
      id: authUser.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: authUser.role,
      customerId: authUser.customerId,
      permissions: authUser.permissions,
      countryId: user.countryId,
      cityId: user.cityId,
    },
    accessToken,
    refreshToken,
  };
}

export async function refresh(rawRefreshToken: string, req: Request) {
  const { userId, refreshToken } = await rotateRefreshToken(rawRefreshToken, {
    userAgent: req.get('user-agent') ?? '',
    ipAddress: req.ip ?? '',
  });
  const authUser = await buildAuthUser(userId);
  const accessToken = signAccessToken(authUser);
  return { accessToken, refreshToken, user: authUser };
}

export async function logout(rawRefreshToken: string | undefined, req: Request) {
  if (rawRefreshToken) await revokeRefreshToken(rawRefreshToken);
  if (req.user) await writeAuditLog(req, 'logout', 'user', req.user.id);
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordResetToken +passwordResetExpires',
  );
  if (!user) {
    return { message: 'If the account exists, a reset token was generated' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  return {
    message: 'If the account exists, a reset token was generated',
    resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
  };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetToken +passwordResetExpires');

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.passwordHash = await User.hashPassword(newPassword);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  return { message: 'Password updated successfully' };
}
