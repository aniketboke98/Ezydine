import { Router, Response } from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all menu items for the authenticated restaurant
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;

    const result = await query(`
      SELECT id, name, category, price, is_veg as "isVeg", is_available as "isAvailable", description, image_url as "image"
      FROM menu_items
      WHERE restaurant_id = $1
      ORDER BY category ASC, name ASC
    `, [restaurantId]);

    return res.json({
      success: true,
      items: result.rows,
      restaurantId,
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
  }
});

// Toggle menu item availability
router.patch('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;

    const result = await query(`
      UPDATE menu_items
      SET is_available = NOT is_available
      WHERE id = $1 AND restaurant_id = $2
      RETURNING id, name, category, price, is_veg as "isVeg", is_available as "isAvailable", image_url as "image"
    `, [id, restaurantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    return res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to toggle availability' });
  }
});

// Add new menu item for authenticated restaurant
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.restaurantId || (req.restaurant && req.restaurant.id) || 1;
    const { name, category, price, isVeg, description, image, imageUrl } = req.body;
    const activeImage = image || imageUrl || '';

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name, category, and price are required' });
    }

    const result = await query(`
      INSERT INTO menu_items (restaurant_id, name, category, price, is_veg, is_available, description, image_url)
      VALUES ($1, $2, $3, $4, $5, true, $6, $7)
      RETURNING id, name, category, price, is_veg as "isVeg", is_available as "isAvailable", description, image_url as "image"
    `, [restaurantId, name, category, price, isVeg ?? true, description || '', activeImage]);

    return res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error adding menu item:', error);
    return res.status(500).json({ success: false, error: 'Failed to add menu item' });
  }
});

export default router;
