import { useQuery } from '@tanstack/react-query'

export interface AssetRow {
  id: number
  ref: string
  label: string
  createdAt: string
}

interface RawAssetListResponse {
  draw: number
  recordsTotal: string
  recordsFiltered: string
  data: { rowid: string; nom: string; code_client: string | null; phone: string }[]
}

// Real via asset/assets-sidebar-list-ajax.php — confirmed by reading the PHP
// source directly. This is a generic DataTables template originally built
// for the Asset card's sidebar widget (see asset/assets-sidebar-list.php,
// included from asset/card.php), reused here as the only real JSON this
// module exposes — the module's actual "Assets Details" page (asset/list.php)
// is a classic server-rendered list with no JSON API of its own.
//
// Column names are copy-pasted from an unrelated customer-list template and
// don't match their real content: 'nom' is actually the asset ref,
// 'code_client' is actually the asset label, 'phone' is actually the
// creation date. Verified against llx_asset directly, not guessed.
//
// No permission check of any kind (no hasRight/restrictedArea) and the
// server hardcodes length=25 regardless of what's requested, with $start
// interpolated into the SQL LIMIT clause unescaped — flagged, not fixed
// (frontend-only scope).
export function useAssetsList(page: number, length: number) {
  return useQuery({
    queryKey: ['fixedAssets', 'list', page, length],
    queryFn: async (): Promise<{ rows: AssetRow[]; total: number; filtered: number }> => {
      const body = new URLSearchParams({ draw: '1', start: String(page * length) })
      const res = await fetch('/asset/assets-sidebar-list-ajax.php', { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const data: RawAssetListResponse = await res.json()
      return {
        rows: data.data.map((row) => ({
          id: Number(row.rowid),
          ref: row.nom,
          label: row.code_client ?? '—',
          createdAt: row.phone,
        })),
        total: Number(data.recordsTotal),
        filtered: Number(data.recordsFiltered),
      }
    },
  })
}
