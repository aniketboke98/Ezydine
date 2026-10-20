import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all staff members for the authenticated restaurant
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;

    const result = await query(`
      SELECT id, name, phone, role, pin, is_active as "active", can_edit_menu as "canEditMenu", can_access_reports as "canAccessReports", created_at as "createdAt"
      FROM staff_members
      WHERE restaurant_id = $1
      ORDER BY 
        CASE 
          WHEN LOWER(role) = 'owner' THEN 1
          WHEN LOWER(role) = 'manager' THEN 2
          WHEN LOWER(role) = 'cashier' THEN 3
          WHEN LOWER(role) = 'chef' THEN 4
          ELSE 5
        END,
        id ASC
    `, [restaurantId]);

    return res.json({
      success: true,
      staff: result.rows,
      restaurantId,
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch staff members' });
  }
});

// POST create new staff member (e.g. Manager with PIN)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;
    const { name, phone, role, pin, canEditMenu, canAccessReports } = req.body;

    if (!name || !phone || !role || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone, role, and 4-digit PIN are required.',
      });
    }

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    // Check if phone already registered for this restaurant
    const existing = await query(`
      SELECT id FROM staff_members WHERE restaurant_id = $1 AND phone = $2
    `, [restaurantId, cleanPhone]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A staff member with this phone number already exists in your restaurant.',
      });
    }

    const result = await query(`
      INSERT INTO staff_members (restaurant_id, name, phone, role, pin, is_active, can_edit_menu, can_access_reports)
      VALUES ($1, $2, $3, $4, $5, true, $6, $7)
      RETURNING id, name, phone, role, pin, is_active as "active", can_edit_menu as "canEditMenu", can_access_reports as "canAccessReports"
    `, [restaurantId, name.trim(), cleanPhone, role, cleanPin, canEditMenu ?? false, canAccessReports ?? false]);

    return res.json({
      success: true,
      member: result.rows[0],
      message: `${role} ${name} created successfully. They can now log in to the web POS using their phone and PIN.`,
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    return res.status(500).json({ success: false, error: 'Failed to create staff member' });
  }
});

// PATCH toggle staff active status
router.patch('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;

    const result = await query(`
      UPDATE staff_members
      SET is_active = NOT is_active
      WHERE id = $1 AND restaurant_id = $2
      RETURNING id, name, phone, role, is_active as "active"
    `, [id, restaurantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    return res.json({ success: true, member: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update staff status' });
  }
});

// DELETE remove staff member
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;

    const result = await query(`
      DELETE FROM staff_members
      WHERE id = $1 AND restaurant_id = $2 AND LOWER(role) != 'owner'
      RETURNING id, name
    `, [id, restaurantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff member not found or Owner cannot be deleted' });
    }

    return res.json({ success: true, message: 'Staff member removed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete staff member' });
  }
});

// GET attendance for a specific date (defaults to today)
router.get('/attendance', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;
    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const result = await query(`
      SELECT 
        sm.id as "staffId",
        sm.name,
        sm.phone,
        sm.role,
        sm.is_active as "active",
        COALESCE(sa.id, 0) as "attendanceId",
        COALESCE(sa.status, 'unmarked') as status,
        sa.clock_in as "clockIn",
        sa.clock_out as "clockOut",
        COALESCE(sa.shift, 'Full Day') as shift,
        sa.notes,
        $2 as date
      FROM staff_members sm
      LEFT JOIN staff_attendance sa 
        ON sa.staff_id = sm.id 
        AND sa.restaurant_id = $1 
        AND sa.date = $2::DATE
      WHERE sm.restaurant_id = $1
      ORDER BY 
        CASE 
          WHEN LOWER(sm.role) = 'owner' THEN 1
          WHEN LOWER(sm.role) = 'manager' THEN 2
          WHEN LOWER(sm.role) = 'cashier' THEN 3
          WHEN LOWER(sm.role) = 'chef' THEN 4
          ELSE 5
        END,
        sm.id ASC
    `, [restaurantId, dateParam]);

    const records = result.rows;
    const totalStaff = records.length;
    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    const leaveCount = records.filter((r) => r.status === 'on_leave' || r.status === 'half_day').length;
    const unmarkedCount = records.filter((r) => r.status === 'unmarked').length;

    return res.json({
      success: true,
      date: dateParam,
      summary: {
        totalStaff,
        presentCount,
        absentCount,
        leaveCount,
        unmarkedCount,
      },
      records,
    });
  } catch (error) {
    console.error('Error fetching staff attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

// POST mark staff attendance / clock-in / clock-out
router.post('/attendance/mark', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;
    const { staffId, date, status, clockIn, clockOut, shift, notes } = req.body;

    if (!staffId) {
      return res.status(400).json({ success: false, error: 'staffId is required' });
    }

    const attendanceDate = date || new Date().toISOString().split('T')[0];
    const attendanceStatus = status || 'present';

    // Format current time if requested
    const currentTimeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const finalClockIn = clockIn !== undefined ? clockIn : (attendanceStatus === 'present' ? currentTimeStr : null);
    const finalClockOut = clockOut !== undefined ? clockOut : null;

    const result = await query(`
      INSERT INTO staff_attendance (
        restaurant_id, staff_id, date, clock_in, clock_out, status, shift, notes
      )
      VALUES ($1, $2, $3::DATE, $4, $5, $6, $7, $8)
      ON CONFLICT (restaurant_id, staff_id, date)
      DO UPDATE SET
        status = EXCLUDED.status,
        clock_in = COALESCE(EXCLUDED.clock_in, staff_attendance.clock_in),
        clock_out = COALESCE(EXCLUDED.clock_out, staff_attendance.clock_out),
        shift = COALESCE(EXCLUDED.shift, staff_attendance.shift),
        notes = COALESCE(EXCLUDED.notes, staff_attendance.notes)
      RETURNING *
    `, [restaurantId, staffId, attendanceDate, finalClockIn, finalClockOut, attendanceStatus, shift || 'Full Day', notes || null]);

    return res.json({
      success: true,
      attendance: result.rows[0],
      message: `Attendance marked as ${attendanceStatus}`,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark attendance' });
  }
});

export default router;
