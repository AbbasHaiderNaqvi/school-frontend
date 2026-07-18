'use client'

import React from "react"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { getInitials } from '@/lib/utils'
import {
  GraduationCap,
  LayoutDashboard,
  LayoutList,
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
  Menu,
  BarChart3,
  BadgePercent,
  CalendarClock,
  Tags,
  MapPin,
  Ruler,
  Truck,
  PackageMinus,
  ArrowLeftRight,
  Repeat,
  ClipboardList,
  Boxes,
  ListChecks,
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
      { title: 'Fiscal Periods', href: '/dashboard/finance/periods', icon: CalendarClock, roles: ['tenant_accountant', 'tenant_admin', 'tenant_owner'] },
      { title: 'Reports', href: '/dashboard/finance/reports', icon: BarChart3, roles: ['tenant_accountant', 'tenant_admin', 'tenant_owner', 'tenant_principal'] },
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
      { title: 'Discounts & Scholarships', href: '/dashboard/fees/discounts', icon: BadgePercent, roles: ['tenant_admin', 'tenant_accountant', 'tenant_owner', 'tenant_principal'] },
      { title: 'Fee Collection', href: '/dashboard/cashier/fee-collection', icon: Wallet, roles: ['tenant_cashier', 'tenant_accountant', 'tenant_admin'] },
      { title: 'Receipts', href: '/dashboard/receipts', icon: FileText },
      { title: 'Reports', href: '/dashboard/fees/reports', icon: BarChart3, roles: ['tenant_accountant', 'tenant_admin', 'tenant_owner', 'tenant_principal'] },
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
      { title: 'Departments', href: '/dashboard/hr/departments', icon: Building2 },
      { title: 'Designations', href: '/dashboard/hr/designations', icon: GraduationCap },
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
      { title: 'Categories', href: '/dashboard/inventory/categories', icon: Tags },
      { title: 'Units', href: '/dashboard/inventory/units', icon: Ruler },
      { title: 'Locations', href: '/dashboard/inventory/locations', icon: MapPin },
      { title: 'Stock In (GRNs)', href: '/dashboard/inventory/grns', icon: Truck },
      { title: 'Stock Out (Issues)', href: '/dashboard/inventory/issues', icon: PackageMinus },
      { title: 'Transfers', href: '/dashboard/inventory/transfers', icon: ArrowLeftRight },
      { title: 'Condition Changes', href: '/dashboard/inventory/condition-changes', icon: Repeat },
      { title: 'Adjustments', href: '/dashboard/inventory/adjustments', icon: ClipboardList },
      { title: 'Stock & Movements', href: '/dashboard/inventory/stock', icon: Boxes },
      { title: 'Settings', href: '/dashboard/inventory/settings', icon: Settings },
    ],
  },
  {
    title: 'Students',
    href: '/dashboard/students',
    icon: GraduationCap,
    roles: ['tenant_admin', 'tenant_principal', 'tenant_accountant', 'hr', 'tenant_owner'],
    featureFlag: 'academics_module',
  },
  {
    title: 'Parents',
    href: '/dashboard/parents',
    icon: Users,
    roles: ['tenant_admin', 'tenant_principal', 'tenant_accountant', 'hr', 'tenant_owner'],
    featureFlag: 'academics_module',
  },
  {
    title: 'Academics',
    icon: GraduationCap,
    roles: ['tenant_admin', 'tenant_principal', 'teacher', 'tenant_owner'],
    featureFlag: 'academics_module',
    children: [
      { title: 'Classes', href: '/dashboard/academics/classes', icon: GraduationCap },
      { title: 'Sections', href: '/dashboard/academics/sections', icon: LayoutList },
      {
        title: 'Enrollments',
        href: '/dashboard/academics/enrollments',
        icon: ListChecks,
        roles: ['tenant_admin', 'tenant_principal', 'tenant_accountant', 'tenant_cashier', 'teacher', 'tenant_owner'],
      },
    ],
  },
  // {
  //   title: 'Task Board',
  //   href: '/dashboard/tasks',
  //   icon: ListTodo,
  //   featureFlag: 'task_module',
  // },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'General', href: '/dashboard/settings', icon: Settings },
      { title: 'Account Heads', href: '/dashboard/settings/account-heads', icon: FileText, roles: ['tenant_owner', 'super_admin'] },
    ],
  },
]

function SidebarBody({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()
  const { user, tenant, branding, features, logout } = useAuth()
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
        onClick={onLinkClick}
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
    <div className="flex flex-col h-full">
      {/* Logo/Tenant Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        {tenant ? (
          <>
            <div className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center overflow-hidden shrink-0">
              {branding?.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={tenant.name}
                  className="w-full h-full object-contain p-1"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <span className="text-lg font-bold text-sidebar-foreground">
                  {getInitials(tenant.name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sidebar-foreground truncate">{branding?.name || tenant.name}</h1>
              <p className="text-xs text-sidebar-foreground/60">School ERP</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sidebar-foreground">Mudirr</h1>
              <p className="text-xs text-sidebar-foreground/60">School Manager</p>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 px-4 py-4">
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
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:block fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <SidebarBody />
    </aside>
  )
}

export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  const { tenant, branding } = useAuth()

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-3 gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 bg-sidebar border-sidebar-border [&>button]:text-sidebar-foreground/70 [&>button]:hover:text-sidebar-foreground"
        >
          <SidebarBody onLinkClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0 overflow-hidden">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={tenant?.name || 'Logo'}
              className="w-full h-full object-contain"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <GraduationCap className="w-4 h-4 text-sidebar-primary-foreground" />
          )}
        </div>
        <span className="font-bold text-sidebar-foreground truncate text-sm">
          {tenant?.name ?? 'Mudirr'}
        </span>
      </div>
    </header>
  )
}
