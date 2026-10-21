import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, IdCard, User, Link2, StickyNote, Paperclip, CalendarClock, Mail, Pencil, Ban, Trash2 } from 'lucide-react'
import { ROUTES } from '../../../routes'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useContact, useContactMeta, useUpdateContact, type ContactKind } from '../contacts.queries'
import { ContractAgendaTab, ContractDocumentsTab, RecordNotesTab } from '../../contracts/components/ContractTabs'
import { CONTACT_BASE } from '../../../api/contractTabs'
import type { ContactDetail as ContactData } from '../../../api/contacts'

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

const disabledBtn = 'flex items-center gap-1.5 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-medium text-text-faint cursor-not-allowed'

// Header and Contact/Address come from contact/fapi/get.php (see
// contacts.queries.ts). contact/perso.php, note.php, document.php and
// agenda.php are still full legacy HTML pages with no JSON API behind them
// (checked every one directly), so those remaining tabs are design-only,
// matching the real page's layout with inert controls, exactly like
// Contract Detail's no-API tabs.
export function ContactDetail({ kind = 'customer' }: { kind?: ContactKind }) {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<TabKey>('contact')
  const { data: contact, isLoading, isError, error, refetch } = useContact(id)
  const listRoute = kind === 'vendor' ? ROUTES.vendorContactList : ROUTES.contactList

  if (isLoading) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyLoadingCard label="Loading contact…" />
      </div>
    )
  }
  if (isError || !contact) {
    return (
      <div className="-m-6 flex-1 flex flex-col min-h-0 p-6">
        <LegacyErrorCard title="Couldn't load contact" message={error instanceof Error ? error.message : `No contact with id ${id}.`} onRetry={() => refetch()} />
      </div>
    )
  }

  return (
    <div className="-m-6 flex-1 flex flex-col min-h-0 overflow-x-hidden">
      <div className="sticky -top-6 z-10 -mx-6 pt-4 pb-2 bg-white dark:bg-gray-950">
        <div className="px-6">
          <Card className="!h-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 p-4 pl-8 pr-8 border-b border-border">
              <div>
                <Link to={listRoute} className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text mb-1.5">
                  <ChevronLeft size={14} /> Contacts/Addresses
                </Link>
                <h2 className="text-lg font-bold text-text!">{contact.full_name || '—'}</h2>
                <div className="text-xs text-text-muted mt-1 space-y-0.5">
                  <p>
                    <span className="text-text-faint">Third-party code:</span> {contact.third_party_code || '—'}
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
        {tab === 'personal' && <PersonalDataTab contact={contact} />}
        {tab === 'related' && <RelatedItemsTab />}
        {tab === 'note' && <RecordNotesTab id={id} base={CONTACT_BASE} />}
        {tab === 'documents' && <ContractDocumentsTab id={id} base={CONTACT_BASE} />}
        {tab === 'agenda' && <ContractAgendaTab id={id} base={CONTACT_BASE} eventElement="" subject="contact" />}
      </div>
    </div>
  )
}

function ContactAddressTab({ contact }: { contact: ContactData }) {
  const phones = [
    contact.phone_pro && `${contact.phone_pro} (work)`,
    contact.phone_mobile && `${contact.phone_mobile} (mobile)`,
    contact.phone_perso && `${contact.phone_perso} (personal)`,
  ].filter(Boolean)
  const address = [contact.address, [contact.zip, contact.town].filter(Boolean).join(' '), contact.country].filter(Boolean).join(', ')
  const fields: Array<[string, string]> = [
    ['Last Name', contact.lastname],
    ['First Name', contact.firstname],
    ['Third-Party', [contact.third_party_name, contact.third_party_code && `(${contact.third_party_code})`].filter(Boolean).join(' ')],
    ['Job Position', contact.poste],
    ['Phone', phones.join(' · ')],
    ['Fax', contact.fax],
    ['Email', contact.email],
    ['Address', address],
    ['Visibility', contact.priv ? 'Private' : 'Public'],
  ]
  return (
    <div className="space-y-3">
      <TabTitle>Contact/Address</TabTitle>
      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3 text-sm">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-text-faint text-xs">{label}</p>
              <p className="font-medium text-text!">{value || '—'}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PersonalDataTab({ contact }: { contact: ContactData }) {
  const { data: meta } = useContactMeta()
  const update = useUpdateContact(String(contact.id))
  const canEdit = !!contact.actions?.can_edit
  const [editing, setEditing] = useState(false)
  const [civility, setCivility] = useState('')
  const [birthday, setBirthday] = useState('')
  const [networks, setNetworks] = useState<Record<string, string>>({})

  const civilityLabel = meta?.civilities.find((c) => c.code === contact.civility_code)?.label ?? contact.civility_code ?? ''
  const socials = Object.entries(contact.socialnetworks ?? {}).filter(([, handle]) => handle)

  function startEdit() {
    setCivility(contact.civility_code ?? '')
    setBirthday(contact.birthday?.slice(0, 10) ?? '')
    setNetworks({ ...(contact.socialnetworks ?? {}) })
    setEditing(true)
  }

  function save() {
    const handles = Object.fromEntries(Object.entries(networks).filter(([, v]) => v.trim()))
    update.mutate(
      { ...(civility ? { civility_code: civility } : {}), ...(birthday ? { birthday } : {}), socialnetworks: handles },
      { onSuccess: () => setEditing(false) },
    )
  }

  const fieldCls = 'w-full text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1.5'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <TabTitle>Personal Data</TabTitle>
        {editing ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text">
              Cancel
            </button>
            <button type="button" disabled={update.isPending} onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
              {update.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <button type="button" disabled={!canEdit} onClick={startEdit} title={canEdit ? 'Modify the personal data' : 'You do not have permission to edit this contact'} className="flex items-center gap-1.5 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-text-faint">
            Modify
          </button>
        )}
      </div>
      {update.isError && <p role="alert" className="text-sm text-danger">{update.error instanceof Error ? update.error.message : 'Could not save the personal data.'}</p>}
      <Card className="!h-auto">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-text-faint text-xs">Title</span>
              <select value={civility} onChange={(e) => setCivility(e.target.value)} className={fieldCls}>
                <option value="" />
                {(meta?.civilities ?? []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-text-faint text-xs">Date of birth</span>
              <input type="date" value={birthday} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthday(e.target.value)} className={fieldCls} />
            </label>
            {(meta?.social_networks ?? []).map((n) => (
              <label key={n.code} className="flex flex-col gap-1">
                <span className="text-text-faint text-xs">{n.label}</span>
                <input value={networks[n.code] ?? ''} onChange={(e) => setNetworks((prev) => ({ ...prev, [n.code]: e.target.value }))} className={fieldCls} />
              </label>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-faint text-xs">Title</p>
              <p className="text-text!">{civilityLabel || '—'}</p>
            </div>
            <div>
              <p className="text-text-faint text-xs">Date of birth</p>
              <p className="text-text!">{contact.birthday ? contact.birthday.slice(0, 10) : '—'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-text-faint text-xs">Social networks</p>
              {socials.length === 0 ? (
                <p className="text-text-faint">—</p>
              ) : (
                <ul className="space-y-0.5">
                  {socials.map(([network, handle]) => (
                    <li key={network} className="text-text!">
                      <span className="text-text-muted capitalize">{network}:</span> {handle}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function RelatedItemsTab() {
  return (
    <div className="space-y-3">
      <TabTitle>Related Items</TabTitle>
      
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
