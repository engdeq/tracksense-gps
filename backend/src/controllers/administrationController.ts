import { z } from 'zod';
import type { Request, Response } from 'express';
import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { RolePermission } from '../models/RolePermission.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { AccessRule } from '../models/AccessRule.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';
import { MODULE_ORDER, PERMISSIONS_CATALOG } from '../config/permissionsCatalog.js';

const PROTECTED_ROLE_KEYS = new Set(['super_admin']);

function paginate(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

async function ensurePermissionCatalog() {
  for (const def of PERMISSIONS_CATALOG) {
    await Permission.updateOne(
      { key: def.key },
      {
        $set: {
          name: def.name,
          module: def.module,
          description: def.description || def.name,
        },
        $setOnInsert: { key: def.key },
      },
      { upsert: true },
    );
  }
}

async function ensureSystemRoles() {
  const defaults = [
    { key: 'super_admin', name: 'Super Admin', scope: 'global', isSystem: true },
    { key: 'admin', name: 'Admin', scope: 'global', isSystem: true },
    { key: 'country_manager', name: 'Country Manager', scope: 'country', isSystem: true },
    { key: 'city_manager', name: 'City Manager', scope: 'city', isSystem: true },
    { key: 'supervisor', name: 'Supervisor', scope: 'assigned', isSystem: true },
    { key: 'operator', name: 'Operator', scope: 'assigned', isSystem: true },
    { key: 'customer', name: 'Customer', scope: 'customer', isSystem: true },
  ] as const;

  for (const role of defaults) {
    await Role.updateOne(
      { key: role.key },
      {
        $set: {
          name: role.name,
          scope: role.scope,
          isSystem: true,
          isActive: true,
        },
        $setOnInsert: { key: role.key, description: `${role.name} system role` },
      },
      { upsert: true },
    );
  }
}

// ─── Roles ───────────────────────────────────────────────────────────────────

export const roleSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).max(64).optional(),
  description: z.string().optional().default(''),
  scope: z.enum(['global', 'country', 'city', 'customer', 'assigned']).optional().default('global'),
  isActive: z.boolean().optional().default(true),
});

