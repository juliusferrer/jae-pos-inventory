// scripts/seed-data.ts
// ============================================================
// SizzlePOS — Sample Data for Firebase Seeding
// ============================================================
// To seed: Go to Firebase Console → Firestore → Create collections manually
// OR use the Firebase Admin SDK with this data.

export const sampleInventory = [
  // Meat
  { name: 'Chicken Breast',   sku: 'CHK-001', category: 'Meat',      stockQty: 15,  minThreshold: 5,  unit: 'kg',     costPerUnit: 280, supplier: 'FreshMeat PH' },
  { name: 'Pork Belly',       sku: 'PRK-001', category: 'Meat',      stockQty: 12,  minThreshold: 3,  unit: 'kg',     costPerUnit: 250, supplier: 'FreshMeat PH' },
  { name: 'Bangus (Milkfish)',sku: 'BNG-001', category: 'Seafood',   stockQty: 8,   minThreshold: 2,  unit: 'kg',     costPerUnit: 180, supplier: 'SeaFresh Market' },
  { name: 'Ground Beef',      sku: 'GBF-001', category: 'Meat',      stockQty: 10,  minThreshold: 3,  unit: 'kg',     costPerUnit: 320, supplier: 'FreshMeat PH' },
  // Dairy
  { name: 'Fresh Eggs',       sku: 'EGG-001', category: 'Dairy',     stockQty: 120, minThreshold: 24, unit: 'pcs',    costPerUnit: 9,   supplier: 'LuckyFarms' },
  { name: 'Fresh Milk',       sku: 'MLK-001', category: 'Dairy',     stockQty: 10,  minThreshold: 5,  unit: 'liters', costPerUnit: 75,  supplier: 'DairyCo PH' },
  { name: 'Butter',           sku: 'BTR-001', category: 'Dairy',     stockQty: 5,   minThreshold: 1,  unit: 'kg',     costPerUnit: 420, supplier: 'DairyCo PH' },
  // Dry Goods
  { name: 'White Rice',       sku: 'RCE-001', category: 'Dry Goods', stockQty: 50,  minThreshold: 10, unit: 'kg',     costPerUnit: 52,  supplier: 'AgriSupply PH' },
  { name: 'Cooking Oil',      sku: 'OIL-001', category: 'Condiments',stockQty: 8,   minThreshold: 2,  unit: 'liters', costPerUnit: 85,  supplier: 'FoodPro Inc.' },
  { name: 'Soy Sauce',        sku: 'SOY-001', category: 'Condiments',stockQty: 6,   minThreshold: 2,  unit: 'liters', costPerUnit: 55,  supplier: 'FoodPro Inc.' },
  { name: 'Garlic',           sku: 'GRL-001', category: 'Vegetables', stockQty: 3,  minThreshold: 1,  unit: 'kg',     costPerUnit: 120, supplier: 'AgriSupply PH' },
  { name: 'Onion',            sku: 'ONI-001', category: 'Vegetables', stockQty: 4,  minThreshold: 1,  unit: 'kg',     costPerUnit: 90,  supplier: 'AgriSupply PH' },
  // Beverages
  { name: 'Coca-Cola 1.5L',   sku: 'CKL-001', category: 'Beverages', stockQty: 24, minThreshold: 6,  unit: 'bottle', costPerUnit: 55,  supplier: 'BevDistrib PH' },
  { name: 'Vanilla Ice Cream',sku: 'ICE-001', category: 'Frozen',    stockQty: 5,  minThreshold: 2,  unit: 'liters', costPerUnit: 280, supplier: 'ColdStorage Inc.' },
  { name: 'Iced Tea Powder',  sku: 'ITP-001', category: 'Beverages', stockQty: 10, minThreshold: 3,  unit: 'pack',   costPerUnit: 35,  supplier: 'BevDistrib PH' },
]

