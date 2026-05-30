import { storage, STORAGE_KEYS } from './storage'
import type { InventoryItem, InventoryMovement } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

export const inventoryManagerService = {
  // Add inventory movement for tracking stock changes
  async recordMovement(
    inventoryId: string,
    tenantId: string,
    movement: Omit<InventoryMovement, 'id' | 'date'>,
  ): Promise<InventoryMovement> {
    const newMovement: InventoryMovement = {
      ...movement,
      id: generateId(),
      date: new Date().toISOString(),
    }

    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    const itemIndex = items.findIndex(i => i.id === inventoryId)

    if (itemIndex !== -1) {
      const item = items[itemIndex]
      let newQuantity = item.quantity

      if (movement.movementType === 'purchase' || movement.movementType === 'adjustment') {
        newQuantity += movement.quantity
      } else {
        newQuantity -= movement.quantity
      }

      // Update inventory quantity and status
      const status: 'in_stock' | 'low_stock' | 'out_of_stock' =
        newQuantity <= 0 ? 'out_of_stock' : newQuantity <= item.reorderLevel ? 'low_stock' : 'in_stock'

      items[itemIndex] = {
        ...item,
        quantity: Math.max(0, newQuantity),
        status,
        lastMovement: new Date().toISOString(),
        movementHistory: [...(item.movementHistory || []), newMovement],
      }

      storage.set(STORAGE_KEYS.INVENTORY, items)

      auditService.log({
        action: 'UPDATE',
        entity: 'InventoryItem',
        entityId: inventoryId,
        details: `${movement.movementType}: ${movement.quantity} units of ${item.name}`,
        tenantId,
      })
    }

    return newMovement
  },

  // Get low stock items for reordering
  async getLowStockItems(tenantId: string): Promise<InventoryItem[]> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    return items.filter(
      i => i.tenantId === tenantId && (i.status === 'low_stock' || i.status === 'out_of_stock'),
    )
  },

  // Get movement history for an item
  async getMovementHistory(inventoryId: string): Promise<InventoryMovement[]> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    const item = items.find(i => i.id === inventoryId)
    return item?.movementHistory || []
  },

  // Bulk update quantities
  async bulkUpdateQuantities(tenantId: string, updates: Record<string, number>): Promise<void> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []

    for (const [itemId, quantityChange] of Object.entries(updates)) {
      const itemIndex = items.findIndex(i => i.id === itemId && i.tenantId === tenantId)
      if (itemIndex !== -1) {
        const item = items[itemIndex]
        const newQuantity = Math.max(0, item.quantity + quantityChange)
        const status: 'in_stock' | 'low_stock' | 'out_of_stock' =
          newQuantity <= 0 ? 'out_of_stock' : newQuantity <= item.reorderLevel ? 'low_stock' : 'in_stock'

        items[itemIndex] = {
          ...item,
          quantity: newQuantity,
          status,
        }
      }
    }

    storage.set(STORAGE_KEYS.INVENTORY, items)
  },

  // Create reorder alert/PO
  async generateReorderPO(tenantId: string, itemId: string): Promise<{ id: string; items: InventoryItem[] }> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    const item = items.find(i => i.id === itemId && i.tenantId === tenantId)

    if (!item) return { id: '', items: [] }

    const reorderItems = [
      {
        ...item,
        quantity: item.reorderQuantity,
        unitPrice: item.unitPrice,
      },
    ]

    return {
      id: generateId(),
      items: reorderItems,
    }
  },
}
