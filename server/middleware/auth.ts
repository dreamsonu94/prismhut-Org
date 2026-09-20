import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { RoleType } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: RoleType;
  restaurantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'Sx+do8nvsU5Zgj8dg8yyxoI1KFoUF06v6e4+hvKgwrsIT74UcTMIZEkrWfl+mkbRJKkLGtkt1QqJTNgxD7CVQQ==';

export const generateToken = (user: AuthenticatedUser): string => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is required',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE_OR_NOT_FOUND',
          message: 'User account is inactive or no longer exists',
        },
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role.name,
      restaurantId: user.restaurantId,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
      },
    });
  }
};
