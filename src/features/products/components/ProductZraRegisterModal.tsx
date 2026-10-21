import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { fapiGet, fapiPost } from '../../../api/fapiEnvelope'

/* eslint-disable @typescript-eslint/no-explicit-any */
const ZRA = '/product/fapi/zra.php'

// product/fapi/zra.php: GET ?product= previews what would be sent (the composed item code, warnings, what the instance
// is missing); POST ?action=register sends it to ZRA (409 with the missing items when the instance cannot register;
// it never pretends to have registered). Creating a product only stores the classification - registration is its own
// outbound call with its own failure modes, so it is a separate action here too.
function useZraPreview(productId: string) {
  return useQuery({
    queryKey: ['products', 'zra', productId],
    queryFn: async () => {
      const d = await fapiGet<any>(ZRA, { product: productId })
      return {
        ready: Boolean(d.readiness?.ready),
        missing: ((d.readiness?.missing ?? []) as string[]).map(String),
        lastStatus: String(d.readiness?.last_api_status ?? ''),
        registered: Boolean(d.zra?.registered),
        zraStatus: String(d.zra?.zrastatus ?? ''),
        classification: String(d.zra?.classification ?? ''),
        itemCode: String(d.item_code?.item_code ?? ''),
        problems: ((d.item_code?.problems ?? []) as string[]).map(String),
        warnings: ((d.item_code?.warnings ?? []) as string[]).map(String),
      }
    },
    staleTime: 0,
  })
}

function useRegisterZra(productId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => fapiPost<any>(ZRA, { product: Number(productId) }, { action: 'register' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products', 'zra', productId] })
      void queryClient.invalidateQueries({ queryKey: ['products', 'detail', productId] })
    },
  })
}

export function ProductZraRegisterModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const preview = useZraPreview(productId)
  const register = useRegisterZra(productId)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const d = preview.data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-3 rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-text!">
            <ShieldCheck size={16} /> Register with ZRA
          </h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-faint hover:bg-surface-hover">
            <X size={16} />
          </button>
        </div>

        {preview.isLoading && <p className="text-sm text-text-muted">Checking…</p>}
        {preview.isError && <p className="text-sm text-danger">{preview.error instanceof Error ? preview.error.message : 'Could not read the ZRA state.'}</p>}

        {d && (
          <div className="space-y-2 text-sm">
            <p className="text-text-muted">
              Item code: <span className="font-mono font-semibold text-text!">{d.itemCode || '—'}</span>
              {d.classification ? ` · classification ${d.classification}` : ''}
            </p>
            {d.registered && <p className="font-medium text-success">Already registered{d.zraStatus ? ` (${d.zraStatus})` : ''}.</p>}
            {d.problems.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-danger">
                {d.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            {d.warnings.length > 0 && (
              <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-text!">
                {d.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-1.5">
                    <TriangleAlert size={13} className="mt-0.5 shrink-0 text-warning" /> {w}
                  </li>
                ))}
              </ul>
            )}
            {!d.ready && (
              <div className="rounded-md border border-border bg-surface-alt p-2 text-xs text-text-muted">
                <p className="font-medium text-text!">This instance cannot register products yet:</p>
                <ul className="mt-1 list-disc pl-5">
                  {d.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                {d.lastStatus && <p className="mt-1">Last ZRA connection state: {d.lastStatus.replace(/^s:\d+:"|";$/g, '')}</p>}
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {done && <p className="text-sm font-medium text-success">Registered with ZRA.</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover">
            Close
          </button>
          <button
            type="button"
            disabled={!d || register.isPending || d.registered || d.problems.length > 0}
            onClick={() => {
              setError('')
              register.mutate(undefined, { onSuccess: () => setDone(true), onError: (e) => setError(e instanceof Error ? e.message : 'The registration was refused.') })
            }}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {register.isPending && <LoaderCircle size={14} className="animate-spin" />} Register
          </button>
        </div>
      </div>
    </div>
  )
}
