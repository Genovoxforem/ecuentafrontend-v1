import { useMutation } from '@tanstack/react-query'

// Generic write-only endpoint — core/ajax/constantonoff.php. It does
// exactly ecuenta_set_const()/ecuenta_del_const() for a named llx_const
// row, gated on $user->admin (session-cookie auth, same as every other
// legacy admin page). It is the ONLY API in the Admin/Setup module — every
// other field on every Setup page is a classic form-POST-and-redirect with
// no JSON equivalent.
//
// Important limitation: this endpoint has no read/list counterpart and
// returns no response body on success, so there is no way to know a
// constant's CURRENT stored value before the user first toggles it here.
// Every toggle wired to this hook therefore starts from a locally-assumed
// default (matching the reference screenshot) — flipping it does send a
// request, but its initial position on page load is not verified against
// the database.
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
