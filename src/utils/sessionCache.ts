// Answers the app asks for once per sign-in (the menu, the bell count, the clock status, the leads pill) are kept for the
// browser session, so a reload or a new tab opens from them instead of asking the backend again. They are only the
// screen's view: every request is still checked by the server. Cleared when the user logs out.
const PREFIX = 'ecuenta_sess:'

export function readSessionCache<T>(key: string): T | undefined {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw === null ? undefined : (JSON.parse(raw) as T)
  } catch {
    return undefined
  }
}

export function writeSessionCache(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage unavailable: the next load just asks again */
  }
}

export function clearSessionCache(): void {
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(PREFIX)) sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
