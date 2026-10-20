import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET restaurant profile
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const targetRestId = req.restaurantId || (req.restaurant && req.restaurant.id);

    let result;
    if (targetRestId) {
      result = await query(
        `SELECT id, name, location, phone, gst_number as "gstNumber",
                gst_rate as "gstRate", fssai, thermal_paper_width as "thermalPaperWidth",
                kot_enabled as "kotEnabled", logo_url as "logoUrl"
         FROM restaurant_profile
         WHERE id = $1`,
        [targetRestId]
      );
    } else {
      result = await query(
        `SELECT id, name, location, phone, gst_number as "gstNumber",
                gst_rate as "gstRate", fssai, thermal_paper_width as "thermalPaperWidth",
                kot_enabled as "kotEnabled", logo_url as "logoUrl"
         FROM restaurant_profile
         WHERE user_id = $1
         ORDER BY id DESC
         LIMIT 1`,
        [userId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Restaurant profile not found' });
    }

    return res.json({ success: true, profile: result.rows[0], restaurant: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch restaurant profile' });
  }
});

// Update restaurant settings (printer width, GST, KOT toggle, logo)
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let targetRestId = req.restaurantId || (req.restaurant && req.restaurant.id);

    if (!targetRestId) {
      const existing = await query(
        `SELECT id FROM restaurant_profile WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
        [userId]
      );
      if (existing.rows.length > 0) {
        targetRestId = existing.rows[0].id;
      }
    }

    if (!targetRestId) {
      return res.status(404).json({ success: false, error: 'Restaurant profile not found' });
    }

    const { name, location, phone, gstNumber, gstRate, thermalPaperWidth, kotEnabled, logoUrl, logo } = req.body;
    const activeLogo = logoUrl !== undefined ? logoUrl : (logo !== undefined ? logo : null);

    const result = await query(`
      UPDATE restaurant_profile
      SET name = COALESCE($1, name),
          location = COALESCE($2, location),
          phone = COALESCE($3, phone),
          gst_number = COALESCE($4, gst_number),
          gst_rate = CASE WHEN $5 IS NOT NULL THEN $5::numeric ELSE gst_rate END,
          thermal_paper_width = COALESCE($6, thermal_paper_width),
          kot_enabled = CASE WHEN $7 IS NOT NULL THEN $7::boolean ELSE kot_enabled END,
          logo_url = CASE WHEN $8 IS NOT NULL THEN $8 ELSE logo_url END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING id, name, location, phone, gst_number as "gstNumber",
                gst_rate as "gstRate", fssai, thermal_paper_width as "thermalPaperWidth",
                kot_enabled as "kotEnabled", logo_url as "logoUrl"
    `, [
      name ?? null,
      location ?? null,
      phone ?? null,
      gstNumber ?? null,
      gstRate !== undefined ? gstRate : null,
      thermalPaperWidth ?? null,
      kotEnabled !== undefined ? kotEnabled : null,
      activeLogo,
      targetRestId
    ]);

    return res.json({ success: true, profile: result.rows[0], restaurant: result.rows[0] });
  } catch (error) {
    console.error('Error updating restaurant profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update restaurant profile' });
  }
});

export default router;
