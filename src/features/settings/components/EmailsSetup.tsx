import { useState } from 'react'
import { Mail } from 'lucide-react'
import { OutgoingEmailsTab } from './emails/OutgoingEmailsTab'
import { EmailTemplatesTab } from './emails/EmailTemplatesTab'
import { SenderProfilesTab } from './emails/SenderProfilesTab'

const TABS = ['Outgoing emails', 'Outgoing emails (for module Ticket)', 'Email templates', 'Emails sender profiles'] as const
type Tab = (typeof TABS)[number]

// Setup > Emails. Each tab is one of the backend's own email setup pages (mails.php,
// mails_ticket.php, mails_templates.php, mails_senderprofile_list.php), read and changed
// through the same requests those pages send.
export function EmailsSetup({ defaultTab = 'Outgoing emails' }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Mail size={20} className="text-brand" /> Emails setup
      </h2>
      <p className="text-sm text-text-muted">This page allows you to set parameters or options for email sending.</p>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${tab === t ? 'border-brand text-brand' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Outgoing emails' && <OutgoingEmailsTab page="outgoing" />}
      {tab === 'Outgoing emails (for module Ticket)' && <OutgoingEmailsTab page="ticket" />}
      {tab === 'Email templates' && <EmailTemplatesTab />}
      {tab === 'Emails sender profiles' && <SenderProfilesTab />}
    </div>
  )
}
