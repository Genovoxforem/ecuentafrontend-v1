import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAsycudaProductSearch, useAsycudaSaveImportProduct } from '../asycudaImport.queries'
import type { LinkedProduct } from '../asycudaRowParser'
import { ROUTES } from '../../../routes'

// Reproduces the real zra-import.php page's own per-row "Search product..."
// widget (product-search-input-main / selectMainProduct / fnRemoveMainProduct
// in that file's own JS) — a debounced live search against the real
// custom/zra/product_search_api.php, saving the pick via custom/zra/
// save_import_products.php. This is a genuinely separate capability from
// "Create product" / "Split" beside it: it links an ALREADY-EXISTING
// product to this import row without creating anything new.
export function AsycudaProductLink({ taskCd, itemSeq, initial }: { taskCd: string; itemSeq: string; initial: LinkedProduct | null }) {
  const [linked, setLinked] = useState(initial)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const save = useAsycudaSaveImportProduct()
  const { data: results, isFetching } = useAsycudaProductSearch(debounced)

  useEffect(() => setLinked(initial), [initial])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  function handleSelect(r: { id: string; text: string }) {
    setOpen(false)
    save.mutate(
      { taskCd, itemSeq, productId: r.id },
      { onSuccess: (res) => res.success && (setLinked({ id: r.id, name: r.text }), setQuery('')) },
    )
  }

  function handleRemove() {
    if (!confirm('Remove this product assignment?')) return
    save.mutate({ taskCd, itemSeq, productId: null }, { onSuccess: (res) => res.success && setLinked(null) })
  }

  if (linked) {
    return (
      <div className="relative inline-flex items-center max-w-[160px] rounded-md border border-input-border bg-surface pl-2 pr-1 py-1">
        <Link to={ROUTES.productDetail.replace(':id', linked.id)} title={linked.name} className="truncate text-xs text-brand hover:underline">
          {linked.name}
        </Link>
        <button
          type="button"
          onClick={handleRemove}
          disabled={save.isPending}
          title="Remove Product"
          className="absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-danger text-white leading-none disabled:opacity-60"
        >
          <X size={9} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search product…"
        disabled={save.isPending}
        className="h-8 w-40 rounded-md border border-input-border bg-input-bg px-2 text-xs text-text outline-none focus:ring-2 focus:ring-brand/30"
      />
      {open && debounced && (
        <div className="absolute z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
          {isFetching ? (
            <p className="px-2 py-1.5 text-xs text-text-faint">Searching…</p>
          ) : results && results.length > 0 ? (
            results.map((r) => (
              <button key={r.id} type="button" onMouseDown={() => handleSelect(r)} className="block w-full px-2 py-1.5 text-left text-xs hover:bg-surface-hover">
                <span className="font-medium text-text!">{r.text}</span>
                {r.ref && <span className="text-text-faint"> · {r.ref}</span>}
              </button>
            ))
          ) : (
            <p className="px-2 py-1.5 text-xs text-text-faint">No products found</p>
          )}
        </div>
      )}
    </div>
  )
}
