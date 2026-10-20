import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET dashboard metrics - REAL DATA ONLY from PostgreSQL
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const restFilter = restaurantId ? `WHERE restaurant_id = ${restaurantId}` : '';
    const restBillFilter = restaurantId ? `AND (b.restaurant_id = ${restaurantId} OR b.restaurant_id IS NULL)` : '';

    // 1. Today (1 Day) Sales & Orders
    const todayRes = await query(`
      SELECT 
        COALESCE(SUM(b.total_amount), 0)::FLOAT as "todaySales",
        COUNT(b.id)::INT as "todayOrders"
      FROM bills b
      WHERE DATE(b.created_at) = CURRENT_DATE ${restBillFilter}
    `);

    // 2. Yesterday's Sales for growth calculation
    const yesterdayRes = await query(`
      SELECT 
        COALESCE(SUM(b.total_amount), 0)::FLOAT as "yesterdaySales"
      FROM bills b
      WHERE DATE(b.created_at) = CURRENT_DATE - 1 ${restBillFilter}
    `);

    // 3. Last 7 Days Sales & Orders
    const sevenDaysRes = await query(`
      SELECT 
        COALESCE(SUM(b.total_amount), 0)::FLOAT as "sevenDaysSales",
        COUNT(b.id)::INT as "sevenDaysOrders"
      FROM bills b
      WHERE b.created_at >= CURRENT_DATE - INTERVAL '6 days' ${restBillFilter}
    `);

    // 4. Last 30 Days Sales & Orders
    const thirtyDaysRes = await query(`
      SELECT 
        COALESCE(SUM(b.total_amount), 0)::FLOAT as "thirtyDaysSales",
        COUNT(b.id)::INT as "thirtyDaysOrders"
      FROM bills b
      WHERE b.created_at >= CURRENT_DATE - INTERVAL '29 days' ${restBillFilter}
    `);

    // 5. Tables Status breakdown
    const tablesRes = await query(`
      SELECT 
        COUNT(*)::INT as "totalTables",
        COUNT(CASE WHEN status = 'occupied' THEN 1 END)::INT as "occupiedCount",
        COUNT(CASE WHEN status = 'available' THEN 1 END)::INT as "availableCount",
        COUNT(CASE WHEN status = 'reserved' THEN 1 END)::INT as "reservedCount"
      FROM tables ${restFilter}
    `);

    // 6. Low stock items
    let lowStockCount = 0;
    try {
      const lowStockRes = await query(`
        SELECT COUNT(*)::INT as "lowStockCount" FROM inventory_items WHERE quantity <= min_threshold
      `);
      lowStockCount = lowStockRes.rows[0]?.lowStockCount || 0;
    } catch {
      lowStockCount = 0;
    }

    // 7. Real daily sales for last 7 days
    const dailyTrendRes = await query(`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date as day_date
      )
      SELECT 
        TO_CHAR(d.day_date, 'DD Mon') as day,
        TO_CHAR(d.day_date, 'DD') as date_number,
        COALESCE(SUM(b.total_amount), 0)::FLOAT as amount,
        (d.day_date = CURRENT_DATE) as is_today
      FROM days d
      LEFT JOIN bills b ON DATE(b.created_at) = d.day_date ${restBillFilter}
      GROUP BY d.day_date
      ORDER BY d.day_date ASC
    `);

    const todaySales = todayRes.rows[0]?.todaySales || 0;
    const todayOrders = todayRes.rows[0]?.todayOrders || 0;
    const yesterdaySales = yesterdayRes.rows[0]?.yesterdaySales || 0;
    const sevenDaysSales = sevenDaysRes.rows[0]?.sevenDaysSales || 0;
    const sevenDaysOrders = sevenDaysRes.rows[0]?.sevenDaysOrders || 0;
    const thirtyDaysSales = thirtyDaysRes.rows[0]?.thirtyDaysSales || 0;
    const thirtyDaysOrders = thirtyDaysRes.rows[0]?.thirtyDaysOrders || 0;

    let salesGrowth = '0%';
    if (yesterdaySales > 0) {
      const growthPct = (((todaySales - yesterdaySales) / yesterdaySales) * 100).toFixed(1);
      salesGrowth = `${Number(growthPct) >= 0 ? '+' : ''}${growthPct}%`;
    } else if (todaySales > 0) {
      salesGrowth = '+100%';
    }

    const occupiedCount = tablesRes.rows[0]?.occupiedCount || 0;
    const availableCount = tablesRes.rows[0]?.availableCount || 0;
    const reservedCount = tablesRes.rows[0]?.reservedCount || 0;
    const totalTables = tablesRes.rows[0]?.totalTables || (occupiedCount + availableCount + reservedCount);

    const salesSummary = dailyTrendRes.rows.map((row) => ({
      day: row.day,
      dateNumber: parseInt(row.date_number, 10),
      amount: row.amount,
      isHighlight: row.is_today,
    }));

    return res.json({
      success: true,
      stats: {
        // Today (1 Day)
        todaySales,
        todayOrders,
        billsCount: todayOrders,
        salesGrowth,

        // Last 7 Days
        sevenDaysSales,
        sevenDaysOrders,

        // Last 30 Days
        thirtyDaysSales,
        thirtyDaysOrders,

        // Tables
        activeTablesCount: occupiedCount,
        availableTablesCount: availableCount,
        reservedTablesCount: reservedCount,
        totalTablesCount: totalTables,

        // Inventory
        lowStockCount,

        // Daily trend
        salesSummary,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch real dashboard metrics' });
  }
});

