import { storage, STORAGE_KEYS } from './storage'
import type { Asset, InventoryItem } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

// Initialize demo data
const initializeInventoryData = (tenantId: string): void => {
  const assets = storage.get<Asset[]>(STORAGE_KEYS.ASSETS) || []
  const inventory = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []

  if (assets.filter(a => a.tenantId === tenantId).length === 0) {
    const demoAssets: Asset[] = [
      {
        id: generateId(), tenantId, name: 'Dell Computer Lab Set', category: 'IT Equipment',
        serialNumber: 'DELL-001', purchaseDate: '2023-01-15', purchasePrice: 25000, currentValue: 20000,
        location: 'Computer Lab A', assignedTo: 'IT Department', status: 'in_use',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'Projector Epson EB-X51', category: 'Audio Visual',
        serialNumber: 'EPSON-AV-002', purchaseDate: '2022-06-20', purchasePrice: 1500, currentValue: 1200,
        location: 'Conference Room', status: 'available',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'School Bus - Toyota Coaster', category: 'Vehicle',
        serialNumber: 'VEH-BUS-001', purchaseDate: '2021-03-10', purchasePrice: 45000, currentValue: 35000,
        location: 'Parking Lot', assignedTo: 'Transport Dept', status: 'in_use',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'Science Lab Equipment Set', category: 'Lab Equipment',
        serialNumber: 'LAB-SCI-001', purchaseDate: '2023-08-01', purchasePrice: 15000, currentValue: 14000,
        location: 'Science Lab', status: 'in_use',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'Air Conditioner - Daikin', category: 'HVAC',
        serialNumber: 'HVAC-AC-005', purchaseDate: '2022-11-15', purchasePrice: 2500, currentValue: 2000,
        location: 'Principal Office', status: 'maintenance',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ]
    storage.set(STORAGE_KEYS.ASSETS, [...assets, ...demoAssets])
  }

  if (inventory.filter(i => i.tenantId === tenantId).length === 0) {
    const demoInventory: InventoryItem[] = [
      {
        id: generateId(), tenantId, name: 'A4 Paper (Reams)', category: 'Stationery',
        sku: 'STAT-001', quantity: 150, reorderLevel: 50, unitPrice: 5,
        location: 'Supply Room A', lastRestocked: '2025-01-15',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'Whiteboard Markers', category: 'Stationery',
        sku: 'STAT-002', quantity: 200, reorderLevel: 100, unitPrice: 2,
        location: 'Supply Room A', lastRestocked: '2025-01-10',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'Chemistry Lab Chemicals Set', category: 'Lab Supplies',
        sku: 'LAB-001', quantity: 20, reorderLevel: 10, unitPrice: 150,
        location: 'Chemistry Lab', lastRestocked: '2024-12-01',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'First Aid Kits', category: 'Medical',
        sku: 'MED-001', quantity: 8, reorderLevel: 5, unitPrice: 75,
        location: 'Nurse Office', lastRestocked: '2024-11-20',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, name: 'Sports Equipment Set', category: 'Sports',
        sku: 'SPT-001', quantity: 5, reorderLevel: 3, unitPrice: 500,
        location: 'Sports Room', lastRestocked: '2024-10-15',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ]
    storage.set(STORAGE_KEYS.INVENTORY, [...inventory, ...demoInventory])
  }
}

export const inventoryService = {
  // Assets
  async getAssets(tenantId: string): Promise<Asset[]> {
    initializeInventoryData(tenantId)
    const assets = storage.get<Asset[]>(STORAGE_KEYS.ASSETS) || []
    return assets.filter(a => a.tenantId === tenantId)
  },

  async getAssetById(id: string): Promise<Asset | null> {
    const assets = storage.get<Asset[]>(STORAGE_KEYS.ASSETS) || []
    return assets.find(a => a.id === id) || null
  },

  async createAsset(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const assets = storage.get<Asset[]>(STORAGE_KEYS.ASSETS) || []
    
    const newAsset: Asset = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    assets.push(newAsset)
    storage.set(STORAGE_KEYS.ASSETS, assets)

    auditService.log({
      action: 'CREATE',
      entity: 'Asset',
      entityId: newAsset.id,
      details: `Created asset: ${data.name}`,
      tenantId: data.tenantId,
    })

    return newAsset
  },

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset | null> {
    const assets = storage.get<Asset[]>(STORAGE_KEYS.ASSETS) || []
    const index = assets.findIndex(a => a.id === id)
    
    if (index === -1) return null

    assets[index] = { ...assets[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.ASSETS, assets)

    auditService.log({
      action: 'UPDATE',
      entity: 'Asset',
      entityId: id,
      details: `Updated asset: ${assets[index].name}`,
      tenantId: assets[index].tenantId,
    })

    return assets[index]
  },

  async assignAsset(id: string, assignedTo: string): Promise<Asset | null> {
    return this.updateAsset(id, { assignedTo, status: 'in_use' })
  },

  async disposeAsset(id: string): Promise<Asset | null> {
    return this.updateAsset(id, { status: 'disposed' })
  },

  // Inventory
  async getInventoryItems(tenantId: string): Promise<InventoryItem[]> {
    initializeInventoryData(tenantId)
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    return items.filter(i => i.tenantId === tenantId)
  },

  async getItems(tenantId: string): Promise<InventoryItem[]> {
    return this.getInventoryItems(tenantId)
  },

  async createInventoryItem(data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    
    const newItem: InventoryItem = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    items.push(newItem)
    storage.set(STORAGE_KEYS.INVENTORY, items)

    return newItem
  },

  async updateInventoryItem(id: string, data: Partial<InventoryItem>): Promise<InventoryItem | null> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    const index = items.findIndex(i => i.id === id)
    
    if (index === -1) return null

    items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.INVENTORY, items)

    return items[index]
  },

  async adjustStock(id: string, quantity: number, isAddition: boolean): Promise<InventoryItem | null> {
    const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
    const index = items.findIndex(i => i.id === id)
    
    if (index === -1) return null

    const newQuantity = isAddition 
      ? items[index].quantity + quantity 
      : Math.max(0, items[index].quantity - quantity)

    items[index] = { 
      ...items[index], 
      quantity: newQuantity,
      lastRestocked: isAddition ? new Date().toISOString().split('T')[0] : items[index].lastRestocked,
      updatedAt: new Date().toISOString() 
    }

    storage.set(STORAGE_KEYS.INVENTORY, items)

    auditService.log({
      action: isAddition ? 'STOCK_ADD' : 'STOCK_REMOVE',
      entity: 'Inventory',
      entityId: id,
      details: `${isAddition ? 'Added' : 'Removed'} ${quantity} units of ${items[index].name}`,
      tenantId: items[index].tenantId,
    })

    return items[index]
  },

  // Stats
  async getInventoryStats(tenantId: string): Promise<{
    totalAssets: number
    assetsInUse: number
    assetsInMaintenance: number
    totalInventoryValue: number
    lowStockItems: number
  }> {
    const assets = await this.getAssets(tenantId)
    const inventory = await this.getInventoryItems(tenantId)

    return {
      totalAssets: assets.length,
      assetsInUse: assets.filter(a => a.status === 'in_use').length,
      assetsInMaintenance: assets.filter(a => a.status === 'maintenance').length,
      totalInventoryValue: inventory.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0),
      lowStockItems: inventory.filter(i => i.quantity <= i.reorderLevel).length,
    }
  },

  async getLowStockItems(tenantId: string): Promise<InventoryItem[]> {
    const items = await this.getInventoryItems(tenantId)
    return items.filter(i => i.quantity <= i.reorderLevel)
  },

  // Movement tracking
  async getMovementHistory(tenantId: string): Promise<any[]> {
    console.log('[v0] inventoryService.getMovementHistory called for tenant:', tenantId)
    const movements = storage.get<any[]>(STORAGE_KEYS.INVENTORY_MOVEMENTS) || []
    console.log('[v0] Found movements:', movements.length)
    return movements
      .filter(m => m.tenantId === tenantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  async recordMovement(data: {
    itemId: string
    movementType: 'purchase' | 'usage' | 'adjustment' | 'transfer'
    quantity: number
    fromLocation?: string
    toLocation?: string
    reason?: string
    movedBy: string
    movedByName: string
    tenantId: string
  }): Promise<boolean> {
    console.log('[v0] inventoryService.recordMovement called with:', data)
    try {
      const movements = storage.get<any[]>(STORAGE_KEYS.INVENTORY_MOVEMENTS) || []
      const items = storage.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY) || []
      
      const itemIndex = items.findIndex(i => i.id === data.itemId)
      if (itemIndex === -1) return false

      const movement = {
        id: generateId(),
        tenantId: data.tenantId,
        itemId: data.itemId,
        itemName: items[itemIndex].name,
        movementType: data.movementType,
        quantity: data.quantity,
        fromLocation: data.fromLocation || items[itemIndex].location,
        toLocation: data.toLocation,
        reason: data.reason,
        movedBy: data.movedBy,
        movedByName: data.movedByName,
        date: new Date().toISOString(),
      }

      movements.push(movement)
      storage.set(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements)

      // Update inventory quantity based on movement type
      if (data.movementType === 'purchase') {
        items[itemIndex].quantity += data.quantity
        items[itemIndex].lastRestocked = new Date().toISOString().split('T')[0]
      } else if (data.movementType === 'usage') {
        items[itemIndex].quantity = Math.max(0, items[itemIndex].quantity - data.quantity)
      } else if (data.movementType === 'adjustment') {
        items[itemIndex].quantity = data.quantity
      }

      if (data.toLocation) {
        items[itemIndex].location = data.toLocation
      }

      items[itemIndex].updatedAt = new Date().toISOString()
      storage.set(STORAGE_KEYS.INVENTORY, items)

      auditService.log({
        action: 'CREATE',
        entity: 'InventoryMovement',
        entityId: movement.id,
        details: `Recorded ${data.movementType} movement: ${data.quantity} units of ${items[itemIndex].name}`,
        tenantId: data.tenantId,
      })

      return true
    } catch (error) {
      console.error('[v0] Error recording movement:', error)
      return false
    }
  },
}
