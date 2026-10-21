import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Wrench, FileSignature, ReceiptText, LoaderCircle } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { useQuotationCard } from '../quotationDetail.queries'
import { createQuotationContract, createQuotationIntervention, createQuotationInvoice, type QuotationConversionResult } from '../../../api/quotations'

// Each form posts to the backend's create_from_propal.php for that document
// type (invoice / contract / intervention). The backend registers the
// quotation as the new document's origin and copies the lines itself, so
// only the few fields the user may override are collected here — anything
// left blank defaults to the quotation's own value on the server.

const inputClass = 'w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text">
      {label}
      {children}
    </label>
  )
}

function useConvert(kind: 'intervention' | 'contract' | 'invoice') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown> & { propal_id: number }): Promise<QuotationConversionResult> => {
      if (kind === 'invoice') return createQuotationInvoice(input as Parameters<typeof createQuotationInvoice>[0])
      if (kind === 'contract') return createQuotationContract(input as Parameters<typeof createQuotationContract>[0])
      return createQuotationIntervention(input as Parameters<typeof createQuotationIntervention>[0])
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotations'] })
      if (kind === 'invoice') void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      if (kind === 'contract') void queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })
}

// Only send fields the user actually filled in, so the server defaults apply.
function compact(values: Record<string, string | boolean>): Record<string, string | boolean> {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== false))
}

export function QuotationConvertReplica({ kind }: { kind: 'intervention' | 'contract' | 'invoice' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuotationCard(id)
  const convert = useConvert(kind)
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [created, setCreated] = useState<QuotationConversionResult | null>(null)

  if (isLoading) return <div className="p-6 text-sm text-text-muted">Loading quotation…</div>
  if (isError || !data) {
    return <Card className="!h-auto"><p role="alert" className="text-sm text-danger">{error instanceof Error ? error.message : 'Could not load the source quotation.'}</p></Card>
  }

  const backTo = ROUTES.quotationDetail.replace(':id', String(data.id))
  const text = (key: string) => (typeof values[key] === 'string' ? (values[key] as string) : '')
  const set = (key: string, value: string | boolean) => setValues((prev) => ({ ...prev, [key]: value }))
  const customerRefKey = kind === 'contract' ? 'ref_customer' : 'ref_client'

  const meta = {
    invoice: { title: 'Create Invoice', icon: ReceiptText },
    contract: { title: 'Create Contract', icon: FileSignature },
    intervention: { title: 'Create Intervention', icon: Wrench },
  }[kind]
  const Icon = meta.icon

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { duration, ...rest } = compact(values)
    // The API takes the per-line duration in seconds; the form collects hours.
    const payload = duration ? { ...rest, duration: Math.round(Number(duration) * 3600) } : rest
    try {
      const result = await convert.mutateAsync({ propal_id: data!.id, ...payload })
      if (kind === 'invoice') navigate(ROUTES.invoiceDetail.replace(':id', String(result.id)))
      else if (kind === 'contract') navigate(ROUTES.contractDetail.replace(':id', String(result.id)))
      else setCreated(result)
    } catch {
      // surfaced below from convert.error
    }
  }

  if (created) {
    return (
      <Card className="!h-auto space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!"><Icon size={20} className="text-brand" /> Intervention {created.ref} created</h2>
        <p className="text-sm text-text-muted">Created from {created.propal_ref}. {created.lines_copied} line(s) copied. Time entries can be added to it from the intervention card.</p>
        <Link to={backTo} className="text-sm font-medium text-brand hover:underline">Back to quotation</Link>
      </Card>
    )
  }

  return (
    <Card className="!h-auto space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!"><Icon size={20} className="text-brand" /> {meta.title} from {data.ref}</h2>
      <p className="text-sm text-text-muted">
        {data.thirdPartyName ? `${data.thirdPartyName} · ` : ''}The new document is linked to this quotation and its lines are copied. Leave a field blank to use the quotation's own value.
      </p>
      <form onSubmit={(event) => void handleSubmit(event)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {kind === 'invoice' && (
          <>
            <Field label="Invoice date"><input type="date" value={text('date')} onChange={(e) => set('date', e.target.value)} className={inputClass} /></Field>
            <Field label="Due date"><input type="date" value={text('date_due')} onChange={(e) => set('date_due', e.target.value)} className={inputClass} /></Field>
          </>
        )}
        {kind === 'contract' && (
          <>
            <Field label="Contract date"><input type="date" value={text('date_contrat')} onChange={(e) => set('date_contrat', e.target.value)} className={inputClass} /></Field>
            <div className="hidden sm:block" />
            <Field label="Service start"><input type="date" value={text('date_start')} onChange={(e) => set('date_start', e.target.value)} className={inputClass} /></Field>
            <Field label="Service end"><input type="date" value={text('date_end')} onChange={(e) => set('date_end', e.target.value)} className={inputClass} /></Field>
          </>
        )}
        {kind === 'intervention' && (
          <>
            <Field label="Intervention date"><input type="datetime-local" value={text('date_intervention')} onChange={(e) => set('date_intervention', e.target.value.replace('T', ' '))} className={inputClass} /></Field>
            <Field label="Duration per copied line (hours)"><input type="number" min="0" step="0.25" value={text('duration')} onChange={(e) => set('duration', e.target.value)} className={inputClass} /></Field>
            <div className="sm:col-span-2">
              <Field label="Description"><textarea rows={2} value={text('description')} onChange={(e) => set('description', e.target.value)} className={inputClass} /></Field>
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={values.copy_lines === true} onChange={(e) => set('copy_lines', e.target.checked)} />
              Copy the quotation lines as time entries
            </label>
          </>
        )}
        {kind !== 'intervention' && (
          <Field label="Customer reference">
            <input value={text(customerRefKey)} placeholder={data.refCustomer} onChange={(e) => set(customerRefKey, e.target.value)} className={inputClass} />
          </Field>
        )}
        <Field label="Public note"><textarea rows={2} value={text('note_public')} onChange={(e) => set('note_public', e.target.value)} className={inputClass} /></Field>
        <Field label="Private note"><textarea rows={2} value={text('note_private')} onChange={(e) => set('note_private', e.target.value)} className={inputClass} /></Field>
        {convert.isError && (
          <p role="alert" className="sm:col-span-2 text-sm text-danger">{convert.error instanceof Error ? convert.error.message : 'Could not create the document.'}</p>
        )}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Link to={backTo} className="rounded-md border border-border px-3 py-1.5 text-sm text-text">Cancel</Link>
          <button type="submit" disabled={convert.isPending} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
            {convert.isPending && <LoaderCircle size={14} className="animate-spin" />} {meta.title}
          </button>
        </div>
      </form>
    </Card>
  )
}
