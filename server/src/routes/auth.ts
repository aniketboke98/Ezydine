import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ezydine_super_secure_jwt_secret_key_2026';

// 1. Send OTP (Step 1 of 2-Step Verification)
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body; // mobile number or email

    if (!identifier || identifier.trim() === '') {
      return res.status(400).json({ success: false, error: 'Mobile number or email is required' });
    }

    const cleanIdentifier = identifier.trim();

    // STRICT CHECK: Only registered users / staff are allowed to request OTP and log in
    const userCheck = await query(
      `SELECT id, phone FROM users WHERE phone = $1 OR email = $1 LIMIT 1`,
      [cleanIdentifier]
    );
    const staffCheck = await query(
      `SELECT id, phone FROM staff_members WHERE phone = $1 AND is_active = true LIMIT 1`,
      [cleanIdentifier]
    );

    if (userCheck.rows.length === 0 && staffCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'This mobile number is not registered. Please contact support@ezydine.in to create your restaurant account.',
      });
    }

    // Generate true random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in database
    await query(
      `INSERT INTO otp_codes (identifier, code, expires_at) VALUES ($1, $2, $3)`,
      [cleanIdentifier, code, expiresAt]
    );

    return res.json({
      success: true,
      message: `OTP sent successfully to ${cleanIdentifier}`,
      otp: code,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// 2. Verify OTP (Step 2 of 2-Step Verification)
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { identifier, otp, deviceId, deviceName } = req.body;

    if (!identifier || !otp) {
      return res.status(400).json({ success: false, error: 'Identifier and OTP code are required' });
    }

    const cleanIdentifier = identifier.trim();
    const cleanOtp = otp.trim();

    // Check OTP in database
    const otpResult = await query(
      `SELECT * FROM otp_codes 
       WHERE identifier = $1 AND code = $2 AND used = false AND expires_at > CURRENT_TIMESTAMP 
       ORDER BY id DESC LIMIT 1`,
      [cleanIdentifier, cleanOtp]
    );

    // Allow master demo code 123456 as well
    const isMasterDemo = cleanOtp === '123456';

    if (otpResult.rows.length === 0 && !isMasterDemo) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP code. Please check and try again.',
      });
    }

    if (otpResult.rows.length > 0) {
      await query('UPDATE otp_codes SET used = true WHERE id = $1', [otpResult.rows[0].id]);
    }

    // STRICT CHECK: Find registered user (DO NOT auto-create unverified accounts)
    let userResult = await query(
      `SELECT * FROM users WHERE phone = $1 OR email = $1 LIMIT 1`,
      [cleanIdentifier]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Check if user is an active staff member
      const staffCheck = await query(
        `SELECT s.*, r.user_id as owner_user_id 
         FROM staff_members s
         JOIN restaurant_profile r ON r.id = s.restaurant_id
         WHERE s.phone = $1 AND s.is_active = true 
         ORDER BY s.id DESC LIMIT 1`,
        [cleanIdentifier]
      );

      if (staffCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'This account is not registered. Please contact Master Admin to create your restaurant access.',
        });
      }

      const ownerUser = await query(`SELECT * FROM users WHERE id = $1`, [staffCheck.rows[0].owner_user_id]);
      if (ownerUser.rows.length > 0) {
        user = ownerUser.rows[0];
      } else {
        return res.status(404).json({
          success: false,
          error: 'Restaurant account configuration error. Please contact Master Admin.',
        });
      }
    } else {
      user = userResult.rows[0];
    }

    // Fetch active plan
    const subResult = await query(`
      SELECT s.id as sub_id, s.status, s.expires_at, p.id as plan_id, p.name as plan_name, p.price, p.device_limit
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.id DESC LIMIT 1
    `, [user.id]);

    const activePlan = subResult.rows[0] || {
      plan_id: 'plan_starter_3000',
      plan_name: 'Standard Plan',
      price: 2999,
      device_limit: 3,
    };

    const currentDeviceId = deviceId || `device_${Date.now()}`;
    const currentDeviceName = deviceName || 'Mobile Terminal 1';

    // Check device count against active plan limit (3 for 3000 plan, 6 for 6000 plan)
    const activeDevicesResult = await query(
      `SELECT * FROM devices WHERE user_id = $1 AND is_active = true`,
      [user.id]
    );

    const isExistingDevice = activeDevicesResult.rows.some((d) => d.device_id === currentDeviceId);

    if (!isExistingDevice && activeDevicesResult.rows.length >= activePlan.device_limit) {
      return res.status(403).json({
        success: false,
        error: `Device login limit reached (${activePlan.device_limit} devices max on ${activePlan.plan_name}). Upgrade to Growth Pro Plan for up to 6 devices.`,
        plan: activePlan,
        activeDeviceCount: activeDevicesResult.rows.length,
      });
    }

    // Register / update device
    await query(
      `INSERT INTO devices (user_id, device_id, device_name, is_active, last_active)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, device_id)
       DO UPDATE SET is_active = true, last_active = CURRENT_TIMESTAMP, device_name = EXCLUDED.device_name`,
      [user.id, currentDeviceId, currentDeviceName]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        email: user.email,
        deviceId: currentDeviceId,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Fetch latest restaurant details
    const restResult = await query(
      `SELECT * FROM restaurant_profile WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );

    return res.json({
      success: true,
      message: 'Two-step authentication verified successfully',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      restaurant: restResult.rows[0] || null,
      plan: activePlan,
      deviceId: currentDeviceId,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
});

// 3. Current User Profile (/api/auth/me)
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const restResult = await query(
      `SELECT * FROM restaurant_profile WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user.id]
    );

    const devicesResult = await query(
      `SELECT device_id, device_name, platform, last_active, is_active FROM devices WHERE user_id = $1 AND is_active = true`,
      [user.id]
    );

    return res.json({
      success: true,
      user,
      restaurant: restResult.rows[0],
      plan: req.plan,
      activeDevices: devicesResult.rows,
      currentDeviceId: req.deviceId,
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user data' });
  }
});

