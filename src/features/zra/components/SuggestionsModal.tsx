import { X } from 'lucide-react'
import { useZraUpdateImport, type AsycudaUpdateItem } from '../asycudaImport.queries'
import type { SimilarProduct } from '../asycudaRowParser'

// Real backend match: zra-import_ajax.php only shows this state (instead of
// a plain Approve button) when the imported item's name doesn't exactly
// match a product but DOES fuzzy-match one or more — each one approvable
// with its own proid, same real POST as the exact-match Approve button.
export function SuggestionsModal({
  itemName,
  products,
  baseItem,
  onClose,
  onApproved,
}: {
  itemName: string
  products: SimilarProduct[]
  baseItem: AsycudaUpdateItem
  onClose: () => void
  onApproved: () => void
}) {
  const updateImport = useZraUpdateImport()

  function approve(proid: string) {
    if (updateImport.isPending) return
    updateImport.mutate(
      { action: 'approve', item: { ...baseItem, proid } },
      {
        onSuccess: (res) => {
          window.alert(res.status)
          onApproved()
        },
        onError: (err) => window.alert(err instanceof Error ? err.message : 'Approve failed — please try again.'),
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-lg font-semibold text-text!">Similar Products Found</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-text-faint mb-3">
            Imported item: <span className="text-text font-medium">{itemName}</span>
          </p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {products.map((p) => (
              <li key={p.proid} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm text-text! truncate">{p.label}</span>
                <button
                  type="button"
                  onClick={() => approve(p.proid)}
                  disabled={updateImport.isPending}
                  className="shrink-0 px-3 py-1 rounded-md text-xs font-medium bg-success text-white hover:opacity-90 disabled:opacity-60"
                >
                  Approve
                </button>
              </li>
            ))}
            {products.length === 0 && <li className="px-3 py-4 text-sm text-text-faint text-center">No similar products.</li>}
          </ul>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-text-muted hover:bg-surface-alt">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
