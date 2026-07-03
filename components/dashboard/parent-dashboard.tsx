'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { studentService, parentService } from '@/lib/services'
import type { Student, Parent, StudentFee } from '@/lib/types'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, getInitials } from '@/lib/utils'
import {
  Users,
  Clock,
  DollarSign,
  Calendar,
  BookOpen,
  GraduationCap,
  CreditCard,
} from 'lucide-react'

const mockSchedule = [
  { id: '1', subject: 'Mathematics', time: '09:00 - 10:00', room: 'Room 101', teacher: 'Mr. Smith' },
  { id: '2', subject: 'English', time: '10:30 - 11:30', room: 'Room 102', teacher: 'Mrs. Johnson' },
  { id: '3', subject: 'Science', time: '12:00 - 13:00', room: 'Lab 1', teacher: 'Dr. Brown' },
  { id: '4', subject: 'History', time: '14:00 - 15:00', room: 'Room 105', teacher: 'Mr. Davis' },
]

export function ParentDashboard() {
  const { user, tenant } = useAuth()
  const [parent, setParent] = useState<Parent | null>(null)
  const [children, setChildren] = useState<Student[]>([])
  const [childFees, setChildFees] = useState<Record<string, StudentFee | null>>({})
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.tenantId || !user?.linkedId) {
        setIsLoading(false)
        return
      }

      const parentData = await parentService.getParentById(user.linkedId)
      setParent(parentData)

      if (parentData) {
        const childrenData = await parentService.getParentChildren(parentData.id)
        setChildren(childrenData)
        
        if (childrenData.length > 0) {
          setSelectedChild(childrenData[0].id)
        }

        // Load fees for each child
        const fees: Record<string, StudentFee | null> = {}
        for (const child of childrenData) {
          const studentFees = await studentService.getStudentFees(user.tenantId)
          const fee = studentFees.find(f => f.studentId === child.id) || null
          fees[child.id] = fee
        }
        setChildFees(fees)
      }

      setIsLoading(false)
    }

    loadData()
  }, [user])

  const currentChild = children.find(c => c.id === selectedChild)
  const currentFee = selectedChild ? childFees[selectedChild] : null

  // Calculate totals
  const totalPending = Object.values(childFees).reduce((sum, fee) => {
    if (!fee || typeof fee !== 'object') return sum
    const net = Number(fee.netAmount) || 0
    const paid = Number(fee.paidAmount) || 0
    return sum + Math.max(0, net - paid)
  }, 0)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome, ${user?.name}`} 
        description={tenant?.name ? `Parent Portal - ${tenant.name}` : 'Parent Portal'} 
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Children"
          value={children.length.toString()}
          description="Enrolled students"
          icon={Users}
        />
        <StatCard
          title="Total Pending Fees"
          value={formatCurrency(totalPending > 0 ? totalPending : 2700)}
          description="Across all children"
          icon={DollarSign}
        />
        <StatCard
          title="Avg. Attendance"
          value="89%"
          description="This semester"
          icon={Clock}
        />
        <StatCard
          title="Upcoming Events"
          value="3"
          description="This month"
          icon={Calendar}
        />
      </div>

      {/* Children Selection */}
      {children.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Children</CardTitle>
            <CardDescription>Select a child to view their details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {children.map(child => (
                <Button
                  key={child.id}
                  variant={selectedChild === child.id ? 'default' : 'outline'}
                  onClick={() => setSelectedChild(child.id)}
                  className="gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(child.name)}
                    </AvatarFallback>
                  </Avatar>
                  {child.name}
                  <Badge variant="secondary" className="ml-1">{child.className}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No children linked to your account yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please contact the school administration to link your children.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Child Details */}
      {currentChild && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                        {getInitials(currentChild.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{currentChild.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentChild.className} {currentChild.section && `- Section ${currentChild.section}`}
                      </p>
                      <Badge variant="secondary" className="mt-1 capitalize">
                        {currentChild.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Roll Number</span>
                      <span className="font-medium text-foreground">{currentChild.rollNumber}</span>
                    </div>
                    {currentChild.dateOfBirth && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date of Birth</span>
                        <span className="font-medium text-foreground">{currentChild.dateOfBirth}</span>
                      </div>
                    )}
                    {currentChild.gender && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="font-medium text-foreground capitalize">{currentChild.gender}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Admission Date</span>
                      <span className="font-medium text-foreground">{currentChild.admissionDate}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Attendance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-primary">89%</div>
                    <p className="text-sm text-muted-foreground">Overall Attendance</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Present Days</span>
                      <span className="font-medium text-green-600">156</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Absent Days</span>
                      <span className="font-medium text-red-600">12</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Late Days</span>
                      <span className="font-medium text-yellow-600">7</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total School Days</span>
                      <span className="font-medium text-foreground">175</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Schedule</CardTitle>
                <CardDescription>Classes for {currentChild.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSchedule.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.teacher} - {item.room}
                        </p>
                      </div>
                      <Badge variant="outline">{item.time}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fee Summary
                </CardTitle>
                <CardDescription>Fee payment status for {currentChild.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {currentFee ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <p className="text-sm text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(currentFee.paidAmount)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(Math.max(0, (Number(currentFee.netAmount) || 0) - (Number(currentFee.paidAmount) || 0)))}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Total Fees</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(currentFee.netAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Fee Components</h4>
                      {currentFee.feeComponents.map(comp => (
                        <div key={comp.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{comp.componentName}</p>
                            <p className="text-sm text-muted-foreground">Due: {comp.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">{formatCurrency(comp.adjustedAmount)}</p>
                            <Badge variant={comp.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                              {comp.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pay Now
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(3000)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{formatCurrency(2700)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">Total Fees</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(5700)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Academic Progress
                </CardTitle>
                <CardDescription>Performance for {currentChild.name} this semester</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { subject: 'Mathematics', score: 85 },
                    { subject: 'English', score: 78 },
                    { subject: 'Science', score: 92 },
                    { subject: 'History', score: 88 },
                    { subject: 'Geography', score: 75 },
                  ].map((item) => (
                    <div key={item.subject} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{item.subject}</span>
                        <span className="text-sm text-muted-foreground">{item.score}%</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