export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  await ensureSystemRoles();
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { key: new RegExp(q, 'i') }];
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (typeof req.query.scope === 'string' && req.query.scope) filter.scope = req.query.scope;

  const [items, total] = await Promise.all([
    Role.find(filter).sort({ isSystem: -1, name: 1 }).skip(skip).limit(limit),
    Role.countDocuments(filter),
  ]);

  const roleIds = items.map((r) => r._id);
  const [permCounts, userCounts] = await Promise.all([
    RolePermission.aggregate([{ $match: { roleId: { $in: roleIds } } }, { $group: { _id: '$roleId', total: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$roleKey', total: { $sum: 1 } } }]),
  ]);
  const permMap = new Map(permCounts.map((c) => [String(c._id), c.total as number]));
  const userMap = new Map(userCounts.map((c) => [String(c._id), c.total as number]));

  return success(res, {
    items: items.map((role, idx) => ({
      ...role.toObject(),
      rowNumber: skip + idx + 1,
      code: role.key,
      permissionsCount: permMap.get(String(role._id)) ?? 0,
      assignedUsers: userMap.get(role.key) ?? 0,
    })),
    total,
    page,
    limit,
  });
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError('Role not found', 404);
  const links = await RolePermission.find({ roleId: role._id }).populate('permissionId');
  const permissions = links
    .map((l) => l.permissionId)
    .filter(Boolean)
    .map((p) => {
      const doc = p as unknown as { _id: unknown; key: string; name: string; module: string };
      return { _id: String(doc._id), key: doc.key, name: doc.name, module: doc.module };
    });
  const assignedUsers = await User.countDocuments({ roleKey: role.key });
  return success(res, {
    ...role.toObject(),
    code: role.key,
    permissions,
    permissionKeys: permissions.map((p) => p.key),
    assignedUsers,
  });
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.body.key || req.body.name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_');
  if (PROTECTED_ROLE_KEYS.has(key)) throw new AppError('Cannot create a protected system role key', 400);
  const exists = await Role.findOne({ key });
  if (exists) throw new AppError('Role code already exists', 409);
  const role = await Role.create({
    key,
    name: req.body.name,
    description: req.body.description || '',
    scope: req.body.scope || 'global',
    isActive: req.body.isActive ?? true,
    isSystem: false,
  });
  await writeAuditLog(req, 'create', 'role', String(role._id), { key, name: role.name });
  return created(res, { ...role.toObject(), code: role.key }, 'Role created');
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError('Role not found', 404);
  if (PROTECTED_ROLE_KEYS.has(role.key) && req.user?.role !== 'super_admin') {
    throw new AppError('Only Super Admin can modify the Super Admin role', 403);
  }

  const payload: Record<string, unknown> = { ...req.body };
  delete payload.key;
  delete payload.isSystem;
  if (PROTECTED_ROLE_KEYS.has(role.key)) {
    delete payload.isActive;
  }

  Object.assign(role, payload);
  await role.save();
  await writeAuditLog(req, 'update', 'role', String(role._id), payload);
  return success(res, { ...role.toObject(), code: role.key }, 'Role updated');
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError('Role not found', 404);
  if (role.isSystem || PROTECTED_ROLE_KEYS.has(role.key)) {
    throw new AppError('System roles cannot be deleted', 400);
  }
  const users = await User.countDocuments({ roleKey: role.key });
  if (users > 0) throw new AppError('Cannot delete a role assigned to users', 400);
  await RolePermission.deleteMany({ roleId: role._id });
  await role.deleteOne();
  await writeAuditLog(req, 'delete', 'role', String(role._id), { key: role.key });
  return success(res, { id: role._id }, 'Role deleted');
});

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  await ensurePermissionCatalog();
  const items = await Permission.find().sort({ module: 1, name: 1 });
  const grouped: Record<string, typeof items> = {};
  for (const p of items) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }
  const modules = MODULE_ORDER.filter((m) => grouped[m]?.length).map((module) => ({
    module,
    permissions: grouped[module],
  }));
  // include any unknown modules
  for (const module of Object.keys(grouped)) {
    if (!MODULE_ORDER.includes(module as (typeof MODULE_ORDER)[number])) {
      modules.push({ module, permissions: grouped[module] });
    }
  }
  return success(res, { items, modules });
});

export const setRolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()).default([]),
});

export const setRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const role = await Role.findById(req.params.id);
  if (!role) throw new AppError('Role not found', 404);
  if (PROTECTED_ROLE_KEYS.has(role.key) && req.user?.role !== 'super_admin') {
    throw new AppError('Only Super Admin can change Super Admin permissions', 403);
  }

  await ensurePermissionCatalog();
  const keys = Array.isArray(req.body.permissionKeys) ? (req.body.permissionKeys as string[]) : [];
  const permissions = await Permission.find({ key: { $in: keys } });
  const permissionIds = permissions.map((p) => p._id);

  await RolePermission.deleteMany({ roleId: role._id });
  if (permissionIds.length) {
    await RolePermission.insertMany(permissionIds.map((permissionId) => ({ roleId: role._id, permissionId })));
  }

  await writeAuditLog(req, 'permissions_changed', 'role', String(role._id), {
    permissionKeys: permissions.map((p) => p.key),
  });

  return success(
    res,
    {
      roleId: role._id,
      permissionKeys: permissions.map((p) => p.key),
      permissionsCount: permissions.length,
    },
    'Permissions updated',
  );
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const q = req.query.q.trim();
    filter.$or = [
      { action: new RegExp(q, 'i') },
      { entity: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { actorRole: new RegExp(q, 'i') },
    ];
  }
  if (typeof req.query.action === 'string' && req.query.action) filter.action = req.query.action;
  if (typeof req.query.module === 'string' && req.query.module) filter.entity = req.query.module;
  if (typeof req.query.status === 'string' && req.query.status) filter.status = req.query.status;
  if (typeof req.query.role === 'string' && req.query.role) filter.actorRole = req.query.role;
  if (typeof req.query.userId === 'string' && req.query.userId) filter.actorId = req.query.userId;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) (filter.createdAt as Record<string, Date>).$gte = new Date(String(req.query.from));
    if (req.query.to) (filter.createdAt as Record<string, Date>).$lte = new Date(String(req.query.to));
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'fullName username roleKey email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return success(res, {
    items: items.map((item, idx) => {
      const obj = item.toObject();
      const actor = obj.actorId as unknown as
        | { fullName?: string; username?: string; roleKey?: string; email?: string }
        | null
        | string;
      return {
        ...obj,
        rowNumber: skip + idx + 1,
        userName:
          actor && typeof actor === 'object'
            ? actor.fullName || actor.username || 'System'
            : 'System',
        userRole: (actor && typeof actor === 'object' ? actor.roleKey : obj.actorRole) || obj.actorRole || '—',
        module: obj.entity,
      };
    }),
    total,
    page,
    limit,
  });
});

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const item = await AuditLog.findById(req.params.id).populate(
    'actorId',
    'fullName username roleKey email phone',
  );
  if (!item) throw new AppError('Audit log not found', 404);
  return success(res, item);
});

