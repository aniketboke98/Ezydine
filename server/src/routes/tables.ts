import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all tables
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT id, table_number as "tableNumber", status, seats,
             active_time as "activeTime", active_amount as "activeAmount", guest_count as "guestCount"
      FROM tables
      ORDER BY id ASC
    `);

    return res.json({ success: true, tables: result.rows });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch tables' });
  }
});

// Update table status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, activeAmount, activeTime, guestCount } = req.body;

    const result = await query(`
      UPDATE tables
      SET status = COALESCE($1, status),
          active_amount = COALESCE($2, active_amount),
          active_time = COALESCE($3, active_time),
          guest_count = COALESCE($4, guest_count)
      WHERE id = $5
      RETURNING *
    `, [status, activeAmount, activeTime, guestCount, id]);

    return res.json({ success: true, table: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update table' });
  }
});

export default router;
