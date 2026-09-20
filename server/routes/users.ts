import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoleType } from '@prisma/client';

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleName: z.nativeEnum(RoleType),
  isActive: z.boolean().default(true),
});

// GET /api/v1/users
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const users = await prisma.user.findMany({
      where: { restaurantId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role.name,
      roleId: u.roleId,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));

    return res.json({ success: true, data: sanitized });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve users' },
    });
  }
});

// GET /api/v1/users/roles
router.get('/roles', requireAuth, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: roles });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch roles' },
    });
  }
});

// POST /api/v1/users
router.post('/', requireAuth, requireRole([RoleType.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message },
      });
    }

    const { name, username, email, phone, password, roleName, isActive } = parseResult.data;
    const restaurantId = req.user!.restaurantId;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, ...(email ? [{ email }] : [])],
      },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Username or email already exists' },
      });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: `Role ${roleName} does not exist` },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        restaurantId,
        roleId: role.id,
        name,
        username,
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        isActive,
      },
      include: { role: true },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create user' },
    });
  }
});

// PUT /api/v1/users/:id
router.put('/:id', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, roleName, isActive, password } = req.body;

    let roleId: string | undefined;
    if (roleName) {
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      if (role) roleId = role.id;
    }

    let hashedPassword: string | undefined;
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(roleId && { roleId }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      include: { role: true },
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        email: updated.email,
        phone: updated.phone,
        role: updated.role.name,
        isActive: updated.isActive,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update user' },
    });
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', requireAuth, requireRole([RoleType.ADMIN]), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Cannot delete your own account' },
      });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ success: true, data: { message: 'User removed' } });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete user' },
    });
  }
});

export default router;
