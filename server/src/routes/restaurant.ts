import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET restaurant profile
router.get('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await query(
      `SELECT id, name, location, phone, gst_number as "gstNumber",
              gst_rate as "gstRate", fssai, thermal_paper_width as "thermalPaperWidth",
              kot_enabled as "kotEnabled", logo_url as "logoUrl"
       FROM restaurant_profile
       WHERE user_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

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
    const { name, location, phone, gstNumber, gstRate, thermalPaperWidth, kotEnabled, logoUrl, logo } = req.body;
    const activeLogo = logoUrl || logo;

    const result = await query(`
      UPDATE restaurant_profile
      SET name = COALESCE($1, name),
          location = COALESCE($2, location),
          phone = COALESCE($3, phone),
          gst_number = COALESCE($4, gst_number),
          gst_rate = COALESCE($5, gst_rate),
          thermal_paper_width = COALESCE($6, thermal_paper_width),
          kot_enabled = COALESCE($7, kot_enabled),
          logo_url = COALESCE($8, logo_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $9
      RETURNING id, name, location, phone, gst_number as "gstNumber",
                gst_rate as "gstRate", fssai, thermal_paper_width as "thermalPaperWidth",
                kot_enabled as "kotEnabled", logo_url as "logoUrl"
    `, [name, location, phone, gstNumber, gstRate, thermalPaperWidth, kotEnabled, activeLogo, userId]);

    return res.json({ success: true, profile: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update restaurant profile' });
  }
});

export default router;
