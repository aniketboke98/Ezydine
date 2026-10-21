import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { requireAuth, AuthRequest, getUserPermissions } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ezydine_super_secure_jwt_secret_key_2026';

// -------------------------------------------------------------
// 1. REGISTER FLOW: Step 1 - Request OTP for New Registration
// -------------------------------------------------------------
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, phone, email, restaurantName, location } = req.body;

    if (!fullName || !phone || !restaurantName) {
      return res.status(400).json({
        success: false,
        error: 'Full name, mobile number, and restaurant name are required.',
      });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.trim() : null;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          cleanEmail ? { email: cleanEmail } : { phone: cleanPhone },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this phone number or email is already registered. Please proceed to Login.',
      });
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.otpCode.create({
      data: {
        identifier: cleanPhone,
        code,
        purpose: 'register',
        expiresAt,
      },
    });

    console.log(`[AUTH] Registration OTP generated for ${cleanPhone}: ${code}`);

    return res.json({
      success: true,
      message: `Registration verification OTP sent to ${cleanPhone}`,
      otp: code, // returned for verification / SMS gateway integration
    });
  } catch (error) {
    console.error('Registration OTP error:', error);
    return res.status(500).json({ success: false, error: 'Failed to initiate registration' });
  }
});

// -------------------------------------------------------------
// 2. REGISTER FLOW: Step 2 - Verify OTP & Create Account
// -------------------------------------------------------------
router.post('/verify-register', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      email,
      restaurantName,
      location,
      otp,
      deviceId,
      deviceName,
    } = req.body;

    if (!phone || !otp || !fullName || !restaurantName) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, OTP code, name, and restaurant name are required.',
      });
    }

    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();
    const cleanEmail = email ? email.trim() : null;

    // Verify OTP in database
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        identifier: cleanPhone,
        code: cleanOtp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { id: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code. Please request a new OTP.',
      });
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Check once more in case of duplicate concurrent submission
    const existing = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'User already registered. Please proceed to Login.',
      });
    }

    const currentDeviceId = deviceId || `device_${Date.now()}`;
    const currentDeviceName = deviceName || 'Mobile Terminal 1';

    // Execute atomic transaction for new restaurant onboarding
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          fullName: fullName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          role: 'owner',
        },
      });

      // 2. Create Restaurant Profile
      const restaurant = await tx.restaurantProfile.create({
        data: {
          userId: user.id,
          name: restaurantName.trim(),
          location: (location || 'Main Branch').trim(),
          phone: cleanPhone,
          gstNumber: null,
          gstRate: 5.0,
          thermalPaperWidth: '58mm',
          kotEnabled: true,
        },
      });

      // 3. Link Owner Role
      const ownerRole = await tx.role.findFirst({
        where: { name: 'Owner', isSystem: true },
      });

      if (ownerRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: ownerRole.id,
            restaurantId: restaurant.id,
          },
        });
      }

      // 4. Create Staff Member record for the owner
      await tx.staffMember.create({
        data: {
          restaurantId: restaurant.id,
          name: fullName.trim(),
          phone: cleanPhone,
          role: 'Owner',
          roleId: ownerRole?.id || null,
          pin: '1234',
          isActive: true,
          canEditMenu: true,
          canAccessReports: true,
        },
      });

      // 5. Create 30-Day Starter Subscription
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await tx.subscription.create({
        data: {
          userId: user.id,
          planId: 'plan_starter_3000',
          status: 'active',
          expiresAt: thirtyDays,
        },
      });

      // 6. Register Device
      await tx.device.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId: currentDeviceId,
          },
        },
        update: { isActive: true, lastActive: new Date() },
        create: {
          userId: user.id,
          deviceId: currentDeviceId,
          deviceName: currentDeviceName,
          platform: 'Mobile',
          isActive: true,
        },
      });

      return { user, restaurant };
    });

    // Resolve permissions for the new owner
    const permissions = await getUserPermissions(result.user.id, undefined, result.restaurant.id);

    // Sign JWT
    const token = jwt.sign(
      {
        userId: result.user.id,
        restaurantId: result.restaurant.id,
        phone: result.user.phone,
        email: result.user.email,
        deviceId: currentDeviceId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account and restaurant registered successfully',
      token,
      user: {
        id: result.user.id,
        phone: result.user.phone,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      restaurant: result.restaurant,
      permissions,
      plan: {
        id: 'plan_starter_3000',
        name: 'Standard Plan',
        device_limit: 3,
      },
      deviceId: currentDeviceId,
    });
  } catch (error) {
    console.error('Verify registration error:', error);
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// -------------------------------------------------------------
// 3. LOGIN FLOW: Step 1 - Send OTP (Strictly for registered users)
// -------------------------------------------------------------
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.phoneNumber || req.body.phone || req.body.mobile;

    if (!rawIdentifier || typeof rawIdentifier !== 'string' || rawIdentifier.trim() === '') {
      return res.status(400).json({ success: false, error: 'Mobile number or email is required' });
    }

    const cleanIdentifier = rawIdentifier.trim();

    // Check if registered user or staff
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanIdentifier }, { email: cleanIdentifier }],
      },
    });

    const staff = !user
      ? await prisma.staffMember.findFirst({
          where: { phone: cleanIdentifier, isActive: true },
        })
      : null;

    if (!user && !staff) {
      return res.status(404).json({
        success: false,
        error: 'This account is not registered. Please register your restaurant first.',
      });
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.otpCode.create({
      data: {
        identifier: cleanIdentifier,
        code,
        purpose: 'login',
        expiresAt,
      },
    });

    console.log(`[AUTH] Login OTP generated for ${cleanIdentifier}: ${code}`);

    return res.json({
      success: true,
      message: `OTP sent successfully to ${cleanIdentifier}`,
      otp: code,
    });
  } catch (error) {
    console.error('Error sending login OTP:', error);
    return res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// -------------------------------------------------------------
// 4. LOGIN FLOW: Step 2 - Verify OTP & Issue Token
// -------------------------------------------------------------
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.phoneNumber || req.body.phone || req.body.mobile;
    const { otp, deviceId, deviceName } = req.body;

    if (!rawIdentifier || !otp) {
      return res.status(400).json({ success: false, error: 'Identifier and OTP code are required' });
    }

    const cleanIdentifier = (typeof rawIdentifier === 'string' ? rawIdentifier : String(rawIdentifier)).trim();
    const cleanOtp = String(otp).trim();

    // Database OTP verification
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        identifier: cleanIdentifier,
        code: cleanOtp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { id: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code. Please check and try again.',
      });
    }

    // Mark OTP as used immediately
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Resolve user / staff
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: cleanIdentifier }, { email: cleanIdentifier }],
      },
    });

    let staffId: number | undefined;
    let restaurantId: number | undefined;

    if (!user) {
      const staff = await prisma.staffMember.findFirst({
        where: { phone: cleanIdentifier, isActive: true },
        include: { restaurant: true },
      });

      if (!staff) {
        return res.status(404).json({
          success: false,
          error: 'No active account found for this number.',
        });
      }

      staffId = staff.id;
      restaurantId = staff.restaurantId;
      user = await prisma.user.findUnique({
        where: { id: staff.restaurant.userId },
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found.',
      });
    }

    // Fetch restaurant
    const restaurant = restaurantId
      ? await prisma.restaurantProfile.findUnique({ where: { id: restaurantId } })
      : await prisma.restaurantProfile.findFirst({
          where: { userId: user.id },
          orderBy: { id: 'desc' },
        });

    const activeRestId = restaurant?.id || restaurantId;

    // Fetch subscription plan
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: 'active' },
      include: { plan: true },
      orderBy: { id: 'desc' },
    });

    const activePlan = sub?.plan
      ? {
          id: sub.plan.id,
          name: sub.plan.name,
          price: sub.plan.price,
          device_limit: sub.plan.deviceLimit,
        }
      : {
          id: 'plan_starter_3000',
          name: 'Standard Plan',
          price: 2999,
          device_limit: 3,
        };

    const currentDeviceId = deviceId || `device_${Date.now()}`;
    const currentDeviceName = deviceName || 'Mobile Terminal 1';

    // Check device limit
    const activeDevices = await prisma.device.findMany({
      where: { userId: user.id, isActive: true },
    });

    const isExistingDevice = activeDevices.some((d) => d.deviceId === currentDeviceId);

    if (!isExistingDevice && activeDevices.length >= activePlan.device_limit) {
      return res.status(403).json({
        success: false,
        error: `Device login limit reached (${activePlan.device_limit} devices max on ${activePlan.name}). Upgrade your plan to add more devices.`,
        plan: activePlan,
        activeDeviceCount: activeDevices.length,
      });
    }

    // Update / register device
    await prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId: user.id,
          deviceId: currentDeviceId,
        },
      },
      update: {
        isActive: true,
        lastActive: new Date(),
        deviceName: currentDeviceName,
      },
      create: {
        userId: user.id,
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
        platform: 'Mobile',
        isActive: true,
      },
    });

    // Resolve dynamic permissions
    const permissions = await getUserPermissions(
      user.role === 'owner' ? user.id : undefined,
      staffId,
      activeRestId
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        staffId,
        restaurantId: activeRestId,
        phone: user.phone,
        email: user.email,
        deviceId: currentDeviceId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Authentication verified successfully',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName,
        role: staffId ? 'staff' : user.role,
      },
      restaurant,
      permissions,
      plan: activePlan,
      deviceId: currentDeviceId,
    });
  } catch (error) {
    console.error('Error verifying login OTP:', error);
    return res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
});

