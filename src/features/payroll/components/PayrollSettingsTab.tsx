import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useBankAccountsList } from '../../banking/banking.queries'
import { useChartOfAccountsTree, type CoaNode } from '../../generalLedger/generalLedgerSetup.queries'
import { usePayrollSetup, useUpdatePayrollSetup, type PayrollSetupRow } from '../payrollSetup.queries'

// Every real account (account_number-label) flattened out of the Chart of
// Accounts tree — the same real /accountancy/admin/fetch.php data General
// Ledger's own tree already uses, reused here rather than re-scraping
// custom/payroll/admin/setup.php's own embedded <select> a second time.
function flattenAccounts(nodes: CoaNode[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  for (const n of nodes) {
    const [accountNumber] = n.text.split('-')
    if (accountNumber?.trim()) out.push({ value: accountNumber.trim(), label: n.text })
    if (n.items?.length) out.push(...flattenAccounts(n.items))
  }
  return out
}

export function PayrollSettingsTab() {
  const { data, isLoading, isError, error, refetch } = usePayrollSetup()
  const { data: coaTree } = useChartOfAccountsTree()
  const { data: bankAccounts } = useBankAccountsList()
  const updateSetup = useUpdatePayrollSetup()

  const [rows, setRows] = useState<PayrollSetupRow[]>([])
  const [bankAccountId, setBankAccountId] = useState('')
  const [napsaLimit, setNapsaLimit] = useState('')
  const [salaryCalculationFrom, setSalaryCalculationFrom] = useState<'basic' | 'gross'>('gross')
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Real current state loads async — local editable state is seeded from it
  // once, same pattern every other legacy-backed edit form in this app uses.
  useEffect(() => {
    if (!data) return
    setRows(data.rows)
    setBankAccountId(data.bankAccountId)
    setNapsaLimit(data.napsaLimit)
    if (data.salaryCalculationFrom) setSalaryCalculationFrom(data.salaryCalculationFrom)
  }, [data])

  const accountOptions = coaTree ? flattenAccounts(coaTree) : []

  function handleUpdate() {
    setSaveError('')
    setSaved(false)
    updateSetup.mutate(
      {
        rows: rows.map((r) => ({ key: r.key, label: r.label, codeId: r.codeId, currentAccountancyCode: r.currentAccountancyCode, accountNumber: r.selectedAccountNumber })),
        bankAccountId,
        napsaLimit,
        salaryCalculationFrom,
      },
      {
        onSuccess: () => setSaved(true),
        onError: (e) => setSaveError(e instanceof Error ? e.message : 'Could not save the payroll setup.'),
      },
    )
  }

  if (isLoading) return <LegacyLoadingCard label="Loading payroll setup…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load payroll setup" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  return (
    <div className="space-y-4">
      <Card className="!h-auto !p-0 overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">Code</th>
              <th className="font-medium px-4 py-2.5">Label</th>
              <th className="font-medium px-4 py-2.5">Accounting Code</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-text!">{r.key}</td>
                <td className="px-4 py-3 text-text-muted">{r.label}</td>
                <td className="px-4 py-3 text-text-muted">
                  <SearchableSelect
                    value={r.selectedAccountNumber}
                    onChange={(v) => setRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, selectedAccountNumber: v } : row)))}
                    options={accountOptions}
                    placeholder="Select Accounting Code..."
                    className="max-w-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="!h-auto space-y-4">
        <Field label="Bank For Payroll Payments" required>
          <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className={inputClasses}>
            <option value="">Select a bank account…</option>
            {(bankAccounts ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="NAPSA Limit" required>
          <input type="number" step="any" value={napsaLimit} onChange={(e) => setNapsaLimit(e.target.value)} className={inputClasses} />
        </Field>
        <Field label="Salary Calculation From" required>
          <select value={salaryCalculationFrom} onChange={(e) => setSalaryCalculationFrom(e.target.value as 'basic' | 'gross')} className={inputClasses}>
            <option value="basic">Basic Salary</option>
            <option value="gross">Gross Salary</option>
          </select>
        </Field>
        {saveError && <p className="text-sm text-danger">{saveError}</p>}
        {saved && !updateSetup.isPending && <p className="text-sm text-success">Saved.</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={updateSetup.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {updateSetup.isPending && <Loader2 size={14} className="animate-spin" />}
            Update
          </button>
        </div>
      </Card>
    </div>
  )
}
