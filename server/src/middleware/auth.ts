import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'ezydine_super_secure_jwt_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    phone: string;
    email: string;
    full_name: string;
    role: string;
  };
  restaurantId?: number;
  restaurant?: any;
  deviceId?: string;
  plan?: {
    id: string;
    name: string;
    device_limit: number;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Without an auth token, access is restricted.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token. Please sign in again.',
      });
    }

    const { userId, deviceId, restaurantId, staffId } = decoded;

    let user: any = null;
    let resolvedRestId = restaurantId;

    if (userId) {
      const userResult = await query(
        'SELECT id, phone, email, full_name, role FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      }
    }

    if (!user && staffId) {
      const staffRes = await query('SELECT * FROM staff_members WHERE id = $1', [staffId]);
      if (staffRes.rows.length > 0) {
        const s = staffRes.rows[0];
        user = { id: s.id, phone: s.phone, email: '', full_name: s.name, role: s.role.toLowerCase() };
        resolvedRestId = s.restaurant_id;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or account deactivated.',
      });
    }

    // Resolve restaurant
    let restaurant: any = null;
    if (resolvedRestId) {
      const restRes = await query('SELECT * FROM restaurant_profile WHERE id = $1', [resolvedRestId]);
      restaurant = restRes.rows[0] || null;
    } else {
      const restRes = await query('SELECT * FROM restaurant_profile WHERE user_id = $1 LIMIT 1', [user.id]);
      restaurant = restRes.rows[0] || null;
      if (restaurant) resolvedRestId = restaurant.id;
    }

    // Verify active plan
    const subResult = await query(`
      SELECT s.id as sub_id, s.status, s.expires_at, p.id as plan_id, p.name as plan_name, p.device_limit
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.id DESC LIMIT 1
    `, [user.id]);

    const plan = subResult.rows[0]
      ? {
          id: subResult.rows[0].plan_id,
          name: subResult.rows[0].plan_name,
          device_limit: subResult.rows[0].device_limit,
        }
      : {
          id: 'plan_starter_3000',
          name: 'Standard Plan',
          device_limit: 3,
        };

    // Verify device active status in DB
    if (deviceId && user.id) {
      await query(
        `UPDATE devices SET last_active = CURRENT_TIMESTAMP WHERE user_id = $1 AND device_id = $2`,
        [user.id, deviceId]
      );
    }

    req.user = user;
    req.restaurantId = resolvedRestId;
    req.restaurant = restaurant;
    req.deviceId = deviceId;
    req.plan = plan;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, error: 'Internal server authentication error' });
  }
}
