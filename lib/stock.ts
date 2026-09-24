import { CartItem, InventoryItem, MenuItem } from '@/lib/types'

export interface ResolvedInventoryLink {
  inventory: InventoryItem
  qtyPerUnit: number
}

export interface CartDeduction {
  itemId: string
  itemName: string
  qty: number
}

export interface InventoryMappingAuditIssue {
  menuItemId: string
  menuItemName: string
  ingredientName: string
  recipeInventoryId: string
  status: 'EMPTY_ID' | 'MISSING_INVENTORY_DOC'
}

export interface InventoryMappingAuditResult {
  invalidMappings: InventoryMappingAuditIssue[]
  duplicateInventoryNames: Array<{ name: string; ids: string[] }>
}

const normalize = (v: string) => v.trim().toLowerCase()

function inventoryByName(items: InventoryItem[]) {
  const map = new Map<string, InventoryItem>()
  for (const i of items) map.set(normalize(i.name), i)
  return map
}

function inventoryById(items: InventoryItem[]) {
  const map = new Map<string, InventoryItem>()
  for (const i of items) map.set(i.id, i)
  return map
}

function resolveIngredientInventory(
  ingredient: { inventoryItemId: string; inventoryItemName: string },
  byId: Map<string, InventoryItem>,
): InventoryItem | null {
  return byId.get(ingredient.inventoryItemId) ?? null
}

export function resolveMenuLinks(item: MenuItem, inventoryItems: InventoryItem[]): ResolvedInventoryLink[] {
  const byId = inventoryById(inventoryItems)
  const byName = inventoryByName(inventoryItems)

  if (item.recipe?.length) {
    const links: ResolvedInventoryLink[] = []
    for (const r of item.recipe) {
      const inv = resolveIngredientInventory(r, byId)
      if (inv && r.quantity > 0) links.push({ inventory: inv, qtyPerUnit: r.quantity })
    }
    return links
  }

  const direct = byName.get(normalize(item.name))
  return direct ? [{ inventory: direct, qtyPerUnit: 1 }] : []
}

export function availableUnitsForMenu(item: MenuItem, inventoryItems: InventoryItem[]): number {
  const links = resolveMenuLinks(item, inventoryItems)
  if (!links.length) return 0

  let minUnits = Number.POSITIVE_INFINITY
  for (const l of links) {
    const units = Math.floor(l.inventory.stockQty / l.qtyPerUnit)
    minUnits = Math.min(minUnits, units)
  }

  if (!Number.isFinite(minUnits)) return 0
  return Math.max(0, minUnits)
}

export function lowStockForMenu(item: MenuItem, inventoryItems: InventoryItem[]): boolean {
  const links = resolveMenuLinks(item, inventoryItems)
  if (!links.length) return true

  return links.some(l => {
    const thresholdUnits = l.qtyPerUnit > 0 ? l.inventory.minThreshold / l.qtyPerUnit : 0
    const availableUnits = l.qtyPerUnit > 0 ? l.inventory.stockQty / l.qtyPerUnit : 0
    return availableUnits <= thresholdUnits
  })
}

export function buildDeductionsFromCart(
  cart: CartItem[],
  inventoryItems: InventoryItem[],
): { deductions: CartDeduction[]; unmappedItems: string[] } {
  const byId = inventoryById(inventoryItems)
  const byName = inventoryByName(inventoryItems)

  const dedMap: Record<string, CartDeduction> = {}
  const unmapped = new Set<string>()

  for (const ci of cart) {
    const links = ci.menuItem.recipe?.length
      ? ci.menuItem.recipe
          .map(r => {
            const inv = resolveIngredientInventory(r, byId)
            if (!inv) return null
            return { inventory: inv, qtyPerUnit: r.quantity }
          })
          .filter((v): v is { inventory: InventoryItem; qtyPerUnit: number } => !!v && v.qtyPerUnit > 0)
      : (() => {
          const inv = byName.get(normalize(ci.menuItem.name))
          return inv ? [{ inventory: inv, qtyPerUnit: 1 }] : []
        })()

    if (!links.length) {
      unmapped.add(ci.menuItem.name)
      continue
    }

    for (const l of links) {
      const qty = l.qtyPerUnit * ci.quantity
      if (!dedMap[l.inventory.id]) {
        dedMap[l.inventory.id] = { itemId: l.inventory.id, itemName: l.inventory.name, qty: 0 }
      }
      dedMap[l.inventory.id].qty += qty
    }
  }

  return { deductions: Object.values(dedMap), unmappedItems: Array.from(unmapped) }
}

export function auditInventoryMappings(menuItems: MenuItem[], inventoryItems: InventoryItem[]): InventoryMappingAuditResult {
  const byId = inventoryById(inventoryItems)
  const byName = new Map<string, string[]>()

  for (const i of inventoryItems) {
    const key = normalize(i.name)
    const ids = byName.get(key) ?? []
    ids.push(i.id)
    byName.set(key, ids)
  }

  const duplicateInventoryNames = Array.from(byName.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([name, ids]) => ({ name, ids }))

  const invalidMappings: InventoryMappingAuditIssue[] = []

  for (const menuItem of menuItems) {
    if (!menuItem.recipe?.length) continue

    for (const ingredient of menuItem.recipe) {
      if (!ingredient.inventoryItemId?.trim()) {
        invalidMappings.push({
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          ingredientName: ingredient.inventoryItemName,
          recipeInventoryId: ingredient.inventoryItemId,
          status: 'EMPTY_ID',
        })
        continue
      }

      if (!byId.has(ingredient.inventoryItemId)) {
        invalidMappings.push({
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          ingredientName: ingredient.inventoryItemName,
          recipeInventoryId: ingredient.inventoryItemId,
          status: 'MISSING_INVENTORY_DOC',
        })
      }
    }
  }

  return { invalidMappings, duplicateInventoryNames }
}
