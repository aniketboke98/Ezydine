import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all staff members for the authenticated restaurant
router.get('/', requireAuth, requirePermission('VIEW_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const staff = await prisma.staffMember.findMany({
      where: { restaurantId },
      include: {
        roleRef: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const formattedStaff = staff.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      role: s.role,
      roleId: s.roleId,
      pin: s.pin,
      active: s.isActive,
      canEditMenu: s.canEditMenu,
      canAccessReports: s.canAccessReports,
      createdAt: s.createdAt,
      permissions: s.roleRef?.rolePermissions.map((rp) => rp.permission.code) || [],
    }));

    return res.json({
      success: true,
      staff: formattedStaff,
      restaurantId,
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch staff members' });
  }
});

// POST create new staff member
router.post('/', requireAuth, requirePermission('MANAGE_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const { name, phone, role, roleId, pin, canEditMenu, canAccessReports } = req.body;

    if (!name || !phone || !role || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone, role, and 4-digit PIN are required.',
      });
    }

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    // Check duplicate phone in restaurant
    const existing = await prisma.staffMember.findFirst({
      where: { restaurantId, phone: cleanPhone },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A staff member with this phone number already exists in your restaurant.',
      });
    }

    let assignedRoleId = roleId ? Number(roleId) : null;
    if (!assignedRoleId) {
      const matchedRole = await prisma.role.findFirst({
        where: {
          name: { equals: role, mode: 'insensitive' },
          OR: [{ restaurantId }, { isSystem: true }],
        },
      });
      if (matchedRole) assignedRoleId = matchedRole.id;
    }

    const member = await prisma.staffMember.create({
      data: {
        restaurantId,
        name: name.trim(),
        phone: cleanPhone,
        role: role.trim(),
        roleId: assignedRoleId,
        pin: cleanPin,
        isActive: true,
        canEditMenu: Boolean(canEditMenu),
        canAccessReports: Boolean(canAccessReports),
      },
    });

    return res.status(201).json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        role: member.role,
        roleId: member.roleId,
        pin: member.pin,
        active: member.isActive,
        canEditMenu: member.canEditMenu,
        canAccessReports: member.canAccessReports,
      },
      message: `${role} ${name} created successfully.`,
    });
  } catch (error) {
    console.error('Error creating staff member:', error);
    return res.status(500).json({ success: false, error: 'Failed to create staff member' });
  }
});

// PATCH toggle staff active status
router.patch('/:id/toggle', requireAuth, requirePermission('MANAGE_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);

    const staff = await prisma.staffMember.findFirst({
      where: { id, restaurantId },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    const updated = await prisma.staffMember.update({
      where: { id },
      data: { isActive: !staff.isActive },
    });

    return res.json({
      success: true,
      member: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        role: updated.role,
        active: updated.isActive,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update staff status' });
  }
});

// DELETE remove staff member
router.delete('/:id', requireAuth, requirePermission('MANAGE_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);

    const staff = await prisma.staffMember.findFirst({
      where: { id, restaurantId },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff member not found' });
    }

    if (staff.role.toLowerCase() === 'owner') {
      return res.status(400).json({ success: false, error: 'Owner cannot be deleted' });
    }

    await prisma.staffMember.delete({ where: { id } });

    return res.json({ success: true, message: 'Staff member removed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete staff member' });
  }
});

// -------------------------------------------------------------
// Granular Roles & Permissions Management
// -------------------------------------------------------------

// GET all available permissions
router.get('/permissions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
    return res.json({ success: true, permissions });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

// GET roles for this restaurant
router.get('/roles', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);

    const roles = await prisma.role.findMany({
      where: {
        OR: [{ restaurantId }, { isSystem: true }],
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    const formattedRoles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map((rp) => rp.permission.code),
    }));

    return res.json({ success: true, roles: formattedRoles });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
});

// POST create custom role
router.post('/roles', requireAuth, requirePermission('MANAGE_ROLES'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    const { name, description, permissions } = req.body;

    if (!name || !restaurantId) {
      return res.status(400).json({ success: false, error: 'Role name and restaurant context required' });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isSystem: false,
        restaurantId,
      },
    });

    if (Array.isArray(permissions) && permissions.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { code: { in: permissions } },
      });

      for (const p of perms) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: p.id },
        });
      }
    }

    return res.status(201).json({ success: true, role });
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ success: false, error: 'Failed to create role' });
  }
});

// PUT update role permissions
router.put('/roles/:id/permissions', requireAuth, requirePermission('MANAGE_ROLES'), async (req: AuthRequest, res: Response) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Permissions array is required' });
    }

    // Delete existing mappings
    await prisma.rolePermission.deleteMany({ where: { roleId } });

    // Link new permissions
    const perms = await prisma.permission.findMany({
      where: { code: { in: permissions } },
    });

    for (const p of perms) {
      await prisma.rolePermission.create({
        data: { roleId, permissionId: p.id },
      });
    }

    return res.json({ success: true, message: 'Role permissions updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update role permissions' });
  }
});

// -------------------------------------------------------------
// Staff Attendance
// -------------------------------------------------------------

router.get('/attendance', requireAuth, requirePermission('VIEW_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const targetDate = new Date(dateParam);

    const staffMembers = await prisma.staffMember.findMany({
      where: { restaurantId },
      include: {
        attendance: {
          where: { date: targetDate },
        },
      },
      orderBy: { id: 'asc' },
    });

    const records = staffMembers.map((sm) => {
      const att = sm.attendance[0];
      return {
        staffId: sm.id,
        name: sm.name,
        phone: sm.phone,
        role: sm.role,
        active: sm.isActive,
        attendanceId: att?.id || 0,
        status: att?.status || 'unmarked',
        clockIn: att?.clockIn || null,
        clockOut: att?.clockOut || null,
        shift: att?.shift || 'Full Day',
        notes: att?.notes || null,
        date: dateParam,
      };
    });

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
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  }
});

router.post('/attendance/mark', requireAuth, requirePermission('MANAGE_STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id);
    if (!restaurantId) {
      return res.status(400).json({ success: false, error: 'Restaurant context required' });
    }

    const { staffId, date, status, clockIn, clockOut, shift, notes } = req.body;
    if (!staffId) {
      return res.status(400).json({ success: false, error: 'staffId is required' });
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(dateStr);
    const attendanceStatus = status || 'present';

    const currentTimeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const finalClockIn = clockIn !== undefined ? clockIn : (attendanceStatus === 'present' ? currentTimeStr : null);
    const finalClockOut = clockOut !== undefined ? clockOut : null;

    const record = await prisma.staffAttendance.upsert({
      where: {
        restaurantId_staffId_date: {
          restaurantId,
          staffId: Number(staffId),
          date: targetDate,
        },
      },
      update: {
        status: attendanceStatus,
        clockIn: finalClockIn,
        clockOut: finalClockOut,
        shift: shift || 'Full Day',
        notes: notes || null,
      },
      create: {
        restaurantId,
        staffId: Number(staffId),
        date: targetDate,
        status: attendanceStatus,
        clockIn: finalClockIn,
        clockOut: finalClockOut,
        shift: shift || 'Full Day',
        notes: notes || null,
      },
    });

    return res.json({
      success: true,
      attendance: record,
      message: `Attendance marked as ${attendanceStatus}`,
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark attendance' });
  }
});

export default router;
