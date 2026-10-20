import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'ezydine_super_secure_jwt_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    phone: string;
    email: string | null;
    full_name: string;
    role: string;
  };
  staffId?: number;
  restaurantId?: number;
  restaurant?: any;
  deviceId?: string;
  permissions?: string[];
  plan?: {
    id: string;
    name: string;
    device_limit: number;
  };
}

export async function getUserPermissions(
  userId?: number,
  staffId?: number,
  restaurantId?: number
): Promise<string[]> {
  try {
    // If staff member, resolve their assigned role's permissions
    if (staffId) {
      const staff = await prisma.staffMember.findUnique({
        where: { id: staffId },
        include: {
          roleRef: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!staff) return [];

      // Check if roleRef has mapped permissions
      if (staff.roleRef?.rolePermissions) {
        const perms = staff.roleRef.rolePermissions.map((rp) => rp.permission.code);
        if (perms.length > 0) return perms;
      }

      // Fallback to role name lookup
      const roleName = staff.role;
      const matchedRole = await prisma.role.findFirst({
        where: {
          name: { equals: roleName, mode: 'insensitive' },
          OR: [{ restaurantId: restaurantId || null }, { isSystem: true }],
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      if (matchedRole?.rolePermissions) {
        return matchedRole.rolePermissions.map((rp) => rp.permission.code);
      }
    }

    // If owner / main user:
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            where: restaurantId ? { restaurantId } : undefined,
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) return [];

      // If user has 'owner' role or userRoles, collect permissions
      if (user.role.toLowerCase() === 'owner') {
        // Owners possess all permissions
        const all = await prisma.permission.findMany({ select: { code: true } });
        return all.map((p) => p.code);
      }

      const permissionSet = new Set<string>();
      for (const ur of user.userRoles) {
        for (const rp of ur.role.rolePermissions) {
          permissionSet.add(rp.permission.code);
        }
      }

      return Array.from(permissionSet);
    }

    return [];
  } catch (err) {
    console.error('Error resolving user permissions:', err);
    return [];
  }
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
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          phone: dbUser.phone,
          email: dbUser.email,
          full_name: dbUser.fullName,
          role: dbUser.role,
        };
      }
    }

    if (!user && staffId) {
      const staff = await prisma.staffMember.findUnique({
        where: { id: staffId },
      });
      if (staff && staff.isActive) {
        user = {
          id: staff.id,
          phone: staff.phone,
          email: null,
          full_name: staff.name,
          role: staff.role.toLowerCase(),
        };
        resolvedRestId = staff.restaurantId;
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account not found or deactivated. Please sign in again.',
      });
    }

    // Resolve restaurant
    let restaurant: any = null;
    if (resolvedRestId) {
      restaurant = await prisma.restaurantProfile.findUnique({
        where: { id: resolvedRestId },
      });
    } else {
      restaurant = await prisma.restaurantProfile.findFirst({
        where: { userId: user.id },
        orderBy: { id: 'desc' },
      });
      if (restaurant) resolvedRestId = restaurant.id;
    }

    // Fetch subscription plan
    const sub = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'active',
      },
      include: { plan: true },
      orderBy: { id: 'desc' },
    });

    const plan = sub?.plan
      ? {
          id: sub.plan.id,
          name: sub.plan.name,
          device_limit: sub.plan.deviceLimit,
        }
      : {
          id: 'plan_starter_3000',
          name: 'Standard Plan',
          device_limit: 3,
        };

    // Keep device activity updated
    if (deviceId && user.id) {
      try {
        await prisma.device.updateMany({
          where: { userId: user.id, deviceId },
          data: { lastActive: new Date(), isActive: true },
        });
      } catch {
        // Non-blocking device ping
      }
    }

    // Resolve dynamic permissions
    const permissions = await getUserPermissions(
      user.role === 'owner' ? user.id : undefined,
      staffId,
      resolvedRestId
    );

    req.user = user;
    req.staffId = staffId;
    req.restaurantId = resolvedRestId;
    req.restaurant = restaurant;
    req.deviceId = deviceId;
    req.permissions = permissions;
    req.plan = plan;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, error: 'Internal server authentication error' });
  }
}

// Granular RBAC Permission Middleware
export function requirePermission(permissionCode: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Owner role automatically bypasses granular restriction
    if (req.user.role?.toLowerCase() === 'owner') {
      return next();
    }

    const perms = req.permissions || [];
    if (!perms.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        error: `Permission denied: Requires permission '${permissionCode}'`,
        requiredPermission: permissionCode,
      });
    }

    next();
  };
}
