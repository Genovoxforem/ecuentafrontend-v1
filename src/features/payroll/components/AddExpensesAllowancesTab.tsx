import { useState } from 'react'
import { Pencil, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { SearchableSelect } from '../../../shared/components/forms/SearchableSelect'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useChartOfAccountsTree, type CoaNode } from '../../generalLedger/generalLedgerSetup.queries'
import {
  useExpenseAllowances,
  useAddExpenseAllowance,
  useUpdateExpenseAllowance,
  useToggleExpenseAllowance,
  useDeleteExpenseAllowance,
  type ExpenseAllowanceRow,
} from '../payrollAdminTabs.queries'

function flattenAccounts(nodes: CoaNode[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  for (const n of nodes) {
    const [accountNumber] = n.text.split('-')
    if (accountNumber?.trim()) out.push({ value: accountNumber.trim(), label: n.text })
    if (n.items?.length) out.push(...flattenAccounts(n.items))
  }
  return out
}

export function AddExpensesAllowancesTab() {
  const { data, isLoading, isError, error, refetch } = useExpenseAllowances()
  const { data: coaTree } = useChartOfAccountsTree()
  const addRow = useAddExpenseAllowance()
  const updateRow = useUpdateExpenseAllowance()
  const toggleRow = useToggleExpenseAllowance()
  const deleteRow = useDeleteExpenseAllowance()

  const accountOptions = coaTree ? flattenAccounts(coaTree) : []

  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [accountNumber, setAccountNumber] = useState('4014')
  const [formError, setFormError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRow, setEditRow] = useState<{ code: string; label: string; accountNumber: string }>({ code: '', label: '', accountNumber: '' })

  function handleAdd() {
    setFormError('')
    if (!code.trim() || !label.trim() || !accountNumber) return setFormError('Code, Label and Accounting Code are all required.')
    addRow.mutate(
      { code: code.trim(), label: label.trim(), accountNumber },
      {
        onSuccess: () => {
          setCode('')
          setLabel('')
        },
        onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not add the row.'),
      },
    )
  }

  function startEdit(row: ExpenseAllowanceRow) {
    setEditingId(row.id)
    setEditRow({ code: row.code, label: row.label, accountNumber: row.accountNumber })
  }

  function saveEdit(id: string) {
    updateRow.mutate(
      { id, code: editRow.code, label: editRow.label, accountNumber: editRow.accountNumber },
      { onSuccess: () => setEditingId(null) },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto !p-0 overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
              <th className="font-medium px-4 py-2.5">
                Code <span className="text-danger">*</span>
              </th>
              <th className="font-medium px-4 py-2.5">
                Label <span className="text-danger">*</span>
              </th>
              <th className="font-medium px-4 py-2.5">
                Accounting Code <span className="text-danger">*</span>
              </th>
              <th className="font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="px-4 py-3">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter Code" className={inputClasses} />
              </td>
              <td className="px-4 py-3">
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Enter Label" className={inputClasses} />
              </td>
              <td className="px-4 py-3">
                <SearchableSelect value={accountNumber} onChange={setAccountNumber} options={accountOptions} placeholder="Select Accounting Code..." className="max-w-xs" />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={addRow.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                >
                  {addRow.isPending && <Loader2 size={14} className="animate-spin" />}
                  Add
                </button>
              </td>
            </tr>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <LegacyLoadingCard label="Loading expenses & allowances…" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <LegacyErrorCard title="Couldn't load expenses & allowances" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
                </td>
              </tr>
            ) : (
              (data ?? []).map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <input value={editRow.code} onChange={(e) => setEditRow((r) => ({ ...r, code: e.target.value }))} className={inputClasses} />
                    </td>
                    <td className="px-4 py-3">
                      <input value={editRow.label} onChange={(e) => setEditRow((r) => ({ ...r, label: e.target.value }))} className={inputClasses} />
                    </td>
                    <td className="px-4 py-3">
                      <SearchableSelect value={editRow.accountNumber} onChange={(v) => setEditRow((r) => ({ ...r, accountNumber: v }))} options={accountOptions} className="max-w-xs" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(row.id)}
                          disabled={updateRow.isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
                        >
                          Modify
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface-hover">
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text!">{row.code}</td>
                    <td className="px-4 py-3 text-text-muted">{row.label}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {row.accountNumber} - {row.accountLabel}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          title={row.active ? 'Click to Disable' : 'Click to Activate'}
                          onClick={() => toggleRow.mutate(row.id)}
                          className={row.active ? 'text-success' : 'text-text-faint'}
                        >
                          {row.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          type="button"
                          title={`Delete ${row.label}`}
                          onClick={() => {
                            if (confirm(`Delete "${row.label}"?`)) deleteRow.mutate(row.id)
                          }}
                          className="text-text-faint hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button type="button" title={`Modify ${row.label}`} onClick={() => startEdit(row)} className="text-text-faint hover:text-brand">
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </Card>
      {formError && <p className="text-sm text-danger">{formError}</p>}
    </div>
  )
}
