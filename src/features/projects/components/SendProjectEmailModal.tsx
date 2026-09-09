import { useState } from 'react'
import { Mail, X, Paperclip } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 outline-none focus:ring-2 focus:ring-brand/30'
const fieldLabel = 'text-xs font-medium text-text-faint'
const requiredMark = <span className="text-danger">*</span>

// Visual match for projet/card.php's real "Send email" presend form
// (card_presend.tpl.php) — same fields/layout as the legacy page. Fields are
// live/editable (backed by local state only, seeded with the one genuinely
// real value available client-side: the logged-in user as Sender). The
// "Send email" action itself stays inert: unlike SendOrderEmailModal.tsx
// (which genuinely POSTs to a real send action), doing that here would need
// the light HTML-parsing step covered by the standing no-scraping rule, so
// there's no real submit target — same honest pattern as this page's other
// inert action buttons.
export function SendProjectEmailModal({ projectRef, onClose }: { projectRef: string; onClose: () => void }) {
  const { user } = useAuth()
  const senderLabel = user ? `${user.firstname} ${user.lastname}${user.email ? ` <${user.email}>` : ''}`.trim() : '—'

  const [receivers, setReceivers] = useState('')
  const [toUsers, setToUsers] = useState('')
  const [copyTo, setCopyTo] = useState('')
  const [copyToUsers, setCopyToUsers] = useState('')
  const [topic, setTopic] = useState(`Information project ${projectRef}`)
  const [message, setMessage] = useState('Hello')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const noSend = 'No real API available on this backend'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text! underline underline-offset-4 decoration-text-faint/50">Send email</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Sender{requiredMark}</span>
            <select className={inputCls}>
              <option>{senderLabel}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Receiver(s){requiredMark}</span>
            <input value={receivers} onChange={(e) => setReceivers(e.target.value)} className={inputCls} placeholder="name@example.com" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>To user(s)</span>
            <input value={toUsers} onChange={(e) => setToUsers(e.target.value)} className={inputCls} />
          </label>

          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Copy to</span>
            <input value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Copy to user(s)</span>
            <input value={copyToUsers} onChange={(e) => setCopyToUsers(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Email topic{requiredMark}</span>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} />
          </label>

          <div className="flex flex-col gap-1 sm:col-span-1">
            <span className={fieldLabel}>Attached files</span>
            {attachedFiles.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-text-faint italic py-2">
                <Paperclip size={12} /> No file attached.
              </p>
            ) : (
              <ul className="space-y-1 py-1">
                {attachedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-text">
                    <Paperclip size={12} className="text-text-faint shrink-0" /> {f.name}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="shrink-0 px-2 py-1 rounded-md text-xs font-medium border border-border bg-surface-hover text-text hover:bg-surface cursor-pointer">
                Choose File
                <input type="file" onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)} className="hidden" />
              </label>
              <span className="text-xs text-text-faint truncate min-w-0 flex-1">{pendingFile ? pendingFile.name : 'No file chosen'}</span>
              <button
                type="button"
                disabled={!pendingFile}
                onClick={() => {
                  if (!pendingFile) return
                  setAttachedFiles((files) => [...files, pendingFile])
                  setPendingFile(null)
                }}
                className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                Attach
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={fieldLabel}>Message</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={inputCls} />
          </label>
        </div>

        <p className="text-xs text-text-faint italic mt-3">This form isn't wired to a real send action on this backend — filled-in values won't actually be sent.</p>

        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button type="button" disabled title={noSend} className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white opacity-60 cursor-not-allowed">
            <Mail size={14} /> Send email
          </button>
        </div>
      </div>
    </div>
  )
}
