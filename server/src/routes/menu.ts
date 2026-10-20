import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all menu items for the authenticated restaurant
router.get('/', requireAuth, requirePermission('VIEW_MENU'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const formatted = items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: Number(item.price),
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      description: item.description,
      image: item.imageUrl,
    }));

    return res.json({
      success: true,
      items: formatted,
      restaurantId,
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
  }
});

// Toggle menu item availability
router.patch('/:id/toggle', requireAuth, requirePermission('MANAGE_MENU'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });

    return res.json({
      success: true,
      item: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        price: Number(updated.price),
        isVeg: updated.isVeg,
        isAvailable: updated.isAvailable,
        image: updated.imageUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to toggle availability' });
  }
});

// Add new menu item for authenticated restaurant
router.post('/', requireAuth, requirePermission('MANAGE_MENU'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const { name, category, price, isVeg, description, image, imageUrl } = req.body;
    const activeImage = image || imageUrl || null;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name, category, and price are required' });
    }

    const created = await prisma.menuItem.create({
      data: {
        restaurantId,
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
        isAvailable: true,
        description: description?.trim() || null,
        imageUrl: activeImage,
      },
    });

    return res.status(201).json({
      success: true,
      item: {
        id: created.id,
        name: created.name,
        category: created.category,
        price: Number(created.price),
        isVeg: created.isVeg,
        isAvailable: created.isAvailable,
        description: created.description,
        image: created.imageUrl,
      },
    });
  } catch (error) {
    console.error('Error adding menu item:', error);
    return res.status(500).json({ success: false, error: 'Failed to add menu item' });
  }
});

// Update existing menu item
router.put('/:id', requireAuth, requirePermission('MANAGE_MENU'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { name, category, price, isVeg, description, image, imageUrl } = req.body;

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const updated = await prisma.menuItem.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        category: category !== undefined ? category.trim() : undefined,
        price: price !== undefined ? Number(price) : undefined,
        isVeg: isVeg !== undefined ? Boolean(isVeg) : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        imageUrl: (image || imageUrl) !== undefined ? (image || imageUrl) : undefined,
      },
    });

    return res.json({
      success: true,
      item: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        price: Number(updated.price),
        isVeg: updated.isVeg,
        isAvailable: updated.isAvailable,
        description: updated.description,
        image: updated.imageUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update menu item' });
  }
});

// Delete menu item
router.delete('/:id', requireAuth, requirePermission('MANAGE_MENU'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    await prisma.menuItem.delete({ where: { id } });

    return res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete menu item' });
  }
});

export default router;
