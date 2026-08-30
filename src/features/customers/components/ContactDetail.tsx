import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, IdCard, User, Link2, StickyNote, Paperclip, CalendarClock, Mail, Pencil, Ban, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useContacts, type ContactKind } from '../contacts.queries'

const TABS = [
  { key: 'contact', label: 'Contact/Address', icon: IdCard },
  { key: 'personal', label: 'Personal Data', icon: User },
  { key: 'related', label: 'Related Items', icon: Link2 },
  { key: 'note', label: 'Note', icon: StickyNote },
  { key: 'documents', label: 'Linked Files', icon: Paperclip },
  { key: 'agenda', label: 'Events/Agenda', icon: CalendarClock },
] as const
type TabKey = (typeof TABS)[number]['key']

function TabTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-semibold text-brand">
      <span className="w-1 h-4 rounded-full bg-brand shrink-0" />
      {children}
    </h3>
  )
}

function NoApiNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-faint italic mt-2">{children}</p>
}

const disabledBtn = 'flex items-center gap-1.5 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-not-allowed'

// Real header/main data reused from contact/contacts-addresses-list-ajax.php
// (see contacts.queries.ts), matched by id — the same "find in the already-
// fetched list" pattern used for Contract Detail's header, since contact/
// card.php, perso.php, note.php, document.php and agenda.php are all full
// legacy HTML pages with no JSON API behind them (checked every one
// directly). Those remaining tabs are design-only, matching the real
// page's layout with inert controls, exactly like Contract Detail's
// no-API tabs.
export function ContactDetail({ kind = 'customer' }: { kind?: ContactKind }) {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('contact')
  // limit is passed as 25 because the real backend hardcodes its own page
  // size to 25 regardless of what's requested (see contacts.queries.ts) —
  // asking for more here would be misleading about what actually comes back.
  const { data, isLoading, isError, error, refetch } = useContacts(kind, '', 1, 25)
  const listRoute = kind === 'vendor' ? ROUTES.vendorContactList : ROUTES.contactList

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading contact…" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load contact" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      </div>
    )
  }

  const contact = data.items.find((c) => c.id === Number(id))
  if (!contact) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Contact not found" message={`No contact with id ${id} in the first 25 rows the real backend returns (it hardcodes its own page size) — try the list's search box to narrow it down first.`} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border">
              <div>
                <Link to={listRoute} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
                  <ChevronLeft size={14} /> Contacts/Addresses
                </Link>
                <h2 className="text-lg font-bold text-text!">{contact.fullName || '—'}</h2>
                <div className="text-xs text-text-muted mt-1 space-y-0.5">
                  <p>
                    <span className="text-text-faint">Third-party code:</span> {contact.thirdPartyCode || '—'}
                  </p>
                  {contact.email && (
                    <p className="flex items-center gap-1">
                      <Mail size={12} /> {contact.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
                  <Mail size={14} /> Send Email
                </button>
                <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
                  <Pencil size={14} /> Modify
                </button>
                <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
                  <Ban size={14} /> Disable
                </button>
                <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
            <div className="border-t border-border">
              <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden -mx-6 px-6" style={{ scrollBehavior: 'smooth' }}>
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                      tab === key ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text hover:border-border'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" /> {label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-6 px-6 py-4 space-y-4 no-scrollbar">
        {tab === 'contact' && <ContactAddressTab contact={contact} />}
        {tab === 'personal' && <PersonalDataTab />}
        {tab === 'related' && <RelatedItemsTab />}
        {tab === 'note' && <NoteTab />}
        {tab === 'documents' && <LinkedFilesTab />}
        {tab === 'agenda' && <EventsAgendaTab />}
      </div>
    </div>
  )
}

function ContactAddressTab({ contact }: { contact: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null; thirdPartyCode: string | null } }) {
  return (
    <div className="space-y-3">
      <TabTitle>Contact/Address</TabTitle>
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-text-faint text-xs">Last Name</p>
            <p className="font-medium text-text!">{contact.lastName || '—'}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">First Name</p>
            <p className="font-medium text-text!">{contact.firstName || '—'}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Third-Party Code</p>
            <p className="font-medium text-text!">{contact.thirdPartyCode || '—'}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Phone</p>
            <p className="font-medium text-text!">{contact.phone || '—'}</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Email</p>
            <p className="font-medium text-text!">{contact.email || '—'}</p>
          </div>
        </div>
      </Card>
      <NoApiNote>Title, Job Position, Address and Visibility aren't returned by the real Contacts list endpoint on this backend — not shown to avoid guessing.</NoApiNote>
    </div>
  )
}

function PersonalDataTab() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Personal Data</TabTitle>
        <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
          Modify
        </button>
      </div>
      <NoApiNote>This tab has no real JSON API on the current backend (contact/perso.php is a full legacy page) — shown for layout reference only.</NoApiNote>
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-text-faint text-xs">Title</p>
            <p className="text-text-faint italic">—</p>
          </div>
          <div>
            <p className="text-text-faint text-xs">Date of birth</p>
            <p className="text-text-faint italic">—</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function RelatedItemsTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Related Items</TabTitle>
      <NoApiNote>This tab has no real JSON API on the current backend — shown for layout reference only.</NoApiNote>
      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Type</th>
              <th className="font-medium px-4 py-2.5">Ref.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-text-faint italic">
                No data source available.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function NoteTab() {
  const [notePublic, setNotePublic] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Note</TabTitle>
        <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
          Save
        </button>
      </div>
      <NoApiNote>This tab has no real JSON API on the current backend (contact/note.php is a full legacy page) — nothing typed here is saved.</NoApiNote>
      <Card className="!h-auto">
        <textarea value={notePublic} onChange={(e) => setNotePublic(e.target.value)} rows={4} className="w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-3 py-2" />
      </Card>
    </div>
  )
}

function LinkedFilesTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Linked Files</TabTitle>
      <NoApiNote>This tab has no real JSON API on the current backend (contact/document.php is a full legacy page) — controls below are inert.</NoApiNote>
      <Card className="!h-auto">
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" disabled className="text-sm text-text-faint file:mr-3 file:rounded-md file:border file:border-input-border file:bg-surface-hover file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-text-faint cursor-not-allowed" />
          <button type="button" disabled title="No real API available on this backend" className={disabledBtn}>
            Upload
          </button>
        </div>
      </Card>
      <Card className="!h-auto">
        <p className="text-sm text-text-faint italic text-center py-4">No Documents Uploaded</p>
      </Card>
    </div>
  )
}

function EventsAgendaTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Events/Agenda</TabTitle>
      <NoApiNote>This tab has no real JSON API on the current backend (contact/agenda.php is a full legacy page) — shown for layout reference only.</NoApiNote>
      <Card className="!h-auto !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border">
              <th className="font-medium px-4 py-2.5">Ref.</th>
              <th className="font-medium px-4 py-2.5">Date</th>
              <th className="font-medium px-4 py-2.5">By</th>
              <th className="font-medium px-4 py-2.5">Type</th>
              <th className="font-medium px-4 py-2.5">Title</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-text-faint italic">
                No data source available.
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
