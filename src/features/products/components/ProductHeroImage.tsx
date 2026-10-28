import { useState } from 'react'
import { Avatar } from '../../../shared/components/Avatar'

// The product photo in the detail header, the way the classic page shows it: a white rounded card with a soft shadow that
// holds the whole picture (object-contain, so a tall bottle is not cropped to a square). Without a photo, or when it cannot
// be loaded, the initials badge is shown instead.
const SIZE = 72

export function ProductHeroImage({ src, name, fallbackRounded, fallbackColor }: { src: string | undefined; name: string; fallbackRounded: 'full' | 'lg'; fallbackColor: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <Avatar name={name} size={SIZE} rounded={fallbackRounded} color={fallbackColor} />
  return (
    <span className="flex shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-md ring-1 ring-black/10" style={{ width: SIZE, height: SIZE }}>
      <img src={src} alt={name} onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
    </span>
  )
}
