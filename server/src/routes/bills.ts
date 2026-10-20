import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all bills / transactions
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT b.id, b.bill_number as "billNumber", b.table_number as "tableOrType",
             b.subtotal, b.discount, b.gst_amount as "gstAmount", b.total_amount as amount,
             b.payment_method as "paymentMethod", b.payment_status as "paymentStatus",
             TO_CHAR(b.created_at, 'HH12:MI AM') as time,
             TO_CHAR(b.created_at, 'YYYY-MM-DD') as date
      FROM bills b
      ORDER BY b.id DESC
      LIMIT 50
    `);

    return res.json({ success: true, bills: result.rows });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch bills' });
  }
});

// GET bill by ID with items
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const billResult = await query(`
      SELECT b.*, TO_CHAR(b.created_at, 'DD Mon YYYY, HH12:MI AM') as formatted_date
      FROM bills b WHERE b.id = $1 OR b.bill_number = $1
    `, [id]);

    if (billResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    const bill = billResult.rows[0];
    const itemsResult = await query(`
      SELECT * FROM bill_items WHERE bill_id = $1
    `, [bill.id]);

    return res.json({
      success: true,
      bill: {
        ...bill,
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch bill details' });
  }
});

// Create new Bill
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { tableNumber, items, subtotal, discount, gstAmount, totalAmount } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Bill items are required' });
    }

    const billNumber = `#${Math.floor(1000 + Math.random() * 9000)}`;

    const billResult = await query(`
      INSERT INTO bills (bill_number, table_number, subtotal, discount, gst_amount, total_amount, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'unpaid')
      RETURNING *
    `, [billNumber, tableNumber || 'T1', subtotal, discount || 0, gstAmount || 0, totalAmount]);

    const bill = billResult.rows[0];

    // Insert bill items
    for (const item of items) {
      await query(`
        INSERT INTO bill_items (bill_id, name, price, quantity, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [bill.id, item.name, item.price, item.quantity, item.price * item.quantity]);
    }

    // Auto create KOT ticket
    const kotNumber = `KOT #${Math.floor(100 + Math.random() * 900)}`;
    await query(`
      INSERT INTO kot_orders (kot_number, bill_id, table_number, status, items)
      VALUES ($1, $2, $3, 'pending', $4)
    `, [kotNumber, bill.id, tableNumber || 'T1', JSON.stringify(items)]);

    return res.json({
      success: true,
      bill,
      billNumber,
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    return res.status(500).json({ success: false, error: 'Failed to create bill' });
  }
});

// Pay / Settle Bill
router.post('/:id/pay', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, amountReceived, changeReturned } = req.body;

    const result = await query(`
      UPDATE bills
      SET payment_method = $1,
          payment_status = 'paid',
          amount_received = $2,
          change_returned = $3
      WHERE id = $4 OR bill_number = $4
      RETURNING *
    `, [paymentMethod || 'Cash', amountReceived, changeReturned, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    return res.json({ success: true, bill: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to settle payment' });
  }
});

export default router;
