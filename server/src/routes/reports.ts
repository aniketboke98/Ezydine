import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET dashboard metrics - REAL DATA ONLY from PostgreSQL
router.get('/dashboard', requireAuth, requirePermission('VIEW_REPORTS'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    // 1. Today Sales & Orders
    const todayBills = await prisma.bill.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const todaySales = todayBills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const todayOrders = todayBills.length;

    // 2. Yesterday Sales
    const yesterdayStart = new Date(new Date().setDate(new Date().getDate() - 1));
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const yesterdayBills = await prisma.bill.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
      },
    });
    const yesterdaySales = yesterdayBills.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    // 3. Last 7 Days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysBills = await prisma.bill.findMany({
      where: {
        restaurantId,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    const sevenDaysSales = sevenDaysBills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const sevenDaysOrders = sevenDaysBills.length;

    // 4. Last 30 Days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysBills = await prisma.bill.findMany({
      where: {
        restaurantId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });
    const thirtyDaysSales = thirtyDaysBills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const thirtyDaysOrders = thirtyDaysBills.length;

    // 5. Tables Status breakdown
    const tables = await prisma.table.findMany({
      where: { restaurantId },
    });
    const totalTables = tables.length;
    const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
    const availableCount = tables.filter((t) => t.status === 'available').length;
    const reservedCount = tables.filter((t) => t.status === 'reserved').length;

    // 6. Low stock items
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { restaurantId },
    });
    const lowStockCount = inventoryItems.filter((i) => Number(i.quantity) <= Number(i.minThreshold)).length;

    // 7. Daily trend (last 7 days)
    const salesSummary: { day: string; dateNumber: number; amount: number; isHighlight: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dayBills = sevenDaysBills.filter((b) => {
        const created = new Date(b.createdAt);
        return created >= startOfDay && created <= endOfDay;
      });

      const dayTotal = dayBills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      salesSummary.push({
        day: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        dateNumber: d.getDate(),
        amount: dayTotal,
        isHighlight: i === 0,
      });
    }

    let salesGrowth = '0%';
    if (yesterdaySales > 0) {
      const growthPct = (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1);
      salesGrowth = `${Number(growthPct) >= 0 ? '+' : ''}${growthPct}%`;
    } else if (todaySales > 0) {
      salesGrowth = '+100%';
    }

    return res.json({
      success: true,
      stats: {
        todaySales,
        todayOrders,
        billsCount: todayOrders,
        salesGrowth,
        sevenDaysSales,
        sevenDaysOrders,
        thirtyDaysSales,
        thirtyDaysOrders,
        activeTablesCount: occupiedCount,
        availableTablesCount: availableCount,
        reservedTablesCount: reservedCount,
        totalTablesCount: totalTables,
        lowStockCount,
        salesSummary,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch real dashboard metrics' });
  }
});

// GET sales reports with Real Data (Daily 1-Day / Weekly 7-Days / Monthly 30-Days)
router.get('/sales', requireAuth, requirePermission('VIEW_REPORTS'), async (req: AuthRequest, res: Response) => {
  try {
    const rawPeriod = ((req.query.period as string) || 'daily').toLowerCase();
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let daysCount = 1;

    if (rawPeriod === 'weekly' || rawPeriod === '7days' || rawPeriod === '7 days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      daysCount = 7;
    } else if (rawPeriod === 'monthly' || rawPeriod === '30days' || rawPeriod === '30 days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
      daysCount = 30;
    }

    const bills = await prisma.bill.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
      include: { items: true },
      orderBy: { id: 'desc' },
    });

    const totalSales = bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalOrders = bills.length;
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0;

    // Payment breakdown
    let upiAmount = 0, upiCount = 0;
    let cashAmount = 0, cashCount = 0;
    let cardAmount = 0, cardCount = 0;

    bills.forEach((b) => {
      const method = (b.paymentMethod || 'cash').toLowerCase();
      const amt = Number(b.totalAmount);
      if (method.includes('upi')) {
        upiAmount += amt;
        upiCount++;
      } else if (method.includes('card')) {
        cardAmount += amt;
        cardCount++;
      } else {
        cashAmount += amt;
        cashCount++;
      }
    });

    const breakdownTotal = upiAmount + cashAmount + cardAmount || 1;
    const paymentBreakdown = {
      upi: { amount: upiAmount, count: upiCount, percentage: parseFloat(((upiAmount / breakdownTotal) * 100).toFixed(1)) },
      cash: { amount: cashAmount, count: cashCount, percentage: parseFloat(((cashAmount / breakdownTotal) * 100).toFixed(1)) },
      card: { amount: cardAmount, count: cardCount, percentage: parseFloat(((cardAmount / breakdownTotal) * 100).toFixed(1)) },
    };

    // Trend summary
    const trendSummary: { day: string; amount: number; isHighlight: boolean }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dayBills = bills.filter((b) => {
        const created = new Date(b.createdAt);
        return created >= startOfDay && created <= endOfDay;
      });

      trendSummary.push({
        day: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        amount: dayBills.reduce((sum, b) => sum + Number(b.totalAmount), 0),
        isHighlight: i === 0,
      });
    }

    // Top items
    const itemMap = new Map<string, { amount: number; count: number }>();
    bills.forEach((b) => {
      b.items.forEach((item) => {
        const existing = itemMap.get(item.name) || { amount: 0, count: 0 };
        existing.amount += Number(item.subtotal);
        existing.count += item.quantity;
        itemMap.set(item.name, existing);
      });
    });

    const topCategories = Array.from(itemMap.entries())
      .map(([name, data]) => ({ category: name, amount: data.amount, count: data.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const formattedBills = bills.slice(0, 50).map((b) => {
      const createdAt = new Date(b.createdAt);
      return {
        id: b.id,
        billNumber: b.billNumber,
        tableOrType: b.tableNumber,
        subtotal: Number(b.subtotal),
        discount: Number(b.discount),
        gstAmount: Number(b.gstAmount),
        amount: Number(b.totalAmount),
        paymentMethod: b.paymentMethod || 'Cash',
        paymentStatus: b.paymentStatus,
        time: createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: createdAt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
    });

    return res.json({
      success: true,
      period: rawPeriod,
      totalSales,
      totalOrders,
      averageOrderValue,
      paymentBreakdown,
      salesSummary: trendSummary,
      topCategories,
      bills: formattedBills,
    });
  } catch (error) {
    console.error('Error fetching sales reports:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sales report' });
  }
});

export default router;