// GET sales reports with Real Data (Daily 1-Day / Weekly 7-Days / Monthly 30-Days)
router.get('/sales', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rawPeriod = ((req.query.period as string) || 'daily').toLowerCase();
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const restBillFilter = restaurantId ? `AND (b.restaurant_id = ${restaurantId} OR b.restaurant_id IS NULL)` : '';

    let dateCondition = `DATE(b.created_at) = CURRENT_DATE`;
    let seriesInterval = `'6 days'`;
    let labelFormat = `'DD Mon'`;

    if (rawPeriod === 'weekly' || rawPeriod === '7days' || rawPeriod === '7 days') {
      dateCondition = `b.created_at >= CURRENT_DATE - INTERVAL '6 days'`;
      seriesInterval = `'6 days'`;
      labelFormat = `'DD Mon'`;
    } else if (rawPeriod === 'monthly' || rawPeriod === '30days' || rawPeriod === '30 days') {
      dateCondition = `b.created_at >= CURRENT_DATE - INTERVAL '29 days'`;
      seriesInterval = `'29 days'`;
      labelFormat = `'DD Mon'`;
    } else {
      // 1 day / daily
      dateCondition = `DATE(b.created_at) = CURRENT_DATE`;
    }

    // 1. Total Sales and Orders for the selected period
    const totalRes = await query(`
      SELECT 
        COALESCE(SUM(b.total_amount), 0)::FLOAT as "totalSales",
        COUNT(b.id)::INT as "totalOrders"
      FROM bills b
      WHERE ${dateCondition} ${restBillFilter}
    `);

    const totalSales = totalRes.rows[0]?.totalSales || 0;
    const totalOrders = totalRes.rows[0]?.totalOrders || 0;
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0;

    // 2. Real Payment Method breakdown
    const paymentRes = await query(`
      SELECT 
        COALESCE(LOWER(b.payment_method), 'unpaid') as method,
        COALESCE(SUM(b.total_amount), 0)::FLOAT as amount,
        COUNT(b.id)::INT as count
      FROM bills b
      WHERE ${dateCondition} ${restBillFilter}
      GROUP BY LOWER(b.payment_method)
    `);

    let upiAmount = 0, upiCount = 0;
    let cashAmount = 0, cashCount = 0;
    let cardAmount = 0, cardCount = 0;

    paymentRes.rows.forEach((r) => {
      const m = r.method;
      if (m.includes('upi')) {
        upiAmount += r.amount;
        upiCount += r.count;
      } else if (m.includes('cash')) {
        cashAmount += r.amount;
        cashCount += r.count;
      } else if (m.includes('card')) {
        cardAmount += r.amount;
        cardCount += r.count;
      } else {
        // Unspecified or unpaid
        cashAmount += r.amount;
        cashCount += r.count;
      }
    });

    const breakdownTotal = upiAmount + cashAmount + cardAmount || 1;
    const paymentBreakdown = {
      upi: {
        amount: upiAmount,
        count: upiCount,
        percentage: parseFloat(((upiAmount / breakdownTotal) * 100).toFixed(1)),
      },
      cash: {
        amount: cashAmount,
        count: cashCount,
        percentage: parseFloat(((cashAmount / breakdownTotal) * 100).toFixed(1)),
      },
      card: {
        amount: cardAmount,
        count: cardCount,
        percentage: parseFloat(((cardAmount / breakdownTotal) * 100).toFixed(1)),
      },
    };

    // 3. Real Trend data for the period
    const trendRes = await query(`
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL ${seriesInterval}, CURRENT_DATE, '1 day'::interval)::date as day_date
      )
      SELECT 
        TO_CHAR(d.day_date, ${labelFormat}) as day,
        COALESCE(SUM(b.total_amount), 0)::FLOAT as amount,
        (d.day_date = CURRENT_DATE) as is_highlight
      FROM days d
      LEFT JOIN bills b ON DATE(b.created_at) = d.day_date ${restBillFilter}
      GROUP BY d.day_date
      ORDER BY d.day_date ASC
    `);

    // 4. Real Top Items from bill_items
    let topCategories: { category: string; amount: number; count: number }[] = [];
    try {
      const itemsRes = await query(`
        SELECT 
          bi.name as category,
          COALESCE(SUM(bi.subtotal), 0)::FLOAT as amount,
          COALESCE(SUM(bi.quantity), 0)::INT as count
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        WHERE ${dateCondition} ${restBillFilter}
        GROUP BY bi.name
        ORDER BY amount DESC
        LIMIT 5
      `);
      topCategories = itemsRes.rows;
    } catch {
      topCategories = [];
    }

    // 5. Real Bill history
    const billsListRes = await query(`
      SELECT 
        b.id,
        b.bill_number as "billNumber",
        b.table_number as "tableOrType",
        b.subtotal::FLOAT,
        b.discount::FLOAT,
        b.gst_amount::FLOAT as "gstAmount",
        b.total_amount::FLOAT as amount,
        COALESCE(b.payment_method, 'Cash') as "paymentMethod",
        b.payment_status as "paymentStatus",
        TO_CHAR(b.created_at, 'HH12:MI AM') as time,
        TO_CHAR(b.created_at, 'DD Mon YYYY') as date
      FROM bills b
      WHERE ${dateCondition} ${restBillFilter}
      ORDER BY b.id DESC
      LIMIT 50
    `);

    return res.json({
      success: true,
      period: rawPeriod,
      totalSales,
      totalOrders,
      averageOrderValue,
      paymentBreakdown,
      salesSummary: trendRes.rows.map((r) => ({
        day: r.day,
        amount: r.amount,
        isHighlight: r.is_highlight,
      })),
      topCategories,
      bills: billsListRes.rows,
    });
  } catch (error) {
    console.error('Error fetching sales reports:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch sales report' });
  }
});

export default router;
