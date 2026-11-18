import { z } from 'zod';
import type { Request, Response } from 'express';
import * as authService from '../services/authService.js';
import { success } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildAuthUser } from '../services/authService.js';

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const forgotSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.username, req.body.password, req);
  return success(res, result, 'Logged in successfully');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken, req);
  return success(res, result, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken, req);
  return success(res, null, 'Logged out');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  return success(res, result, result.message);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body.token, req.body.password);
  return success(res, result, result.message);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const authUser = await buildAuthUser(req.user!.id);
  return success(res, authUser);
});
