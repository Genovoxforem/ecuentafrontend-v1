import { Package } from 'lucide-react'

// Renders the legacy AJAX row's own colored circular icon badge (see
// productAjax.ts's avatarBg/avatarColor) so list rows match the reference
// app's per-product icon instead of a flat monochrome one. Falls back to a
// neutral badge when rich data hasn't loaded yet or a ref wasn't found.
export function ProductAvatar({ bg, color }: { bg?: string | null; color?: string | null }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full shrink-0 w-8 h-8" style={{ backgroundColor: bg ?? 'var(--color-surface-hover)' }}>
      <Package size={14} style={{ color: color ?? 'var(--color-text-faint)' }} />
    </span>
  )
}
