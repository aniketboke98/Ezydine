import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET inventory items and summary for authenticated restaurant
router.get('/', requireAuth, requirePermission('VIEW_INVENTORY'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });

    const formatted = items.map((item) => {
      const qty = Number(item.quantity);
      const minThresh = Number(item.minThreshold);
      const cost = Number(item.costPerUnit);
      const totalVal = Math.round(qty * cost * 100) / 100;
      const isLow = qty <= minThresh;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: qty,
        unit: item.unit,
        minThreshold: minThresh,
        costPerUnit: cost,
        totalValue: totalVal,
        isLowStock: isLow,
      };
    });

    const totalStockValue = formatted.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockAlertsCount = formatted.filter((item) => item.isLowStock).length;

    return res.json({
      success: true,
      items: formatted,
      summary: {
        totalStockValue,
        totalItemsCount: formatted.length,
        lowStockAlertsCount,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// Adjust stock quantity
router.post('/adjust', requireAuth, requirePermission('MANAGE_INVENTORY'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { id, adjustment, reason } = req.body;

    const item = await prisma.inventoryItem.findFirst({
      where: { id: Number(id), restaurantId },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found' });
    }

    const newQty = Math.max(0, Number(item.quantity) + Number(adjustment));

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQty },
    });

    return res.json({
      success: true,
      item: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        quantity: Number(updated.quantity),
        unit: updated.unit,
        minThreshold: Number(updated.minThreshold),
        costPerUnit: Number(updated.costPerUnit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

// Add new inventory item
router.post('/', requireAuth, requirePermission('MANAGE_INVENTORY'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { name, category, quantity, unit, minThreshold, costPerUnit } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({ success: false, error: 'Name, category, and unit are required' });
    }

    const created = await prisma.inventoryItem.create({
      data: {
        restaurantId,
        name: name.trim(),
        category: category.trim(),
        quantity: quantity !== undefined ? Number(quantity) : 0,
        unit: unit.trim(),
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : 5,
        costPerUnit: costPerUnit !== undefined ? Number(costPerUnit) : 0,
      },
    });

    return res.status(201).json({ success: true, item: created });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create inventory item' });
  }
});

export default router;
