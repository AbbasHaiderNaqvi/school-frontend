import { storage, STORAGE_KEYS } from './storage'
import type { TaskBoard, CustomColumn, Task } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

export const taskBoardService = {
  // Create new board
  async createBoard(
    tenantId: string,
    board: Omit<TaskBoard, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<TaskBoard> {
    const newBoard: TaskBoard = {
      ...board,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    boards.push(newBoard)
    storage.set(STORAGE_KEYS.TASK_BOARDS, boards)

    auditService.log({
      action: 'CREATE',
      entity: 'TaskBoard',
      entityId: newBoard.id,
      details: `Created board: ${board.name}`,
      tenantId,
    })

    return newBoard
  },

  // Get all boards for tenant
  async getBoardsByTenant(tenantId: string): Promise<TaskBoard[]> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    return boards.filter(b => b.tenantId === tenantId).sort((a, b) => (b.isPinned ? 1 : -1))
  },

  // Get single board
  async getBoardById(boardId: string): Promise<TaskBoard | null> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    return boards.find(b => b.id === boardId) || null
  },

  // Add column to board
  async addColumn(boardId: string, column: Omit<CustomColumn, 'order'>): Promise<TaskBoard | null> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    const boardIndex = boards.findIndex(b => b.id === boardId)

    if (boardIndex === -1) return null

    const newColumn: CustomColumn = {
      ...column,
      order: boards[boardIndex].columns.length,
    }

    boards[boardIndex].columns.push(newColumn)
    boards[boardIndex].updatedAt = new Date().toISOString()

    storage.set(STORAGE_KEYS.TASK_BOARDS, boards)
    return boards[boardIndex]
  },

  // Update column
  async updateColumn(boardId: string, columnId: string, updates: Partial<CustomColumn>): Promise<TaskBoard | null> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    const boardIndex = boards.findIndex(b => b.id === boardId)

    if (boardIndex === -1) return null

    const columnIndex = boards[boardIndex].columns.findIndex(c => c.id === columnId)
    if (columnIndex === -1) return null

    boards[boardIndex].columns[columnIndex] = {
      ...boards[boardIndex].columns[columnIndex],
      ...updates,
    }

    boards[boardIndex].updatedAt = new Date().toISOString()
    storage.set(STORAGE_KEYS.TASK_BOARDS, boards)

    return boards[boardIndex]
  },

  // Delete column
  async deleteColumn(boardId: string, columnId: string): Promise<TaskBoard | null> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    const boardIndex = boards.findIndex(b => b.id === boardId)

    if (boardIndex === -1) return null

    boards[boardIndex].columns = boards[boardIndex].columns.filter(c => c.id !== columnId)
    boards[boardIndex].updatedAt = new Date().toISOString()

    storage.set(STORAGE_KEYS.TASK_BOARDS, boards)
    return boards[boardIndex]
  },

  // Reorder columns
  async reorderColumns(boardId: string, columnIds: string[]): Promise<TaskBoard | null> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    const boardIndex = boards.findIndex(b => b.id === boardId)

    if (boardIndex === -1) return null

    const columnMap = new Map(boards[boardIndex].columns.map(c => [c.id, c]))
    boards[boardIndex].columns = columnIds
      .map(id => columnMap.get(id))
      .filter(Boolean) as CustomColumn[]
    boards[boardIndex].columns.forEach((col, idx) => {
      col.order = idx
    })

    boards[boardIndex].updatedAt = new Date().toISOString()
    storage.set(STORAGE_KEYS.TASK_BOARDS, boards)

    return boards[boardIndex]
  },

  // Pin/unpin board
  async togglePinBoard(boardId: string): Promise<TaskBoard | null> {
    const boards = storage.get<TaskBoard[]>(STORAGE_KEYS.TASK_BOARDS) || []
    const boardIndex = boards.findIndex(b => b.id === boardId)

    if (boardIndex === -1) return null

    boards[boardIndex].isPinned = !boards[boardIndex].isPinned
    boards[boardIndex].updatedAt = new Date().toISOString()

    storage.set(STORAGE_KEYS.TASK_BOARDS, boards)
    return boards[boardIndex]
  },

  // Get tasks for board
  async getTasksByBoard(boardId: string): Promise<Task[]> {
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    return tasks.filter(t => t.boardId === boardId)
  },
}
