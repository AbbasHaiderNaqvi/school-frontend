import type { TenantTheme } from '@/lib/services/branding'

// Picks readable black/white text over a given background color using relative luminance.
function contrastColor(hex?: string | null): string | undefined {
  if (!hex) return undefined
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return undefined
  const value = parseInt(match[1], 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

// The subdomain landing page is built entirely on the --sidebar-* CSS custom
// properties (see globals.css); the login page's dark left panel uses the same
// tokens, while its light right panel (form, Sign In button) uses the global
// --primary tokens. Overriding both sets inline on a page's root element
// re-themes it without touching any component — but --background/--card are
// deliberately left alone so the login page's light form panel doesn't go dark.
export function tenantThemeStyle(theme?: TenantTheme | null): Record<string, string> {
  if (!theme) return {}
  const style: Record<string, string> = {}

  if (theme.backgroundColor) {
    style['--sidebar'] = theme.backgroundColor
    const fg = contrastColor(theme.backgroundColor)
    if (fg) style['--sidebar-foreground'] = fg
  }
  if (theme.primaryColor) {
    style['--sidebar-primary'] = theme.primaryColor
    style['--primary'] = theme.primaryColor
    style['--ring'] = theme.primaryColor
    const fg = contrastColor(theme.primaryColor)
    if (fg) {
      style['--sidebar-primary-foreground'] = fg
      style['--primary-foreground'] = fg
    }
  }
  if (theme.secondaryColor) {
    style['--sidebar-accent'] = theme.secondaryColor
    const fg = contrastColor(theme.secondaryColor)
    if (fg) style['--sidebar-accent-foreground'] = fg
  }

  return style
}
