import type { Tenant, UserRole } from './types'

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['all'],
  tenant_owner: [
    'dashboard',
    'finance',
    'approvals',
    'accounts',
    'settings',
    'students',
    'parents',
    'employees',
    'attendance',
    'tasks',
    'inventory',
    'fees',
    'hr',
  ],
  admin: [
    'dashboard',
    'finance',
    'accounts',
    'settings',
    'students',
    'parents',
    'employees',
    'attendance',
    'tasks',
    'inventory',
    'fees',
    'hr',
  ],
  principal: [
    'dashboard',
    'finance',
    'approvals',
    'students',
    'teachers',
    'attendance',
    'tasks',
    'fees',
    'employees',
    'settings',
  ],
  vice_principal: ['dashboard', 'students', 'teachers', 'attendance', 'tasks', 'fees'],
  admin_assistant: ['dashboard', 'students', 'parents', 'attendance', 'tasks'],
  teacher: ['dashboard', 'students', 'attendance', 'tasks', 'fees'],
  accountant: ['dashboard', 'finance', 'fees', 'expenses', 'budgets', 'payroll'],
  hr: ['dashboard', 'employees', 'hr', 'attendance', 'payroll'],
  student: ['dashboard', 'fees', 'grades', 'attendance', 'tasks'],
  parent: ['dashboard', 'fees', 'students', 'attendance'],
}

export const FEATURE_MODULE_MAP: Record<string, string> = {
  finance: 'finance_module',
  hr: 'hr_module',
  inventory: 'inventory_module',
  tasks: 'task_module',
  attendance: 'attendance_module',
  fees: 'fee_module',
}

export function hasAccess(role: UserRole, feature: string): boolean {
  if (role === 'super_admin') return true

  const permissions = ROLE_PERMISSIONS[role] || []
  if (permissions.includes('all')) return true

  return permissions.includes(feature)
}

export function canAccessFeature(
  role: UserRole,
  feature: string,
  tenant?: Tenant | null,
): boolean {
  // Role-based access
  if (!hasAccess(role, feature)) return false

  // Tenant feature toggle check
  if (tenant) {
    const moduleKey = FEATURE_MODULE_MAP[feature] as keyof typeof tenant.features
    if (moduleKey && !tenant.features[moduleKey]) {
      return false
    }
  }

  return true
}

export function getAvailableFeatures(role: UserRole, tenant?: Tenant | null): string[] {
  let features = ROLE_PERMISSIONS[role] || []

  if (role === 'super_admin') {
    features = ['all']
  }

  if (tenant && features.includes('all') === false) {
    features = features.filter(f => {
      const moduleKey = FEATURE_MODULE_MAP[f] as keyof typeof tenant.features
      return !moduleKey || tenant.features[moduleKey]
    })
  }

  return features
}
