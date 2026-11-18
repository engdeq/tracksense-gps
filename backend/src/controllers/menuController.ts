import { z } from 'zod';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Menu } from '../models/Menu.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, success } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/auditService.js';

export const menuSchema = z.object({
  key: z.string().min(2),
  label: z.string().min(1),
  icon: z.string().optional().default('Circle'),
  path: z.string().optional().default(''),
  parentId: z.string().nullable().optional().default(null),
  group: z.string().optional().default('main'),
  order: z.number().optional().default(0),
  permission: z.string().optional().default(''),
  roles: z.array(z.string()).optional().default(['super_admin', 'admin', 'operator']),
  isActive: z.boolean().optional().default(true),
  isVisible: z.boolean().optional().default(true),
});

type MenuLean = {
  _id: Types.ObjectId;
  key: string;
  label: string;
  icon?: string;
  path?: string;
  parentId?: Types.ObjectId | null;
  group?: string;
  order?: number;
  permission?: string;
  roles?: string[];
  isActive?: boolean;
  isVisible?: boolean;
  children?: MenuLean[];
};

function buildTree(items: MenuLean[]): MenuLean[] {
  const map = new Map<string, MenuLean>();
  items.forEach((item) => map.set(String(item._id), { ...item, children: [] }));
  const roots: MenuLean[] = [];
  map.forEach((item) => {
    const parentKey = item.parentId ? String(item.parentId) : null;
    if (parentKey && map.has(parentKey)) {
      map.get(parentKey)!.children!.push(item);
    } else {
      roots.push(item);
    }
  });
  const sortRec = (nodes: MenuLean[]) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    nodes.forEach((n) => n.children && sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export const listMenusTree = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user?.role;
  const filter: Record<string, unknown> = {};
  if (req.query.manage !== 'true') {
    filter.isActive = true;
    filter.isVisible = true;
  }
  const items = (await Menu.find(filter).sort({ order: 1 }).lean()) as unknown as MenuLean[];
  const filtered =
    req.query.manage === 'true'
      ? items
      : items.filter((m) => !m.roles?.length || (role ? m.roles.includes(role) : false));
  return success(res, { items: filtered, tree: buildTree(filtered) });
});

export const listMenusFlat = asyncHandler(async (_req: Request, res: Response) => {
  const items = await Menu.find().sort({ order: 1 });
  return success(res, items);
});

export const getMenu = asyncHandler(async (req: Request, res: Response) => {
  const menu = await Menu.findById(req.params.id);
  if (!menu) throw new AppError('Menu not found', 404);
  return success(res, menu);
});

export const createMenu = asyncHandler(async (req: Request, res: Response) => {
  const exists = await Menu.findOne({ key: req.body.key });
  if (exists) throw new AppError('Menu key already exists', 409);
  if (req.body.parentId) {
    const parent = await Menu.findById(req.body.parentId);
    if (!parent) throw new AppError('Parent menu not found', 404);
  }
  const menu = await Menu.create({
    ...req.body,
    parentId: req.body.parentId || null,
  });
  await writeAuditLog(req, 'create', 'menu', String(menu._id), req.body);
  return created(res, menu, 'Menu created');
});

export const updateMenu = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.parentId === req.params.id) {
    throw new AppError('Menu cannot be its own parent', 400);
  }
  if (req.body.parentId) {
    const parent = await Menu.findById(req.body.parentId);
    if (!parent) throw new AppError('Parent menu not found', 404);
  }
  const menu = await Menu.findByIdAndUpdate(
    req.params.id,
    { ...req.body, parentId: req.body.parentId === undefined ? undefined : req.body.parentId || null },
    { new: true, runValidators: true },
  );
  if (!menu) throw new AppError('Menu not found', 404);
  await writeAuditLog(req, 'update', 'menu', String(menu._id), req.body);
  return success(res, menu, 'Menu updated');
});

export const deleteMenu = asyncHandler(async (req: Request, res: Response) => {
  const children = await Menu.countDocuments({ parentId: req.params.id });
  if (children > 0) throw new AppError('Cannot delete menu with submenus', 400);
  const menu = await Menu.findByIdAndDelete(req.params.id);
  if (!menu) throw new AppError('Menu not found', 404);
  await writeAuditLog(req, 'delete', 'menu', String(menu._id));
  return success(res, null, 'Menu deleted');
});

export const reorderMenus = asyncHandler(async (req: Request, res: Response) => {
  const items = z
    .array(z.object({ id: z.string(), order: z.number(), parentId: z.string().nullable().optional() }))
    .parse(req.body.items ?? req.body);
  await Promise.all(
    items.map((item) =>
      Menu.findByIdAndUpdate(item.id, {
        order: item.order,
        ...(item.parentId !== undefined ? { parentId: item.parentId || null } : {}),
      }),
    ),
  );
  return success(res, null, 'Menus reordered');
});
