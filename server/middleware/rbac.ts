import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { RoleType } from '@prisma/client';

export const requireRole = (allowedRoles: RoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    // SUPER_ADMIN has access to everything
    if (req.user.role === RoleType.SUPER_ADMIN || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      },
    });
  };
};
