import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { ROUTES } from '../../routes'
import { RouteBoundary } from '../RouteBoundary'

const LedgerModule = lazy(() => import('../../modules/ledger/LedgerModule').then((m) => ({ default: m.LedgerModule })))
const JournalsModule = lazy(() => import('../../modules/ledger/JournalsModule').then((m) => ({ default: m.JournalsModule })))
const PieceDetailModule = lazy(() => import('../../modules/ledger/PieceDetailModule').then((m) => ({ default: m.PieceDetailModule })))
const SubledgerModule = lazy(() => import('../../modules/ledger/SubledgerModule').then((m) => ({ default: m.SubledgerModule })))
const NewTransactionModule = lazy(() => import('../../modules/ledger/NewTransactionModule').then((m) => ({ default: m.NewTransactionModule })))
const ChartOfAccountsModule = lazy(() => import('../../modules/ledger/ChartOfAccountsModule').then((m) => ({ default: m.ChartOfAccountsModule })))
const AccountCardModule = lazy(() => import('../../modules/ledger/AccountCardModule').then((m) => ({ default: m.AccountCardModule })))
const OpeningBalanceModule = lazy(() => import('../../modules/ledger/OpeningBalanceModule').then((m) => ({ default: m.OpeningBalanceModule })))
const GeneralSettingsModule = lazy(() => import('../../modules/ledger/GeneralSettingsModule').then((m) => ({ default: m.GeneralSettingsModule })))
const AccountingJournalsModule = lazy(() => import('../../modules/ledger/AccountingJournalsModule').then((m) => ({ default: m.AccountingJournalsModule })))
const ChartOfAccountsModelsModule = lazy(() => import('../../modules/ledger/ChartOfAccountsModelsModule').then((m) => ({ default: m.ChartOfAccountsModelsModule })))
const PcgVersionModule = lazy(() => import('../../modules/ledger/PcgVersionModule').then((m) => ({ default: m.PcgVersionModule })))
const ChartOfIndividualAccountsModule = lazy(() => import('../../modules/ledger/ChartOfIndividualAccountsModule').then((m) => ({ default: m.ChartOfIndividualAccountsModule })))
const PersonalizedGroupsModule = lazy(() => import('../../modules/ledger/PersonalizedGroupsModule').then((m) => ({ default: m.PersonalizedGroupsModule })))
const PersonalizedGroupAccountsModule = lazy(() => import('../../modules/ledger/PersonalizedGroupAccountsModule').then((m) => ({ default: m.PersonalizedGroupAccountsModule })))
const DefaultAccountsModule = lazy(() => import('../../modules/ledger/DefaultAccountsModule').then((m) => ({ default: m.DefaultAccountsModule })))
const BankAccountsSetupModule = lazy(() => import('../../modules/ledger/BankAccountsSetupModule').then((m) => ({ default: m.BankAccountsSetupModule })))
const VatAccountsModule = lazy(() => import('../../modules/ledger/VatAccountsModule').then((m) => ({ default: m.VatAccountsModule })))
const TaxAccountsModule = lazy(() => import('../../modules/ledger/TaxAccountsModule').then((m) => ({ default: m.TaxAccountsModule })))
const ExpenseReportAccountsModule = lazy(() => import('../../modules/ledger/ExpenseReportAccountsModule').then((m) => ({ default: m.ExpenseReportAccountsModule })))
const ProductAccountsModule = lazy(() => import('../../modules/ledger/ProductAccountsModule').then((m) => ({ default: m.ProductAccountsModule })))
const ExportOptionsModule = lazy(() => import('../../modules/ledger/ExportOptionsModule').then((m) => ({ default: m.ExportOptionsModule })))
const ClosureAccountsModule = lazy(() => import('../../modules/ledger/ClosureAccountsModule').then((m) => ({ default: m.ClosureAccountsModule })))
const FiscalPeriodModule = lazy(() => import('../../modules/ledger/FiscalPeriodModule').then((m) => ({ default: m.FiscalPeriodModule })))
const FiscalPeriodCreateModule = lazy(() => import('../../modules/ledger/FiscalPeriodCreateModule').then((m) => ({ default: m.FiscalPeriodCreateModule })))
const AccountingAreaModule = lazy(() => import('../../modules/ledger/AccountingAreaModule').then((m) => ({ default: m.AccountingAreaModule })))
const AccountBalanceModule = lazy(() => import('../../modules/ledger/AccountBalanceModule').then((m) => ({ default: m.AccountBalanceModule })))
const AnnualClosureModule = lazy(() => import('../../modules/ledger/AnnualClosureModule').then((m) => ({ default: m.AnnualClosureModule })))
const ValidateMovementsModule = lazy(() => import('../../modules/ledger/ValidateMovementsModule').then((m) => ({ default: m.ValidateMovementsModule })))
const ExportAccountingDocumentsModule = lazy(() => import('../../modules/ledger/ExportAccountingDocumentsModule').then((m) => ({ default: m.ExportAccountingDocumentsModule })))
const CreateFinancialClosureModule = lazy(() => import('../../modules/ledger/CreateFinancialClosureModule').then((m) => ({ default: m.CreateFinancialClosureModule })))
const FinancialClosureListModule = lazy(() => import('../../modules/ledger/FinancialClosureListModule').then((m) => ({ default: m.FinancialClosureListModule })))
const ForeignCurrencyRevaluationModule = lazy(() => import('../../modules/ledger/ForeignCurrencyRevaluationModule').then((m) => ({ default: m.ForeignCurrencyRevaluationModule })))
const FinanceJournalModule = lazy(() => import('../../modules/ledger/FinanceJournalModule').then((m) => ({ default: m.FinanceJournalModule })))
const ExpenseJournalModule = lazy(() => import('../../modules/ledger/ExpenseJournalModule').then((m) => ({ default: m.ExpenseJournalModule })))
const SellJournalModule = lazy(() => import('../../modules/ledger/SellJournalModule').then((m) => ({ default: m.SellJournalModule })))
const PurchaseJournalModule = lazy(() => import('../../modules/ledger/PurchaseJournalModule').then((m) => ({ default: m.PurchaseJournalModule })))
const PredefinedGroupsModule = lazy(() => import('../../modules/ledger/PredefinedGroupsModule').then((m) => ({ default: m.PredefinedGroupsModule })))
const PersonalizedGroupsReportModule = lazy(() => import('../../modules/ledger/PersonalizedGroupsReportModule').then((m) => ({ default: m.PersonalizedGroupsReportModule })))
const DonationsListModule = lazy(() => import('../../modules/ledger/DonationsListModule').then((m) => ({ default: m.DonationsListModule })))
const DonationCreateModule = lazy(() => import('../../modules/ledger/DonationCreateModule').then((m) => ({ default: m.DonationCreateModule })))
const SpecialPaymentsAreaModule = lazy(() => import('../../modules/ledger/SpecialPaymentsAreaModule').then((m) => ({ default: m.SpecialPaymentsAreaModule })))
const SocialFiscalTaxesListModule = lazy(() => import('../../modules/ledger/SocialFiscalTaxesListModule').then((m) => ({ default: m.SocialFiscalTaxesListModule })))
const SocialFiscalTaxCreateModule = lazy(() => import('../../modules/ledger/SocialFiscalTaxCreateModule').then((m) => ({ default: m.SocialFiscalTaxCreateModule })))
const SocialFiscalTaxPaymentsModule = lazy(() => import('../../modules/ledger/SocialFiscalTaxPaymentsModule').then((m) => ({ default: m.SocialFiscalTaxPaymentsModule })))
const SalesTaxListModule = lazy(() => import('../../modules/ledger/SalesTaxListModule').then((m) => ({ default: m.SalesTaxListModule })))
const SalesTaxCreateModule = lazy(() => import('../../modules/ledger/SalesTaxCreateModule').then((m) => ({ default: m.SalesTaxCreateModule })))
const VatReportByMonthModule = lazy(() => import('../../modules/ledger/VatReportByMonthModule').then((m) => ({ default: m.VatReportByMonthModule })))
const VatReportByCustomerModule = lazy(() => import('../../modules/ledger/VatReportByCustomerModule').then((m) => ({ default: m.VatReportByCustomerModule })))
const VatReportByRateModule = lazy(() => import('../../modules/ledger/VatReportByRateModule').then((m) => ({ default: m.VatReportByRateModule })))
const SalaryListModule = lazy(() => import('../../modules/ledger/SalaryListModule').then((m) => ({ default: m.SalaryListModule })))
const SalaryPaymentCreateModule = lazy(() => import('../../modules/ledger/SalaryPaymentCreateModule').then((m) => ({ default: m.SalaryPaymentCreateModule })))
const SalaryStatisticsModule = lazy(() => import('../../modules/ledger/SalaryStatisticsModule').then((m) => ({ default: m.SalaryStatisticsModule })))
const EmployeeLoansListModule = lazy(() => import('../../modules/ledger/EmployeeLoansListModule').then((m) => ({ default: m.EmployeeLoansListModule })))
const LedgerLoanCreateModule = lazy(() => import('../../modules/ledger/LedgerLoanCreateModule').then((m) => ({ default: m.LedgerLoanCreateModule })))
const MiscPaymentsListModule = lazy(() => import('../../modules/ledger/MiscPaymentsListModule').then((m) => ({ default: m.MiscPaymentsListModule })))
const MiscPaymentCreateModule = lazy(() => import('../../modules/ledger/MiscPaymentCreateModule').then((m) => ({ default: m.MiscPaymentCreateModule })))
const MiscPaymentDetailModule = lazy(() => import('../../modules/ledger/MiscPaymentDetailModule').then((m) => ({ default: m.MiscPaymentDetailModule })))
const CustomerBindingIndexModule = lazy(() => import('../../modules/ledger/CustomerBindingIndexModule').then((m) => ({ default: m.CustomerBindingIndexModule })))
const CustomerToDispatchModule = lazy(() => import('../../modules/ledger/CustomerToDispatchModule').then((m) => ({ default: m.CustomerToDispatchModule })))
const CustomerDispatchedModule = lazy(() => import('../../modules/ledger/CustomerDispatchedModule').then((m) => ({ default: m.CustomerDispatchedModule })))
const VendorBindingIndexModule = lazy(() => import('../../modules/ledger/VendorBindingIndexModule').then((m) => ({ default: m.VendorBindingIndexModule })))
const VendorToDispatchModule = lazy(() => import('../../modules/ledger/VendorToDispatchModule').then((m) => ({ default: m.VendorToDispatchModule })))
const VendorDispatchedModule = lazy(() => import('../../modules/ledger/VendorDispatchedModule').then((m) => ({ default: m.VendorDispatchedModule })))
const ExpenseReportBindingIndexModule = lazy(() => import('../../modules/ledger/ExpenseReportBindingIndexModule').then((m) => ({ default: m.ExpenseReportBindingIndexModule })))
const ExpenseReportToDispatchModule = lazy(() => import('../../modules/ledger/ExpenseReportToDispatchModule').then((m) => ({ default: m.ExpenseReportToDispatchModule })))
const ExpenseReportDispatchedModule = lazy(() => import('../../modules/ledger/ExpenseReportDispatchedModule').then((m) => ({ default: m.ExpenseReportDispatchedModule })))
const ReportingAreaModule = lazy(() => import('../../modules/ledger/ReportingAreaModule').then((m) => ({ default: m.ReportingAreaModule })))
const ReportTurnoverModule = lazy(() => import('../../modules/ledger/ReportTurnoverModule').then((m) => ({ default: m.ReportTurnoverModule })))
const DonationsAreaModule = lazy(() => import('../../modules/ledger/DonationsAreaModule').then((m) => ({ default: m.DonationsAreaModule })))

