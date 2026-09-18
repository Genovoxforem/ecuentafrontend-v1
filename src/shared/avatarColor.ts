import type { IconColor } from './components/dashboard/DashboardKit'

// Deterministic per-name color + initials, purely decorative (same idea as
// the avatar-circle badges already used for third-party/user cells scraped
// elsewhere in this app, e.g. taskActivityParser.ts's real rows) — a stable
// hash over the name picks one of a small fixed palette so the same person
// always gets the same color across renders/pages. Shared by every list
// page that shows a per-employee/per-customer avatar chip instead of a real
// photo, so the same name always renders the same color everywhere.
const AVATAR_COLORS: IconColor[] = ['blue', 'green', 'violet', 'amber', 'rose', 'cyan', 'indigo']

export function avatarColorFor(name: string): IconColor {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}
