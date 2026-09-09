import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument } from '../../shared/legacyHtmlFetch'

// Project tags/categories (Dolibarr Categorie::TYPE_PROJECT=6) — the app's
// own custom /api/categories/ endpoint (used by the Customers Tags/Categories
// page) only exists for types 1/2/4 and 404s for other types, so this
// follows the same legacy-scrape pattern as the rest of the Projects module
// instead. Verified live against categories/card.php?type=6: real field
// names are label, description, color, parent, with hidden id="", type="6",
// type_id="", action=add, urlfrom, token.

const NOT_SIGNED_IN_MESSAGE =
  'Not signed into the legacy backend. Project categories have no usable REST API and read the real Dolibarr page directly — log out and back in to refresh that session, then retry.'

// categories/tag-sidebarlist-ajax.php — a genuine, already-deployed JSON
// endpoint (confirmed by reading it directly), not something added here.
// Its `type_id` param filters llx_categorie.type server-side (real column,
// matches TYPE_PROJECT=6 used by the create form above). It only returns
// 4 columns (rowid, label as "nom", color as "code_client", date_creation
// as "phone" — reused generic column aliases from whatever list template
// this was adapted from, but the underlying values are genuinely category
// data) and has no parent/hierarchy field at all, so this renders a flat
// list rather than fabricating the real page's tree structure. `length` is
// hardcoded to 25 server-side with no override, so this pages through
// `start` itself to build the full list for client-side name search —
// same "fetch everything, filter client-side" pattern already used
// elsewhere in this app (e.g. Tickets), capped at 10 pages as a sanity
// limit.
export interface ProjectCategoryRow {
  id: number
  label: string
  color: string | null
  dateCreation: string | null
}
interface RawCategoryRow {
  rowid: number
  nom: string
  code_client: string | null
  phone: string | null
}
interface RawCategoryListResponse {
  recordsTotal: number
  recordsFiltered: number
  data: RawCategoryRow[]
}

export function useProjectCategoriesList() {
  return useQuery({
    queryKey: ['projects', 'categories', 'list'],
    queryFn: async (): Promise<ProjectCategoryRow[]> => {
      const rows: ProjectCategoryRow[] = []
      for (let page = 0; page < 10; page++) {
        const res = await fetch(`/categories/tag-sidebarlist-ajax.php?type_id=6&start=${page * 25}`, { credentials: 'same-origin' })
        if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
        const data: RawCategoryListResponse = await res.json()
        rows.push(...data.data.map((r) => ({ id: r.rowid, label: r.nom, color: r.code_client, dateCreation: r.phone })))
        if (data.data.length < 25) break
      }
      return rows
    },
    staleTime: 1000 * 30,
  })
}

export interface ProjectCategoryFormContext {
  token: string
  parentOptions: { value: string; label: string }[]
}

function looksLikeLegacyLoginPage(doc: Document): boolean {
  return !doc.querySelector('form input[name="label"]') && !!doc.querySelector('input[name="password"]')
}

export function useProjectCategoryCreateForm() {
  return useQuery({
    queryKey: ['projects', 'categories', 'createForm'],
    queryFn: async (): Promise<ProjectCategoryFormContext> => {
      const doc = await fetchLegacyDocument('/categories/card.php', new URLSearchParams({ action: 'create', type: '6', mainmenu: 'projectmanagement', leftmenu: '' }))
      if (looksLikeLegacyLoginPage(doc)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const form = Array.from(doc.querySelectorAll<HTMLFormElement>('form')).find((f) => f.querySelector('input[name="label"]'))
      const parentSelect = form?.querySelector<HTMLSelectElement>('select[name="parent"]') ?? null
      const parentOptions = parentSelect
        ? Array.from(parentSelect.options)
            .map((o) => ({ value: o.value, label: (o.textContent ?? '').trim() }))
            .filter((o) => o.value !== '-1')
        : []
      return { token: (form?.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? '').trim(), parentOptions }
    },
    staleTime: 1000 * 30,
    retry: false,
  })
}

export function useCreateProjectCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; description: string; color: string; parent: string }) => {
      const form = queryClient.getQueryData<ProjectCategoryFormContext>(['projects', 'categories', 'createForm'])
      if (!form) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const body = new URLSearchParams({
        token: form.token,
        urlfrom: '',
        action: 'add',
        id: '',
        type: '6',
        type_id: '',
        label: input.label,
        description: input.description,
        color: input.color,
        parent: input.parent || '-1',
      })
      const res = await fetch('/categories/card.php?type=6', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        redirect: 'manual',
      })
      if (res.type !== 'opaqueredirect' && res.status === 200) {
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
        if (doc.querySelector('form input[name="label"]')) throw new Error('Could not create category — check the Ref. field.')
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects', 'categories'] }),
  })
}
