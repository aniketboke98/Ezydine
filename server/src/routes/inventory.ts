import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET inventory items and summary
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const itemsResult = await query(`
      SELECT id, name, category, quantity, unit,
             min_threshold as "minThreshold", cost_per_unit as "costPerUnit",
             ROUND((quantity * cost_per_unit), 2) as "totalValue",
             (quantity <= min_threshold) as "isLowStock"
      FROM inventory_items
      ORDER BY (quantity <= min_threshold) DESC, name ASC
    `);

    const totalValue = itemsResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.totalValue || 0),
      0
    );

    const lowStockCount = itemsResult.rows.filter((item) => item.isLowStock).length;

    return res.json({
      success: true,
      items: itemsResult.rows,
      summary: {
        totalStockValue: totalValue,
        totalItemsCount: itemsResult.rows.length,
        lowStockAlertsCount: lowStockCount,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// Adjust stock quantity
router.post('/adjust', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id, adjustment, reason } = req.body;

    const result = await query(`
      UPDATE inventory_items
      SET quantity = GREATEST(0, quantity + $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [adjustment, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    return res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to adjust stock' });
  }
});

export default router;
