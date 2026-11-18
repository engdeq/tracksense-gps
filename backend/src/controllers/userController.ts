import { z } from 'zod';
import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';

export const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional().default(''),
  roleKey: z.enum([
    'super_admin',
    'admin',
    'country_manager',
    'city_manager',
    'supervisor',
    'operator',
    'customer',
  ]),
  customerId: z.string().optional().nullable(),
  countryId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  countryId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  avatarUrl: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.roleKey === 'string' && req.query.roleKey) filter.roleKey = req.query.roleKey;
  const items = await User.find(filter)
    .populate('customerId', 'companyName')
    .populate('countryId', 'name')
    .populate('cityId', 'name')
    .sort({ createdAt: -1 });
  return success(res, items);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const exists = await User.findOne({
    $or: [{ username: req.body.username.toLowerCase() }, { email: req.body.email.toLowerCase() }],
  });
  if (exists) throw new AppError('Username or email already exists', 409);

  const passwordHash = await User.hashPassword(req.body.password);

  const user = await User.create({
    ...req.body,
    username: req.body.username.toLowerCase(),
    email: req.body.email.toLowerCase(),
    passwordHash,
  });

  await writeAuditLog(req, 'create', 'user', String(user._id));
  return created(res, user, 'User created');
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.user!.id, req.body, { new: true, runValidators: true });
  if (!user) throw new AppError('User not found', 404);
  return success(res, user, 'Profile updated');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404);
  const ok = await user.comparePassword(req.body.currentPassword);
  if (!ok) throw new AppError('Current password is incorrect', 400);

  user.passwordHash = await User.hashPassword(req.body.newPassword);
  await user.save();
  return success(res, null, 'Password changed');
});
