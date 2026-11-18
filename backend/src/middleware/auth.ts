import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';
import type { AuthRole } from '../types/express.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.slice(7);
  req.user = verifyAccessToken(token);
  return next();
}

export function requireRoles(...roles: AuthRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    return next();
  };
}

export function requirePermissions(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (req.user.role === 'super_admin') return next();
    if (req.user.role === 'admin' && permissions.every((p) => !p.startsWith('roles.') && p !== 'permissions.manage')) {
      // Admins retain broad access, but role/permission management still needs explicit grants or super_admin.
      // Keep backward-compatible: admin passes unless managing roles/permissions without grant.
    }
    if (req.user.role === 'admin') {
      const needsElevated = permissions.some((p) =>
        ['roles.manage', 'permissions.manage', 'access.manage'].includes(p),
      );
      if (!needsElevated) return next();
    }
    const hasAll = permissions.every((p) => req.user!.permissions.includes(p));
    if (!hasAll) return next(new AppError('Insufficient permissions', 403));
    return next();
  };
}

/** Enforce customer data isolation — never trust client-supplied customerId */
export function resolveCustomerScope(req: Request): string | undefined {
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.role === 'customer') {
    if (!req.user.customerId) throw new AppError('Customer account is not linked', 403);
    return req.user.customerId;
  }
  const queryCustomerId = req.query.customerId;
  if (typeof queryCustomerId === 'string' && queryCustomerId) return queryCustomerId;
  return undefined;
}

/** Country managers may only operate within their assigned country. */
export function resolveCountryScope(req: Request): string | undefined {
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.role === 'country_manager' || req.user.role === 'city_manager') {
    if (!req.user.countryId) throw new AppError('Country scope is not assigned', 403);
    return req.user.countryId;
  }
  const q = req.query.countryId;
  if (typeof q === 'string' && q) return q;
  return undefined;
}

/** City managers may only operate within their assigned city. */
export function resolveCityScope(req: Request): string | undefined {
  if (!req.user) throw new AppError('Authentication required', 401);
  if (req.user.role === 'city_manager') {
    if (!req.user.cityId) throw new AppError('City scope is not assigned', 403);
    return req.user.cityId;
  }
  const q = req.query.cityId;
  if (typeof q === 'string' && q) return q;
  return undefined;
}
