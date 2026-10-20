import { Router, Response } from 'express';
import prisma from '../db/prisma';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// GET restaurant profile
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const targetRestId = req.restaurantId || (req.restaurant && req.restaurant.id);

    let profile = null;
    if (targetRestId) {
      profile = await prisma.restaurantProfile.findUnique({
        where: { id: targetRestId },
      });
    } else {
      profile = await prisma.restaurantProfile.findFirst({
        where: { userId },
        orderBy: { id: 'desc' },
      });
    }

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Restaurant profile not found' });
    }

    const formatted = {
      id: profile.id,
      name: profile.name,
      location: profile.location,
      phone: profile.phone,
      gstNumber: profile.gstNumber,
      gstRate: Number(profile.gstRate),
      fssai: profile.fssai,
      thermalPaperWidth: profile.thermalPaperWidth,
      kotEnabled: profile.kotEnabled,
      logoUrl: profile.logoUrl,
    };

    return res.json({ success: true, profile: formatted, restaurant: formatted });
  } catch (error) {
    console.error('Error fetching restaurant profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch restaurant profile' });
  }
});

// Update restaurant settings (printer width, GST, KOT toggle, logo)
router.put('/profile', requireAuth, requirePermission('MANAGE_SETTINGS'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let targetRestId = req.restaurantId || (req.restaurant && req.restaurant.id);

    if (!targetRestId) {
      const existing = await prisma.restaurantProfile.findFirst({
        where: { userId },
        orderBy: { id: 'desc' },
      });
      if (existing) targetRestId = existing.id;
    }

    if (!targetRestId) {
      return res.status(404).json({ success: false, error: 'Restaurant profile not found' });
    }

    const { name, location, phone, gstNumber, gstRate, thermalPaperWidth, kotEnabled, logoUrl, logo } = req.body;
    const activeLogo = logoUrl !== undefined ? logoUrl : (logo !== undefined ? logo : undefined);

    const updated = await prisma.restaurantProfile.update({
      where: { id: targetRestId },
      data: {
        name: name !== undefined ? name : undefined,
        location: location !== undefined ? location : undefined,
        phone: phone !== undefined ? phone : undefined,
        gstNumber: gstNumber !== undefined ? gstNumber : undefined,
        gstRate: gstRate !== undefined ? Number(gstRate) : undefined,
        thermalPaperWidth: thermalPaperWidth !== undefined ? thermalPaperWidth : undefined,
        kotEnabled: kotEnabled !== undefined ? Boolean(kotEnabled) : undefined,
        logoUrl: activeLogo !== undefined ? activeLogo : undefined,
      },
    });

    const formatted = {
      id: updated.id,
      name: updated.name,
      location: updated.location,
      phone: updated.phone,
      gstNumber: updated.gstNumber,
      gstRate: Number(updated.gstRate),
      fssai: updated.fssai,
      thermalPaperWidth: updated.thermalPaperWidth,
      kotEnabled: updated.kotEnabled,
      logoUrl: updated.logoUrl,
    };

    return res.json({ success: true, profile: formatted, restaurant: formatted });
  } catch (error) {
    console.error('Error updating restaurant profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update restaurant profile' });
  }
});

export default router;
