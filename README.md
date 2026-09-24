# 🔥 SizzlePOS — Restaurant ERP System

A full-stack **Restaurant POS + ERP** system with integrated inventory management, built with **Next.js 14**, **Tailwind CSS**, **Firebase**, and **Cloudinary**.

---

## 🧰 Tech Stack

| Layer         | Technology                                |
|---------------|-------------------------------------------|
| Frontend      | Next.js 14 (App Router) + TypeScript      |
| Styling       | Tailwind CSS + Plus Jakarta Sans / Inter  |
| Dark Mode     | Class-based with localStorage persistence |
| Database      | Firebase Firestore                        |
| Auth          | Firebase Authentication                   |
| Image Storage | Cloudinary (unsigned upload preset)       |
| Charts        | Recharts                                  |
| Export        | SheetJS (xlsx)                            |

---

## 🎯 Features

### 📊 Dashboard
- Daily/weekly/monthly KPIs (Revenue, Profit, Orders)
- Revenue + Profit area chart (multi-period)
- Orders per day bar chart
- Best sellers leaderboard
- Low stock alert widget with critical item list
- Revenue by category pie chart

### 🛒 Point of Sale
- Grid menu browser with category filters
- Cart with qty controls (+ / − / remove)
- Out-of-stock items disabled automatically
- Payment methods: Cash (with change calc), GCash, Card, Maya
- Place order → triggers inventory deduction via Firestore transaction
- Receipt modal after every order
- Real-time stock validation before order placement

### 🍽️ Menu Management
- Full CRUD (Create, Read, Update, Delete)
- Cloudinary image upload with live preview
- Category filter + search
- Availability toggle (affects POS grid immediately)
- **Recipe Mapping** — link menu items to inventory ingredients
  - Defines how much of each ingredient is used per serving
  - Drives automatic stock deduction in POS

### 📦 Inventory Management
- Full CRUD for ingredients / raw materials
- Fields: Name, SKU, Category, Stock Qty, Min Threshold, Unit, Cost/Unit, Supplier, Barcode
- **Stock In** — add stock with quantity + notes + auto-log
- **Stock Out** — manual deduction with notes + auto-log
- **Auto Deduction** — triggered by POS orders via recipe mapping
- Low stock detection with visual badges (OK / Low / Critical)
- Movement history with full audit trail (per item or all items)
- Excel export

### 📋 Sales Records
- Full transaction history with date range filter
- Search by order #, item name, cashier
- Filter by status (Completed / Cancelled / Refunded)
- Filter by payment method
- **Cancel Order** — reverses stock deduction automatically
- Order detail modal with profit breakdown
- Excel export with revenue, cost, and profit columns

### 📈 Reports
- Revenue + Profit trend (area chart)
- Revenue by category (pie chart)
- Orders by hour distribution (bar chart)
- Top sellers table with revenue share bars
- Payment method breakdown
- **Stock Valuation Report** — total inventory value per item
- Multi-period: Today / This Week / This Month / 3 Months / Custom range
- Full Excel export (Summary + Daily Breakdown + Inventory sheets)

---

## 🧠 Key Business Logic

### Automatic Inventory Deduction

```
POS Order Placed
    → Build deductions from recipe mappings (sum across cart quantities)
    → Firestore runTransaction():
        1. Read ALL inventory items (before any writes)
        2. Validate sufficient stock for EVERY item
        3. If any item fails → throw error, abort transaction
        4. Deduct all items atomically
        5. Set order.stockDeducted = true (idempotency guard)
    → Log each deduction to inventory_logs collection
    → Update menu item soldCount
```

### Cancel / Refund Stock Reversal

```
Cancel Order
    → Check order.stockDeducted === true
    → runTransaction() to add back stock for each ingredient
    → Log reversals as 'refund_reversal' in inventory_logs
    → Update order.status = 'cancelled'
```

---

## 🗄️ Firestore Schema

### `menu_items/{id}`
```json
{
  "name": "Tapsilog",
  "category": "Silog Meals",
  "price": 130,
  "costPrice": 55,
  "available": true,
  "soldCount": 42,
  "recipe": [
    { "inventoryItemId": "abc123", "inventoryItemName": "Chicken Breast", "quantity": 0.15, "unit": "kg" },
    { "inventoryItemId": "def456", "inventoryItemName": "White Rice",     "quantity": 0.20, "unit": "kg" },
    { "inventoryItemId": "ghi789", "inventoryItemName": "Fresh Eggs",     "quantity": 1,    "unit": "pcs" }
  ]
}
```

### `inventory/{id}`
```json
{
  "name": "Chicken Breast", "sku": "CHK-001",
  "category": "Meat", "stockQty": 15,
  "minThreshold": 5, "unit": "kg",
  "costPerUnit": 280, "supplier": "FreshMeat PH"
}
```

### `orders/{id}`
```json
{
  "orderNumber": "ORD-20241201-4821",
  "items": [{ "menuItemId": "...", "name": "Tapsilog", "price": 130, "costPrice": 55, "quantity": 2, "subtotal": 260 }],
  "total": 260, "costTotal": 110, "grossProfit": 150,
  "paymentMethod": "Cash", "cashReceived": 300, "change": 40,
  "status": "completed", "stockDeducted": true,
  "date": "2024-12-01", "timestamp": "2024-12-01T14:32:00Z"
}
```

### `inventory_logs/{id}`
```json
{
  "inventoryItemId": "abc123", "inventoryItemName": "Chicken Breast",
  "type": "sale_deduction", "quantity": -0.15,
  "balanceBefore": 15.15, "balanceAfter": 15.00,
  "reference": "ORD-20241201-4821",
  "createdAt": "2024-12-01T14:32:00Z"
}
```

---

## 🚀 Quick Start

```bash
git clone <repo> && cd sizzle-erp
npm install
cp .env.example .env.local
# Fill in Firebase + Cloudinary values
npm run dev
```

### Firebase Setup
1. Firebase Console → Authentication → Enable Email/Password
2. Firestore → Create database
3. Add user: `admin@sizzle.ph` / `admin123`
4. Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes`

### Seed Sample Data
Follow instructions in `scripts/seed-data.ts`

---

## 🚢 Deploy (Vercel)
```bash
vercel
# Add all NEXT_PUBLIC_* env vars in Vercel dashboard
```

---

## 📁 Project Structure

```
/app
  /login              ← Auth page
  /dashboard          ← Analytics overview
  /pos                ← POS with cart + order placement
  /menu-management    ← CRUD + recipe mapping
  /inventory          ← Stock management + movement logs
  /sales              ← Transaction history + cancel
  /reports            ← Full analytics + export

/components
  AppShell.tsx        ← Auth guard + sidebar layout
  AuthProvider.tsx    ← Firebase Auth context
  ThemeProvider.tsx   ← Dark/light mode
  Sidebar.tsx         ← Collapsible navigation
  Topbar.tsx          ← Header with clock + theme toggle
  Modal.tsx           ← Accessible portal modal

/lib
  firebase.ts         ← Firebase init
  cloudinary.ts       ← Upload helper
  types.ts            ← All TypeScript types
  utils.ts            ← Formatters + helpers

/services
  inventoryService.ts ← Stock CRUD + atomic deduction
  allServices.ts      ← Menu service + Order service
```

---

## 📝 License
MIT — free for commercial use.
