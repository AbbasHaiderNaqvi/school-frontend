'use client'

import { useAuth } from '@/contexts/auth-context'
import { SuperAdminDashboard } from '@/components/dashboard/super-admin-dashboard'
import { TenantAdminDashboard } from '@/components/dashboard/tenant-admin-dashboard'
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard'
import { AccountantDashboard } from '@/components/dashboard/accountant-dashboard'
import { HRDashboard } from '@/components/dashboard/hr-dashboard'
import { StudentDashboard } from '@/components/dashboard/student-dashboard'
import { ParentDashboard } from '@/components/dashboard/parent-dashboard'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  switch (user.role) {
    case 'super_admin':
      return <SuperAdminDashboard />
    case 'tenant_owner':
      return <TenantAdminDashboard />
    case 'tenant_admin':
      return <TenantAdminDashboard />
    case 'tenant_accountant':
      return <AccountantDashboard />
    case 'tenant_cashier':
      return <AccountantDashboard />
    case 'tenant_principal':
      return <TenantAdminDashboard />
    case 'teacher':
      return <TeacherDashboard />
    case 'hr':
      return <HRDashboard />
    case 'student':
      return <StudentDashboard />
    case 'parent':
      return <ParentDashboard />
    default:
      return <TenantAdminDashboard />
  }
}
