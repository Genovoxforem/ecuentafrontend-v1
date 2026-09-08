import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Check, X, Info, Paperclip } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { StickyFormShell } from '../../../shared/components/layout/StickyFormShell'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { useCustomerOptions } from '../../customers/customerOptions'
import { useCustomerContacts, useCustomerContracts } from '../../customers/customerDetailTabs.queries'
import { useAgendaFilterOptions } from '../../agenda/calendarApi.queries'
import { useAuth } from '../../auth/AuthContext'

// Native replacement for ticket/card.php?action=create. Read the real PHP
// source directly (ticket/card.php's action=='add' handler + FormTicket::
// checkRequiredFields) to find the real create contract: subject, message,
// socid, contactid, fk_user_assign, projectid, contractid/contratid and
// notify_tiers_at_create are genuinely just POST fields with no dictionary
// behind them — wired for real below via this app's existing real pickers
// (useCustomerOptions, useCustomerContacts, useAgendaFilterOptions, both
// already used elsewhere in this app). ref/type_code/category_code/
// severity_code are ALSO required (checkRequiredFields fails the whole
// submit without them), but their only source anywhere on this backend is
// the classic page's own prefilled <input>/<select> — no JSON API exists
// (checked ticket/api/*.php: all 404; the custom ticketdesk module has no
// api/ folder; no core ticket dictionary ajax handler exists either). Per
// this app's standing rule against DOM-scraping a legacy page to fake a
// dropdown/value (see feedback_no_html_scraping in project memory), those
// stay honestly disabled rather than scraped — which means the Create
// button can't actually submit yet. Contract is disabled for a related but
// different reason: societe/api/contracts.php (real, used by Customer
// Detail's own Contracts tab) returns each row's ref but never its numeric
// id, so there's no real value this field could submit either.
export function TicketCreateForm() {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [notify, setNotify] = useState(false)
  const [thirdPartyId, setThirdPartyId] = useState('')
  const [contactId, setContactId] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('')
  const [contractId, setContractId] = useState('')

  const { data: customers, isLoading: customersLoading } = useCustomerOptions()
  const { data: contacts, isLoading: contactsLoading } = useCustomerContacts(thirdPartyId || undefined)
  const { data: contracts } = useCustomerContracts(thirdPartyId || undefined)
  const { data: filters, isLoading: filtersLoading } = useAgendaFilterOptions()

  const customerOptions = (customers ?? []).map((c) => ({ value: c.id, label: c.name }))
  const assignedToValue = assignedTo ?? (user ? String(user.id) : '')

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
          disabled
          title="Ref, Request Type, Ticket Group and Severity are all required by the real backend, but none has a confirmed JSON API — this app won't scrape the classic page's dropdowns to fake them, so ticket creation can't be submitted from here yet."
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          <Check size={14} /> Create ticket
        </button>
      }
    >
      <Card className="!h-auto flex items-start gap-2 bg-warning-bg/40 border border-warning-bg">
        <Info size={15} className="text-warning-fg mt-0.5 shrink-0" />
        <p className="text-xs text-warning-fg">
          Subject, Message, Third-party, Contact/Address, Assigned to, Project, Contract and the Notify checkbox below are real and interactive. Ref, Request Type, Ticket Group, Severity and
          Uploads have no confirmed JSON API on this backend (only the classic page's own HTML form has them) — this app doesn't scrape HTML to fake dropdowns, so those stay disabled and ticket
          creation can't be fully submitted yet.
        </p>
      </Card>

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Field label="Ref." required>
            <input disabled value="(auto-generated)" className={`${inputClasses} text-text-faint cursor-not-allowed`} title="No confirmed JSON API for the next ticket ref." />
          </Field>
          <Field label="Request type" required>
            <select disabled className={`${inputClasses} text-text-faint cursor-not-allowed`} title="No confirmed JSON API for this dictionary (c_ticket_type).">
              <option>—</option>
            </select>
          </Field>
          <Field label="Ticket group">
            <select disabled className={`${inputClasses} text-text-faint cursor-not-allowed`} title="No confirmed JSON API for this dictionary (c_ticket_category).">
              <option>Other</option>
            </select>
          </Field>

          <Field label="Severity" required>
            <select disabled className={`${inputClasses} text-text-faint cursor-not-allowed`} title="No confirmed JSON API for this dictionary (c_ticket_severity).">
              <option>Normal</option>
            </select>
          </Field>
          <Field label="Subject" required>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClasses} placeholder="Short summary of the issue" />
          </Field>
          <Field label="Message" required>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={1} className={`${inputClasses} resize-y`} placeholder="Describe the issue" />
          </Field>

          <Field label="Uploads">
            <span
              title="No confirmed upload endpoint for ticket creation on this backend."
              className={`${inputClasses} flex items-center gap-1.5 text-text-faint cursor-not-allowed`}
            >
              <Paperclip size={13} /> No file chosen
            </span>
          </Field>
          <Field label="Third-party">
            <SearchableSelect
              value={thirdPartyId}
              onChange={(v) => {
                setThirdPartyId(v)
                setContactId('')
                setContractId('')
              }}
              options={customerOptions}
              placeholder={customersLoading ? 'Loading…' : 'Select a third party'}
            />
          </Field>
          <Field label="Contact/Address">
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              disabled={!thirdPartyId}
              className={`${inputClasses} ${!thirdPartyId ? 'text-text-faint cursor-not-allowed' : ''}`}
            >
              <option value="">{!thirdPartyId ? 'Select a third party first…' : contactsLoading ? 'Loading…' : 'External contributor'}</option>
              {(contacts?.rows ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstname, c.lastname].filter(Boolean).join(' ') || `Contact #${c.id}`}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notify third party at creation">
            <label className="flex items-center gap-2 text-sm text-text-muted h-[38px]">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={!thirdPartyId} />
              {!thirdPartyId ? <span className="text-xs text-text-faint">Select a third party first</span> : 'Send a notification email'}
            </label>
          </Field>
          <Field label="Assigned to">
            <select value={assignedToValue} onChange={(e) => setAssignedTo(e.target.value)} className={inputClasses}>
              <option value="">{filtersLoading ? 'Loading…' : '—'}</option>
              {(filters?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClasses}>
              <option value="">{filtersLoading ? 'Loading…' : 'Select a project'}</option>
              {(filters?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contract">
            <select
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              disabled={!thirdPartyId}
              className={`${inputClasses} ${!thirdPartyId ? 'text-text-faint cursor-not-allowed' : ''}`}
            >
              <option value="">{!thirdPartyId ? 'Select a third party first…' : 'Select a contract'}</option>
              {(contracts?.rows ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.ref}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>
    </StickyFormShell>
  )
}
