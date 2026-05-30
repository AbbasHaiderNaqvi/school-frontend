'use client'

import React from "react"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  Receipt,
  Clock,
  UserCog,
  Package,
  ListTodo,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  FileText,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  children?: NavItem[]
  featureFlag?: string
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Tenants',
    href: '/dashboard/tenants',
    icon: Building2,
    roles: ['super_admin'],
  },
  {
    title: 'Feature Flags',
    href: '/dashboard/features',
    icon: Shield,
    roles: ['super_admin'],
  },
  {
    title: 'User Management',
    href: '/dashboard/users',
    icon: UserCog,
    roles: ['super_admin', 'tenant_owner', 'tenant_admin'],
  },
  {
    title: 'Finance',
    icon: Wallet,
    roles: ['tenant_admin', 'tenant_principal', 'tenant_accountant', 'tenant_owner'],
    featureFlag: 'finance_module',
    children: [
      { title: 'Overview', href: '/dashboard/finance', icon: LayoutDashboard },
      { title: 'GL Accounts', href: '/dashboard/finance/gl', icon: FileText, roles: ['tenant_accountant', 'tenant_admin', 'tenant_owner'] },
      { title: 'All Transactions', href: '/dashboard/finance/all-transactions', icon: Receipt },
      { title: 'Transaction Flow', href: '/dashboard/finance/transactions-flow', icon: Wallet, roles: ['tenant_accountant', 'tenant_admin', 'tenant_principal'] },
      { title: 'Expenses', href: '/dashboard/finance/expenses', icon: Wallet, roles: ['tenant_accountant', 'tenant_admin', 'tenant_principal'] },
      { title: 'Budgets', href: '/dashboard/finance/budgets', icon: Briefcase, roles: ['tenant_accountant', 'tenant_admin', 'tenant_owner'] },
      { title: 'Expense Approvals', href: '/dashboard/finance/expense-approvals', icon: CheckCircle2, roles: ['tenant_owner', 'tenant_principal'] },
      { title: 'Approval Threshold', href: '/dashboard/finance/threshold', icon: DollarSign, roles: ['tenant_owner', 'super_admin'] },
    ],
  },
  {
    title: 'Fee Management',
    icon: Receipt,
    roles: ['tenant_admin', 'tenant_principal', 'tenant_accountant', 'tenant_cashier', 'tenant_owner'],
    featureFlag: 'fee_module',
    children: [
      { title: 'Overview', href: '/dashboard/fees', icon: LayoutDashboard },
      { title: 'Student Fees', href: '/dashboard/fees/students', icon: Users },
      { title: 'Fee Structures', href: '/dashboard/fees/structures', icon: FileText, roles: ['tenant_admin', 'tenant_accountant', 'tenant_owner'] },
      { title: 'Invoices', href: '/dashboard/fees/invoices', icon: Receipt },
      { title: 'Payments', href: '/dashboard/fees/payments', icon: Wallet },
      { title: 'Fee Collection', href: '/dashboard/cashier/fee-collection', icon: Wallet, roles: ['tenant_cashier', 'tenant_accountant', 'tenant_admin'] },
      { title: 'Receipts', href: '/dashboard/receipts', icon: FileText },
    ],
  },
  {
    title: 'HR & Employees',
    icon: UserCog,
    roles: ['tenant_admin', 'tenant_principal', 'hr', 'tenant_owner'],
    featureFlag: 'hr_module',
    children: [
      { title: 'Overview', href: '/dashboard/hr', icon: LayoutDashboard },
      { title: 'Employees', href: '/dashboard/hr/employees', icon: Users },
      { title: 'Payroll', href: '/dashboard/hr/payroll', icon: Wallet, roles: ['tenant_admin', 'tenant_accountant', 'hr', 'tenant_owner'] },
      { title: 'Job Openings', href: '/dashboard/hr/jobs', icon: Briefcase },
      { title: 'Leave Requests', href: '/dashboard/hr/leaves', icon: AlertCircle },
    ],
  },
  {
    title: 'Attendance',
    href: '/dashboard/attendance',
    icon: Clock,
    roles: ['tenant_admin', 'tenant_principal', 'hr', 'teacher', 'tenant_owner'],
    featureFlag: 'attendance_module',
  },
  {
    title: 'Inventory',
    icon: Package,
    roles: ['tenant_admin', 'tenant_principal', 'tenant_owner'],
    featureFlag: 'inventory_module',
    children: [
      { title: 'Overview', href: '/dashboard/inventory', icon: LayoutDashboard },
      { title: 'Items', href: '/dashboard/inventory/items', icon: Package },
      { title: 'Assets', href: '/dashboard/inventory/assets', icon: Package },
      { title: 'Movements', href: '/dashboard/inventory/movements', icon: FileText },
    ],
  },
  {
    title: 'Task Board',
    href: '/dashboard/tasks',
    icon: ListTodo,
    featureFlag: 'task_module',
  },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'General', href: '/dashboard/settings', icon: Settings },
      { title: 'Account Heads', href: '/dashboard/settings/account-heads', icon: FileText, roles: ['tenant_owner', 'super_admin'] },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, tenant, features, logout } = useAuth()
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  const isFeatureEnabled = (featureFlag?: string) => {
    if (!featureFlag) return true
    if (user?.role === 'super_admin') return true
    return features?.[featureFlag] !== false
  }

  const hasAccess = (item: NavItem) => {
    if (!item.roles) return true
    return item.roles.includes(user?.role || '')
  }

  const filteredNavItems = navItems.filter(
    (item) => hasAccess(item) && isFeatureEnabled(item.featureFlag)
  )

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = item.href ? pathname === item.href : false
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openItems.includes(item.title)

    if (hasChildren) {
      const visibleChildren = item.children!.filter(
        (child) => hasAccess(child) && isFeatureEnabled(child.featureFlag)
      )

      if (visibleChildren.length === 0) return null

      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={() => toggleItem(item.title)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.title}</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-4 pl-4 border-l border-sidebar-border space-y-1">
            {visibleChildren.map((child) => renderNavItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      )
    }

    return (
      <Link
        key={item.title}
        href={item.href || '#'}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex flex-col h-full">
        {/* Logo/Tenant Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          {tenant ? (
            <>
              <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden">
                {tenant.logo ? (
                  <img 
                    src={tenant.logo || "/placeholder.svg"} 
                    alt={tenant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-sidebar-foreground">
                    {getInitials(tenant.name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-sidebar-foreground truncate">{tenant.name}</h1>
                <p className="text-xs text-sidebar-foreground/60">School ERP</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-sidebar-foreground">Mudirr</h1>
                <p className="text-xs text-sidebar-foreground/60">School Manager</p>
              </div>
            </>
          )}
        </div>

        {/* Tenant contact info badge (if admin) */}
        {tenant && tenant.contactInfo?.email && ['admin', 'principal', 'tenant_owner'].includes(user?.role || '') && (
          <div className="px-4 py-2 border-b border-sidebar-border">
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/30 space-y-1">
              <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{tenant.contactInfo.email}</span>
              </div>
              {tenant.contactInfo.phone && (
                <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
                  <span className="w-3 text-center">P</span>
                  <span className="truncate">{tenant.contactInfo.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-1">{filteredNavItems.map((item) => renderNavItem(item))}</nav>
        </ScrollArea>

        {/* User section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                {getInitials(user?.name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.name}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-sidebar-foreground/60" />
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  )
}
