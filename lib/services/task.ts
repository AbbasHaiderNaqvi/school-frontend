import { storage, STORAGE_KEYS } from './storage'
import type { Task, TaskStatus, KanbanColumn, TaskLabel, TaskComment, TaskChecklistItem } from '../types'
import { generateId } from '../utils'
import { auditService } from './audit'

// Kanban columns configuration
export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-slate-500' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-amber-500' },
  { id: 'review', title: 'Review', color: 'bg-purple-500' },
  { id: 'completed', title: 'Completed', color: 'bg-emerald-500' },
]

// Default labels
export const DEFAULT_LABELS: TaskLabel[] = [
  { id: 'label_1', name: 'Bug', color: 'bg-red-500' },
  { id: 'label_2', name: 'Feature', color: 'bg-blue-500' },
  { id: 'label_3', name: 'Urgent', color: 'bg-orange-500' },
  { id: 'label_4', name: 'Documentation', color: 'bg-purple-500' },
  { id: 'label_5', name: 'Meeting', color: 'bg-teal-500' },
  { id: 'label_6', name: 'Academic', color: 'bg-green-500' },
]

// Initialize demo data
const initializeTaskData = (tenantId: string): void => {
  const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
  
  if (tasks.filter(t => t.tenantId === tenantId).length === 0) {
    const today = new Date()
    const demoTasks: Task[] = [
      {
        id: generateId(), tenantId, title: 'Prepare Annual Report',
        description: 'Compile and prepare the annual academic report for board review',
        assigneeIds: ['user_1', 'user_2'], assigneeNames: ['John Teacher', 'Sarah Accountant'],
        priority: 'high', status: 'in_progress', columnOrder: 0,
        dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[5]], checklist: [
          { id: generateId(), text: 'Gather financial data', completed: true },
          { id: generateId(), text: 'Compile attendance statistics', completed: true },
          { id: generateId(), text: 'Review academic results', completed: false },
        ],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Update Student Records',
        description: 'Update all student records for the new academic year',
        assigneeIds: ['user_3'], assigneeNames: ['Mike HR'],
        priority: 'medium', status: 'todo', columnOrder: 0,
        dueDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[5]],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Review Expense Reports',
        description: 'Review and approve pending expense reports from departments',
        assigneeIds: ['user_2'], assigneeNames: ['Sarah Accountant'],
        priority: 'urgent', status: 'todo', columnOrder: 1,
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[2]],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Organize Sports Day',
        description: 'Plan and organize the annual sports day event',
        assigneeIds: ['user_4', 'user_5'], assigneeNames: ['Emily Math', 'David Sports'],
        priority: 'medium', status: 'backlog', columnOrder: 0,
        dueDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[4]],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Complete Lab Safety Audit',
        description: 'Conduct safety audit of all science laboratories',
        assigneeIds: ['user_1'], assigneeNames: ['John Teacher'],
        priority: 'high', status: 'completed', columnOrder: 0,
        dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[2], DEFAULT_LABELS[5]],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Fix Attendance Module Bug',
        description: 'There is a bug in the attendance module where some records are not being saved correctly',
        assigneeIds: ['user_1'], assigneeNames: ['John Teacher'],
        priority: 'high', status: 'review', columnOrder: 0,
        dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[0]],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(), tenantId, title: 'Parent Teacher Meeting',
        description: 'Schedule and organize the quarterly parent-teacher meeting',
        assigneeIds: ['user_4'], assigneeNames: ['Emily Math'],
        priority: 'medium', status: 'in_progress', columnOrder: 1,
        dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        labels: [DEFAULT_LABELS[4], DEFAULT_LABELS[5]],
        createdBy: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      },
    ]
    storage.set(STORAGE_KEYS.TASKS, [...tasks, ...demoTasks])
  }
}