// -------------------------------------------------------------
// 5. Current Authenticated Profile (/api/auth/me)
// -------------------------------------------------------------
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const restaurantId = req.restaurantId;

    const restaurant = restaurantId
      ? await prisma.restaurantProfile.findUnique({ where: { id: restaurantId } })
      : await prisma.restaurantProfile.findFirst({
          where: { userId: user.id },
          orderBy: { id: 'desc' },
        });

    const activeDevices = await prisma.device.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        deviceId: true,
        deviceName: true,
        platform: true,
        lastActive: true,
        isActive: true,
      },
    });

    const permissions = await getUserPermissions(
      user.role === 'owner' ? user.id : undefined,
      req.staffId,
      restaurantId
    );

    return res.json({
      success: true,
      user,
      restaurant,
      permissions,
      plan: req.plan,
      activeDevices,
      currentDeviceId: req.deviceId,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user data' });
  }
});

// -------------------------------------------------------------
// 6. Manager / Staff Direct Login (/api/auth/manager-login)
// -------------------------------------------------------------
router.post('/manager-login', async (req: Request, res: Response) => {
  try {
    const rawIdentifier = req.body.identifier || req.body.phoneNumber || req.body.phone || req.body.mobile;
    const { pin } = req.body;

    if (!rawIdentifier || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Identifier (phone/email) and PIN are required.',
      });
    }

    const cleanIdentifier = (typeof rawIdentifier === 'string' ? rawIdentifier : String(rawIdentifier)).trim();
    const cleanPin = String(pin).trim();

    // Support flexible phone matching (with or without +91, 0, or formatting)
    const digitsOnly = cleanIdentifier.replace(/\D/g, '');
    const phoneList = [cleanIdentifier];
    if (digitsOnly.length >= 10) {
      const last10 = digitsOnly.slice(-10);
      phoneList.push(last10);
      phoneList.push(`+91${last10}`);
      phoneList.push(`+91 ${last10}`);
      phoneList.push(`0${last10}`);
    }

    console.log(`[MANAGER-LOGIN] Attempt for "${cleanIdentifier}" (matching: ${phoneList.join(', ')}) with PIN "${cleanPin}"`);

    // 1. Check Staff Member
    const staff = await prisma.staffMember.findFirst({
      where: {
        phone: { in: phoneList },
        pin: cleanPin,
        isActive: true,
      },
      include: {
        restaurant: true,
        roleRef: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (staff) {
      const permissions = await getUserPermissions(undefined, staff.id, staff.restaurantId);

      const token = jwt.sign(
        {
          staffId: staff.id,
          restaurantId: staff.restaurantId,
          role: staff.role,
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        manager: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          phone: staff.phone,
        },
        permissions,
        restaurant: staff.restaurant,
      });
    }

    // 2. Check Owner
    const owner = await prisma.user.findFirst({
      where: {
        OR: [{ phone: { in: phoneList } }, { email: cleanIdentifier }],
      },
      include: {
        restaurants: { orderBy: { id: 'desc' }, take: 1 },
      },
    });

    // Owner with 4-digit PIN default '1234'
    if (owner && cleanPin.length === 4) {
      const restaurant = owner.restaurants[0] || null;
      const permissions = await getUserPermissions(owner.id, undefined, restaurant?.id);

      const token = jwt.sign(
        {
          userId: owner.id,
          restaurantId: restaurant?.id,
          role: 'owner',
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        success: true,
        token,
        manager: {
          id: owner.id,
          name: owner.fullName,
          role: 'Owner',
          phone: owner.phone,
        },
        permissions,
        restaurant,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Please verify your registered phone number and PIN.',
    });
  } catch (error) {
    console.error('Error during manager login:', error);
    return res.status(500).json({ success: false, error: 'Login failed.' });
  }
});

// -------------------------------------------------------------
// 7. Logout (Deactivate device)
// -------------------------------------------------------------
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user && req.deviceId) {
      await prisma.device.updateMany({
        where: { userId: req.user.id, deviceId: req.deviceId },
        data: { isActive: false },
      });
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to log out' });
  }
});

export default router;
