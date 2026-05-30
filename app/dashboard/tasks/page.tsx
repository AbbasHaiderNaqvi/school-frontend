'use client'

import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { taskService, DEFAULT_LABELS, KANBAN_COLUMNS } from '@/lib/services/task'
import type { Task, TaskStatus, TaskLabel, TaskComment } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  MoreHorizontal,
  Calendar,
  Users,
  Tag,
  CheckSquare,
  MessageSquare,
  Trash2,
  Edit,
  AlertCircle,
  Clock,
  X,
  Send,
  Copy,
  Archive,
  Eye,
  Paperclip,
  AlignLeft,
} from 'lucide-react'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'

export default function TasksPage() {
  const { user } = useAuth()
  const [columns, setColumns] = useState<Record<TaskStatus, Task[]>>({
    backlog: [],
    todo: [],
    in_progress: [],
    review: [],
    completed: [],
  })
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [newComment, setNewComment] = useState('')
  const [addingTaskToColumn, setAddingTaskToColumn] = useState<TaskStatus | null>(null)
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const quickTaskInputRef = useRef<HTMLInputElement>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
  })

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as TaskStatus,
    dueDate: '',
    labels: [] as TaskLabel[],
  })

  const tenantId = user?.tenantId || 'tenant_1'

  useEffect(() => {
    loadTasks()
  }, [tenantId])

  useEffect(() => {
    if (addingTaskToColumn && quickTaskInputRef.current) {
      quickTaskInputRef.current.focus()
    }
  }, [addingTaskToColumn])

  const loadTasks = async () => {
    setLoading(true)
    const tasksByColumn = await taskService.getTasksByColumn(tenantId)
    setColumns(tasksByColumn)
    setLoading(false)
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return

    await taskService.createTask({
      ...newTask,
      tenantId,
      assigneeIds: [],
      assigneeNames: [],
      columnOrder: columns[newTask.status].length,
      createdBy: user?.name || 'Unknown',
    })

    setIsCreateDialogOpen(false)
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      dueDate: '',
      labels: [],
    })
    loadTasks()
  }

  const handleQuickCreateTask = async (status: TaskStatus) => {
    if (!quickTaskTitle.trim()) {
      setAddingTaskToColumn(null)
      return
    }

    await taskService.createTask({
      title: quickTaskTitle,
      description: '',
      priority: 'medium',
      status,
      dueDate: '',
      labels: [],
      tenantId,
      assigneeIds: [],
      assigneeNames: [],
      columnOrder: columns[status].length,
      createdBy: user?.name || 'Unknown',
    })

    setQuickTaskTitle('')
    setAddingTaskToColumn(null)
    loadTasks()
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    
    if (!draggedTask) return
    
    if (draggedTask.status !== targetStatus) {
      await taskService.moveTask(draggedTask.id, targetStatus, columns[targetStatus].length)
      loadTasks()
    }
    setDraggedTask(null)
  }

  const handleDeleteTask = async (taskId: string) => {
    await taskService.deleteTask(taskId)
    setIsDetailDialogOpen(false)
    setSelectedTask(null)
    loadTasks()
  }

  const handleDuplicateTask = async () => {
    if (!selectedTask) return
    
    await taskService.createTask({
      title: `${selectedTask.title} (Copy)`,
      description: selectedTask.description,
      priority: selectedTask.priority,
      status: selectedTask.status,
      dueDate: selectedTask.dueDate,
      labels: selectedTask.labels,
      tenantId: selectedTask.tenantId,
      assigneeIds: selectedTask.assigneeIds,
      assigneeNames: selectedTask.assigneeNames,
      columnOrder: columns[selectedTask.status].length,
      createdBy: user?.name || 'Unknown',
    })
    
    loadTasks()
  }

  const handleAddChecklistItem = async () => {
    if (!selectedTask || !newChecklistItem.trim()) return
    await taskService.addChecklistItem(selectedTask.id, newChecklistItem)
    const updated = await taskService.getTaskById(selectedTask.id)
    setSelectedTask(updated)
    setNewChecklistItem('')
    loadTasks()
  }

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!selectedTask) return
    await taskService.toggleChecklistItem(selectedTask.id, itemId)
    const updated = await taskService.getTaskById(selectedTask.id)
    setSelectedTask(updated)
    loadTasks()
  }

  const handleRemoveChecklistItem = async (itemId: string) => {
    if (!selectedTask) return
    await taskService.removeChecklistItem(selectedTask.id, itemId)
    const updated = await taskService.getTaskById(selectedTask.id)
    setSelectedTask(updated)
    loadTasks()
  }

  const handleToggleLabel = async (label: TaskLabel) => {
    if (!selectedTask) return
    const hasLabel = selectedTask.labels?.some(l => l.id === label.id)
    if (hasLabel) {
      await taskService.removeLabel(selectedTask.id, label.id)
    } else {
      await taskService.addLabel(selectedTask.id, label)
    }
    const updated = await taskService.getTaskById(selectedTask.id)
    setSelectedTask(updated)
    loadTasks()
  }

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return
    
    await taskService.addComment(selectedTask.id, {
      userId: user?.id || 'unknown',
      userName: user?.name || 'Unknown User',
      content: newComment,
    })
    
    const updated = await taskService.getTaskById(selectedTask.id)
    setSelectedTask(updated)
    setNewComment('')
    loadTasks()
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await taskService.moveTask(taskId, newStatus, columns[newStatus].length)
    const updated = await taskService.getTaskById(taskId)
    setSelectedTask(updated)
    loadTasks()
  }

  const handleSaveEdit = async () => {
    if (!selectedTask) return
    
    await taskService.updateTask(selectedTask.id, {
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      dueDate: editForm.dueDate,
    })
    
    const updated = await taskService.getTaskById(selectedTask.id)
    setSelectedTask(updated)
    setIsEditMode(false)
    loadTasks()
  }

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
    })
    setIsEditMode(false)
    setIsDetailDialogOpen(true)
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-yellow-500 text-foreground'
      case 'low': return 'bg-slate-400 text-white'
      default: return 'bg-slate-400 text-white'
    }
  }

  const isOverdue = (dueDate: string) => {
    return dueDate && new Date(dueDate) < new Date()
  }

  const getChecklistProgress = (task: Task) => {
    if (!task.checklist || task.checklist.length === 0) return 0
    return (task.checklist.filter(c => c.completed).length / task.checklist.length) * 100
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Board</h1>
          <p className="text-muted-foreground">Drag and drop tasks between columns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 h-[calc(100%-5rem)] overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 flex flex-col rounded-xl transition-colors ${
              dragOverColumn === column.id 
                ? 'bg-primary/10 ring-2 ring-primary/30' 
                : 'bg-muted/30'
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-3 flex items-center gap-2 border-b border-border/50">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-foreground">{column.title}</h3>
              <Badge variant="secondary" className="ml-auto">
                {columns[column.id].length}
              </Badge>
            </div>

            {/* Tasks */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {columns[column.id].map((task) => (
                  <Card
                    key={task.id}
                    className={`cursor-pointer hover:border-primary/50 transition-all hover:shadow-md ${
                      draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => openTaskDetail(task)}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Labels */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.labels.map((label) => (
                            <div
                              key={label.id}
                              className={`h-2 w-12 rounded-full ${label.color}`}
                              title={label.name}
                            />
                          ))}
                        </div>
                      )}

                      {/* Title */}
                      <p className="font-medium text-sm text-foreground leading-snug">{task.title}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 text-xs ${isOverdue(task.dueDate) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {isOverdue(task.dueDate) ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {formatDate(task.dueDate)}
                          </div>
                        )}
                      </div>

                      {/* Checklist Progress */}
                      {task.checklist && task.checklist.length > 0 && (
                        <div className="space-y-1">
                          <Progress value={getChecklistProgress(task)} className="h-1" />
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.description && (
                            <span className="flex items-center gap-1" title="Has description">
                              <AlignLeft className="h-3 w-3" />
                            </span>
                          )}
                          {task.checklist && task.checklist.length > 0 && (
                            <span className="flex items-center gap-1" title="Checklist">
                              <CheckSquare className="h-3 w-3" />
                              {task.checklist.filter(c => c.completed).length}/{task.checklist.length}
                            </span>
                          )}
                          {task.comments && task.comments.length > 0 && (
                            <span className="flex items-center gap-1" title="Comments">
                              <MessageSquare className="h-3 w-3" />
                              {task.comments.length}
                            </span>
                          )}
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="flex items-center gap-1" title="Attachments">
                              <Paperclip className="h-3 w-3" />
                              {task.attachments.length}
                            </span>
                          )}
                        </div>
                        {task.assigneeNames && task.assigneeNames.length > 0 && (
                          <div className="flex -space-x-2">
                            {task.assigneeNames.slice(0, 3).map((name, i) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {getInitials(name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {task.assigneeNames.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">+{task.assigneeNames.length - 3}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Quick Add Task */}
                {addingTaskToColumn === column.id ? (
                  <Card className="border-primary">
                    <CardContent className="p-2">
                      <Input
                        ref={quickTaskInputRef}
                        value={quickTaskTitle}
                        onChange={(e) => setQuickTaskTitle(e.target.value)}
                        placeholder="Enter task title..."
                        className="mb-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuickCreateTask(column.id)
                          if (e.key === 'Escape') {
                            setAddingTaskToColumn(null)
                            setQuickTaskTitle('')
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleQuickCreateTask(column.id)}>
                          Add
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setAddingTaskToColumn(null)
                            setQuickTaskTitle('')
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => setAddingTaskToColumn(column.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add a card
                  </Button>
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Add a new task to your board</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add a more detailed description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Column</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(v) => setNewTask({ ...newTask, status: v as TaskStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KANBAN_COLUMNS.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${col.color}`} />
                          {col.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(v) => setNewTask({ ...newTask, priority: v as Task['priority'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_LABELS.map((label) => {
                  const isSelected = newTask.labels.some(l => l.id === label.id)
                  return (
                    <Badge
                      key={label.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer ${isSelected ? label.color : ''}`}
                      onClick={() => {
                        if (isSelected) {
                          setNewTask({ ...newTask, labels: newTask.labels.filter(l => l.id !== label.id) })
                        } else {
                          setNewTask({ ...newTask, labels: [...newTask.labels, label] })
                        }
                      }}
                    >
                      {label.name}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title.trim()}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedTask && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    {isEditMode ? (
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="text-xl font-semibold"
                      />
                    ) : (
                      <DialogTitle className="text-xl pr-8">{selectedTask.title}</DialogTitle>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>in</span>
                      <Select
                        value={selectedTask.status}
                        onValueChange={(v) => handleUpdateTaskStatus(selectedTask.id, v as TaskStatus)}
                      >
                        <SelectTrigger className="w-auto h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KANBAN_COLUMNS.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                {col.title}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditMode(!isEditMode)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {isEditMode ? 'Cancel Edit' : 'Edit'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDuplicateTask}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteTask(selectedTask.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="checklist">
                      Checklist
                      {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {selectedTask.checklist.filter(c => c.completed).length}/{selectedTask.checklist.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="comments">
                      Comments
                      {selectedTask.comments && selectedTask.comments.length > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {selectedTask.comments.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6 mt-0">
                    {/* Description */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                        <AlignLeft className="h-4 w-4" />
                        Description
                      </h4>
                      {isEditMode ? (
                        <Textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Add a more detailed description..."
                          rows={4}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedTask.description || 'No description provided. Click Edit to add one.'}
                        </p>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                          <Calendar className="h-4 w-4" />
                          Due Date
                        </h4>
                        {isEditMode ? (
                          <Input
                            type="date"
                            value={editForm.dueDate}
                            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                          />
                        ) : (
                          <p className={`text-sm ${selectedTask.dueDate && isOverdue(selectedTask.dueDate) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'Not set'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-foreground">Priority</h4>
                        {isEditMode ? (
                          <Select
                            value={editForm.priority}
                            onValueChange={(v) => setEditForm({ ...editForm, priority: v as Task['priority'] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getPriorityColor(selectedTask.priority)}>
                            {selectedTask.priority}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Assignees */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4" />
                        Assignees
                      </h4>
                      {selectedTask.assigneeNames && selectedTask.assigneeNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedTask.assigneeNames.map((name, i) => (
                            <div key={i} className="flex items-center gap-2 bg-muted px-2 py-1 rounded">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No assignees</p>
                      )}
                    </div>

                    {/* Labels */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                        <Tag className="h-4 w-4" />
                        Labels
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {DEFAULT_LABELS.map((label) => {
                          const isSelected = selectedTask.labels?.some(l => l.id === label.id)
                          return (
                            <Badge
                              key={label.id}
                              variant={isSelected ? 'default' : 'outline'}
                              className={`cursor-pointer transition-all ${isSelected ? label.color : 'hover:bg-muted'}`}
                              onClick={() => handleToggleLabel(label)}
                            >
                              {label.name}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>

                    {/* Created Info */}
                    <div className="text-xs text-muted-foreground pt-4 border-t">
                      Created by {selectedTask.createdBy} on {formatDateTime(selectedTask.createdAt)}
                    </div>
                  </TabsContent>

                  <TabsContent value="checklist" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                          <CheckSquare className="h-4 w-4" />
                          Checklist
                        </h4>
                        {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {selectedTask.checklist.filter(c => c.completed).length} of {selectedTask.checklist.length} complete
                          </span>
                        )}
                      </div>
                      
                      {/* Progress bar */}
                      {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                        <Progress value={getChecklistProgress(selectedTask)} className="h-2" />
                      )}

                      {/* Checklist items */}
                      <div className="space-y-2 mt-4">
                        {selectedTask.checklist?.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 group p-2 rounded hover:bg-muted/50">
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() => handleToggleChecklistItem(item.id)}
                            />
                            <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {item.text}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveChecklistItem(item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add checklist item */}
                      <div className="flex gap-2 pt-2">
                        <Input
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          placeholder="Add an item..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                        />
                        <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-foreground">
                        <MessageSquare className="h-4 w-4" />
                        Activity
                      </h4>

                      {/* Add comment */}
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(user?.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows={2}
                          />
                          <Button 
                            size="sm" 
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Comment
                          </Button>
                        </div>
                      </div>

                      {/* Comments list */}
                      <div className="space-y-4 pt-4 border-t">
                        {selectedTask.comments && selectedTask.comments.length > 0 ? (
                          selectedTask.comments.slice().reverse().map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs">
                                  {getInitials(comment.userName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{comment.userName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No comments yet. Be the first to comment!
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </ScrollArea>

              {isEditMode && (
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
