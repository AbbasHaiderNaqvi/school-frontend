'use client'

import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  BookOpen,
  Clock,
  Calendar,
} from 'lucide-react'

const mockSchedule = [
  { id: '1', subject: 'Mathematics', time: '09:00 - 10:00', room: 'Room 101', class: 'Grade 5A' },
  { id: '2', subject: 'Physics', time: '10:30 - 11:30', room: 'Lab 2', class: 'Grade 6B' },
  { id: '3', subject: 'Mathematics', time: '12:00 - 13:00', room: 'Room 103', class: 'Grade 5B' },
  { id: '4', subject: 'Science', time: '14:00 - 15:00', room: 'Lab 1', class: 'Grade 4A' },
]

export function TeacherDashboard() {
  const { user, tenant } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Welcome, ${user?.name}`} 
        description={tenant?.name || 'Teacher Dashboard'} 
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Classes"
          value="4"
          description="Assigned classes"
          icon={BookOpen}
        />
        <StatCard
          title="Total Students"
          value="120"
          description="Across all classes"
          icon={Users}
        />
        <StatCard
          title="Classes Today"
          value="4"
          description="Scheduled for today"
          icon={Calendar}
        />
        <StatCard
          title="Pending Assignments"
          value="8"
          description="To be graded"
          icon={Clock}
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
                    <p className="text-sm text-muted-foreground">{item.class} - {item.room}</p>
                  </div>
                  <Badge variant="outline">{item.time}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Class Overview */}
        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
            <CardDescription>Students in your assigned classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { class: 'Grade 5A', students: 32, attendance: 94 },
                { class: 'Grade 5B', students: 30, attendance: 97 },
                { class: 'Grade 6B', students: 28, attendance: 92 },
                { class: 'Grade 4A', students: 30, attendance: 96 },
              ].map((item) => (
                <div
                  key={item.class}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.class}</p>
                    <p className="text-sm text-muted-foreground">{item.students} students</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{item.attendance}%</p>
                    <p className="text-sm text-muted-foreground">Attendance</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