export const auditSummary = asyncHandler(async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, failures, logins, byAction] = await Promise.all([
    AuditLog.countDocuments({ createdAt: { $gte: since } }),
    AuditLog.countDocuments({ createdAt: { $gte: since }, status: 'failure' }),
    AuditLog.countDocuments({ createdAt: { $gte: since }, action: { $in: ['login', 'login_failed'] } }),
    AuditLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$action', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
    ]),
  ]);
  return success(res, {
    windowDays: 7,
    total,
    failures,
    logins,
    topActions: byAction.map((a) => ({ action: a._id, total: a.total })),
  });
});

export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) (filter.createdAt as Record<string, Date>).$gte = new Date(String(req.query.from));
    if (req.query.to) (filter.createdAt as Record<string, Date>).$lte = new Date(String(req.query.to));
  }
  const items = await AuditLog.find(filter)
    .populate('actorId', 'fullName username roleKey')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean();

  const format = String(req.query.format || 'json');
  if (format === 'csv') {
    const header = ['timestamp', 'user', 'role', 'action', 'module', 'description', 'status', 'ip', 'userAgent'];
    const rows = items.map((i) => {
      const actor = i.actorId as unknown as { fullName?: string; username?: string; roleKey?: string } | null;
      return [
        i.createdAt?.toISOString?.() ?? '',
        actor?.fullName || actor?.username || 'System',
        actor?.roleKey || i.actorRole || '',
        i.action,
        i.entity,
        (i.description || '').replace(/"/g, '""'),
        i.status || 'success',
        i.ipAddress || '',
        (i.userAgent || '').replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.send([header.join(','), ...rows].join('\n'));
  }

  return success(res, { items, total: items.length });
});

// ─── Access Control ──────────────────────────────────────────────────────────

export const accessRuleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(''),
  targetType: z.enum(['user', 'role']),
  userId: z.string().nullable().optional(),
  roleKey: z.string().optional().default(''),
  resource: z.string().min(2),
  accessType: z.enum(['allow', 'deny', 'read', 'write', 'manage']).optional().default('allow'),
  countryId: z.string().nullable().optional(),
  cityId: z.string().nullable().optional(),
  conditions: z.record(z.string(), z.unknown()).optional().default({}),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const accessControlSummary = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    lockedAccounts,
    elevatedUsers,
    recentEvents,
    rulesCount,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ lockedUntil: { $gt: now } }),
    User.countDocuments({ roleKey: { $in: ['super_admin', 'admin', 'country_manager'] } }),
    AuditLog.find({ action: { $in: ['login', 'login_failed', 'logout', 'permissions_changed', 'access_rule'] } })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('actorId', 'fullName username'),
    AccessRule.countDocuments({ isActive: true }),
  ]);

  return success(res, {
    totalUsers,
    activeUsers,
    suspendedUsers,
    lockedAccounts,
    elevatedUsers,
    activeRules: rulesCount,
    recentEvents,
  });
});

export const listAccessRules = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { resource: new RegExp(q, 'i') }, { roleKey: new RegExp(q, 'i') }];
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const [items, total] = await Promise.all([
    AccessRule.find(filter)
      .populate('userId', 'fullName username roleKey')
      .populate('countryId', 'name code')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AccessRule.countDocuments(filter),
  ]);

  return success(res, {
    items: items.map((item, idx) => ({ ...item.toObject(), rowNumber: skip + idx + 1 })),
    total,
    page,
    limit,
  });
});

