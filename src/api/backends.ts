export function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL?.trim()
  if (!url) throw new Error('VITE_BACKEND_URL is not configured')
  return url.replace(/\/$/, '')
}

export function resolveBackendAsset(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const origin = new URL(getBackendUrl()).origin
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}
