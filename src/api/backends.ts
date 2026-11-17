export function getBackendUrl(): string {
  const url = import.meta.env.VITE_BACKEND_URL?.trim()
  if (!url) throw new Error('VITE_BACKEND_URL is not configured')
  return url.replace(/\/$/, '')
}

/**
 * Returns true if the frontend is running on a different origin than the backend
 * (excluding local dev/preview on localhost/127.0.0.1 where Vite proxy handles requests).
 */
export function isCrossOriginDeployment(): boolean {
  if (typeof window === 'undefined') return false
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return false
  }
  try {
    const backend = new URL(getBackendUrl())
    return window.location.origin !== backend.origin
  } catch {
    return false
  }
}

export function resolveBackendUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (isCrossOriginDeployment()) {
    const backend = getBackendUrl()
    return `${backend}${path.startsWith('/') ? '' : '/'}${path}`
  }
  return path
}

export function resolveBackendAsset(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) {
    const assetUrl = new URL(path)
    const backendOrigin = new URL(getBackendUrl()).origin
    return assetUrl.origin === backendOrigin ? `${assetUrl.pathname}${assetUrl.search}${assetUrl.hash}` : path
  }
  const origin = new URL(getBackendUrl()).origin
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}