export const getAccessRule = asyncHandler(async (req: Request, res: Response) => {
  const item = await AccessRule.findById(req.params.id)
    .populate('userId', 'fullName username roleKey email')
    .populate('countryId', 'name code')
    .populate('cityId', 'name');
  if (!item) throw new AppError('Access rule not found', 404);
  return success(res, item);
});

export const createAccessRule = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.targetType === 'user' && !req.body.userId) {
    throw new AppError('userId is required for user-targeted rules', 400);
  }
  if (req.body.targetType === 'role' && !req.body.roleKey) {
    throw new AppError('roleKey is required for role-targeted rules', 400);
  }
  const item = await AccessRule.create({
    ...req.body,
    userId: req.body.userId || null,
    countryId: req.body.countryId || null,
    cityId: req.body.cityId || null,
    startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    createdBy: req.user?.id || null,
  });
  await writeAuditLog(req, 'create', 'access_rule', String(item._id), { name: item.name });
  return created(res, item, 'Access rule created');
});

export const updateAccessRule = asyncHandler(async (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.userId === '') payload.userId = null;
  if (payload.countryId === '') payload.countryId = null;
  if (payload.cityId === '') payload.cityId = null;
  if (payload.startsAt) payload.startsAt = new Date(payload.startsAt);
  if (payload.expiresAt) payload.expiresAt = new Date(payload.expiresAt);
  const item = await AccessRule.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!item) throw new AppError('Access rule not found', 404);
  await writeAuditLog(req, 'update', 'access_rule', String(item._id), payload);
  return success(res, item, 'Access rule updated');
});

export const deleteAccessRule = asyncHandler(async (req: Request, res: Response) => {
  const item = await AccessRule.findByIdAndDelete(req.params.id);
  if (!item) throw new AppError('Access rule not found', 404);
  await writeAuditLog(req, 'delete', 'access_rule', String(item._id), { name: item.name });
  return success(res, { id: item._id }, 'Access rule deleted');
});

export const listAccessUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginate(req);
  const filter: Record<string, unknown> = {};
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    filter.$or = [
      { fullName: new RegExp(q, 'i') },
      { username: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'suspended') filter.isActive = false;
  if (req.query.status === 'locked') filter.lockedUntil = { $gt: new Date() };

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .populate('countryId', 'name')
      .populate('cityId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const userIds = items.map((u) => u._id);
  const sessions = await RefreshToken.aggregate([
    { $match: { userId: { $in: userIds }, revokedAt: null, expiresAt: { $gt: new Date() } } },
    { $group: { _id: '$userId', total: { $sum: 1 } } },
  ]);
  const sessionMap = new Map(sessions.map((s) => [String(s._id), s.total as number]));

  return success(res, {
    items: items.map((u, idx) => ({
      ...u.toObject(),
      rowNumber: skip + idx + 1,
      activeSessions: sessionMap.get(String(u._id)) ?? 0,
      isLocked: Boolean(u.lockedUntil && u.lockedUntil.getTime() > Date.now()),
    })),
    total,
    page,
    limit,
  });
});

export const setUserAccessStatus = asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.body as { action?: string };
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.roleKey === 'super_admin' && req.user?.role !== 'super_admin') {
    throw new AppError('Cannot modify Super Admin account', 403);
  }

  if (action === 'activate') {
    user.isActive = true;
    user.lockedUntil = null;
    user.lockReason = '';
    user.failedLoginAttempts = 0;
  } else if (action === 'suspend') {
    user.isActive = false;
  } else if (action === 'unlock') {
    user.lockedUntil = null;
    user.lockReason = '';
    user.failedLoginAttempts = 0;
  } else {
    throw new AppError('Unsupported action', 400);
  }
  await user.save();
  await writeAuditLog(req, action || 'update', 'user', String(user._id), { action });
  return success(res, user, `User ${action}d`);
});

export const revokeUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.roleKey === 'super_admin' && req.user?.role !== 'super_admin') {
    throw new AppError('Cannot revoke Super Admin sessions', 403);
  }
  const result = await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  await writeAuditLog(req, 'revoke_sessions', 'user', String(user._id), {
    revoked: result.modifiedCount,
  });
  return success(res, { revoked: result.modifiedCount }, 'Sessions revoked');
});
