import axios from 'axios'

// Sales-order tab APIs: commande/fapi/{order,notes,documents,contacts,agenda,form_options}.php,
// expedition/api/shipment.php, consumption/api/history.php. They answer the same envelope as
// commande/fapi/* ({success, data, message, errors}) with the same field names, so each hook
// asks the new endpoint first and falls back to the existing fapi call when that route is not
// deployed on the connected backend (an HTML 404). A JSON error from the new endpoint — e.g.
// "Order not found" — is a real answer and is never retried on the old route.
const missingRoutes = new Set<string>()

// Thrown when a request that should answer JSON got the dev server's / web server's HTML page back with a 200
// (an unproxied path in dev falls through to the SPA's index.html).
export class MissingRouteError extends Error {
  constructor() {
    super('API route is not available on this backend.')
    this.name = 'MissingRouteError'
  }
}

// Returns the response when its body is JSON, otherwise reports the route as missing.
export function requireJson<T extends { data: unknown }>(res: T): T {
  if (typeof res.data !== 'object' || res.data === null) throw new MissingRouteError()
  return res
}

export function isMissingRoute(err: unknown): boolean {
  if (err instanceof MissingRouteError) return true
  if (!axios.isAxiosError(err) || !err.response) return false
  const { status, data } = err.response
  // A deployed endpoint always answers JSON; a missing route answers the web server's HTML 404/405.
  return (status === 404 || status === 405 || status === 501) && (typeof data !== 'object' || data === null)
}

// `key` names the route (e.g. 'notes') so one 404 is remembered and later calls skip straight to the fallback.
export async function preferNewApi<T>(key: string, primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (!missingRoutes.has(key)) {
    try {
      return await primary()
    } catch (err) {
      if (!isMissingRoute(err)) throw err
      missingRoutes.add(key)
    }
  }
  return fallback()
}

// New order workflow actions (commande/fapi/order.php?action=…) for the legacy fapi action names the UI uses.
export const NEW_ORDER_ACTIONS: Record<string, string> = {
  modif: 'restore_draft',
  validate: 'validate',
  reopen: 'reopen',
  shipped: 'classify_delivered',
  cancel: 'cancel',
  classifybilled: 'classify_billed',
  classifyunbilled: 'classify_unbilled',
  clone: 'clone',
  delete: 'delete',
  builddoc: 'build_doc',
}