export const sampleMenuItems = [
  {
    name: 'Tapsilog',
    category: 'Silog Meals',
    price: 130,
    costPrice: 55,
    available: true,
    description: 'Beef tapa, sinangag, at itlog',
    recipe: [
      { inventoryItemId: 'CHK-001-REF', inventoryItemName: 'Chicken Breast', quantity: 0.15, unit: 'kg' },
      { inventoryItemId: 'RCE-001-REF', inventoryItemName: 'White Rice',     quantity: 0.20, unit: 'kg' },
      { inventoryItemId: 'EGG-001-REF', inventoryItemName: 'Fresh Eggs',     quantity: 1,    unit: 'pcs' },
    ],
  },
  {
    name: 'Pork Sisig',
    category: 'Sizzling',
    price: 180,
    costPrice: 75,
    available: true,
    description: 'Sizzling pork sisig with calamansi',
    recipe: [
      { inventoryItemId: 'PRK-001-REF', inventoryItemName: 'Pork Belly', quantity: 0.20, unit: 'kg' },
    ],
  },
  {
    name: 'Chicken Inasal',
    category: 'Hot Plate',
    price: 165,
    costPrice: 68,
    available: true,
    description: 'Grilled marinated chicken',
    recipe: [
      { inventoryItemId: 'CHK-001-REF', inventoryItemName: 'Chicken Breast', quantity: 0.20, unit: 'kg' },
    ],
  },
  {
    name: 'Bangsilog',
    category: 'Silog Meals',
    price: 140,
    costPrice: 58,
    available: true,
    description: 'Bangus, sinangag, itlog',
    recipe: [
      { inventoryItemId: 'BNG-001-REF', inventoryItemName: 'Bangus',     quantity: 0.15, unit: 'kg' },
      { inventoryItemId: 'RCE-001-REF', inventoryItemName: 'White Rice', quantity: 0.20, unit: 'kg' },
      { inventoryItemId: 'EGG-001-REF', inventoryItemName: 'Fresh Eggs', quantity: 1,    unit: 'pcs' },
    ],
  },
  {
    name: 'Coke Float',
    category: 'Drinks',
    price: 55,
    costPrice: 18,
    available: true,
    description: 'Coke with vanilla ice cream',
    recipe: [
      { inventoryItemId: 'CKL-001-REF', inventoryItemName: 'Coca-Cola 1.5L',  quantity: 0.25,  unit: 'bottle' },
      { inventoryItemId: 'ICE-001-REF', inventoryItemName: 'Vanilla Ice Cream', quantity: 0.05, unit: 'liters' },
    ],
  },
  {
    name: 'Iced Tea',
    category: 'Drinks',
    price: 45,
    costPrice: 12,
    available: true,
    description: 'Freshly brewed iced tea',
    recipe: [
      { inventoryItemId: 'ITP-001-REF', inventoryItemName: 'Iced Tea Powder', quantity: 0.1, unit: 'pack' },
    ],
  },
  {
    name: 'Porksilog',
    category: 'Silog Meals',
    price: 110,
    costPrice: 48,
    available: true,
    description: 'Pork, sinangag, itlog',
    recipe: [
      { inventoryItemId: 'PRK-001-REF', inventoryItemName: 'Pork Belly', quantity: 0.15, unit: 'kg' },
      { inventoryItemId: 'RCE-001-REF', inventoryItemName: 'White Rice', quantity: 0.20, unit: 'kg' },
      { inventoryItemId: 'EGG-001-REF', inventoryItemName: 'Fresh Eggs', quantity: 1,    unit: 'pcs' },
    ],
  },
]

/*
MANUAL SETUP GUIDE:
===================

1. FIREBASE SETUP
   - Go to Firebase Console → Authentication → Enable Email/Password
   - Go to Firestore → Create database (start in production mode)
   - Go to Authentication → Add user:
     Email: admin@sizzle.ph | Password: admin123

2. FIRESTORE COLLECTIONS
   Create these collections manually or use the Admin SDK:
   - inventory      (use sampleInventory above)
   - menu_items     (use sampleMenuItems above)
   - orders         (empty - created automatically by POS)
   - inventory_logs (empty - created automatically)

3. RECIPE LINKING
   When creating menu items, link them to actual Firestore inventory document IDs.
   The recipe array maps menu items → inventory items for automatic stock deduction.

4. DEPLOY FIRESTORE RULES
   firebase deploy --only firestore:rules
   firebase deploy --only firestore:indexes

5. CLOUDINARY
   - Create account at cloudinary.com
   - Settings → Upload → Upload presets → Add upload preset
   - Set Signing Mode: "Unsigned"
   - Copy preset name to .env.local

6. DARK MODE
   The app defaults to dark mode. Toggle via the moon/sun icon in the topbar.
*/
