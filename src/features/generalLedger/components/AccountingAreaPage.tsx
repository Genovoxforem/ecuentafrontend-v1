import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckSquare, CalendarDays } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'
import { getBackendUrl } from '../../../api/backends'

// accountancy/index.php — a getting-started wizard (steps 1-9, A-E) that links
// into Setup/Binding pages built elsewhere in this module. Every href below
// was checked against the real page's own links (not assumed from the label
// text), which surfaced two genuine quirks:
//   - STEP 3's "Chart of accounts" link actually points at the same real
//     page as the sidebar's own "Pcg_version" item (admin/account.php), NOT
//     the sidebar's separate "Chart of accounts" leaf (admin/accountjstree.php,
//     a different real page) — mapped to ledgerPcgVersion here.
//   - STEP 2's "Chart of accounts models" is yet another real page
//     (admin/accountmodel.php, distinct from both of the above) with no
//     dedicated page built in this app yet — opens the real backend page
//     directly instead of a fabricated internal route.
// Step D ("Registration in accounting" / "Register transactions in
// accounting") is genuinely plain bold text on the real page too, not a
// link — left as plain text rather than a fabricated route.
function StepLink({ to, external, children }: { to: string | null; external?: boolean; children: ReactNode }) {
  if (!to) return <span className="font-medium text-text!">{children}</span>
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className="font-medium text-brand hover:underline">
      {children}
    </Link>
  )
}

function Step({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="text-sm text-text-muted">
      <span className="font-semibold text-text!">STEP {id}:</span> {children}
    </p>
  )
}

// STEP 2 has no built React page yet, so it opens the real backend page
// directly — but getBackendUrl() throws when VITE_BACKEND_URL isn't
// configured, so guard it the same way Navbar.tsx does rather than crashing
// this page's render.
function useLegacyPageUrl(path: string): string | null {
  try {
    return `${getBackendUrl()}${path}`
  } catch {
    return null
  }
}

export function AccountingAreaPage() {
  const chartOfAccountsModelsUrl = useLegacyPageUrl('/accountancy/admin/accountmodel.php')
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <FileText size={20} className="text-brand" /> Accounting Area
      </h2>

      <p className="text-sm text-text-muted">Usage of the accountancy module is done in several step:</p>

      <Card className="!h-auto gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-text!">
          <CheckSquare size={16} className="text-brand" /> The following actions are usually executed one time only, or once per year...
        </h3>

        <div className="space-y-2 border-t border-border pt-3">
          <Step id="1">
            Create or check content of your journal list from menu Setup - <StepLink to={ROUTES.ledgerAccountingJournals}>Accounting journals</StepLink>
          </Step>
          <Step id="2">
            Check that a model of chart of account exists or create one from menu Setup -{' '}
            <StepLink to={chartOfAccountsModelsUrl} external>
              Chart of accounts models
            </StepLink>
          </Step>
          <Step id="3">
            Select and/or complete your chart of account from menu Setup - <StepLink to={ROUTES.ledgerPcgVersion}>Chart of accounts</StepLink>
          </Step>
        </div>

        <p className="text-sm text-text-muted border-t border-border pt-3">
          Next steps should be done to save you time in future by suggesting you the correct default accounting account when making the journalization
          (writing record in Journals and General ledger)
        </p>

        <div className="space-y-2">
          <Step id="4">
            Define default accounting accounts. For this, use the menu entry Setup - <StepLink to={ROUTES.ledgerDefaultAccounts}>Default accounts</StepLink>.
          </Step>
          <Step id="5">
            Define accounting accounts and journal code for each bank and financial accounts. For this, use the menu entry Setup -{' '}
            <StepLink to={ROUTES.ledgerBankAccountsSetup}>Bank accounts</StepLink>.
          </Step>
          <Step id="6">
            Define accounting accounts for each VAT Rates. For this, use the menu entry Setup - <StepLink to={ROUTES.ledgerVatAccounts}>Vat accounts</StepLink>
            .
          </Step>
          <Step id="7">
            Define default accounting accounts for special expenses (miscellaneous taxes). For this, use the menu entry Setup -{' '}
            <StepLink to={ROUTES.ledgerTaxAccounts}>Tax accounts</StepLink>.
          </Step>
          <Step id="8">
            Define default accounting accounts for each type of expense report. For this, use the menu entry Setup -{' '}
            <StepLink to={ROUTES.ledgerExpenseReportAccounts}>Expense report accounts</StepLink>.
          </Step>
          <Step id="9">
            Define accounting accounts on your products/services. For this, use the menu entry Setup -{' '}
            <StepLink to={ROUTES.ledgerProductAccounts}>Products accounts</StepLink>.
          </Step>
        </div>
      </Card>

      <Card className="!h-auto gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-text!">
          <CalendarDays size={16} className="text-brand" /> The following actions are usually executed every month, week or day for very large companies...
        </h3>

        <div className="space-y-2 border-t border-border pt-3">
          <Step id="A">
            Check the binding between existing Customer invoices lines and accounting account is done, so application will be able to journalize
            transactions in Ledger in one click. Complete missing bindings. For this, use the menu entry Transfer in accounting -{' '}
            <StepLink to={ROUTES.ledgerCustomerBindingIndex}>Customer invoice binding</StepLink>.
          </Step>
          <Step id="B">
            Check the binding between existing Vendor invoices lines and accounting account is done, so application will be able to journalize transactions
            in Ledger in one click. Complete missing bindings. For this, use the menu entry Transfer in accounting -{' '}
            <StepLink to={ROUTES.ledgerVendorBindingIndex}>Vendor invoice binding</StepLink>.
          </Step>
          <Step id="C">
            Check the binding between existing Expense reports lines and accounting account is done, so application will be able to journalize transactions
            in Ledger in one click. Complete missing bindings. For this, use the menu entry Transfer in accounting -{' '}
            <StepLink to={ROUTES.ledgerExpenseReportBindingIndex}>Expense report binding</StepLink>.
          </Step>
          <Step id="D">
            Write transactions into the Ledger. For this, go into menu <span className="font-medium text-text!">Transfer in accounting - Registration in
            accounting</span>, and click into button <span className="font-medium text-text!">Register transactions in accounting</span>.
          </Step>
          <Step id="E">Add or edit existing transactions and generate reports and exports.</Step>
        </div>
      </Card>
    </div>
  )
}
