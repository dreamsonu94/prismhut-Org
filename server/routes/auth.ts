import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.issues[0]?.message || 'Invalid input data',
        },
      });
    }

    const { username, password } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
      include: {
        role: true,
        restaurant: true,
      },
    });

    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    // Safe authentication diagnostics (NEVER logs sensitive passwords, hashes, tokens, or secrets)
    console.log('[AUTH LOGIN ATTEMPT]', {
      usernameReceived: Boolean(username) ? 'yes' : 'no',
      userFound: Boolean(user) ? 'yes' : 'no',
      passwordValid: isMatch ? 'yes' : 'no',
      databaseConnected: 'yes',
    });

    if (!user || !user.isActive || !isMatch) {
      logger.authFailure(
        username,
        !user ? 'USER_NOT_FOUND' : !user.isActive ? 'ACCOUNT_INACTIVE' : 'PASSWORD_MISMATCH',
        req.ip
      );
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
        },
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.name,
      restaurantId: user.restaurantId,
    });

    // Record login audit log
    await prisma.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        action: 'USER_LOGIN',
        entity: 'USER',
        entityId: user.id,
        details: JSON.stringify({ username: user.username, role: user.role.name }),
      },
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role.name,
          restaurant: {
            id: user.restaurant.id,
            name: user.restaurant.name,
            currency: user.restaurant.currency,
          },
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while logging in',
      },
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.user) {
    await prisma.auditLog.create({
      data: {
        restaurantId: req.user.restaurantId,
        userId: req.user.id,
        action: 'USER_LOGOUT',
        entity: 'USER',
        entityId: req.user.id,
        details: JSON.stringify({ username: req.user.username }),
      },
    });
  }
  return res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        role: true,
        restaurant: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role.name,
          restaurant: {
            id: user.restaurant.id,
            name: user.restaurant.name,
            currency: user.restaurant.currency,
            defaultTaxRate: user.restaurant.defaultTaxRate,
            serviceChargeRate: user.restaurant.serviceChargeRate,
          },
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch user profile' },
    });
  }
});

export default router;
