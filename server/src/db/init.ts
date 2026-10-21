import { pool } from './index';

export async function initializeDatabase() {
  console.log('🔄 Initializing EzyDine Multi-Tenant PostgreSQL database schema...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(100),
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. OTP Codes table for 2-step verification
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(100) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price INTEGER NOT NULL,
        duration VARCHAR(20) DEFAULT 'monthly',
        device_limit INTEGER NOT NULL,
        tagline VARCHAR(150),
        popular BOOLEAN DEFAULT false,
        features JSONB NOT NULL
      );
    `);

    // 4. Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(50) REFERENCES plans(id),
        status VARCHAR(20) DEFAULT 'active',
        starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        amount_paid INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Subscription Payments history
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(50) REFERENCES plans(id),
        plan_name VARCHAR(100) NOT NULL,
        amount INTEGER NOT NULL,
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        payment_method VARCHAR(50) DEFAULT 'UPI / Card',
        status VARCHAR(20) DEFAULT 'SUCCESS',
        invoice_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Active Devices tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(150) NOT NULL,
        device_name VARCHAR(100) NOT NULL,
        platform VARCHAR(50) DEFAULT 'Mobile',
        ip_address VARCHAR(50),
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE (user_id, device_id)
      );
    `);

    // 7. Restaurant Profile (Tenant Root)
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_profile (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(200) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        gst_number VARCHAR(50),
        gst_rate NUMERIC(5,2) DEFAULT 5.0,
        fssai VARCHAR(50),
        thermal_paper_width VARCHAR(10) DEFAULT '58mm',
        kot_enabled BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Staff Members table (Multi-Tenant Staff & Manager accounts created from Mobile App)
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_members (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL,
        pin VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        can_edit_menu BOOLEAN DEFAULT false,
        can_access_reports BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (restaurant_id, phone)
      );
    `);

    // 9. Tables (linked to restaurant_profile)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tables (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE,
        table_number VARCHAR(10) NOT NULL,
        status VARCHAR(20) DEFAULT 'available',
        seats INTEGER DEFAULT 4,
        section VARCHAR(50) DEFAULT 'Dine-In',
        active_time VARCHAR(50),
        active_amount NUMERIC(10,2) DEFAULT 0,
        guest_count INTEGER DEFAULT 0
      );
    `);

    // Add restaurant_id column to tables if missing
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'restaurant_id') THEN
          ALTER TABLE tables ADD COLUMN restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'section') THEN
          ALTER TABLE tables ADD COLUMN section VARCHAR(50) DEFAULT 'Dine-In';
        END IF;
      END $$;
    `);

    // 10. Menu Items (linked to restaurant_profile)
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        is_veg BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        description TEXT
      );
    `);

    // Add restaurant_id column to menu_items if missing
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'restaurant_id') THEN
          ALTER TABLE menu_items ADD COLUMN restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 11. Bills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE,
        bill_number VARCHAR(50) NOT NULL,
        table_number VARCHAR(10) NOT NULL,
        order_type VARCHAR(20) DEFAULT 'Dine-In',
        subtotal NUMERIC(10,2) NOT NULL,
        discount NUMERIC(10,2) DEFAULT 0,
        gst_amount NUMERIC(10,2) DEFAULT 0,
        total_amount NUMERIC(10,2) NOT NULL,
        payment_method VARCHAR(20),
        payment_status VARCHAR(20) DEFAULT 'unpaid',
        amount_received NUMERIC(10,2),
        change_returned NUMERIC(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bills' AND column_name = 'restaurant_id') THEN
          ALTER TABLE bills ADD COLUMN restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 12. Bill Items
    await client.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        subtotal NUMERIC(10,2) NOT NULL
      );
    `);

    // 13. KOT Orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS kot_orders (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE,
        kot_number VARCHAR(20) NOT NULL,
        bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
        table_number VARCHAR(10) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        items JSONB NOT NULL,
        time_elapsed VARCHAR(20) DEFAULT '2m ago',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kot_orders' AND column_name = 'restaurant_id') THEN
          ALTER TABLE kot_orders ADD COLUMN restaurant_id INTEGER REFERENCES restaurant_profile(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Seed Standard Plans
    await client.query(`
      INSERT INTO plans (id, name, price, duration, device_limit, tagline, popular, features)
      VALUES 
      (
        'plan_starter_3000',
        'Standard Plan',
        2999,
        'monthly',
        3,
        'Essential billing & live KOT for up to 3 devices',
        false,
        '["Up to 3 Device Logins", "Full POS Billing & Thermal Print", "Live Kitchen Order Display (KOT)", "Inventory & Low Stock Alerts", "Daily Sales Analytics", "Email & Chat Support"]'::jsonb
      ),
      (
        'plan_growth_6000',
        'Growth Pro Plan',
        5999,
        'monthly',
        6,
        'High-speed multi-station sync for up to 6 devices',
        true,
        '["Up to 6 Device Logins", "Instant Real-time Multi-Device Sync", "Priority Live KOT Router", "Advanced Inventory & Recipe Tracking", "Comprehensive GST & P&L Reports", "24/7 Dedicated Support & Training"]'::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        device_limit = EXCLUDED.device_limit,
        features = EXCLUDED.features;
    `);

    // ==========================================
    // SEED TENANT 1: The Curry House
    // ==========================================
    const user1Res = await client.query(`
      INSERT INTO users (phone, email, full_name, role)
      VALUES ('9876543210', 'arjun@thecurryhouse.in', 'Arjun Mehta', 'owner')
      ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id;
    `);
    const user1Id = user1Res.rows[0].id;

    const rest1Res = await client.query(`
      INSERT INTO restaurant_profile (user_id, name, location, phone, gst_number, gst_rate, fssai, thermal_paper_width, kot_enabled)
      VALUES ($1, 'The Curry House', 'Indiranagar, Bengaluru', '080 4123 4567', '29AABCT1332L1Z4', 5.0, '11223344556677', '58mm', true)
      RETURNING id;
    `, [user1Id]);
    const rest1Id = rest1Res.rows[0]?.id || 1;

    // Staff for Tenant 1 (The Curry House)
    await client.query(`
      INSERT INTO staff_members (restaurant_id, name, phone, role, pin, is_active, can_edit_menu, can_access_reports)
      VALUES
        ($1, 'Arjun Mehta', '9876543210', 'Owner', '1234', true, true, true),
        ($1, 'Rajesh Sharma', '9845111222', 'Manager', '2222', true, true, true),
        ($1, 'Priya Verma', '9845122334', 'Cashier', '2345', true, false, false),
        ($1, 'Chef Ramesh', '9731288765', 'Chef', '3456', true, false, false)
      ON CONFLICT (restaurant_id, phone) DO UPDATE SET pin = EXCLUDED.pin, role = EXCLUDED.role;
    `, [rest1Id]);

    // Menu for Tenant 1 (The Curry House)
    await client.query(`
      INSERT INTO menu_items (restaurant_id, name, category, price, is_veg, is_available, description)
      VALUES
        ($1, 'Masala Dosa', 'South Indian', 120.00, true, true, 'Crispy rice crepe filled with spiced potato masala and served with coconut chutney & sambar'),
        ($1, 'Idli Vada Combo', 'South Indian', 90.00, true, true, '2 steamed idlis and 1 crispy medu vada with hot sambar and coconut chutney'),
        ($1, 'Samosa (2 pcs)', 'Snacks', 60.00, true, true, 'Flaky pastry stuffed with spiced potato and peas served with mint chutney'),
        ($1, 'Paneer Pakoda', 'Snacks', 140.00, true, true, 'Crispy spiced gram-flour battered fresh cottage cheese fritters'),
        ($1, 'Paneer Butter Masala', 'Mains', 320.00, true, true, 'Rich cottage cheese in creamy tomato gravy'),
        ($1, 'Dal Makhani Royale', 'Mains', 260.00, true, true, 'Slow-cooked black lentils in butter and cream'),
        ($1, 'Garlic Naan', 'Breads', 70.00, true, true, 'Tandoori naan topped with roasted garlic and butter'),
        ($1, 'Butter Chicken Special', 'Mains', 380.00, false, true, 'Smoked chicken in classic fenugreek butter gravy'),
        ($1, 'Sweet Punjabi Lassi', 'Beverages', 100.00, true, true, 'Traditional churned yogurt shake with malai top'),
        ($1, 'Gulab Jamun (2 pcs)', 'Desserts', 90.00, true, true, 'Warm milk solids soaked in rose syrup')
      ON CONFLICT DO NOTHING;
    `, [rest1Id]);

    // Tables for Tenant 1
    await client.query(`
      INSERT INTO tables (restaurant_id, table_number, status, seats, section, active_amount)
      VALUES
        ($1, '01', 'available', 2, 'Dine-In', 0),
        ($1, '02', 'available', 4, 'Dine-In', 0),
        ($1, '03', 'occupied', 4, 'Dine-In', 580),
        ($1, '04', 'available', 6, 'Dine-In', 0)
      ON CONFLICT DO NOTHING;
    `, [rest1Id]);

    // ==========================================
    // SEED TENANT 2: Tandoor Nights (Second Distinct Restaurant)
    // ==========================================
    const user2Res = await client.query(`
      INSERT INTO users (phone, email, full_name, role)
      VALUES ('9811223344', 'vikram@tandoornights.in', 'Vikram Singh', 'owner')
      ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id;
    `);
    const user2Id = user2Res.rows[0].id;

    const rest2Res = await client.query(`
      INSERT INTO restaurant_profile (user_id, name, location, phone, gst_number, gst_rate, fssai, thermal_paper_width, kot_enabled)
      VALUES ($1, 'Tandoor Nights', 'Koramangala, Bengaluru', '080 8899 0011', '29XYZT9988K2Z1', 5.0, '22334455667788', '80mm', true)
      RETURNING id;
    `, [user2Id]);
    const rest2Id = rest2Res.rows[0]?.id || 2;

    // Staff for Tenant 2 (Tandoor Nights)
    await client.query(`
      INSERT INTO staff_members (restaurant_id, name, phone, role, pin, is_active, can_edit_menu, can_access_reports)
      VALUES
        ($1, 'Vikram Singh', '9811223344', 'Owner', '5555', true, true, true),
        ($1, 'Amit Saxena', '9812345678', 'Manager', '7777', true, true, true),
        ($1, 'Chef Sunil', '9819988776', 'Chef', '8888', true, false, false)
      ON CONFLICT (restaurant_id, phone) DO UPDATE SET pin = EXCLUDED.pin, role = EXCLUDED.role;
    `, [rest2Id]);

    // Menu for Tenant 2 (Tandoor Nights)
    await client.query(`
      INSERT INTO menu_items (restaurant_id, name, category, price, is_veg, is_available, description)
      VALUES
        ($1, 'Tandoori Murgh Full', 'Starters', 480.00, false, true, 'Whole chicken marinated in mustard oil & Kashmiri deghi mirch'),
        ($1, 'Mutton Rogan Josh Special', 'Mains', 420.00, false, true, 'Slow braised mutton in rich aromatic Kashmiri gravy'),
        ($1, 'Tandoori Roti', 'Breads', 30.00, true, true, 'Whole wheat clay oven baked bread'),
        ($1, 'Laccha Paratha', 'Breads', 60.00, true, true, 'Crisp layered tandoor bread with ghee'),
        ($1, 'Masala Chaas', 'Beverages', 60.00, true, true, 'Spiced buttermilk with roasted jeera')
      ON CONFLICT DO NOTHING;
    `, [rest2Id]);

    // Tables for Tenant 2
    await client.query(`
      INSERT INTO tables (restaurant_id, table_number, status, seats, section, active_amount)
      VALUES
        ($1, 'TN-1', 'available', 4, 'Terrace', 0),
        ($1, 'TN-2', 'occupied', 6, 'Terrace', 960),
        ($1, 'VIP-1', 'available', 8, 'VIP Lounge', 0)
      ON CONFLICT DO NOTHING;
    `, [rest2Id]);

    await client.query('COMMIT');
    console.log('✅ Multi-tenant schema and 2 distinct restaurants successfully initialized!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
