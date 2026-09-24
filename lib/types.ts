// lib/types.ts
export type MenuCategory = 'Meat'|'Dairy & Eggs'|'Canned Goods'|'Rice & Grains'|'Noodles & Pasta'|'Condiments'|'Dry Goods'|'Beverages'|'Frozen'|'Snacks'|'Personal Care'|'Household'|'Other'
export const MENU_CATS: MenuCategory[] = ['Meat','Dairy & Eggs','Canned Goods','Rice & Grains','Noodles & Pasta','Condiments','Dry Goods','Beverages','Frozen','Snacks','Personal Care','Household','Other']

export interface RecipeIngredient {
  inventoryItemId: string; inventoryItemName: string; quantity: number; unit: string
}

export interface MenuItem {
  id: string; name: string; category: MenuCategory; price: number; costPrice: number
  imageUrl?: string; imagePublicId?: string; available: boolean; soldCount: number
  description?: string; recipe: RecipeIngredient[]; createdAt: string; updatedAt: string
}

export type InvCategory = 'Meat'|'Dairy & Eggs'|'Canned Goods'|'Rice & Grains'|'Noodles & Pasta'|'Condiments'|'Dry Goods'|'Beverages'|'Frozen'|'Snacks'|'Personal Care'|'Household'|'Other'
export const INV_CATS: InvCategory[] = ['Meat','Dairy & Eggs','Canned Goods','Rice & Grains','Noodles & Pasta','Condiments','Dry Goods','Beverages','Frozen','Snacks','Personal Care','Household','Other']
export type StockUnit = 'kg'|'g'|'pcs'|'liters'|'ml'|'box'|'pack'|'bottle'|'can'|'bag'
export const STOCK_UNITS: StockUnit[] = ['kg','g','pcs','liters','ml','box','pack','bottle','can','bag']

export interface InventoryItem {
  id: string; name: string; sku: string; category: InvCategory
  stockQty: number; minThreshold: number; unit: StockUnit
  costPerUnit: number; supplier: string; description?: string; barcode?: string
  createdAt: string; updatedAt: string
}

export type MovType = 'stock_in'|'stock_out'|'sale_deduction'|'refund_reversal'|'adjustment'

export interface InventoryLog {
  id: string; inventoryItemId: string; inventoryItemName: string
  type: MovType; quantity: number; balanceBefore: number; balanceAfter: number
  reference?: string; notes?: string; performedBy: string; createdAt: string
}

export type PaymentMethod = 'Cash'|'GCash'|'Card'|'Maya'
export type OrderStatus = 'completed'|'cancelled'|'refunded'

export interface OrderItem {
  menuItemId: string; name: string; category: string
  price: number; costPrice: number; quantity: number; subtotal: number; costSubtotal: number
}

export interface Order {
  id: string; orderNumber: string; items: OrderItem[]
  subtotal: number; total: number; costTotal: number; grossProfit: number
  paymentMethod: PaymentMethod; cashReceived?: number | null; change?: number | null
  status: OrderStatus; stockDeducted: boolean
  cashierId: string; cashierName: string; cancelReason?: string
  timestamp: string; date: string
}

export interface CartItem { menuItem: MenuItem; quantity: number }
