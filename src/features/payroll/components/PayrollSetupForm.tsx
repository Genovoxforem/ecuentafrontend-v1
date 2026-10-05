import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { PayrollSettingsTab } from './PayrollSettingsTab'
import { EmpDesignationTab } from './EmpDesignationTab'
import { TaxDeductionsTab } from './TaxDeductionsTab'
import { DeviceSettingTab } from './DeviceSettingTab'
import { AboutPayrollTab } from './AboutPayrollTab'
import { AddExpensesAllowancesTab } from './AddExpensesAllowancesTab'
import { PayeeTaxSlabTab } from './PayeeTaxSlabTab'

const TABS = [
  { key: 'settings', label: 'Settings', Component: PayrollSettingsTab },
  { key: 'empdesignation', label: 'EmpDesignation', Component: EmpDesignationTab },
  { key: 'taxdeductions', label: 'Tax Deductions', Component: TaxDeductionsTab },
  { key: 'devicesetting', label: 'Device Setting', Component: DeviceSettingTab },
  { key: 'about', label: 'About', Component: AboutPayrollTab },
  { key: 'addexpenses', label: 'Add Expenses & Allowances', Component: AddExpensesAllowancesTab },
  { key: 'payeetax', label: 'Payee Tax Slab', Component: PayeeTaxSlabTab },
] as const
type TabKey = (typeof TABS)[number]['key']

// custom/payroll/admin/{setup,designation,tax_deduction,device_settings,
// about,add_expense,paye_tax}.php — all 7 real backend pages, each read via
// fetchLegacyDocument and each with real save/update/delete actions posted
// back to the exact same real endpoints those pages' own forms use
// (confirmed by reading every one of them directly this session). See each
// tab component + payrollSetup.queries.ts / payrollAdminTabs.queries.ts.
export function PayrollSetupForm() {
  const [tab, setTab] = useState<TabKey>('settings')
  const Active = TABS.find((t) => t.key === tab)?.Component ?? PayrollSettingsTab

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Settings2 size={20} className="text-brand" /> PayrollSetup
      </h2>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
              tab === t.key ? 'text-brand border-b-2 border-brand' : 'text-text-faint hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  )
}
