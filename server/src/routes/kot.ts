import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET active KOT orders for authenticated restaurant
router.get('/', requireAuth, requirePermission('VIEW_KOT'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const orders = await prisma.kotOrder.findMany({
      where: { restaurantId },
      orderBy: { id: 'desc' },
      take: 50,
    });

    const formatted = orders.map((o) => {
      const createdAt = new Date(o.createdAt);
      const timeStr = createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      return {
        id: o.id,
        kotNumber: o.kotNumber,
        tableNumber: o.tableNumber,
        status: o.status,
        items: o.items,
        timeElapsed: o.timeElapsed,
        createdAt: timeStr,
      };
    });

    return res.json({ success: true, orders: formatted });
  } catch (error) {
    console.error('Error fetching KOT orders:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch KOT orders' });
  }
});

// Update KOT order status (pending -> preparing -> ready -> served)
router.all('/:id/status', requireAuth, requirePermission('UPDATE_KOT_STATUS'), async (req: AuthRequest, res: Response) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { status } = req.body;

    const order = await prisma.kotOrder.findFirst({
      where: { id, restaurantId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'KOT order not found' });
    }

    const updated = await prisma.kotOrder.update({
      where: { id },
      data: { status },
    });

    return res.json({
      success: true,
      order: {
        id: updated.id,
        kotNumber: updated.kotNumber,
        tableNumber: updated.tableNumber,
        status: updated.status,
        items: updated.items,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update KOT status' });
  }
});

export default router;
