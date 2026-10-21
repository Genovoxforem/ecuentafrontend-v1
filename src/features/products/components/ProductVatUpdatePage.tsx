import { useState } from 'react'
import { Loader2, Wand2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { formatMoney } from '../../../utils/format'
import type { BulkVatInput, BulkVatResult } from '../../../api/products'
import { useBulkVatInfo, useRunBulkVat } from '../productTools.queries'
import { applyBlockReason, StatusBadge, Summary } from './ProductBulkToolsPages'
import { LegacyErrorCard, LegacyLoadingCard } from './LegacyReportStates'

const selectCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

// Global VAT Update, laid out like the classic product/admin/product_tools.php: a
// Parameters / Value table (old and new rate) and "Launch bulk conversion". The
// launch is a dry run first (product/fapi/bulk_vat.php; every product keeps its
// own price base, so a price entered incl. tax stays the same for the customer);
// Apply then writes exactly what was previewed.
export function ProductVatUpdatePage() {
  const confirm = useConfirm()
  const { data: info, isLoading, isError, error, refetch } = useBulkVatInfo()
  const run = useRunBulkVat()
  const [oldRate, setOldRate] = useState('')
  const [target, setTarget] = useState('')
  // Products the preview found on the old rate AND code: Apply writes exactly these.
  const [applyIds, setApplyIds] = useState<number[]>([])
  const [result, setResult] = useState<BulkVatResult | null>(null)
  const [previewKey, setPreviewKey] = useState<string | null>(null)
  const [runError, setRunError] = useState('')
  const [applying, setApplying] = useState(false)

  const rates = info?.vat_rates ?? []
  const chosen = target === '' ? null : rates[Number(target)]
  const old = oldRate === '' ? null : rates[Number(oldRate)]
  const currentKey = `${oldRate}|${target}`
  const rateText = (r: { rate: number; code: string; note: string }) => `${r.rate}% (${r.code}) — ${r.note}`

  // The classic tool picks products by the old rate AND the old VAT code (load_tva
  // lists every rate/code pair). bulk_vat.php filters on the rate only, so the
  // preview is narrowed to the old code here and Apply sends those product ids.
  function launch() {
    setRunError('')
    if (!chosen || !old) return setRunError('Select the old and the new VAT rate.')
    if (chosen.rate === old.rate && chosen.code === old.code) return setRunError('The old and the new VAT rate are the same.')
    const input: BulkVatInput = { vat_rate: chosen.rate, vat_code: chosen.code, current_vat: old.rate }
    run.mutate(
      { input, confirm: false },
      {
        onSuccess: (r) => {
          const rows = r.rows.filter((row) => (row.vat_code_from || '') === old.code)
          const count = (status: string) => rows.filter((row) => row.status === status).length
          setApplyIds(rows.filter((row) => row.status === 'would_change').map((row) => row.id))
          setResult({ ...r, rows, matched: rows.length, would_change: count('would_change'), skipped: count('unchanged') + count('skipped_no_cost'), failed: count('error') })
          setPreviewKey(currentKey)
        },
        onError: (e) => setRunError(errorText(e, 'The preview failed.')),
      },
    )
  }

  async function apply() {
    if (!chosen || !result || applyIds.length === 0) return
    const ok = await confirm({
      title: 'Apply the VAT update?',
      message: `Set VAT ${chosen!.rate}% (${chosen!.code}) on ${result.would_change} product(s)?`,
      warningTitle: 'This changes live product prices.',
      warningMessage: 'Every changed product gets a new price log line. There is no undo button.',
      confirmLabel: 'Apply',
      variant: 'default',
    })
    if (!ok) return
    setRunError('')
    setApplying(true)
    run.mutate(
      { input: { vat_rate: chosen.rate, vat_code: chosen.code, products: applyIds }, confirm: true },
      {
        onSuccess: (r) => {
          setResult(r)
          setPreviewKey(null)
        },
        onError: (e) => setRunError(errorText(e, 'The VAT update failed.')),
        onSettled: () => setApplying(false),
      },
    )
  }

  const reason = applyBlockReason({ canWrite: !!info?.can_write, preview: result?.dry_run ? result : null, previewKey, currentKey })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text!">Global VAT Update</h2>
      <div className="rounded-md border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-text">
        This tool updates the VAT rate defined on <strong className="underline">ALL</strong> products and services!
      </div>

      {isError && <LegacyErrorCard title="Couldn't load the VAT rates" message={errorText(error, 'Unknown error.')} onRetry={() => refetch()} />}
      {isLoading && <LegacyLoadingCard label="Loading the VAT rates…" />}

      {info && (
        <>
          <Card className="!h-auto !p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border bg-surface-alt text-text!">
                  <th className="font-medium px-4 py-2.5">Parameters</th>
                  <th className="font-medium px-4 py-2.5 w-72">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 text-text!">Old VAT Rate</td>
                  <td className="px-4 py-2">
                    <select value={oldRate} onChange={(e) => setOldRate(e.target.value)} className={selectCls}>
                      <option value="">Select a rate</option>
                      {rates.map((r, i) => (
                        <option key={`${r.rate}-${r.code}`} value={i}>
                          {rateText(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-text!">New VAT Rate</td>
                  <td className="px-4 py-2">
                    <select value={target} onChange={(e) => setTarget(e.target.value)} className={selectCls}>
                      <option value="">Select a rate</option>
                      {rates.map((r, i) => (
                        <option key={`${r.rate}-${r.code}`} value={i}>
                          {rateText(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          <div>
            <button type="button" onClick={launch} disabled={run.isPending || applying} className="inline-flex h-fit w-fit self-start items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60">
            {run.isPending && !applying && <Loader2 size={14} className="animate-spin" />} Launch bulk conversion
          </button>
          </div>
          {runError && <p className="text-sm font-medium text-danger">{runError}</p>}

          {result && (
            <Card className="!h-auto space-y-3">
              <Summary result={result} />
              {result.dry_run && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void apply()}
                    disabled={!!reason || applying}
                    title={reason || undefined}
                    className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {applying ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Apply conversion
                  </button>
                  {reason && <span className="text-xs text-text-faint">{reason}</span>}
                </div>
              )}
              <div className="overflow-auto max-h-[60vh] rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
                      <th className="font-medium px-3 py-2">Product</th>
                      <th className="font-medium px-3 py-2 text-right">VAT</th>
                      <th className="font-medium px-3 py-2">Code</th>
                      <th className="font-medium px-3 py-2">Base</th>
                      <th className="font-medium px-3 py-2 text-right">Price incl. tax</th>
                      <th className="font-medium px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.id} className="border-b border-border">
                        <td className="px-3 py-2">
                          <span className="font-medium text-text!">{r.ref}</span> <span className="text-text-muted">{r.label}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {r.vat_from}% → {r.vat_to}%
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.vat_code_from || '—'} → {r.vat_code_to || '—'}
                        </td>
                        <td className="px-3 py-2">{r.price_base}</td>
                        <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatMoney(r.price_ttc_from)} → {formatMoney(r.price_ttc_to)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                          {r.message && <span className="block text-xs text-text-faint">{r.message}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
