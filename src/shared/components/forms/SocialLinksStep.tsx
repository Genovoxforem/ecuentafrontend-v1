import { type ComponentType } from 'react'
import { Phone, Camera, Ghost, Play, MessageCircle, Share2, Code2 } from 'lucide-react'
import { ICON_STYLES } from '../dashboard/DashboardKit'

type IconType = ComponentType<{ size?: number; className?: string }>

export interface SocialLinkField {
  key: string
  label: string
}

// Matches the reference Dolibarr wizard's "Links" step (societe/card.php and
// user/card.php both end on this identical field set) — shared between
// ThirdPartyCreateForm and UserCreateForm rather than duplicated.
export const SOCIAL_LINK_FIELDS: SocialLinkField[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'skype', label: 'Skype' },
  { key: 'twitter', label: 'Twitter' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'googlePlus', label: 'GooglePlus' },
  { key: 'youtube', label: 'Youtube' },
  { key: 'whatsapp', label: 'Whatsapp' },
  { key: 'diaspora', label: 'Diaspora' },
  { key: 'viber', label: 'Viber' },
  { key: 'github', label: 'Github' },
]

// lucide-react ships no brand/logo icons (removed project-wide for
// trademark reasons), so social platforms get a colored letter/glyph badge
// instead — closest available stand-in for brand recognition.
const SOCIAL_META: Record<string, { badge?: string; icon?: IconType; className: string }> = {
  facebook: { badge: 'f', className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  linkedin: { badge: 'in', className: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  twitter: { badge: 'X', className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
  skype: { icon: Phone, className: ICON_STYLES.cyan },
  instagram: { icon: Camera, className: ICON_STYLES.rose },
  snapchat: { icon: Ghost, className: ICON_STYLES.amber },
  googlePlus: { badge: 'G+', className: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400' },
  youtube: { icon: Play, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  whatsapp: { icon: MessageCircle, className: ICON_STYLES.green },
  diaspora: { icon: Share2, className: ICON_STYLES.indigo },
  viber: { icon: Phone, className: ICON_STYLES.violet },
  github: { icon: Code2, className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300' },
}

export function SocialField({ field, value, onChange }: { field: SocialLinkField; value: string; onChange: (value: string) => void }) {
  const meta = SOCIAL_META[field.key]
  const BadgeIcon = meta?.icon
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-muted">{field.label}</span>
      <div className="flex items-center gap-2.5 w-full rounded-lg border border-input-border bg-input-bg pl-1.5 pr-3 py-1.5 transition-shadow focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/30 focus-within:border-brand">
        <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${meta?.className ?? 'bg-surface-hover text-text-muted'}`}>
          {BadgeIcon ? <BadgeIcon size={14} /> : meta?.badge}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${field.label} username or link`}
          className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
        />
      </div>
    </label>
  )
}

export function SocialLinksStep({ values, onChange }: { values: Record<string, string>; onChange: (key: string) => (value: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Share2 size={14} className="text-brand" />
          <h4 className="text-xs font-semibold text-text-faint uppercase tracking-wide">Social Profiles</h4>
        </div>
        <span className="text-xs text-text-faint">All fields optional</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-4">
        {SOCIAL_LINK_FIELDS.map((field) => (
          <SocialField key={field.key} field={field} value={values[field.key] ?? ''} onChange={onChange(field.key)} />
        ))}
      </div>
    </div>
  )
}