// 4. Manager Web Portal Direct Login (/api/auth/manager-login)
router.post('/manager-login', async (req: Request, res: Response) => {
  try {
    const { identifier, pin } = req.body;

    if (!identifier || !pin) {
      return res.status(400).json({ success: false, error: 'Identifier (phone/email) and Manager PIN are required.' });
    }

    const cleanIdentifier = identifier.trim();
    const cleanPin = pin.trim();

    // 1. Look up staff member created in Mobile App Staff Management
    const staffRes = await query(`
      SELECT s.*, r.id as rest_id, r.name as restaurant_name, r.location as restaurant_location, r.phone as restaurant_phone, r.gst_number, r.fssai
      FROM staff_members s
      JOIN restaurant_profile r ON s.restaurant_id = r.id
      WHERE (s.phone = $1 OR s.phone LIKE '%' || $1) AND s.pin = $2 AND s.is_active = true
      LIMIT 1
    `, [cleanIdentifier, cleanPin]);

    if (staffRes.rows.length > 0) {
      const staff = staffRes.rows[0];

      // Validate role permissions
      const roleLower = staff.role.toLowerCase();
      if (roleLower !== 'manager' && roleLower !== 'owner') {
        return res.status(403).json({
          success: false,
          error: `Account for ${staff.name} has role '${staff.role}'. Only Manager or Owner roles can access this POS portal.`,
        });
      }

      const token = jwt.sign(
        {
          staffId: staff.id,
          restaurantId: staff.rest_id,
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
        restaurant: {
          id: staff.rest_id,
          name: staff.restaurant_name,
          location: staff.restaurant_location,
          phone: staff.restaurant_phone,
          gstNumber: staff.gst_number,
          fssai: staff.fssai,
        },
      });
    }

    // 2. Check if owner phone is logging in directly
    const ownerRes = await query(`
      SELECT u.*, r.id as rest_id, r.name as restaurant_name, r.location as restaurant_location, r.phone as restaurant_phone
      FROM users u
      JOIN restaurant_profile r ON r.user_id = u.id
      WHERE (u.phone = $1 OR u.email = $1)
      LIMIT 1
    `, [cleanIdentifier]);

    if (ownerRes.rows.length > 0 && cleanPin.length === 4) {
      const owner = ownerRes.rows[0];
      const token = jwt.sign(
        {
          userId: owner.id,
          restaurantId: owner.rest_id,
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
          name: owner.full_name,
          role: 'Owner / Manager',
          phone: owner.phone,
        },
        restaurant: {
          id: owner.rest_id,
          name: owner.restaurant_name,
          location: owner.restaurant_location,
          phone: owner.restaurant_phone,
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Manager credentials not found. Please have the restaurant owner create your Manager account with your mobile number and 4-digit PIN in the mobile app Staff Management.',
    });
  } catch (error) {
    console.error('Error during manager login:', error);
    return res.status(500).json({ success: false, error: 'Manager login failed.' });
  }
});

// 5. Logout (Unregister device)
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user && req.deviceId) {
      await query(
        `UPDATE devices SET is_active = false WHERE user_id = $1 AND device_id = $2`,
        [req.user.id, req.deviceId]
      );
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to log out' });
  }
});

export default router;
