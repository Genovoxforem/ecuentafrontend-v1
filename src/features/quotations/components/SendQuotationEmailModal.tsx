import { useEffect, useState } from 'react'
import { Mail, X, LoaderCircle, Check } from 'lucide-react'
import { useQuotationEmailDefaults, useSendQuotationEmail } from '../quotationEmail.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

// Native replacement for linking out to comm/propal/card.php?...&action=presend
// — see quotationEmail.ts/quotationEmail.queries.ts for why this POSTs
// straight to that same real backend endpoint (Dolibarr's own stock
// send-mail action, same mechanism as Sales Order's SendOrderEmailModal).
export function SendQuotationEmailModal({ id, quotationRef, onClose }: { id: string; quotationRef: string; onClose: () => void }) {
  const { data, isLoading, isError, error, refetch } = useQuotationEmailDefaults(id, true)
  const sendEmail = useSendQuotationEmail()

  const [fromtype, setFromtype] = useState('')
  const [sendto, setSendto] = useState('')
  const [sendtocc, setSendtocc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!data) return
    setFromtype(data.senderOptions.find((o) => o.value === 'company')?.value ?? data.senderOptions[0]?.value ?? '')
    setSubject(data.defaultSubject)
    setMessage(data.defaultMessage)
  }, [data])

  function handleSubmit() {
    setFormError('')
    if (!sendto.trim()) {
      setFormError('Receiver(s) is required.')
      return
    }
    if (!subject.trim()) {
      setFormError('Email topic is required.')
      return
    }
    if (!data) return
    sendEmail.mutate({ id, token: data.token, returnUrl: data.returnUrl, fromtype, sendto, sendtocc, subject, message, attachments })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Mail size={16} className="text-brand" /> Send email — {quotationRef}
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <LegacyLoadingCard label="Loading email form…" />
        ) : isError || !data ? (
          <LegacyErrorCard title="Couldn't load the email form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
        ) : sendEmail.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-text!">Email sent.</p>
            <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Sender*</span>
              <select value={fromtype} onChange={(e) => setFromtype(e.target.value)} className={inputCls}>
                {data.senderOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Receiver(s)*</span>
              <input value={sendto} onChange={(e) => setSendto(e.target.value)} placeholder="name@example.com, name2@example.com" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Copy to</span>
              <input value={sendtocc} onChange={(e) => setSendtocc(e.target.value)} placeholder="name@example.com" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Email topic*</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Attached files</span>
              <input
                type="file"
                multiple
                onChange={(e) => setAttachments(e.target.files ? Array.from(e.target.files) : [])}
                className="text-xs text-text-muted file:mr-2 file:rounded-md file:border file:border-border file:bg-surface-hover file:px-2 file:py-1 file:text-xs"
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-faint">Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className={inputCls} />
            </label>

            {(formError || sendEmail.isError) && (
              <p className="text-xs text-danger">{formError || (sendEmail.error instanceof Error ? sendEmail.error.message : 'Could not send this email.')}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="button"
                disabled={sendEmail.isPending}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {sendEmail.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Mail size={14} />} Send email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
