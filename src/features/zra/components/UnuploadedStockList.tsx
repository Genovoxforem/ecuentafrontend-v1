import { useState } from 'react'
import { Boxes, Loader2, UploadCloud } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { LegacyListPage } from '../../generalLedger/components/LegacyListPage'
import { useUploadStockMovements } from '../zraActions.queries'

const idOf = (href: string | null) => new URLSearchParams((href ?? '').split('?')[1] ?? '').get('id') ?? ''

// product/stock/movement_listunuploaded.php — the real list of stock movements
// the ZRA gateway has not accepted yet (each row's ZRA Status is the backend's
// own), with the page's own warehouse / movement-type / reference filters and
// paging. Product and warehouse cells open the native pages.
//
// Tick movements and press "Upload TO ZRA": that posts the ticked ids to
// product/stock/zraallupdatestock.php, which sends them to the live ZRA gateway
// and answers with a status message (shown below), exactly like the backend page.
export function UnuploadedStockList() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<string | null>(null)
  const upload = useUploadStockMovements()
  const confirm = useConfirm()

  const send = async () => {
    setResult(null)
    if (selected.size === 0) {
      setResult('Please select at least one stock movement to upload.')
      return
    }
    const ok = await confirm({
      title: 'Upload stock movements to ZRA?',
      message: `Send ${selected.size} stock movement${selected.size === 1 ? '' : 's'} to the ZRA gateway now?`,
      warningTitle: 'This submits to the live ZRA gateway.',
      warningMessage: 'The gateway records what it accepts; it cannot be undone from here.',
      variant: 'default',
      confirmLabel: 'Upload TO ZRA',
    })
    if (!ok) return
    upload.mutate([...selected], {
      onSuccess: (message) => {
        setResult(message)
        setSelected(new Set())
      },
    })
  }

  return (
    <div className="space-y-4">
      {result && <div className="whitespace-pre-line rounded-lg border border-success/40 bg-success-bg/50 px-4 py-3 text-sm text-success-fg">{result}</div>}
      {upload.isError && (
        <div className="whitespace-pre-line rounded-lg border border-danger/40 bg-danger-bg/50 px-4 py-3 text-sm text-danger">
          {upload.error instanceof Error ? upload.error.message : 'The upload failed.'}
        </div>
      )}
      <LegacyListPage
        icon={Boxes}
        title="Un-uploaded Stock Movements"
        path="/product/stock/movement_listunuploaded.php"
        firstHeader={/^REF/}
        emptyText="No un-uploaded stock movements."
        rowSelect={{ selected, onChange: setSelected }}
        toolbar={
          <button
            type="button"
            onClick={send}
            disabled={upload.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:opacity-90 disabled:opacity-60"
          >
            {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            {upload.isPending ? 'Updating to ZRA…' : `Upload TO ZRA${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        }
        linkFor={(header, cell) => {
          const id = idOf(cell.href)
          if (!id) return null
          if (/^Product ref/i.test(header) && cell.href?.includes('/product/stock/product.php')) return ROUTES.productDetail.replace(':id', id)
          if (/^Warehouse/i.test(header) && cell.href?.includes('/product/stock/card.php')) return ROUTES.warehouseDetail.replace(':id', id)
          return null
        }}
      />
    </div>
  )
}