// Routes of the ledger area, rendered inside the app layout (see src/App.tsx).
export function ledgerRoutes() {
  return (
    <>
      <Route
        path={ROUTES.ledgerDashboard}
        element={
          <RouteBoundary>
            <LedgerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerList}
        element={
          <RouteBoundary>
            <JournalsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPieceDetail}
        element={
          <RouteBoundary>
            <PieceDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSubledger}
        element={
          <RouteBoundary>
            <SubledgerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerCreate}
        element={
          <RouteBoundary>
            <NewTransactionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerChartOfAccounts}
        element={
          <RouteBoundary>
            <ChartOfAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerAccountCard}
        element={
          <RouteBoundary>
            <AccountCardModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerOpeningBalance}
        element={
          <RouteBoundary>
            <OpeningBalanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerGeneralSettings}
        element={
          <RouteBoundary>
            <GeneralSettingsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerAccountingJournals}
        element={
          <RouteBoundary>
            <AccountingJournalsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerChartOfAccountsModels}
        element={
          <RouteBoundary>
            <ChartOfAccountsModelsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPcgVersion}
        element={
          <RouteBoundary>
            <PcgVersionModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerChartOfIndividualAccounts}
        element={
          <RouteBoundary>
            <ChartOfIndividualAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPersonalizedGroups}
        element={
          <RouteBoundary>
            <PersonalizedGroupsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPersonalizedGroupAccounts}
        element={
          <RouteBoundary>
            <PersonalizedGroupAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerDefaultAccounts}
        element={
          <RouteBoundary>
            <DefaultAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerBankAccountsSetup}
        element={
          <RouteBoundary>
            <BankAccountsSetupModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVatAccounts}
        element={
          <RouteBoundary>
            <VatAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerTaxAccounts}
        element={
          <RouteBoundary>
            <TaxAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExpenseReportAccounts}
        element={
          <RouteBoundary>
            <ExpenseReportAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerProductAccounts}
        element={
          <RouteBoundary>
            <ProductAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExportOptions}
        element={
          <RouteBoundary>
            <ExportOptionsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerClosureAccounts}
        element={
          <RouteBoundary>
            <ClosureAccountsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerFiscalPeriod}
        element={
          <RouteBoundary>
            <FiscalPeriodModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerFiscalPeriodCreate}
        element={
          <RouteBoundary>
            <FiscalPeriodCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerAccountingArea}
        element={
          <RouteBoundary>
            <AccountingAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerAccountBalance}
        element={
          <RouteBoundary>
            <AccountBalanceModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerAnnualClosure}
        element={
          <RouteBoundary>
            <AnnualClosureModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerValidateMovements}
        element={
          <RouteBoundary>
            <ValidateMovementsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExportAccountingDocuments}
        element={
          <RouteBoundary>
            <ExportAccountingDocumentsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerCreateFinancialClosure}
        element={
          <RouteBoundary>
            <CreateFinancialClosureModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerFinancialClosureList}
        element={
          <RouteBoundary>
            <FinancialClosureListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerForeignCurrencyRevaluation}
        element={
          <RouteBoundary>
            <ForeignCurrencyRevaluationModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerFinanceJournal}
        element={
          <RouteBoundary>
            <FinanceJournalModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExpenseJournal}
        element={
          <RouteBoundary>
            <ExpenseJournalModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSellJournal}
        element={
          <RouteBoundary>
            <SellJournalModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPurchaseJournal}
        element={
          <RouteBoundary>
            <PurchaseJournalModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPredefinedGroups}
        element={
          <RouteBoundary>
            <PredefinedGroupsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerPersonalizedGroupsReport}
        element={
          <RouteBoundary>
            <PersonalizedGroupsReportModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerDonationsList}
        element={
          <RouteBoundary>
            <DonationsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerDonationCreate}
        element={
          <RouteBoundary>
            <DonationCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSpecialPaymentsArea}
        element={
          <RouteBoundary>
            <SpecialPaymentsAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSocialFiscalTaxesList}
        element={
          <RouteBoundary>
            <SocialFiscalTaxesListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSocialFiscalTaxCreate}
        element={
          <RouteBoundary>
            <SocialFiscalTaxCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSocialFiscalTaxPayments}
        element={
          <RouteBoundary>
            <SocialFiscalTaxPaymentsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSalesTaxList}
        element={
          <RouteBoundary>
            <SalesTaxListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSalesTaxCreate}
        element={
          <RouteBoundary>
            <SalesTaxCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVatReportByMonth}
        element={
          <RouteBoundary>
            <VatReportByMonthModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVatReportByCustomer}
        element={
          <RouteBoundary>
            <VatReportByCustomerModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVatReportByRate}
        element={
          <RouteBoundary>
            <VatReportByRateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSalaryList}
        element={
          <RouteBoundary>
            <SalaryListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSalaryPaymentCreate}
        element={
          <RouteBoundary>
            <SalaryPaymentCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerSalaryStatistics}
        element={
          <RouteBoundary>
            <SalaryStatisticsModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerEmployeeLoansList}
        element={
          <RouteBoundary>
            <EmployeeLoansListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerLoanCreate}
        element={
          <RouteBoundary>
            <LedgerLoanCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerMiscPaymentsList}
        element={
          <RouteBoundary>
            <MiscPaymentsListModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerMiscPaymentCreate}
        element={
          <RouteBoundary>
            <MiscPaymentCreateModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerMiscPaymentDetail}
        element={
          <RouteBoundary>
            <MiscPaymentDetailModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerCustomerBindingIndex}
        element={
          <RouteBoundary>
            <CustomerBindingIndexModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerCustomerBindingToDispatch}
        element={
          <RouteBoundary>
            <CustomerToDispatchModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerCustomerBindingDispatched}
        element={
          <RouteBoundary>
            <CustomerDispatchedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVendorBindingIndex}
        element={
          <RouteBoundary>
            <VendorBindingIndexModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVendorBindingToDispatch}
        element={
          <RouteBoundary>
            <VendorToDispatchModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerVendorBindingDispatched}
        element={
          <RouteBoundary>
            <VendorDispatchedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExpenseReportBindingIndex}
        element={
          <RouteBoundary>
            <ExpenseReportBindingIndexModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExpenseReportBindingToDispatch}
        element={
          <RouteBoundary>
            <ExpenseReportToDispatchModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerExpenseReportBindingDispatched}
        element={
          <RouteBoundary>
            <ExpenseReportDispatchedModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerReportingArea}
        element={
          <RouteBoundary>
            <ReportingAreaModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerReportTurnover}
        element={
          <RouteBoundary>
            <ReportTurnoverModule />
          </RouteBoundary>
        }
      />
      <Route
        path={ROUTES.ledgerDonationsArea}
        element={
          <RouteBoundary>
            <DonationsAreaModule />
          </RouteBoundary>
        }
      />
    </>
  )
}
