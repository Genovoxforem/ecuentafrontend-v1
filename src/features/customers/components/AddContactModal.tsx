import { useState } from 'react'
import { UserPlus, X, LoaderCircle, Check } from 'lucide-react'
import { useCreateContact } from '../customerDetailTabs.queries'

const inputCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand/30'

// Native replacement for linking out to societe/contact.php?action=create
// — wired to the real societe/api/contacts.php create action (see
// customerDetailTabs.queries.ts). Not live-tested against this instance's
// database (mutation, requires per-instance approval).
export function AddContactModal({ socid, onClose }: { socid: string; onClose: () => void }) {
  const createContact = useCreateContact(socid)
  const [lastname, setLastname] = useState('')
  const [firstname, setFirstname] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneMobile, setPhoneMobile] = useState('')
  const [poste, setPoste] = useState('')
  const [formError, setFormError] = useState('')

  function handleSubmit() {
    setFormError('')
    if (!lastname.trim()) {
      setFormError('Last name is required.')
      return
    }
    createContact.mutate({ lastname, firstname, email, phone, phone_mobile: phoneMobile, poste })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-surface border border-border p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <UserPlus size={16} className="text-brand" /> Add Contact
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md text-text-faint hover:bg-surface-hover hover:text-text">
            <X size={16} />
          </button>
        </div>

        {createContact.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-bg text-success-fg">
              <Check size={20} />
            </span>
            <p className="text-sm font-medium text-text!">Contact created.</p>
            <button type="button" onClick={onClose} className="mt-2 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Last name*</span>
                <input value={lastname} onChange={(e) => setLastname(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">First name</span>
                <input value={firstname} onChange={(e) => setFirstname(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Position</span>
                <input value={poste} onChange={(e) => setPoste(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-faint">Mobile</span>
                <input value={phoneMobile} onChange={(e) => setPhoneMobile(e.target.value)} className={inputCls} />
              </label>
            </div>

            {(formError || createContact.isError) && (
              <p className="text-xs text-danger">{formError || (createContact.error instanceof Error ? createContact.error.message : 'Could not create the contact.')}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-sm font-medium border border-border text-text-muted hover:bg-surface-hover">
                Cancel
              </button>
              <button
                type="button"
                disabled={createContact.isPending}
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {createContact.isPending && <LoaderCircle size={13} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
