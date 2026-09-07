import { BookText } from 'lucide-react'
import { ROUTES } from '../../routes'
import type { NavSection } from '../navTypes'

// Mirrors the real app's "General Ledger" left menu (llx_menu, mainmenu=generalledger).
// Labels below are verbatim from the live menu (confirmed via an authenticated
// fetch of accountancy/index.php) — including its own inconsistent casing/
// spacing (e.g. "FiscalPeriod" as one word) — since matching in
// buildNavSections.ts is by normalized label text, not by idmenu. NavGroupItem
// nests to arbitrary depth (see navTypes.ts), so the real 3-level "Default
// Accounting > Setup > ..." shape below is fully expanded, not flattened.
export const nav: NavSection = {
  key: 'general-ledger',
  label: 'General Ledger',
  icon: BookText,
  items: [
    {
      label: 'Default Accounting',
      items: [
        {
          label: 'Setup',
          items: [
            { label: 'General', path: ROUTES.ledgerGeneralSettings },
            { label: 'Accounting journals', path: ROUTES.ledgerAccountingJournals },
            { label: 'Pcg_version', path: ROUTES.ledgerPcgVersion },
            { label: 'Chart of accounts', path: ROUTES.ledgerChartOfAccounts },
            { label: 'Chart of individual accounts', path: ROUTES.ledgerChartOfIndividualAccounts },
            { label: 'Personalized groups', path: ROUTES.ledgerPersonalizedGroups },
            { label: 'Default accounts', path: ROUTES.ledgerDefaultAccounts },
            { label: 'Bank accounts', path: ROUTES.ledgerBankAccountsSetup },
            { label: 'Vat accounts', path: ROUTES.ledgerVatAccounts },
            { label: 'Tax accounts', path: ROUTES.ledgerTaxAccounts },
            { label: 'Expense report accounts', path: ROUTES.ledgerExpenseReportAccounts },
            { label: 'Product accounts', path: ROUTES.ledgerProductAccounts },
            { label: 'Export Options', path: ROUTES.ledgerExportOptions },
            { label: 'Closure accounts', path: ROUTES.ledgerClosureAccounts },
            { label: 'FiscalPeriod', path: ROUTES.ledgerFiscalPeriod },
          ],
        },
        { label: 'Account Balance', path: ROUTES.ledgerAccountBalance },
        { label: 'Create Financial Closure', path: ROUTES.ledgerCreateFinancialClosure },
        { label: 'Financial Closure List', path: ROUTES.ledgerFinancialClosureList },
        { label: 'Journals', path: ROUTES.ledgerList },
        // Real label + real file — same page as "Export Accounting Documents"
        // under the Accounting group below (compta/accounting-files.php),
        // reached via a 2nd real menu node. "Accountant Files"/"Reportings"
        // (previously here) don't exist verbatim on the live menu — replaced
        // with the 3 real labels found instead (Export source documents,
        // Reporting, MenuReportInOut, ReportTurnover).
        { label: 'Export source documents', path: ROUTES.ledgerExportAccountingDocuments },
        { label: 'Reporting', path: ROUTES.ledgerReportingArea },
        { label: 'MenuReportInOut', path: ROUTES.ledgerReportingArea },
        { label: 'ReportTurnover', path: ROUTES.ledgerReportTurnover },
      ],
    },
    {
      label: 'Accounting',
      items: [
        { label: 'Accounting Area', path: ROUTES.ledgerAccountingArea },
        { label: 'Ledger', path: ROUTES.ledgerDashboard },
        { label: 'Account Balance', path: ROUTES.ledgerAccountBalance },
        // Live label is literally "Annual closure" — not "Closure" — confirmed
        // via an authenticated fetch of the real menu tree.
        { label: 'Annual Closure', path: ROUTES.ledgerAnnualClosure },
        { label: 'Validate Movements', path: ROUTES.ledgerValidateMovements },
        { label: 'Export Accounting Documents', path: ROUTES.ledgerExportAccountingDocuments },
        { label: 'Opening Balance', path: ROUTES.ledgerOpeningBalance },
        { label: 'Foreign Currency Revaluation', path: ROUTES.ledgerForeignCurrencyRevaluation },
      ],
    },
    {
      label: 'Groups',
      items: [
        { label: 'By Predefined Groups', path: ROUTES.ledgerPredefinedGroups },
        { label: 'By Personalized Groups', path: ROUTES.ledgerPersonalizedGroupsReport },
      ],
    },
    {
      label: 'Donations',
      items: [
        { label: 'Donations Area', path: ROUTES.ledgerDonationsArea },
        { label: 'New Donation', path: ROUTES.ledgerDonationCreate },
        { label: 'List', path: ROUTES.ledgerDonationsList },
      ],
    },
    // Several labels below hyphenate without surrounding spaces on the live
    // menu (e.g. "New-Sales tax", "Payments-Salaries") — verbatim, not a typo
    // fixed here, since label matching in buildNavSections.ts is exact-text
    // (case-insensitive only).
    {
      label: 'Special Expenses',
      items: [
        { label: 'Area For All Special Payments', path: ROUTES.ledgerSpecialPaymentsArea },
        { label: 'Social/Fiscal Taxes', path: ROUTES.ledgerSocialFiscalTaxesList },
        { label: 'New Social/Fiscal Tax', path: ROUTES.ledgerSocialFiscalTaxCreate },
        { label: 'List - Social/Fiscal Taxes', path: ROUTES.ledgerSocialFiscalTaxesList },
        { label: 'Payments-Social/Fiscal Taxes', path: ROUTES.ledgerSocialFiscalTaxPayments },
        { label: 'Sales Tax', path: ROUTES.ledgerSalesTaxList },
        { label: 'New-Sales Tax', path: ROUTES.ledgerSalesTaxCreate },
        { label: 'Report By Month-Sales Tax', path: ROUTES.ledgerVatReportByMonth },
        { label: 'Report By Customer-Sales Tax', path: ROUTES.ledgerVatReportByCustomer },
        { label: 'Report By Rate-Sales Tax', path: ROUTES.ledgerVatReportByRate },
        { label: 'Salary List', path: ROUTES.ledgerSalaryList },
        { label: 'New Payment-Salaries', path: ROUTES.ledgerSalaryPaymentCreate },
        { label: 'Payments-Salaries', path: ROUTES.ledgerSalaryList },
        { label: 'Statistics-Salaries', path: ROUTES.ledgerSalaryStatistics },
        { label: 'Employee Loans', path: ROUTES.ledgerEmployeeLoansList },
        { label: 'New Loans', path: ROUTES.ledgerLoanCreate },
        { label: 'Miscellaneous Payments', path: ROUTES.ledgerMiscPaymentsList },
        { label: 'New-Miscellaneous Payments', path: ROUTES.ledgerMiscPaymentCreate },
        { label: 'List-Miscellaneous Payments', path: ROUTES.ledgerMiscPaymentsList },
      ],
    },
    // The real top-level label here is literally "Binding to accounts" (not
    // "Binding") — confirmed from the live menu's own DOM nesting, which is
    // genuinely 4 levels deep: Binding to accounts > {Customer invoice
    // binding, Vendor invoice binding, Expense report binding} > {ToDispatch,
    // Dispatched}. "ToDispatch"/"Dispatched" repeat identically under all 3
    // parents pointing at 3 different real pages — the exact case
    // buildNavSections.ts's ancestor-chain composite key exists to
    // disambiguate, which only works if this local tree's own nesting
    // (including this group's own label) matches the real one exactly.
    {
      label: 'Binding to accounts',
      path: ROUTES.ledgerCustomerBindingIndex,
      items: [
        {
          label: 'Customer invoice binding',
          path: ROUTES.ledgerCustomerBindingIndex,
          items: [
            { label: 'ToDispatch', path: ROUTES.ledgerCustomerBindingToDispatch },
            { label: 'Dispatched', path: ROUTES.ledgerCustomerBindingDispatched },
          ],
        },
        {
          label: 'Vendor invoice binding',
          path: ROUTES.ledgerVendorBindingIndex,
          items: [
            { label: 'ToDispatch', path: ROUTES.ledgerVendorBindingToDispatch },
            { label: 'Dispatched', path: ROUTES.ledgerVendorBindingDispatched },
          ],
        },
        {
          label: 'Expense report binding',
          path: ROUTES.ledgerExpenseReportBindingIndex,
          items: [
            { label: 'ToDispatch', path: ROUTES.ledgerExpenseReportBindingToDispatch },
            { label: 'Dispatched', path: ROUTES.ledgerExpenseReportBindingDispatched },
          ],
        },
      ],
    },
    {
      label: 'Journal',
      items: [
        { label: 'Finance Journal', path: ROUTES.ledgerFinanceJournal },
        { label: 'Expense Journal', path: ROUTES.ledgerExpenseJournal },
        { label: 'Sell Journal', path: ROUTES.ledgerSellJournal },
        { label: 'Purchase Journal', path: ROUTES.ledgerPurchaseJournal },
      ],
    },
  ],
}
