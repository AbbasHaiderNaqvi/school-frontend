'use client'

import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import {
  GraduationCap,
  Clock,
  DollarSign,
  Calendar,
  BookOpen,
} from 'lucide-react'

const mockSchedule = [
  { id: '1', subject: 'Mathematics', time: '09:00 - 10:00', room: 'Room 101', teacher: 'Mr. Smith' },
  { id: '2', subject: 'English', time: '10:30 - 11:30', room: 'Room 102', teacher: 'Mrs. Johnson' },
  { id: '3', subject: 'Science', time: '12:00 - 13:00', room: 'Lab 1', teacher: 'Dr. Brown' },
  { id: '4', subject: 'History', time: '14:00 - 15:00', room: 'Room 105', teacher: 'Mr. Davis' },
]

export function StudentDashboard() {
  const { user, tenant } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome, ${user?.name}`} 
        description={tenant?.name || 'Student Portal'} 
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Attendance"
          value="92%"
          description="This semester"
          icon={Clock}
        />
        <StatCard
          title="Pending Fees"
          value={formatCurrency(2700)}
          description="Due by Feb 15"
          icon={DollarSign}
        />
        <StatCard
          title="Classes Today"
          value="4"
          description="Scheduled classes"
          icon={Calendar}
        />
        <StatCard
          title="Assignments"
          value="3"
          description="Pending submission"
          icon={BookOpen}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
            <CardDescription>Your classes for today</CardDescription>
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

        {/* Academic Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Progress</CardTitle>
            <CardDescription>Your performance this semester</CardDescription>
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
      </div>

      {/* Fee Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Summary</CardTitle>
          <CardDescription>Your fee payment status</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  )
}
