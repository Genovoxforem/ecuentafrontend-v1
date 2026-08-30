import { useMutation } from '@tanstack/react-query'

// Real, generic write-only endpoint — core/ajax/constantonoff.php, confirmed
// by reading its PHP directly. It does exactly ecuenta_set_const()/
// ecuenta_del_const() for a named llx_const row, gated on $user->admin
// (session-cookie auth, same as every other legacy admin page). It is the
// ONLY real API anywhere in the Admin/Setup module — every other field on
// every Setup page is a classic form-POST-and-redirect with no JSON
// equivalent (confirmed this session across all 13 Setup pages).
//
// Important limitation: this endpoint has no read/list counterpart and
// returns no response body on success, so there is no real way to know a
// constant's CURRENT stored value before the user first toggles it here.
// Every toggle wired to this hook therefore starts from a locally-assumed
// default (matching the reference screenshot), not a confirmed live value —
// flipping it does send a genuine request, but its initial position on page
// load is not verified against the database.
export function useToggleConstant() {
  return useMutation({
    mutationFn: async ({ name, on, value = '1' }: { name: string; on: boolean; value?: string | number }) => {
      const params = new URLSearchParams({ action: on ? 'set' : 'del', name })
      if (on) params.set('value', String(value))
      const res = await fetch(`/core/ajax/constantonoff.php?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
    },
  })
}
