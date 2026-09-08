import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { parseInventoryLinesPage, LINES_PER_PAGE, type InventoryLinesPage } from './inventoryLines'

const BASE = '/product/inventory/inventory.php'

function linesQueryKey(id: string | undefined, page: number) {
  return ['warehouses', 'inventoryLines', id, page] as const
}

function invalidateLines(queryClient: ReturnType<typeof useQueryClient>, id: string) {
  queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryLines', id] })
  queryClient.invalidateQueries({ queryKey: ['warehouses', 'inventoryDetail', id] })
}

// This theme surfaces a real action failure via an inline
// showToast(msg, "error") script call rather than a non-2xx status or a
// static error div — same finding as inventoryEmail.queries.ts and
// useDeleteInventoryReal in warehouseExtras.queries.ts.
function extractToastError(html: string): string | null {
  const m = html.match(/showToast\("((?:[^"\\]|\\.)*)",\s*"error"\)/)
  if (!m) return null
  const div = document.createElement('div')
  div.innerHTML = m[1].replace(/\\'/g, "'")
  return (div.textContent ?? 'The legacy backend rejected this action.').trim()
}

export function useInventoryLinesPage(id: string | undefined, page: number) {
  return useQuery<InventoryLinesPage>({
    queryKey: linesQueryKey(id, page),
    queryFn: async () => {
      const res = await fetch(`${BASE}?id=${id}&page=${page}&limit=${LINES_PER_PAGE}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      return parseInventoryLinesPage(await res.text())
    },
    enabled: !!id,
  })
}

async function scrapeToken(id: string): Promise<string> {
  const res = await fetch(`${BASE}?id=${id}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
  const html = await res.text()
  const match = html.match(/name="token" value="([a-f0-9]+)"/)
  if (!match) throw new Error('Could not find a CSRF token on the legacy page.')
  return match[1]
}

export interface AddInventoryLineInput {
  id: string
  fkWarehouse: string
  fkProduct: string
  qty: string
}

// Real contract confirmed live: POST action=updateinventorylines (the
// form's own default hidden action) + addline=Add + fk_warehouse +
// fk_product + qtytoadd. Verified end-to-end against a disposable test
// record — the new line appeared with the exact submitted values.
export function useAddInventoryLineReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AddInventoryLineInput) => {
      const token = await scrapeToken(input.id)
      const body = new URLSearchParams({
        token,
        action: 'updateinventorylines',
        id: input.id,
        sortfield: 'e.ref',
        sortorder: 'ASC',
        fk_warehouse: input.fkWarehouse,
        fk_product: input.fkProduct,
        qtytoadd: input.qty,
        addline: 'Add',
      })
      const res = await fetch(`${BASE}?page=0&id=${input.id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const err = extractToastError(html)
      if (err) throw new Error(err)
    },
    onSuccess: (_data, input) => invalidateLines(queryClient, input.id),
  })
}

export interface SaveInventoryLinesInput {
  id: string
  page: number
  lines: { lineId: number; realQty: string; stockQtySnapshot: string }[]
}

// Real contract confirmed live: POST action=updateinventorylines with
// id_<lineid>=<new real qty> + stock_qty_<lineid>=<the same hidden snapshot
// the page rendered> for every row on the current page — this is exactly
// what the real page's own "Save" button submits (the whole #formrecord).
export function useUpdateInventoryLinesReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveInventoryLinesInput) => {
      const token = await scrapeToken(input.id)
      const body = new URLSearchParams({ token, action: 'updateinventorylines', id: input.id, sortfield: 'e.ref', sortorder: 'ASC' })
      for (const line of input.lines) {
        body.set(`id_${line.lineId}`, line.realQty)
        body.set(`stock_qty_${line.lineId}`, line.stockQtySnapshot)
      }
      const res = await fetch(`${BASE}?page=${input.page}&id=${input.id}`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const err = extractToastError(html)
      if (err) throw new Error(err)
    },
    onSuccess: (_data, input) => invalidateLines(queryClient, input.id),
  })
}

// Real two-step GET flow, same shape as Delete/Back-to-Draft elsewhere in
// this module: `action=deleteline` only shows a confirm box; its real "Yes"
// target is `action=confirm_deleteline&confirm=yes`. Verified live — the
// line was gone from a fresh re-fetch afterward.
export function useDeleteInventoryLineReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; page: number; lineId: number }) => {
      const token = await scrapeToken(input.id)
      const params = new URLSearchParams({
        id: input.id,
        lineid: String(input.lineId),
        action: 'confirm_deleteline',
        confirm: 'yes',
        page: String(input.page),
        sortfield: 'e.ref',
        sortorder: 'ASC',
        token,
      })
      const res = await fetch(`${BASE}?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const err = extractToastError(html)
      if (err) throw new Error(err)
    },
    onSuccess: (_data, input) => invalidateLines(queryClient, input.id),
  })
}

// Real two-step flow read directly off the PHP source's own
// $form->formconfirm(...) calls (not live-tested — see inventoryLines.ts's
// header comment for why): `action=record` only renders a confirm box
// targeting `action=update`, which is the action that actually walks every
// line, computes the Real-minus-Expected delta, and posts a genuine
// MouvementStock for each one before marking the inventory Recorded.
export function useCloseInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; page: number }) => {
      const token = await scrapeToken(input.id)
      const params = new URLSearchParams({ id: input.id, action: 'update', confirm: 'yes', page: String(input.page), token })
      const res = await fetch(`${BASE}?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const err = extractToastError(html)
      if (err) throw new Error(err)
    },
    onSuccess: (_data, input) => invalidateLines(queryClient, input.id),
  })
}

// Real two-step flow, same source-reading confidence as Close above:
// `action=confirm_cancel` only renders a confirm box targeting
// `action=cancel_record`, which calls Inventory::setCanceled().
export function useCancelInventoryReal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await scrapeToken(id)
      const params = new URLSearchParams({ id, action: 'cancel_record', confirm: 'yes', token })
      const res = await fetch(`${BASE}?${params.toString()}`, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      const err = extractToastError(html)
      if (err) throw new Error(err)
    },
    onSuccess: (_data, id) => invalidateLines(queryClient, id),
  })
}