export const taskService = {
  async getTasks(tenantId: string, filters?: {
    status?: Task['status']
    priority?: Task['priority']
    assigneeId?: string
  }): Promise<Task[]> {
    initializeTaskData(tenantId)
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    let filtered = tasks.filter(t => t.tenantId === tenantId)
    
    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status)
    }
    if (filters?.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority)
    }
    if (filters?.assigneeId) {
      filtered = filtered.filter(t => t.assigneeIds.includes(filters.assigneeId!))
    }
    
    return filtered.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  },

  async getTaskById(id: string): Promise<Task | null> {
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    return tasks.find(t => t.id === id) || null
  },

  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    
    const newTask: Task = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tasks.push(newTask)
    storage.set(STORAGE_KEYS.TASKS, tasks)

    auditService.log({
      action: 'CREATE',
      entity: 'Task',
      entityId: newTask.id,
      details: `Created task: ${data.title}`,
      tenantId: data.tenantId,
    })

    return newTask
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    const index = tasks.findIndex(t => t.id === id)
    
    if (index === -1) return null

    tasks[index] = { ...tasks[index], ...data, updatedAt: new Date().toISOString() }
    storage.set(STORAGE_KEYS.TASKS, tasks)

    auditService.log({
      action: 'UPDATE',
      entity: 'Task',
      entityId: id,
      details: `Updated task: ${tasks[index].title}`,
      tenantId: tasks[index].tenantId,
    })

    return tasks[index]
  },

  async updateTaskStatus(id: string, status: Task['status']): Promise<Task | null> {
    return this.updateTask(id, { status })
  },

  async assignTask(id: string, assigneeIds: string[], assigneeNames: string[]): Promise<Task | null> {
    return this.updateTask(id, { assigneeIds, assigneeNames })
  },

  async deleteTask(id: string): Promise<boolean> {
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    const task = tasks.find(t => t.id === id)
    const filtered = tasks.filter(t => t.id !== id)
    
    if (filtered.length === tasks.length) return false
    
    storage.set(STORAGE_KEYS.TASKS, filtered)

    if (task) {
      auditService.log({
        action: 'DELETE',
        entity: 'Task',
        entityId: id,
        details: `Deleted task: ${task.title}`,
        tenantId: task.tenantId,
      })
    }

    return true
  },

  // Stats
  async getTaskStats(tenantId: string): Promise<{
    total: number
    backlog: number
    todo: number
    inProgress: number
    review: number
    completed: number
    overdue: number
  }> {
    const tasks = await this.getTasks(tenantId)
    const today = new Date().toISOString().split('T')[0]
    
    return {
      total: tasks.length,
      backlog: tasks.filter(t => t.status === 'backlog').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status !== 'completed' && t.dueDate < today).length,
    }
  },

  async getOverdueTasks(tenantId: string): Promise<Task[]> {
    const tasks = await this.getTasks(tenantId)
    const today = new Date().toISOString().split('T')[0]
    return tasks.filter(t => t.status !== 'completed' && t.dueDate < today)
  },

  async getUpcomingTasks(tenantId: string, days: number = 7): Promise<Task[]> {
    const tasks = await this.getTasks(tenantId)
    const today = new Date()
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    
    return tasks.filter(t => t.status !== 'completed' && t.dueDate >= todayStr && t.dueDate <= futureDate)
  },

  // Kanban-specific methods
  async getTasksByColumn(tenantId: string): Promise<Record<TaskStatus, Task[]>> {
    const tasks = await this.getTasks(tenantId)
    const columns: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      completed: [],
    }
    
    for (const task of tasks) {
      if (columns[task.status]) {
        columns[task.status].push(task)
      }
    }
    
    // Sort each column by columnOrder
    for (const status of Object.keys(columns) as TaskStatus[]) {
      columns[status].sort((a, b) => (a.columnOrder || 0) - (b.columnOrder || 0))
    }
    
    return columns
  },

  async moveTask(taskId: string, newStatus: TaskStatus, newOrder: number): Promise<Task | null> {
    const tasks = storage.get<Task[]>(STORAGE_KEYS.TASKS) || []
    const taskIndex = tasks.findIndex(t => t.id === taskId)
    
    if (taskIndex === -1) return null
    
    const task = tasks[taskIndex]
    const oldStatus = task.status
    
    // Update the task's status and order
    tasks[taskIndex] = {
      ...task,
      status: newStatus,
      columnOrder: newOrder,
      updatedAt: new Date().toISOString(),
    }
    
    // Reorder other tasks in the new column
    tasks.forEach((t, i) => {
      if (t.id !== taskId && t.tenantId === task.tenantId && t.status === newStatus && t.columnOrder >= newOrder) {
        tasks[i] = { ...t, columnOrder: t.columnOrder + 1 }
      }
    })
    
    storage.set(STORAGE_KEYS.TASKS, tasks)
    
    if (oldStatus !== newStatus) {
      auditService.log({
        action: 'MOVE',
        entity: 'Task',
        entityId: taskId,
        details: `Moved task "${task.title}" from ${oldStatus} to ${newStatus}`,
        tenantId: task.tenantId,
      })
    }
    
    return tasks[taskIndex]
  },

  async addComment(taskId: string, comment: Omit<TaskComment, 'id' | 'createdAt'>): Promise<Task | null> {
    const task = await this.getTaskById(taskId)
    if (!task) return null
    
    const newComment: TaskComment = {
      ...comment,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }
    
    return this.updateTask(taskId, {
      comments: [...(task.comments || []), newComment],
    })
  },

  async addChecklistItem(taskId: string, text: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId)
    if (!task) return null
    
    const newItem: TaskChecklistItem = {
      id: generateId(),
      text,
      completed: false,
    }
    
    return this.updateTask(taskId, {
      checklist: [...(task.checklist || []), newItem],
    })
  },

  async toggleChecklistItem(taskId: string, itemId: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId)
    if (!task || !task.checklist) return null
    
    const checklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    
    return this.updateTask(taskId, { checklist })
  },

  async removeChecklistItem(taskId: string, itemId: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId)
    if (!task || !task.checklist) return null
    
    return this.updateTask(taskId, {
      checklist: task.checklist.filter(item => item.id !== itemId),
    })
  },

  async addLabel(taskId: string, label: TaskLabel): Promise<Task | null> {
    const task = await this.getTaskById(taskId)
    if (!task) return null
    
    // Don't add duplicate labels
    if (task.labels?.some(l => l.id === label.id)) return task
    
    return this.updateTask(taskId, {
      labels: [...(task.labels || []), label],
    })
  },

  async removeLabel(taskId: string, labelId: string): Promise<Task | null> {
    const task = await this.getTaskById(taskId)
    if (!task) return null
    
    return this.updateTask(taskId, {
      labels: (task.labels || []).filter(l => l.id !== labelId),
    })
  },

  getKanbanColumns(): KanbanColumn[] {
    return KANBAN_COLUMNS
  },

  getDefaultLabels(): TaskLabel[] {
    return DEFAULT_LABELS
  },
}
