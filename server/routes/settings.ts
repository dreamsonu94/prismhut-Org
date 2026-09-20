import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoleType } from '@prisma/client';

const router = Router();

// GET /api/v1/settings/restaurant & GET /api/v1/settings
const getSettingsHandler = async (req: AuthenticatedRequest, res: any) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        sections: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Restaurant settings not found' },
      });
    }

    const taxes = await prisma.tax.findMany({ orderBy: { rate: 'asc' } });
    const discounts = await prisma.discount.findMany({ orderBy: { name: 'asc' } });

    const formatted = {
      ...restaurant,
      taxRate: restaurant.defaultTaxRate,
      restaurant,
      taxes,
      discounts,
    };

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch settings' },
    });
  }
};

router.get('/restaurant', requireAuth, getSettingsHandler);
router.get('/', requireAuth, getSettingsHandler);

// PUT /api/v1/settings/restaurant & PUT /api/v1/settings
const putSettingsHandler = async (req: AuthenticatedRequest, res: any) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const {
      name,
      logoUrl,
      address,
      phone,
      email,
      currency,
      defaultTaxRate,
      taxRate,
      serviceChargeRate,
      invoicePrefix,
      kotPrefix,
      botPrefix,
    } = req.body;

    const finalTaxRate = defaultTaxRate !== undefined ? Number(defaultTaxRate) : (taxRate !== undefined ? Number(taxRate) : undefined);

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...(name && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(currency && { currency }),
        ...(finalTaxRate !== undefined && { defaultTaxRate: finalTaxRate }),
        ...(serviceChargeRate !== undefined && { serviceChargeRate: Number(serviceChargeRate) }),
        ...(invoicePrefix && { invoicePrefix }),
        ...(kotPrefix && { kotPrefix }),
        ...(botPrefix && { botPrefix }),
      },
    });

    return res.json({
      success: true,
      data: {
        ...updated,
        taxRate: updated.defaultTaxRate,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update settings' },
    });
  }
};

router.put('/restaurant', requireAuth, requireRole([RoleType.ADMIN]), putSettingsHandler);
router.put('/', requireAuth, requireRole([RoleType.ADMIN]), putSettingsHandler);

// TAXES CRUD
router.get('/taxes', requireAuth, async (req, res) => {
  try {
    const taxes = await prisma.tax.findMany({ orderBy: { rate: 'asc' } });
    return res.json({ success: true, data: taxes });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch taxes' } });
  }
});

router.post('/taxes', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { name, rate, isDefault, isActive } = req.body;
    if (!name || rate === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and rate are required' } });
    }

    if (isDefault) {
      await prisma.tax.updateMany({ data: { isDefault: false } });
    }

    const tax = await prisma.tax.create({
      data: {
        name,
        rate: Number(rate),
        isDefault: Boolean(isDefault),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json({ success: true, data: tax });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create tax' } });
  }
});

router.put('/taxes/:id', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rate, isDefault, isActive } = req.body;

    if (isDefault) {
      await prisma.tax.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
    }

    const updated = await prisma.tax.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(rate !== undefined && { rate: Number(rate) }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update tax' } });
  }
});

router.delete('/taxes/:id', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tax.delete({ where: { id } });
    return res.json({ success: true, data: { message: 'Tax deleted' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete tax' } });
  }
});

// DISCOUNTS CRUD
router.get('/discounts', requireAuth, async (req, res) => {
  try {
    const discounts = await prisma.discount.findMany({ orderBy: { name: 'asc' } });
    return res.json({ success: true, data: discounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch discounts' } });
  }
});

router.post('/discounts', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { name, code, percentage, fixedAmount, isActive } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and code are required' } });
    }

    const discount = await prisma.discount.create({
      data: {
        name,
        code: String(code).toUpperCase(),
        percentage: percentage !== undefined ? Number(percentage) : null,
        fixedAmount: fixedAmount !== undefined ? Number(fixedAmount) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json({ success: true, data: discount });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create discount' } });
  }
});

router.put('/discounts/:id', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, percentage, fixedAmount, isActive } = req.body;

    const updated = await prisma.discount.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code: String(code).toUpperCase() }),
        ...(percentage !== undefined && { percentage: Number(percentage) }),
        ...(fixedAmount !== undefined && { fixedAmount: Number(fixedAmount) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update discount' } });
  }
});

router.delete('/discounts/:id', requireAuth, requireRole([RoleType.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.discount.delete({ where: { id } });
    return res.json({ success: true, data: { message: 'Discount deleted' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete discount' } });
  }
});

export default router;
