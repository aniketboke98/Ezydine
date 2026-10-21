import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all bills for the authenticated restaurant
router.get('/', requireAuth, requirePermission('VIEW_BILLS'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const bills = await prisma.bill.findMany({
      where: { restaurantId },
      include: { items: true },
      orderBy: { id: 'desc' },
      take: 100,
    });

    const formatted = bills.map((b) => {
      const createdAt = new Date(b.createdAt);
      const timeStr = createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dateStr = createdAt.toISOString().split('T')[0];

      return {
        id: b.id,
        billNumber: b.billNumber,
        tableOrType: b.tableNumber,
        tableNumber: b.tableNumber,
        orderType: b.orderType,
        subtotal: Number(b.subtotal),
        discount: Number(b.discount),
        gstAmount: Number(b.gstAmount),
        amount: Number(b.totalAmount),
        totalAmount: Number(b.totalAmount),
        paymentMethod: b.paymentMethod,
        paymentStatus: b.paymentStatus,
        time: timeStr,
        date: dateStr,
        items: b.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
        })),
      };
    });

    return res.json({ success: true, bills: formatted });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch bills' });
  }
});

// GET bill by ID or Bill Number
router.get('/:id', requireAuth, requirePermission('VIEW_BILLS'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const parsedId = parseInt(id, 10);

    const bill = await prisma.bill.findFirst({
      where: {
        restaurantId,
        OR: [
          !isNaN(parsedId) ? { id: parsedId } : { billNumber: id },
          { billNumber: id },
        ],
      },
      include: { items: true },
    });

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    const formatted = {
      id: bill.id,
      billNumber: bill.billNumber,
      tableNumber: bill.tableNumber,
      orderType: bill.orderType,
      subtotal: Number(bill.subtotal),
      discount: Number(bill.discount),
      gstAmount: Number(bill.gstAmount),
      totalAmount: Number(bill.totalAmount),
      paymentMethod: bill.paymentMethod,
      paymentStatus: bill.paymentStatus,
      amountReceived: bill.amountReceived ? Number(bill.amountReceived) : null,
      changeReturned: bill.changeReturned ? Number(bill.changeReturned) : null,
      createdAt: bill.createdAt,
      items: bill.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
      })),
    };

    return res.json({ success: true, bill: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch bill details' });
  }
});

// Create new Bill & KOT
router.post('/', requireAuth, requirePermission('CREATE_BILL'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const { tableNumber, items, subtotal, discount, gstAmount, totalAmount, orderType } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Bill items are required' });
    }

    const count = await prisma.bill.count({
      where: { restaurantId },
    });
    const orderNum = count + 1;
    const billNumber = req.body.billNumber || `Order #${orderNum}`;
    const kotNumber = req.body.kotNumber || `KOT #${orderNum}`;

    const newBill = await prisma.$transaction(async (tx) => {
      // 1. Create Bill
      const bill = await tx.bill.create({
        data: {
          restaurantId,
          billNumber,
          tableNumber: tableNumber || 'T1',
          orderType: orderType || 'Dine-In',
          subtotal: Number(subtotal),
          discount: discount ? Number(discount) : 0,
          gstAmount: gstAmount ? Number(gstAmount) : 0,
          totalAmount: Number(totalAmount),
          paymentStatus: req.body.paymentStatus || 'paid',
          paymentMethod: req.body.paymentMethod || 'UPI',
          items: {
            create: items.map((item: any) => ({
              name: item.name,
              price: Number(item.price),
              quantity: Number(item.quantity),
              subtotal: Number(item.price) * Number(item.quantity),
            })),
          },
        },
        include: { items: true },
      });

      // 2. Auto Create Kitchen Order Ticket
      await tx.kotOrder.create({
        data: {
          restaurantId,
          billId: bill.id,
          kotNumber,
          tableNumber: tableNumber || 'T1',
          status: 'pending',
          items: items.map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            notes: i.notes || '',
          })),
          timeElapsed: 'Just now',
        },
      });

      // 3. Update Table status
      if (tableNumber) {
        const isPaid = (req.body.paymentStatus || 'paid') === 'paid';
        await tx.table.updateMany({
          where: { restaurantId, tableNumber },
          data: {
            status: isPaid ? 'available' : 'occupied',
            activeAmount: isPaid ? 0 : Number(totalAmount),
            activeTime: isPaid ? null : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          },
        });
      }

      return bill;
    });

    return res.status(201).json({
      success: true,
      bill: {
        id: newBill.id,
        billNumber: newBill.billNumber,
        tableNumber: newBill.tableNumber,
        totalAmount: Number(newBill.totalAmount),
        paymentStatus: newBill.paymentStatus,
        items: newBill.items,
      },
      billNumber,
      kotNumber,
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    return res.status(500).json({ success: false, error: 'Failed to create bill' });
  }
});

// Pay / Settle Bill
const handleSettleBill = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { paymentMethod, amountReceived, changeReturned } = req.body;
    const parsedId = parseInt(id, 10);

    const bill = await prisma.bill.findFirst({
      where: {
        restaurantId,
        OR: [
          !isNaN(parsedId) ? { id: parsedId } : { billNumber: id },
          { billNumber: id },
        ],
      },
    });

    if (!bill) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    const settled = await prisma.$transaction(async (tx) => {
      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          paymentMethod: paymentMethod || 'Cash',
          paymentStatus: 'paid',
          amountReceived: amountReceived !== undefined ? Number(amountReceived) : undefined,
          changeReturned: changeReturned !== undefined ? Number(changeReturned) : undefined,
        },
      });

      // Release table back to available
      if (bill.tableNumber) {
        await tx.table.updateMany({
          where: { restaurantId, tableNumber: bill.tableNumber },
          data: {
            status: 'available',
            activeAmount: 0,
            activeTime: null,
          },
        });
      }

      return updatedBill;
    });

    return res.json({
      success: true,
      bill: {
        id: settled.id,
        billNumber: settled.billNumber,
        paymentStatus: settled.paymentStatus,
        paymentMethod: settled.paymentMethod,
        totalAmount: Number(settled.totalAmount),
      },
    });
  } catch (error) {
    console.error('Error settling payment:', error);
    return res.status(500).json({ success: false, error: 'Failed to settle payment' });
  }
};

router.post('/:id/pay', requireAuth, requirePermission('CREATE_BILL'), handleSettleBill);
router.put('/:id/pay', requireAuth, requirePermission('CREATE_BILL'), handleSettleBill);
router.post('/:id/settle', requireAuth, requirePermission('CREATE_BILL'), handleSettleBill);
router.put('/:id/settle', requireAuth, requirePermission('CREATE_BILL'), handleSettleBill);

export default router;
