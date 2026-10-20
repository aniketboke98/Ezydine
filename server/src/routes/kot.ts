import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET active KOT orders
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT id, kot_number as "kotNumber", table_number as "tableNumber",
             status, items, time_elapsed as "timeElapsed",
             TO_CHAR(created_at, 'HH12:MI AM') as "createdAt"
      FROM kot_orders
      ORDER BY id DESC
    `);

    return res.json({ success: true, orders: result.rows });
  } catch (error) {
    console.error('Error fetching KOT orders:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch KOT orders' });
  }
});

// Update KOT order status (pending -> preparing -> ready -> served)
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(`
      UPDATE kot_orders
      SET status = $1
      WHERE id = $2
      RETURNING id, kot_number as "kotNumber", table_number as "tableNumber", status, items
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'KOT order not found' });
    }

    return res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update KOT status' });
  }
});

export default router;
