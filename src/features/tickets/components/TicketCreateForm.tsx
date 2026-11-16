import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell, WizardStep } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useCreateTicket, useTicketCreateContext } from '../ticketCreate.queries'

// New Ticket on ticket/fapi: the dictionaries come from form_options.php and the ticket is created by create.php (see ticketCreate.queries.ts).
// Required, as the API checks them: Request type, Subject and Message; the ref is given by the backend. The classic form's contact and role, notification
// email, project, contract and attachments are not accepted by create.php and are not on this form.
export function TicketCreateForm() {
  const navigate = useNavigate()
  const { data: context, isLoading, isError, error, refetch } = useTicketCreateContext()
  const { data: customers } = useCustomerOptions()
  const create = useCreateTicket()

  const [typeCode, setTypeCode] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [severityCode, setSeverityCode] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const thirdParties = useMemo(() => (customers ?? []).map((c) => ({ value: c.id, label: c.ref ? `${c.name} (${c.ref})` : c.name })), [customers])

  function submit() {
    const missing = [!typeCode && 'Request type', !subject.trim() && 'Subject', !message.trim() && 'Message'].filter(Boolean)
    if (missing.length) {
      setFormError(`Required: ${missing.join(', ')}.`)
      return
    }
    setFormError(null)
    create.mutate(
      { typeCode, categoryCode, severityCode, subject: subject.trim(), message, socid: thirdPartyId, assignedTo },
      {
        onSuccess: ({ id }) => navigate(id ? ROUTES.ticketDetail.replace(':id', String(id)) : ROUTES.ticketList),
        onError: (err) => setFormError(err instanceof Error ? err.message : 'The ticket could not be created.'),
      },
    )
  }

  return (
    <StickyFormShell
      wizard={[{ title: 'Ticket Details', subtitle: 'Type, subject & message' }, { title: 'Assignment', subtitle: 'Customer & owner' }]}
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
            <WizardStep n={0}>
              <Field label="Request type" required>
                <select value={typeCode} onChange={(e) => setTypeCode(e.target.value)} className={inputClasses} aria-label="Request type">
                  <option value="">—</option>
                  {context.typeCodes.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ticket group">
                <select value={categoryCode} onChange={(e) => setCategoryCode(e.target.value)} className={inputClasses} aria-label="Ticket group">
                  <option value="">—</option>
                  {context.categories.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Severity">
                <select value={severityCode} onChange={(e) => setSeverityCode(e.target.value)} className={inputClasses} aria-label="Severity">
                  <option value="">—</option>
                  {context.severities.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Subject" required>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClasses} placeholder="Short summary of the issue" aria-label="Subject" />
              </Field>
              <Field label="Message" required>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={`${inputClasses} resize-y`} placeholder="Describe the issue" aria-label="Message" />
              </Field>
            </WizardStep>
            <WizardStep n={1}>
              <Field label="Third-party">
                <SearchableSelect value={thirdPartyId} onChange={setThirdPartyId} options={thirdParties} placeholder="Select a third party" />
              </Field>
              <Field label="Assigned to">
                <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inputClasses} aria-label="Assigned to">
                  <option value="">Select a user</option>
                  {context.users.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </WizardStep>
          </div>
        </Card>
      )}
    </StickyFormShell>
  )
}
