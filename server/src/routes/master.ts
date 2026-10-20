import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ezydine_super_secure_jwt_secret_key_2026';

// 1. GET App Requested OTPs
router.get('/otps', async (req: Request, res: Response) => {
  try {
    const otps = await prisma.otpCode.findMany({
      orderBy: { id: 'desc' },
      take: 50,
    });

    const now = new Date();
    const formatted = otps.map((o) => {
      let status = 'ACTIVE';
      if (o.used) status = 'USED';
      else if (new Date(o.expiresAt) <= now) status = 'EXPIRED';

      return {
        id: o.id,
        phone: o.identifier,
        otpCode: o.code,
        purpose: o.purpose,
        used: o.used,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
        requestedAt: new Date(o.createdAt).toLocaleString('en-US'),
        status,
      };
    });

    return res.json({
      success: true,
      totalRequested: formatted.length,
      otps: formatted,
    });
  } catch (error) {
    console.error('Error fetching requested OTPs:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch requested OTPs' });
  }
});

// 2. POST Master Create App Login
router.post('/create-app-login', async (req: Request, res: Response) => {
  try {
    const { phone, fullName, restaurantName, location, pin, planId } = req.body;

    if (!phone || !fullName || !restaurantName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, Owner Full Name, and Restaurant Name are required.',
      });
    }

    const cleanPhone = phone.trim();
    const cleanName = fullName.trim();
    const cleanRestName = restaurantName.trim();
    const cleanLocation = (location || 'Main Street, City').trim();
    const cleanPin = (pin || '1234').trim();
    const cleanPlanId = planId || 'plan_starter_3000';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert User
      const user = await tx.user.upsert({
        where: { phone: cleanPhone },
        update: { fullName: cleanName },
        create: {
          phone: cleanPhone,
          fullName: cleanName,
          role: 'owner',
        },
      });

      // 2. Create or Update Restaurant
      let restaurant = await tx.restaurantProfile.findFirst({
        where: { userId: user.id },
        orderBy: { id: 'desc' },
      });

      if (restaurant) {
        restaurant = await tx.restaurantProfile.update({
          where: { id: restaurant.id },
          data: {
            name: cleanRestName,
            location: cleanLocation,
            phone: cleanPhone,
          },
        });
      } else {
        restaurant = await tx.restaurantProfile.create({
          data: {
            userId: user.id,
            name: cleanRestName,
            location: cleanLocation,
            phone: cleanPhone,
          },
        });
      }

      // 3. Link Owner Role
      const ownerRole = await tx.role.findFirst({
        where: { name: 'Owner', isSystem: true },
      });

      if (ownerRole) {
        await tx.userRole.upsert({
          where: {
            userId_roleId_restaurantId: {
              userId: user.id,
              roleId: ownerRole.id,
              restaurantId: restaurant.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: ownerRole.id,
            restaurantId: restaurant.id,
          },
        });
      }

      // 4. Create Staff Member entry
      await tx.staffMember.upsert({
        where: {
          restaurantId_phone: {
            restaurantId: restaurant.id,
            phone: cleanPhone,
          },
        },
        update: { name: cleanName, pin: cleanPin },
        create: {
          restaurantId: restaurant.id,
          name: cleanName,
          phone: cleanPhone,
          role: 'Owner',
          roleId: ownerRole?.id || null,
          pin: cleanPin,
          isActive: true,
          canEditMenu: true,
          canAccessReports: true,
        },
      });

      // 5. Create Subscription
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const amountPaid = cleanPlanId === 'plan_growth_6000' ? 5999 : 2999;

      await tx.subscription.create({
        data: {
          userId: user.id,
          planId: cleanPlanId,
          status: 'active',
          expiresAt,
          amountPaid,
        },
      });

      return { user, restaurant };
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        phone: result.user.phone,
        restaurantId: result.restaurant.id,
        role: 'owner',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: `App login created successfully for ${cleanName} (${cleanRestName})!`,
      appLogin: {
        userId: result.user.id,
        phone: cleanPhone,
        fullName: cleanName,
        restaurantName: cleanRestName,
        location: cleanLocation,
        initialPin: cleanPin,
        planId: cleanPlanId,
        token,
      },
    });
  } catch (error) {
    console.error('Error creating app login:', error);
    return res.status(500).json({ success: false, error: 'Failed to create app login' });
  }
});

// 3. GET All Registered App Logins
router.get('/app-logins', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        restaurants: { orderBy: { id: 'desc' }, take: 1 },
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          orderBy: { id: 'desc' },
          take: 1,
        },
        devices: { where: { isActive: true } },
      },
      orderBy: { id: 'desc' },
    });

    const logins = users.map((u) => {
      const rest = u.restaurants[0];
      const sub = u.subscriptions[0];

      return {
        userId: u.id,
        phone: u.phone,
        fullName: u.fullName,
        role: u.role,
        restaurantId: rest?.id || 0,
        restaurantName: rest?.name || 'Unassigned',
        location: rest?.location || '-',
        planName: sub?.plan.name || 'Standard Plan',
        deviceLimit: sub?.plan.deviceLimit || 3,
        activeDevices: u.devices.length,
        createdAt: new Date(u.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
    });

    return res.json({
      success: true,
      totalLogins: logins.length,
      logins,
    });
  } catch (error) {
    console.error('Error fetching app logins:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch app logins' });
  }
});

// 4. DELETE App Login
router.delete('/app-logins/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({
      success: true,
      message: `Account for ${user.fullName} (${user.phone}) deleted successfully.`,
    });
  } catch (error) {
    console.error('Error removing app login:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove account' });
  }
});

export default router;
