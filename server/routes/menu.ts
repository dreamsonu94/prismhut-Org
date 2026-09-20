import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { RoleType, Department } from '@prisma/client';

const router = Router();

const createItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be greater than 0'),
  taxPercent: z.number().nonnegative().default(10.0),
  imageUrl: z.string().optional(),
  isVegetarian: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  department: z.nativeEnum(Department).default(Department.KITCHEN),
  preparationTime: z.number().int().positive().default(15),
});

// GET /api/v1/menu/categories
router.get('/categories', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch categories' },
    });
  }
});

// POST /api/v1/menu/categories
router.post('/categories', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Category name is required' },
      });
    }

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: req.user!.restaurantId,
        name,
        description,
        sortOrder: sortOrder ? Number(sortOrder) : 0,
      },
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create category' },
    });
  }
});

// PUT /api/v1/menu/categories/:id
router.put('/categories/:id', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder } = req.body;

    const category = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    return res.json({ success: true, data: category });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update category' },
    });
  }
});

// DELETE /api/v1/menu/categories/:id
router.delete('/categories/:id', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuCategory.delete({ where: { id } });
    return res.json({ success: true, data: { message: 'Category deleted' } });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete category' },
    });
  }
});

// GET /api/v1/menu/items
router.get('/items', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const restaurantId = req.user!.restaurantId;
    const { categoryId, department, available, search } = req.query;

    const where: any = { restaurantId };
    if (categoryId) where.categoryId = String(categoryId);
    if (department) where.department = department as Department;
    if (available !== undefined) where.isAvailable = available === 'true';
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { sku: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        images: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch menu items' },
    });
  }
});

// POST /api/v1/menu/items
router.post('/items', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = createItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0]?.message },
      });
    }

    const restaurantId = req.user!.restaurantId;
    const data = parseResult.data;

    const item = await prisma.menuItem.create({
      data: {
        restaurantId,
        ...data,
      },
      include: { category: true },
    });

    return res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create menu item' },
    });
  }
});

// GET /api/v1/menu/items/:id
router.get('/items/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true, images: true },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Menu item not found' },
      });
    }

    return res.json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch menu item' },
    });
  }
});

// PUT /api/v1/menu/items/:id
router.put('/items/:id', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      sku,
      categoryId,
      price,
      taxPercent,
      imageUrl,
      isVegetarian,
      isAvailable,
      department,
      preparationTime,
    } = req.body;

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(categoryId && { categoryId }),
        ...(price !== undefined && { price: Number(price) }),
        ...(taxPercent !== undefined && { taxPercent: Number(taxPercent) }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isVegetarian !== undefined && { isVegetarian: Boolean(isVegetarian) }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(department && { department }),
        ...(preparationTime !== undefined && { preparationTime: Number(preparationTime) }),
      },
      include: { category: true },
    });

    return res.json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update menu item' },
    });
  }
});

// DELETE /api/v1/menu/items/:id
router.delete('/items/:id', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    return res.json({ success: true, data: { message: 'Menu item deleted' } });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete menu item' },
    });
  }
});

// POST /api/v1/menu/upload (Support real image uploads via base64 or URL)
router.post('/upload', requireAuth, async (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Image base64 payload is required' },
      });
    }

    // In a production server without S3, data URI or persistent local uploads work seamlessly
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    return res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: filename || 'uploaded_item.jpg',
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to upload image' },
    });
  }
});

// PATCH /api/v1/menu/items/:id/availability
router.patch('/items/:id/availability', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER, RoleType.CASHIER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const item = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: Boolean(isAvailable) },
      include: { category: true, images: true },
    });

    return res.json({ success: true, data: item });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update item availability' },
    });
  }
});

// GET /api/v1/menu/items/:id/images
router.get('/items/:id/images', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const images = await prisma.menuItemImage.findMany({
      where: { menuItemId: id },
      orderBy: { isPrimary: 'desc' },
    });
    return res.json({ success: true, data: images });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch item images' },
    });
  }
});

// POST /api/v1/menu/items/:id/images
router.post('/items/:id/images', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req, res) => {
  try {
    const { id } = req.params;
    const { url, isPrimary } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Image URL is required' },
      });
    }

    if (isPrimary) {
      await prisma.menuItemImage.updateMany({
        where: { menuItemId: id },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.menuItemImage.create({
      data: {
        menuItemId: id,
        url,
        isPrimary: Boolean(isPrimary),
      },
    });

    // Also update main imageUrl if primary
    if (isPrimary) {
      await prisma.menuItem.update({
        where: { id },
        data: { imageUrl: url },
      });
    }

    return res.status(201).json({ success: true, data: image });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to add item image' },
    });
  }
});

// DELETE /api/v1/menu/items/:id/images/:imageId
router.delete('/items/:id/images/:imageId', requireAuth, requireRole([RoleType.ADMIN, RoleType.MANAGER]), async (req, res) => {
  try {
    const { imageId } = req.params;
    await prisma.menuItemImage.delete({ where: { id: imageId } });
    return res.json({ success: true, data: { message: 'Image removed' } });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete item image' },
    });
  }
});

export default router;
