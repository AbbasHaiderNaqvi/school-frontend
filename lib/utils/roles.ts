import type { User, UserRole } from '@/lib/types'

/**
 * Check if user has a specific role (including multi-role support)
 */
export function hasRole(user: User | null | undefined, role: UserRole): boolean {
  if (!user) return false
  if (user.role === role) return true
  if (user.roles && user.roles.includes(role)) return true
  return false
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: User | null | undefined, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.some(role => hasRole(user, role))
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(user: User | null | undefined, roles: UserRole[]): boolean {
  if (!user) return false
  return roles.every(role => hasRole(user, role))
}

/**
 * Get all roles for a user (primary + additional)
 */
export function getAllRoles(user: User | null | undefined): UserRole[] {
  if (!user) return []
  const roles = [user.role]
  if (user.roles) {
    roles.push(...user.roles)
  }
  return [...new Set(roles)] // Remove duplicates
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    tenant_owner: 'Tenant Owner',
    tenant_admin: 'Tenant Admin',
    tenant_accountant: 'Accountant',
    tenant_cashier: 'Cashier',
    tenant_principal: 'Principal',
    teacher: 'Teacher',
    hr: 'HR Manager',
    student: 'Student',
    parent: 'Parent',
  }
  return roleNames[role] || role
}
