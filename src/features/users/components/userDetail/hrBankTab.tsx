import { useEffect, useState, type ComponentType } from 'react'
import { UserRound, X, Mail, Plus, Loader2, PhoneCall, CalendarClock, Save, Landmark, CreditCard } from 'lucide-react'
import { useUserBankProfile, useSaveUserPersonalContact, useAddUserBankAccount, useSaveUserLeaveTypes } from '../../userDetailTabs.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'
import { InfoCard, inputCls, primaryBtn } from './UserDetailShared'

function IconField({
  icon: Icon,
  ...props
}: { icon: ComponentType<{ size?: number; className?: string }> } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
      <input {...props} className={`${inputCls} pl-9`} />
    </div>
  )
}

// Real via userprofile/api/bank.php (bank.php's own set_personal/add_account
// actions — see userDetailTabs.queries.ts). Leave-type assignment is real
// too, but goes through a different real page entirely
// (user/salarydetails.php's own editform, action=update) — bank.php's own
// action=set_leavetypes is a dead stub (see useSaveUserLeaveTypes' comment).
export function HrBankTab({ userId, canEdit }: { userId: string | undefined; canEdit: boolean }) {
  const { data, isLoading, isError, error, refetch } = useUserBankProfile(userId)
  const saveContact = useSaveUserPersonalContact(userId)
  const addAccount = useAddUserBankAccount(userId)
  const saveLeaveTypes = useSaveUserLeaveTypes(userId)
  const [personalEmail, setPersonalEmail] = useState('')
  const [personalMobile, setPersonalMobile] = useState('')
  const [accountForm, setAccountForm] = useState({ label: '', bank: '', number: '', iban: '', bic: '' })
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [selectedLeaves, setSelectedLeaves] = useState<number[]>([])

  useEffect(() => {
    if (data) {
      setPersonalEmail(data.personalEmail)
      setPersonalMobile(data.personalMobile)
      setSelectedLeaves(data.assignedLeaves)
    }
  }, [data])

  if (isLoading) return <LegacyLoadingCard label="Loading HR & bank details…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load HR & bank details" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const editable = canEdit && data.canEdit

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,1fr)] gap-5">
      <div className="space-y-5">
        <InfoCard icon={UserRound} title="Personal Contact" subtitle="Employee's personal contact details">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-faint">Personal email</label>
              <IconField
                icon={Mail}
                type="email"
                value={personalEmail}
                disabled={!editable}
                onChange={(e) => setPersonalEmail(e.target.value)}
                placeholder="employee@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-text-faint">Personal mobile</label>
              <IconField
                icon={PhoneCall}
                type="tel"
                value={personalMobile}
                disabled={!editable}
                onChange={(e) => setPersonalMobile(e.target.value)}
                placeholder="Enter mobile number"
                className="mt-1"
              />
            </div>
            {editable && (
              <button
                type="button"
                disabled={saveContact.isPending}
                onClick={() => saveContact.mutate({ personal_email: personalEmail, personal_mobile: personalMobile })}
                className={primaryBtn}
              >
                {saveContact.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
              </button>
            )}
            {saveContact.isError && <p className="text-sm text-danger">{saveContact.error instanceof Error ? saveContact.error.message : 'Failed to save.'}</p>}
          </div>
        </InfoCard>

        <InfoCard
          icon={Landmark}
          title="Bank Accounts"
          subtitle="Manage bank accounts for salary payments"
          action={
            editable && (
              <button type="button" onClick={() => setShowAddAccount((s) => !s)} className={`${primaryBtn} shrink-0`}>
                <Plus size={13} /> Add Account
              </button>
            )
          }
        >
          {data.accounts.length === 0 && !showAddAccount ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-surface text-text-faint">
                <CreditCard size={22} />
              </span>
              <p className="text-sm font-medium text-text!">No bank accounts yet</p>
              <p className="text-xs text-text-faint">Add a bank account to enable salary payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                    <th className="font-medium py-2 px-3">Label</th>
                    <th className="font-medium py-2 px-3">Bank</th>
                    <th className="font-medium py-2 px-3">Account Number</th>
                    <th className="font-medium py-2 px-3">IBAN</th>
                    <th className="font-medium py-2 px-3">BIC/SWIFT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-3 text-text!">{a.label}</td>
                      <td className="py-2 px-3 text-text-muted">{a.bank}</td>
                      <td className="py-2 px-3 text-text-muted">{a.number}</td>
                      <td className="py-2 px-3 text-text-muted">{a.iban}</td>
                      <td className="py-2 px-3 text-text-muted">{a.bic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {editable && showAddAccount && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
              {(['label', 'bank', 'number', 'iban', 'bic'] as const).map((key) => (
                <input
                  key={key}
                  placeholder={key === 'label' ? 'BAN Label' : key === 'number' ? 'Account Number' : key.toUpperCase()}
                  value={accountForm[key]}
                  onChange={(e) => setAccountForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={inputCls}
                />
              ))}
              <button
                type="button"
                disabled={addAccount.isPending || !accountForm.label}
                onClick={() =>
                  addAccount.mutate(accountForm, {
                    onSuccess: () => {
                      setAccountForm({ label: '', bank: '', number: '', iban: '', bic: '' })
                      setShowAddAccount(false)
                    },
                  })
                }
                className={`${primaryBtn} sm:col-span-5 justify-center`}
              >
                {addAccount.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Account
              </button>
            </div>
          )}
        </InfoCard>
      </div>

      <div>
        <InfoCard icon={CalendarClock} title="Leave Types" subtitle="Assign holiday leave types for this employee. Salary templates and shifts are managed in the Payroll tab.">
          {data.leaveTypes.length === 0 ? (
            <p className="text-sm text-text-faint italic">No leave types configured.</p>
          ) : (
            <div>
              {selectedLeaves.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedLeaves.map((id) => {
                    const t = data.leaveTypes.find((lt) => lt.id === id)
                    if (!t) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand/10 text-brand px-2.5 py-1 text-xs">
                        {canEdit && (
                          <button
                            type="button"
                            title="Remove"
                            onClick={() => setSelectedLeaves((prev) => prev.filter((x) => x !== id))}
                            className="hover:opacity-70"
                          >
                            <X size={10} />
                          </button>
                        )}
                        {t.name} ({t.daysEntitled} days)
                      </span>
                    )
                  })}
                </div>
              )}
              <div className="space-y-1">
                {data.leaveTypes.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      checked={selectedLeaves.includes(t.id)}
                      disabled={!canEdit}
                      onChange={(e) => setSelectedLeaves((prev) => (e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)))}
                      className="rounded border-input-border"
                    />
                    {t.name} <span className="text-text-faint">({t.daysEntitled} days)</span>
                  </label>
                ))}
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={saveLeaveTypes.isPending || JSON.stringify([...selectedLeaves].sort()) === JSON.stringify([...data.assignedLeaves].sort())}
                  onClick={() => saveLeaveTypes.mutate(selectedLeaves)}
                  className={`${primaryBtn} mt-3`}
                >
                  {saveLeaveTypes.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Leave Types
                </button>
              )}
              {saveLeaveTypes.isError && (
                <p className="text-sm text-danger mt-1">{saveLeaveTypes.error instanceof Error ? saveLeaveTypes.error.message : 'Failed to save.'}</p>
              )}
            </div>
          )}
        </InfoCard>
      </div>
    </div>
  )
}
