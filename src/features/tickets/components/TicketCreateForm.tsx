import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, Check, X, Paperclip, Loader2, AlertCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useCustomerContacts } from '../../customers/customerDetailTabs.queries'
import { useCreateTicket, useTicketCreateContext } from '../ticketCreate.queries'

// Native replacement for ticket/card.php?action=create. The next ref, the
// form token and every dropdown come from that page itself (see
// ticketCreate.queries.ts), and the ticket is created with the same POST the
// classic form sends. Required, as the classic form checks them: Ref, Request
// type, Severity, Subject and Message. Attachments are not sent: the classic
// form uploads them in a separate "Attach this file" round-trip first.
export function TicketCreateForm() {
  const navigate = useNavigate()
  const { data: context, isLoading, isError, error, refetch } = useTicketCreateContext()
  const create = useCreateTicket()

  const [ref, setRef] = useState('')
  const [typeCode, setTypeCode] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [severityCode, setSeverityCode] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [notify, setNotify] = useState(false)
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [contactId, setContactId] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [projectId, setProjectId] = useState('')
  const [contractId, setContractId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Prefill with the classic form's own defaults once it has loaded.
  useEffect(() => {
    if (!context) return
    setRef((v) => v || context.ref)
    setCategoryCode((v) => v || context.categoryDefault)
    setSeverityCode((v) => v || context.severityDefault)
    setAssignedTo((v) => v || context.userDefault)
    setContactRole((v) => v || context.contactRoles[0]?.value || '')
  }, [context])

  const { data: contacts, isLoading: contactsLoading } = useCustomerContacts(thirdPartyId || undefined)

  function submit() {
    const missing = [
      !ref.trim() && 'Ref.',
      !typeCode && 'Request type',
      !severityCode && 'Severity',
      !subject.trim() && 'Subject',
      !message.trim() && 'Message',
    ].filter(Boolean)
    if (missing.length) {
      setFormError(`Required: ${missing.join(', ')}.`)
      return
    }
    setFormError(null)
    create.mutate(
      { ref: ref.trim(), typeCode, categoryCode, severityCode, subject: subject.trim(), message, socid: thirdPartyId, contactId, contactRole, notify, assignedTo, projectId, contractId },
      {
        onSuccess: ({ id }) => navigate(id ? ROUTES.ticketDetail.replace(':id', String(id)) : ROUTES.ticketList),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'The ticket could not be created.'),
      },
    )
  }

  return (
    <StickyFormShell
      header={
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <Ticket size={20} className="text-brand" /> New Ticket
        </h2>
      }
      footerLeft={
        <Link to={ROUTES.ticketList} className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover">
          <X size={14} /> Cancel
        </Link>
      }
      footerRight={
        <button
          type="button"
          onClick={submit}
          disabled={!context || create.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create ticket
        </button>
      }
    >
      {isLoading && <LegacyLoadingCard label="Loading the ticket form…" />}
      {isError && <LegacyErrorCard title="Couldn't load the ticket form" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />}
      {formError && (
        <Card className="!h-auto flex items-start gap-2 bg-danger-bg/40 border border-danger-bg">
          <AlertCircle size={15} className="text-danger-fg mt-0.5 shrink-0" />
          <p className="text-sm text-danger-fg">{formError}</p>
        </Card>
      )}

      {context && (
        <Card className="!h-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Ref." required>
              <input value={ref} onChange={(e) => setRef(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="Request type" required>
              <select value={typeCode} onChange={(e) => setTypeCode(e.target.value)} className={inputClasses}>
                <option value="">—</option>
                {context.typeCodes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ticket group">
              <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={inputClasses}>
                <option value="">—</option>
                {context.categories.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Severity" required>
              <select value={severityCode} onChange={(e) => setSeverityCode(e.target.value)} className={inputClasses}>
                <option value="">—</option>
                {context.severities.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject" required>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClasses} placeholder="Short summary of the issue" />
            </Field>
            <Field label="Message" required>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={`${inputClasses} resize-y`} placeholder="Describe the issue" />
            </Field>

            <Field label="Uploads">
              <span title="Add attachments from the ticket page once it is created." className={`${inputClasses} flex items-center gap-1.5 text-text-faint cursor-not-allowed`}>
                <Paperclip size={13} /> Attach files after creating the ticket
              </span>
            </Field>
            <Field label="Third-party">
              <SearchableSelect
                value={thirdPartyId}
                onChange={(v) => {
                  setThirdPartyId(v)
                  setContactId('')
                }}
                options={context.thirdParties}
                placeholder="Select a third party"
              />
            </Field>
            <Field label="Contact/Address">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  disabled={!thirdPartyId}
                  className={`${inputClasses} ${!thirdPartyId ? 'text-text-faint cursor-not-allowed' : ''}`}
                >
                  <option value="">{!thirdPartyId ? 'Select a third party first…' : contactsLoading ? 'Loading…' : '—'}</option>
                  {(contacts?.rows ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.firstname, c.lastname].filter(Boolean).join(' ') || `Contact #${c.id}`}
                    </option>
                  ))}
                </select>
                <select value={contactRole} onChange={(e) => setContactRole(e.target.value)} className={inputClasses} aria-label="Contact role">
                  {context.contactRoles.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label="Notify third party at creation">
              <label className="flex items-center gap-2 text-sm text-text-muted h-[38px]">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={!thirdPartyId} />
                {!thirdPartyId ? <span className="text-xs text-text-faint">Select a third party first</span> : 'Send a notification email'}
              </label>
            </Field>
            <Field label="Assigned to">
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClasses}>
                <option value="">Select a user</option>
                {context.users.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
                <option value="">Select a project</option>
                {context.projects.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Contract">
              <select value={contractId} onChange={(e) => setContractId(e.target.value)} className={inputClasses}>
                <option value="">Select a contract</option>
                {context.contracts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      )}
    </StickyFormShell>
  )
}
