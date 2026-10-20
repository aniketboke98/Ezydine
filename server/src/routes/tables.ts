import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all tables for authenticated restaurant
router.get('/', requireAuth, requirePermission('VIEW_TABLES'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { id: 'asc' },
    });

    const formatted = tables.map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      status: t.status,
      seats: t.seats,
      section: t.section,
      activeTime: t.activeTime,
      activeAmount: Number(t.activeAmount),
      guestCount: t.guestCount,
    }));

    return res.json({ success: true, tables: formatted });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch tables' });
  }
});

// Update table status / active amount / occupancy
router.patch('/:id/status', requireAuth, requirePermission('CREATE_BILL'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { status, activeAmount, activeTime, guestCount } = req.body;

    const table = await prisma.table.findFirst({
      where: { id, restaurantId },
    });

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        activeAmount: activeAmount !== undefined ? Number(activeAmount) : undefined,
        activeTime: activeTime !== undefined ? activeTime : undefined,
        guestCount: guestCount !== undefined ? Number(guestCount) : undefined,
      },
    });

    return res.json({
      success: true,
      table: {
        id: updated.id,
        tableNumber: updated.tableNumber,
        status: updated.status,
        seats: updated.seats,
        section: updated.section,
        activeTime: updated.activeTime,
        activeAmount: Number(updated.activeAmount),
        guestCount: updated.guestCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update table' });
  }
});

// Create new table
router.post('/', requireAuth, requirePermission('MANAGE_TABLES'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { tableNumber, seats, section } = req.body;

    if (!tableNumber || !restaurantId) {
      return res.status(400).json({ success: false, error: 'Table number and restaurant required' });
    }

    const created = await prisma.table.create({
      data: {
        restaurantId,
        tableNumber: tableNumber.trim(),
        seats: seats ? Number(seats) : 4,
        section: section ? section.trim() : 'Dine-In',
        status: 'available',
      },
    });

    return res.status(201).json({
      success: true,
      table: {
        id: created.id,
        tableNumber: created.tableNumber,
        status: created.status,
        seats: created.seats,
        section: created.section,
        activeTime: created.activeTime,
        activeAmount: Number(created.activeAmount),
        guestCount: created.guestCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to create table' });
  }
});

export default router;
