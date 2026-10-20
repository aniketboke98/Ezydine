import prisma from './prisma';

export async function seedDatabase() {
  console.log('🌱 Seeding Master System Permissions, Roles, and Baseline Plans...');

  // 1. Seed Master Permissions
  const permissionsData = [
    // Billing
    { code: 'CREATE_BILL', name: 'Create Bill', module: 'billing', description: 'Create and settle customer bills' },
    { code: 'VIEW_BILLS', name: 'View Bills', module: 'billing', description: 'View bill history and receipts' },
    { code: 'APPLY_DISCOUNT', name: 'Apply Discount', module: 'billing', description: 'Apply custom discounts to orders' },
    { code: 'CANCEL_BILL', name: 'Cancel Bill', module: 'billing', description: 'Void or cancel generated bills' },
    // KOT
    { code: 'VIEW_KOT', name: 'View KOT', module: 'kot', description: 'Access live Kitchen Order Tickets' },
    { code: 'UPDATE_KOT_STATUS', name: 'Update KOT Status', module: 'kot', description: 'Change status to preparing, ready, or served' },
    // Menu
    { code: 'VIEW_MENU', name: 'View Menu', module: 'menu', description: 'View items and categories' },
    { code: 'MANAGE_MENU', name: 'Manage Menu', module: 'menu', description: 'Add, update, or remove menu items and prices' },
    // Tables
    { code: 'VIEW_TABLES', name: 'View Tables', module: 'tables', description: 'View floor plan and table status' },
    { code: 'MANAGE_TABLES', name: 'Manage Tables', module: 'tables', description: 'Configure table capacity and sections' },
    // Staff & Roles
    { code: 'VIEW_STAFF', name: 'View Staff', module: 'staff', description: 'View staff members list' },
    { code: 'MANAGE_STAFF', name: 'Manage Staff', module: 'staff', description: 'Create and manage staff accounts and PINs' },
    { code: 'MANAGE_ROLES', name: 'Manage Roles', module: 'staff', description: 'Configure custom roles and assign permissions' },
    // Reports
    { code: 'VIEW_REPORTS', name: 'View Reports', module: 'reports', description: 'Access daily sales, revenue, and category reports' },
    { code: 'EXPORT_REPORTS', name: 'Export Reports', module: 'reports', description: 'Download CSV and PDF business statements' },
    // Inventory
    { code: 'VIEW_INVENTORY', name: 'View Inventory', module: 'inventory', description: 'Check stock levels and alerts' },
    { code: 'MANAGE_INVENTORY', name: 'Manage Inventory', module: 'inventory', description: 'Adjust stock counts, units, and reorder levels' },
    // Settings
    { code: 'MANAGE_SETTINGS', name: 'Manage Settings', module: 'settings', description: 'Configure restaurant profile, GST, and thermal printer' },
  ];

  for (const perm of permissionsData) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module, description: perm.description },
      create: perm,
    });
  }
  console.log(`✅ Seeded ${permissionsData.length} granular permissions.`);

  // 2. Seed System Master Roles
  const allPermissions = await prisma.permission.findMany();
  const permMap = new Map(allPermissions.map((p) => [p.code, p.id]));

  const systemRoles: { name: string; description: string; perms: string[] }[] = [
    {
      name: 'Owner',
      description: 'Full administrative access to all restaurant modules and settings',
      perms: permissionsData.map((p) => p.code),
    },
    {
      name: 'Manager',
      description: 'Operations management, reports, menu, inventory, and staff access',
      perms: [
        'CREATE_BILL', 'VIEW_BILLS', 'APPLY_DISCOUNT',
        'VIEW_KOT', 'UPDATE_KOT_STATUS',
        'VIEW_MENU', 'MANAGE_MENU',
        'VIEW_TABLES', 'MANAGE_TABLES',
        'VIEW_STAFF', 'VIEW_REPORTS', 'EXPORT_REPORTS',
        'VIEW_INVENTORY', 'MANAGE_INVENTORY',
      ],
    },
    {
      name: 'Cashier',
      description: 'Billing, table assignment, and payment collection',
      perms: ['CREATE_BILL', 'VIEW_BILLS', 'APPLY_DISCOUNT', 'VIEW_MENU', 'VIEW_TABLES', 'VIEW_KOT'],
    },
    {
      name: 'Waiter',
      description: 'Take customer orders, view tables, and dispatch to kitchen',
      perms: ['CREATE_BILL', 'VIEW_MENU', 'VIEW_TABLES', 'VIEW_KOT'],
    },
    {
      name: 'Chef',
      description: 'Kitchen display screen and order status updates',
      perms: ['VIEW_KOT', 'UPDATE_KOT_STATUS'],
    },
  ];

  for (const roleDef of systemRoles) {
    // Find or create system role (restaurantId = null)
    let role = await prisma.role.findFirst({
      where: { name: roleDef.name, restaurantId: null },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: true,
          restaurantId: null,
        },
      });
    }

    // Link role permissions
    for (const code of roleDef.perms) {
      const permId = permMap.get(code);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${systemRoles.length} system master roles with permission mappings.`);

  // 3. Seed Subscription Plans
  await prisma.plan.upsert({
    where: { id: 'plan_starter_3000' },
    update: {
      name: 'Standard Plan',
      price: 2999,
      duration: 'monthly',
      deviceLimit: 3,
      tagline: 'Essential billing & live KOT for up to 3 devices',
      popular: false,
      features: [
        'Up to 3 Device Logins',
        'Full POS Billing & Thermal Print',
        'Live Kitchen Order Display (KOT)',
        'Inventory & Low Stock Alerts',
        'Daily Sales Analytics',
        'Email & Chat Support',
      ],
    },
    create: {
      id: 'plan_starter_3000',
      name: 'Standard Plan',
      price: 2999,
      duration: 'monthly',
      deviceLimit: 3,
      tagline: 'Essential billing & live KOT for up to 3 devices',
      popular: false,
      features: [
        'Up to 3 Device Logins',
        'Full POS Billing & Thermal Print',
        'Live Kitchen Order Display (KOT)',
        'Inventory & Low Stock Alerts',
        'Daily Sales Analytics',
        'Email & Chat Support',
      ],
    },
  });

  await prisma.plan.upsert({
    where: { id: 'plan_growth_6000' },
    update: {
      name: 'Growth Pro Plan',
      price: 5999,
      duration: 'monthly',
      deviceLimit: 6,
      tagline: 'High-speed multi-station sync for up to 6 devices',
      popular: true,
      features: [
        'Up to 6 Device Logins',
        'Instant Real-time Multi-Device Sync',
        'Priority Live KOT Router',
        'Advanced Inventory & Recipe Tracking',
        'Comprehensive GST & P&L Reports',
        '24/7 Dedicated Support & Training',
      ],
    },
    create: {
      id: 'plan_growth_6000',
      name: 'Growth Pro Plan',
      price: 5999,
      duration: 'monthly',
      deviceLimit: 6,
      tagline: 'High-speed multi-station sync for up to 6 devices',
      popular: true,
      features: [
        'Up to 6 Device Logins',
        'Instant Real-time Multi-Device Sync',
        'Priority Live KOT Router',
        'Advanced Inventory & Recipe Tracking',
        'Comprehensive GST & P&L Reports',
        '24/7 Dedicated Support & Training',
      ],
    },
  });
  console.log('✅ Seeded standard subscription plans.');

  // 4. Seed Demo Restaurant & Manager for Out-of-the-Box Login
  const demoOwner = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      fullName: 'EzyDine Demo Owner',
      phone: '9876543210',
      email: 'owner@ezydine.in',
      role: 'owner',
    },
  });

  let demoRestaurant = await prisma.restaurantProfile.findFirst({
    where: { userId: demoOwner.id },
  });

  if (!demoRestaurant) {
    demoRestaurant = await prisma.restaurantProfile.create({
      data: {
        userId: demoOwner.id,
        name: 'EzyDine Demo Bistro',
        location: 'Indiranagar, Bengaluru',
        phone: '9876543210',
        gstNumber: '29AABCT1332L1Z4',
        gstRate: 5.0,
        thermalPaperWidth: '58mm',
        kotEnabled: true,
      },
    });
  }

  // Link Owner Role to Demo Owner
  const ownerRole = await prisma.role.findFirst({ where: { name: 'Owner', isSystem: true } });
  if (ownerRole) {
    const existing = await prisma.userRole.findFirst({
      where: { userId: demoOwner.id, roleId: ownerRole.id, restaurantId: demoRestaurant.id },
    });
    if (!existing) {
      await prisma.userRole.create({
        data: { userId: demoOwner.id, roleId: ownerRole.id, restaurantId: demoRestaurant.id },
      });
    }
  }

  // Find Manager Role
  const managerRole = await prisma.role.findFirst({ where: { name: 'Manager', isSystem: true } });

  // Seed Demo Manager Staff
  await prisma.staffMember.upsert({
    where: {
      restaurantId_phone: {
        restaurantId: demoRestaurant.id,
        phone: '9800000001',
      },
    },
    update: {
      restaurantId: demoRestaurant.id,
      roleId: managerRole?.id || null,
      pin: '1234',
      role: 'Manager',
      isActive: true,
    },
    create: {
      restaurantId: demoRestaurant.id,
      name: 'Alex Demo Manager',
      phone: '9800000001',
      role: 'Manager',
      roleId: managerRole?.id || null,
      pin: '1234',
      isActive: true,
    },
  });

  console.log('✅ Seeded Demo Manager: Phone 9800000001 | PIN 1234');
  console.log('🎉 Database seeding complete!');
}

if (require.main === module) {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
