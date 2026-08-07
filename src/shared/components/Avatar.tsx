import { useState } from 'react'

function initialsOf(name: string) {
  const parts = (name || '').split(/[^a-zA-Z0-9]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Renders the user's real profile photo when one loads successfully, falling
// back to an initials badge otherwise (covers both "no photo on file" and
// "photo URL points at something we can't fetch", e.g. the legacy PHP app's
// session-gated viewimage.php — see auth.api.ts).
export function Avatar({
  photo,
  name,
  size = 36,
  rounded = 'full',
  className = '',
}: {
  photo?: string
  name: string
  size?: number
  rounded?: 'full' | 'lg'
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(photo) && !failed
  const roundedClass = rounded === 'full' ? 'rounded-full' : 'rounded-lg'

  if (showPhoto) {
    return (
      <img
        src={photo}
        alt={name}
        onError={() => setFailed(true)}
        className={`${roundedClass} object-cover shrink-0 ring-1 ring-black/10 dark:ring-white/15 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={`${roundedClass} bg-teal-500 text-white font-semibold flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initialsOf(name)}
    </span>
  )
}
