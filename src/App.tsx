import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppShell } from './app/AppShell'
import { queryClient } from './api/queryClient'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarStyleProvider } from './context/SidebarStyleContext'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { RouteFallback } from './shared/components/RouteFallback'
import { LoginModule } from './modules/auth/LoginModule'
import { DashboardModule } from './modules/dashboard/DashboardModule'
import { ROUTES } from './routes'
import { PAYROLL_PLACEHOLDERS } from './features/payroll/payrollPlaceholders'
import { BANKING_PLACEHOLDERS } from './features/banking/bankingPlaceholders'
import { EXPENSE_PLACEHOLDERS } from './features/expenses/expensesPlaceholders'
import { TICKET_PLACEHOLDERS } from './features/tickets/ticketsPlaceholders'
import { MEMBER_PLACEHOLDERS } from './features/members/membersPlaceholders'
import { FIXED_ASSET_PLACEHOLDERS } from './features/fixedAsset/fixedAssetPlaceholders'

// Everything below is route-level code-splitting: each of these ~45 modules
// used to be imported eagerly, so visiting /login shipped the entire app
// (ZRA, invoices, POS, reports, every dashboard...) in one ~2.4MB bundle
// before the sign-in form could even paint. lazy() gives each route its own
// chunk, fetched only when that route is actually visited. LoginModule and
// DashboardModule stay eager — they're what nearly every session needs
// first (sign-in, then the landing dashboard), so splitting them out would
// just add a loading flash to the one screen that can least afford it.
//
// Named exports need the `.then(m => ({ default: m.X }))` wrapper because
// lazy() requires a default export from the dynamic import promise; POS's
// components already have default exports, so they don't.
const ReportsModule = lazy(() => import('./modules/reports/ReportsModule').then((m) => ({ default: m.ReportsModule })))
const SettingsModule = lazy(() => import('./modules/settings/SettingsModule').then((m) => ({ default: m.SettingsModule })))
const CompanyOrganizationModule = lazy(() => import('./modules/settings/CompanyOrganizationModule').then((m) => ({ default: m.CompanyOrganizationModule })))
const SetupLandingModule = lazy(() => import('./modules/settings/SetupLandingModule').then((m) => ({ default: m.SetupLandingModule })))
const MenusSetupModule = lazy(() => import('./modules/settings/MenusSetupModule').then((m) => ({ default: m.MenusSetupModule })))
const DisplaySetupModule = lazy(() => import('./modules/settings/DisplaySetupModule').then((m) => ({ default: m.DisplaySetupModule })))
const TranslationSetupModule = lazy(() => import('./modules/settings/TranslationSetupModule').then((m) => ({ default: m.TranslationSetupModule })))
const DefaultValuesSetupModule = lazy(() => import('./modules/settings/DefaultValuesSetupModule').then((m) => ({ default: m.DefaultValuesSetupModule })))
const WidgetsSetupModule = lazy(() => import('./modules/settings/WidgetsSetupModule').then((m) => ({ default: m.WidgetsSetupModule })))
const AlertsSetupModule = lazy(() => import('./modules/settings/AlertsSetupModule').then((m) => ({ default: m.AlertsSetupModule })))
const SecuritySetupModule = lazy(() => import('./modules/settings/SecuritySetupModule').then((m) => ({ default: m.SecuritySetupModule })))
const LimitsSetupModule = lazy(() => import('./modules/settings/LimitsSetupModule').then((m) => ({ default: m.LimitsSetupModule })))
const PdfSetupModule = lazy(() => import('./modules/settings/PdfSetupModule').then((m) => ({ default: m.PdfSetupModule })))
const EmailsSetupModule = lazy(() => import('./modules/settings/EmailsSetupModule').then((m) => ({ default: m.EmailsSetupModule })))
const EmailTemplatesModule = lazy(() => import('./modules/settings/EmailsSetupModule').then((m) => ({ default: m.EmailTemplatesModule })))
const SmsSetupModule = lazy(() => import('./modules/settings/SmsSetupModule').then((m) => ({ default: m.SmsSetupModule })))
const DictionarySetupModule = lazy(() => import('./modules/settings/DictionarySetupModule').then((m) => ({ default: m.DictionarySetupModule })))
const OtherSetupModule = lazy(() => import('./modules/settings/OtherSetupModule').then((m) => ({ default: m.OtherSetupModule })))
const ExportAssistantModule = lazy(() => import('./modules/settings/ExportAssistantModule').then((m) => ({ default: m.ExportAssistantModule })))
const ImportAssistantModule = lazy(() => import('./modules/settings/ImportAssistantModule').then((m) => ({ default: m.ImportAssistantModule })))
const CashflowSettingsModule = lazy(() => import('./modules/settings/CashflowSettingsModule').then((m) => ({ default: m.CashflowSettingsModule })))
const ZraModule = lazy(() => import('./modules/zra/ZraModule').then((m) => ({ default: m.ZraModule })))
const ZraImportModule = lazy(() => import('./modules/zra/ZraImportModule').then((m) => ({ default: m.ZraImportModule })))
const ZraAutomaticPurchaseModule = lazy(() => import('./modules/zra/ZraAutomaticPurchaseModule').then((m) => ({ default: m.ZraAutomaticPurchaseModule })))
const ZraUnuploadedCustomersModule = lazy(() => import('./modules/zra/ZraUnuploadedCustomersModule').then((m) => ({ default: m.ZraUnuploadedCustomersModule })))
const ZraPendingSalesModule = lazy(() => import('./modules/zra/ZraPendingSalesModule').then((m) => ({ default: m.ZraPendingSalesModule })))
const ZraPendingPurchaseModule = lazy(() => import('./modules/zra/ZraPendingPurchaseModule').then((m) => ({ default: m.ZraPendingPurchaseModule })))
const ZraUnuploadedStockModule = lazy(() => import('./modules/zra/ZraUnuploadedStockModule').then((m) => ({ default: m.ZraUnuploadedStockModule })))
const ZraUnuploadProductsModule = lazy(() => import('./modules/zra/ZraUnuploadProductsModule').then((m) => ({ default: m.ZraUnuploadProductsModule })))
const ZraSalesLookupModule = lazy(() => import('./modules/zra/ZraSalesLookupModule').then((m) => ({ default: m.ZraSalesLookupModule })))
const ZraCustomerInfoModule = lazy(() => import('./modules/zra/ZraCustomerInfoModule').then((m) => ({ default: m.ZraCustomerInfoModule })))
const ZraItemDetailsModule = lazy(() => import('./modules/zra/ZraItemDetailsModule').then((m) => ({ default: m.ZraItemDetailsModule })))
const ZraRrpItemListModule = lazy(() => import('./modules/zra/ZraRrpItemListModule').then((m) => ({ default: m.ZraRrpItemListModule })))
const ZraPrincipalsModule = lazy(() => import('./modules/zra/ZraPrincipalsModule').then((m) => ({ default: m.ZraPrincipalsModule })))
const ZraStockListModule = lazy(() => import('./modules/zra/ZraStockListModule').then((m) => ({ default: m.ZraStockListModule })))
const AsycudaPurchaseInvoiceModule = lazy(() => import('./modules/zra/AsycudaPurchaseInvoiceModule').then((m) => ({ default: m.AsycudaPurchaseInvoiceModule })))
const SalesModule = lazy(() => import('./modules/sales/SalesModule').then((m) => ({ default: m.SalesModule })))
const PurchasesModule = lazy(() => import('./modules/purchases/PurchasesModule').then((m) => ({ default: m.PurchasesModule })))
const WarehousesModule = lazy(() => import('./modules/warehouses/WarehousesModule').then((m) => ({ default: m.WarehousesModule })))
const WarehouseCreateModule = lazy(() => import('./modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseCreateModule })))
const WarehouseListModule = lazy(() => import('./modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseListModule })))
const WarehouseDetailModule = lazy(() => import('./modules/warehouses/WarehouseModules').then((m) => ({ default: m.WarehouseDetailModule })))
const InventoryCreateModule = lazy(() => import('./modules/warehouses/InventoryModules').then((m) => ({ default: m.InventoryCreateModule })))
const InventoryListModule = lazy(() => import('./modules/warehouses/InventoryModules').then((m) => ({ default: m.InventoryListModule })))
const InventoryDetailModule = lazy(() => import('./modules/warehouses/InventoryModules').then((m) => ({ default: m.InventoryDetailModule })))
const LandedCostCreateModule = lazy(() => import('./modules/warehouses/LandedCostModules').then((m) => ({ default: m.LandedCostCreateModule })))
const LandedCostListModule = lazy(() => import('./modules/warehouses/LandedCostModules').then((m) => ({ default: m.LandedCostListModule })))
const ShipmentSearchModule = lazy(() => import('./modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentSearchModule })))
const ShipmentDraftModule = lazy(() => import('./modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentDraftModule })))
const ShipmentValidatedModule = lazy(() => import('./modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentValidatedModule })))
const ShipmentProcessedModule = lazy(() => import('./modules/warehouses/ShipmentModules').then((m) => ({ default: m.ShipmentProcessedModule })))
const StatisticsShipmentModule = lazy(() => import('./modules/warehouses/ShipmentModules').then((m) => ({ default: m.StatisticsShipmentModule })))
const PackingListModule = lazy(() => import('./modules/warehouses/ShipmentModules').then((m) => ({ default: m.PackingListModule })))
const ReceptionsAreaModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionsAreaModule })))
const ReceptionCreateModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionCreateModule })))
const ReceptionListModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionListModule })))
const ReceptionDraftModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionDraftModule })))
const ReceptionValidatedModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionValidatedModule })))
const ReceptionProcessedModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionProcessedModule })))
const ReceptionStatisticsModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.ReceptionStatisticsModule })))
const CreditNoteOrderListModule = lazy(() => import('./modules/warehouses/ReceptionModules').then((m) => ({ default: m.CreditNoteOrderListModule })))
const StockMovementsListModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockMovementsListModule })))
const BoxBreakModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.BoxBreakModule })))
const FefoDashboardModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.FefoDashboardModule })))
const StockCorrectionModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockCorrectionModule })))
const StockTransferModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.StockTransferModule })))
const MassStockTransferModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.MassStockTransferModule })))
const ReplenishmentModule = lazy(() => import('./modules/warehouses/StockMovementModules').then((m) => ({ default: m.ReplenishmentModule })))
const RacksAreaModule = lazy(() => import('./modules/warehouses/RackModules').then((m) => ({ default: m.RacksAreaModule })))
const ShelvesModule = lazy(() => import('./modules/warehouses/RackModules').then((m) => ({ default: m.ShelvesModule })))
const RacksListModule = lazy(() => import('./modules/warehouses/RackModules').then((m) => ({ default: m.RacksListModule })))
const ProductRackAssignModule = lazy(() => import('./modules/warehouses/RackModules').then((m) => ({ default: m.ProductRackAssignModule })))
const PayrollModule = lazy(() => import('./modules/payroll/PayrollModule').then((m) => ({ default: m.PayrollModule })))
const DateWiseAttendanceModule = lazy(() => import('./modules/payroll/DateWiseAttendanceModule').then((m) => ({ default: m.DateWiseAttendanceModule })))
const MarkAttendanceModule = lazy(() => import('./modules/payroll/MarkAttendanceModule').then((m) => ({ default: m.MarkAttendanceModule })))
const HolidayModule = lazy(() => import('./modules/payroll/HolidayModule').then((m) => ({ default: m.HolidayModule })))
const AwardModule = lazy(() => import('./modules/payroll/AwardModule').then((m) => ({ default: m.AwardModule })))
const TransferModule = lazy(() => import('./modules/payroll/TransferModule').then((m) => ({ default: m.TransferModule })))
const ResignationModule = lazy(() => import('./modules/payroll/ResignationModule').then((m) => ({ default: m.ResignationModule })))
const TravelModule = lazy(() => import('./modules/payroll/TravelModule').then((m) => ({ default: m.TravelModule })))
const ComplaintModule = lazy(() => import('./modules/payroll/ComplaintModule').then((m) => ({ default: m.ComplaintModule })))
const WarningModule = lazy(() => import('./modules/payroll/WarningModule').then((m) => ({ default: m.WarningModule })))
const TerminationModule = lazy(() => import('./modules/payroll/TerminationModule').then((m) => ({ default: m.TerminationModule })))
const IndicatorModule = lazy(() => import('./modules/payroll/IndicatorModule').then((m) => ({ default: m.IndicatorModule })))
const AppraisalModule = lazy(() => import('./modules/payroll/AppraisalModule').then((m) => ({ default: m.AppraisalModule })))
const MarkSpecialShiftAttendanceModule = lazy(() => import('./modules/payroll/MarkSpecialShiftAttendanceModule').then((m) => ({ default: m.MarkSpecialShiftAttendanceModule })))
const MarkHolidayAttendanceModule = lazy(() => import('./modules/payroll/MarkHolidayAttendanceModule').then((m) => ({ default: m.MarkHolidayAttendanceModule })))
const AdvanceSalaryModule = lazy(() => import('./modules/payroll/AdvanceSalaryModule').then((m) => ({ default: m.AdvanceSalaryModule })))
const LoanModule = lazy(() => import('./modules/payroll/LoanModule').then((m) => ({ default: m.LoanModule })))
const ShiftModule = lazy(() => import('./modules/payroll/ShiftModule').then((m) => ({ default: m.ShiftModule })))
const SalaryTemplateModule = lazy(() => import('./modules/payroll/SalaryTemplateModule').then((m) => ({ default: m.SalaryTemplateModule })))
const HourlyTemplateModule = lazy(() => import('./modules/payroll/HourlyTemplateModule').then((m) => ({ default: m.HourlyTemplateModule })))
const ManageSalaryModule = lazy(() => import('./modules/payroll/ManageSalaryModule').then((m) => ({ default: m.ManageSalaryModule })))
const ManageSalaryListModule = lazy(() => import('./modules/payroll/ManageSalaryListModule').then((m) => ({ default: m.ManageSalaryListModule })))
const ManageHolidaySalaryModule = lazy(() => import('./modules/payroll/ManageHolidaySalaryModule').then((m) => ({ default: m.ManageHolidaySalaryModule })))
const ManageSpecialShiftSalaryModule = lazy(() => import('./modules/payroll/ManageSpecialShiftSalaryModule').then((m) => ({ default: m.ManageSpecialShiftSalaryModule })))
const PayrollPlaceholderModule = lazy(() => import('./modules/payroll/PayrollPlaceholderModule').then((m) => ({ default: m.PayrollPlaceholderModule })))
const BankAccountsListModule = lazy(() => import('./modules/banking/BankAccountsListModule').then((m) => ({ default: m.BankAccountsListModule })))
const BankEntriesListModule = lazy(() => import('./modules/banking/BankEntriesListModule').then((m) => ({ default: m.BankEntriesListModule })))
const BankAccountCategoriesListModule = lazy(() => import('./modules/banking/BankAccountCategoriesListModule').then((m) => ({ default: m.BankAccountCategoriesListModule })))
const LoanListModule = lazy(() => import('./modules/banking/LoanListModule').then((m) => ({ default: m.LoanListModule })))
const BankAccountCreateModule = lazy(() => import('./modules/banking/BankAccountCreateModule').then((m) => ({ default: m.BankAccountCreateModule })))
const LoanCreateModule = lazy(() => import('./modules/banking/LoanCreateModule').then((m) => ({ default: m.LoanCreateModule })))
const CheckDepositCreateModule = lazy(() => import('./modules/banking/CheckDepositCreateModule').then((m) => ({ default: m.CheckDepositCreateModule })))
const CheckDepositListModule = lazy(() => import('./modules/banking/CheckDepositListModule').then((m) => ({ default: m.CheckDepositListModule })))
const BankingPlaceholderModule = lazy(() => import('./modules/banking/BankingPlaceholderModule').then((m) => ({ default: m.BankingPlaceholderModule })))
const BudgetModule = lazy(() => import('./modules/budget/BudgetModule').then((m) => ({ default: m.BudgetModule })))
const TicketsListModule = lazy(() => import('./modules/tickets/TicketsListModule').then((m) => ({ default: m.TicketsListModule })))
const MyAssignedTicketsModule = lazy(() => import('./modules/tickets/MyAssignedTicketsModule').then((m) => ({ default: m.MyAssignedTicketsModule })))
const TicketStatisticsModule = lazy(() => import('./modules/tickets/TicketStatisticsModule').then((m) => ({ default: m.TicketStatisticsModule })))
const TicketPlaceholderModule = lazy(() => import('./modules/tickets/TicketPlaceholderModule').then((m) => ({ default: m.TicketPlaceholderModule })))
const ExpenseReportsListModule = lazy(() => import('./modules/expenses/ExpenseReportsListModule').then((m) => ({ default: m.ExpenseReportsListModule })))
const ExpensePlaceholderModule = lazy(() => import('./modules/expenses/ExpensePlaceholderModule').then((m) => ({ default: m.ExpensePlaceholderModule })))
const SpecialExpensesModule = lazy(() => import('./modules/expenses/SpecialExpensesModule').then((m) => ({ default: m.SpecialExpensesModule })))
const LedgerModule = lazy(() => import('./modules/ledger/LedgerModule').then((m) => ({ default: m.LedgerModule })))
const JournalsModule = lazy(() => import('./modules/ledger/JournalsModule').then((m) => ({ default: m.JournalsModule })))
const SubledgerModule = lazy(() => import('./modules/ledger/SubledgerModule').then((m) => ({ default: m.SubledgerModule })))
const NewTransactionModule = lazy(() => import('./modules/ledger/NewTransactionModule').then((m) => ({ default: m.NewTransactionModule })))
const MembersListModule = lazy(() => import('./modules/members/MembersListModule').then((m) => ({ default: m.MembersListModule })))
const MemberPlaceholderModule = lazy(() => import('./modules/members/MemberPlaceholderModule').then((m) => ({ default: m.MemberPlaceholderModule })))
const AssetsListModule = lazy(() => import('./modules/fixedAsset/AssetsListModule').then((m) => ({ default: m.AssetsListModule })))
const FixedAssetPlaceholderModule = lazy(() => import('./modules/fixedAsset/FixedAssetPlaceholderModule').then((m) => ({ default: m.FixedAssetPlaceholderModule })))
const ReportDetailModule = lazy(() => import('./modules/reports/ReportDetailModule').then((m) => ({ default: m.ReportDetailModule })))
const StockMovementsModule = lazy(() => import('./modules/stockMovements/StockMovementsModule').then((m) => ({ default: m.StockMovementsModule })))
const GroupEditModule = lazy(() => import('./modules/usersDashboard/GroupEditModule').then((m) => ({ default: m.GroupEditModule })))
const QuotationCreateInterventionModule = lazy(() => import('./modules/quotations/QuotationCreateInterventionModule').then((m) => ({ default: m.QuotationCreateInterventionModule })))
const QuotationCreateContractModule = lazy(() => import('./modules/quotations/QuotationCreateContractModule').then((m) => ({ default: m.QuotationCreateContractModule })))
const QuotationCreateInvoiceModule = lazy(() => import('./modules/quotations/QuotationCreateInvoiceModule').then((m) => ({ default: m.QuotationCreateInvoiceModule })))
const CreateReceptionModule = lazy(() => import('./modules/purchaseOrders/CreateReceptionModule').then((m) => ({ default: m.CreateReceptionModule })))
const TicketDetailModule = lazy(() => import('./modules/tickets/TicketDetailModule').then((m) => ({ default: m.TicketDetailModule })))
const StockAtDateModule = lazy(() => import('./modules/products/StockAtDateModule').then((m) => ({ default: m.StockAtDateModule })))
const ExpenseReportDetailModule = lazy(() => import('./modules/expenses/ExpenseReportDetailModule').then((m) => ({ default: m.ExpenseReportDetailModule })))
const ConsumptionHistoryModule = lazy(() => import('./modules/quotations/ConsumptionHistoryModule').then((m) => ({ default: m.ConsumptionHistoryModule })))
const MembersDashboardModule = lazy(() => import('./modules/members/MembersDashboardModule').then((m) => ({ default: m.MembersDashboardModule })))
const LotSerialDetailModule = lazy(() => import('./modules/products/LotSerialDetailModule').then((m) => ({ default: m.LotSerialDetailModule })))
const VariantAttributeDetailModule = lazy(() => import('./modules/products/VariantAttributeDetailModule').then((m) => ({ default: m.VariantAttributeDetailModule })))
const KitchenModule = lazy(() => import('./modules/kitchen/KitchenModule').then((m) => ({ default: m.KitchenModule })))
const BeverageOrdersModule = lazy(() => import('./modules/kitchen/BeverageOrdersModule').then((m) => ({ default: m.BeverageOrdersModule })))
const CreateOrderModule = lazy(() => import('./modules/kitchen/CreateOrderModule').then((m) => ({ default: m.CreateOrderModule })))
const HotelModule = lazy(() => import('./modules/hotel/HotelModule').then((m) => ({ default: m.HotelModule })))
const UsersDashboardModule = lazy(() => import('./modules/usersDashboard/UsersDashboardModule').then((m) => ({ default: m.UsersDashboardModule })))
const UserCreateModule = lazy(() => import('./modules/usersDashboard/UserCreateModule').then((m) => ({ default: m.UserCreateModule })))
const UserDetailModule = lazy(() => import('./modules/usersDashboard/UserDetailModule').then((m) => ({ default: m.UserDetailModule })))
const GroupsListModule = lazy(() => import('./modules/usersDashboard/GroupsListModule').then((m) => ({ default: m.GroupsListModule })))
const GroupCreateModule = lazy(() => import('./modules/usersDashboard/GroupCreateModule').then((m) => ({ default: m.GroupCreateModule })))
const TagsListModule = lazy(() => import('./modules/usersDashboard/TagsListModule').then((m) => ({ default: m.TagsListModule })))
const HrmAreaModule = lazy(() => import('./modules/usersDashboard/HrmAreaModule').then((m) => ({ default: m.HrmAreaModule })))
const LeaveListModule = lazy(() => import('./modules/usersDashboard/LeaveListModule').then((m) => ({ default: m.LeaveListModule })))
const LeaveRequestModule = lazy(() => import('./modules/usersDashboard/LeaveRequestModule').then((m) => ({ default: m.LeaveRequestModule })))
const TimeSpentModule = lazy(() => import('./modules/usersDashboard/TimeSpentModule').then((m) => ({ default: m.TimeSpentModule })))
const ActivitiesDetailModule = lazy(() => import('./modules/usersDashboard/ActivitiesDetailModule').then((m) => ({ default: m.ActivitiesDetailModule })))
const LinkedFilesAreaModule = lazy(() => import('./modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesAreaModule })))
const LinkedFilesManualTreeModule = lazy(() => import('./modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesManualTreeModule })))
const LinkedFilesAutomaticTreeModule = lazy(() => import('./modules/usersDashboard/LinkedFilesAreaModule').then((m) => ({ default: m.LinkedFilesAutomaticTreeModule })))
const CustomersListModule = lazy(() => import('./modules/customers/CustomersListModule').then((m) => ({ default: m.CustomersListModule })))
const CustomerCreateModule = lazy(() => import('./modules/customers/CustomerCreateModule').then((m) => ({ default: m.CustomerCreateModule })))
const CustomerDetailModule = lazy(() => import('./modules/customers/CustomerDetailModule').then((m) => ({ default: m.CustomerDetailModule })))
const ProspectsListModule = lazy(() => import('./modules/customers/ProspectsListModule').then((m) => ({ default: m.ProspectsListModule })))
const ProspectCreateModule = lazy(() => import('./modules/customers/ProspectCreateModule').then((m) => ({ default: m.ProspectCreateModule })))
const CustomerGroupListModule = lazy(() => import('./modules/customers/CustomerGroupListModule').then((m) => ({ default: m.CustomerGroupListModule })))
const CustomerGroupCreateModule = lazy(() => import('./modules/customers/CustomerGroupCreateModule').then((m) => ({ default: m.CustomerGroupCreateModule })))
const ContactCreateModule = lazy(() => import('./modules/customers/ContactCreateModule').then((m) => ({ default: m.ContactCreateModule })))
const ContactListModule = lazy(() => import('./modules/customers/ContactListModule').then((m) => ({ default: m.ContactListModule })))
const ContactDetailModule = lazy(() => import('./modules/customers/ContactDetailModule').then((m) => ({ default: m.ContactDetailModule })))
const CustomerTagsModule = lazy(() => import('./modules/customers/CustomerTagsModule').then((m) => ({ default: m.CustomerTagsModule })))
const ContactTagsModule = lazy(() => import('./modules/customers/ContactTagsModule').then((m) => ({ default: m.ContactTagsModule })))
const ImportCustomersModule = lazy(() => import('./modules/customers/ImportCustomersModule').then((m) => ({ default: m.ImportCustomersModule })))
const VendorsListModule = lazy(() => import('./modules/vendors/VendorsListModule').then((m) => ({ default: m.VendorsListModule })))
const VendorCreateModule = lazy(() => import('./modules/vendors/VendorCreateModule').then((m) => ({ default: m.VendorCreateModule })))
const VendorTagsModule = lazy(() => import('./modules/purchases/VendorTagsModule').then((m) => ({ default: m.VendorTagsModule })))
const PurchaseOrderStatisticsModule = lazy(() => import('./modules/purchases/PurchaseOrderStatisticsModule').then((m) => ({ default: m.PurchaseOrderStatisticsModule })))
const VendorProposalsAreaModule = lazy(() => import('./modules/purchases/VendorProposalsAreaModule').then((m) => ({ default: m.VendorProposalsAreaModule })))
const VendorContactCreateModule = lazy(() => import('./modules/purchases/VendorContactCreateModule').then((m) => ({ default: m.VendorContactCreateModule })))
const VendorContactListModule = lazy(() => import('./modules/purchases/VendorContactListModule').then((m) => ({ default: m.VendorContactListModule })))
const VendorContactDetailModule = lazy(() => import('./modules/purchases/VendorContactDetailModule').then((m) => ({ default: m.VendorContactDetailModule })))
const VendorContactTagsModule = lazy(() => import('./modules/purchases/VendorContactTagsModule').then((m) => ({ default: m.VendorContactTagsModule })))
const QuickPurchaseCreateModule = lazy(() => import('./modules/purchases/QuickPurchaseCreateModule').then((m) => ({ default: m.QuickPurchaseCreateModule })))
const DetailedPurchaseCreateModule = lazy(() => import('./modules/purchases/DetailedPurchaseCreateModule').then((m) => ({ default: m.DetailedPurchaseCreateModule })))
const VendorInvoiceListModule = lazy(() => import('./modules/purchases/VendorInvoiceListModule').then((m) => ({ default: m.VendorInvoiceListModule })))
const VendorInvoicePaidModule = lazy(() => import('./modules/purchases/VendorInvoicePaidModule').then((m) => ({ default: m.VendorInvoicePaidModule })))
const VendorInvoiceUnpaidModule = lazy(() => import('./modules/purchases/VendorInvoiceUnpaidModule').then((m) => ({ default: m.VendorInvoiceUnpaidModule })))
const VendorInvoiceManualModule = lazy(() => import('./modules/purchases/VendorInvoiceManualModule').then((m) => ({ default: m.VendorInvoiceManualModule })))
const VendorInvoiceAutomaticModule = lazy(() => import('./modules/purchases/VendorInvoiceAutomaticModule').then((m) => ({ default: m.VendorInvoiceAutomaticModule })))
const VendorPaymentsListModule = lazy(() => import('./modules/purchases/VendorPaymentsListModule').then((m) => ({ default: m.VendorPaymentsListModule })))
const VendorPaymentsReportModule = lazy(() => import('./modules/purchases/VendorPaymentsReportModule').then((m) => ({ default: m.VendorPaymentsReportModule })))
const VendorInvoiceStatisticsModule = lazy(() => import('./modules/purchases/VendorInvoiceStatisticsModule').then((m) => ({ default: m.VendorInvoiceStatisticsModule })))
const ProjectCreateModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectCreateModule })))
const ProjectEditModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectEditModule })))
const ProjectListModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectListModule })))
const ProjectDetailModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectDetailModule })))
const ProjectOpenLeadsListModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectOpenLeadsListModule })))
const ProjectOpenProjectsListModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectOpenProjectsListModule })))
const ProjectStatsModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectStatsModule })))
const ProjectTaskCreateModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTaskCreateModule })))
const ProjectTaskListModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTaskListModule })))
const ProjectTimeSpentModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectTimeSpentModule })))
const ProjectCategoryCreateModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.ProjectCategoryCreateModule })))
const SupplierProposalStatsModule = lazy(() => import('./modules/projects/ProjectsModules').then((m) => ({ default: m.SupplierProposalStatsModule })))
const OrdersListModule = lazy(() => import('./modules/salesOrders/OrdersListModule').then((m) => ({ default: m.OrdersListModule })))
const OrderCreateModule = lazy(() => import('./modules/salesOrders/OrderCreateModule').then((m) => ({ default: m.OrderCreateModule })))
const OrderDetailModule = lazy(() => import('./modules/salesOrders/OrderDetailModule').then((m) => ({ default: m.OrderDetailModule })))
const OrderStatisticsModule = lazy(() => import('./modules/salesOrders/OrderStatisticsModule').then((m) => ({ default: m.OrderStatisticsModule })))
const ContractsListModule = lazy(() => import('./modules/contracts/ContractsListModule').then((m) => ({ default: m.ContractsListModule })))
const ContractCreateModule = lazy(() => import('./modules/contracts/ContractCreateModule').then((m) => ({ default: m.ContractCreateModule })))
const ServicesDetailsModule = lazy(() => import('./modules/contracts/ServicesDetailsModule').then((m) => ({ default: m.ServicesDetailsModule })))
const ContractReportModule = lazy(() => import('./modules/contracts/ContractReportModule').then((m) => ({ default: m.ContractReportModule })))
const ContractDetailModule = lazy(() => import('./modules/contracts/ContractDetailModule').then((m) => ({ default: m.ContractDetailModule })))
const QuotationsListModule = lazy(() => import('./modules/quotations/QuotationsListModule').then((m) => ({ default: m.QuotationsListModule })))
const QuotationCreateModule = lazy(() => import('./modules/quotations/QuotationCreateModule').then((m) => ({ default: m.QuotationCreateModule })))
const QuotationDetailModule = lazy(() => import('./modules/quotations/QuotationDetailModule').then((m) => ({ default: m.QuotationDetailModule })))
const QuotationStatisticsModule = lazy(() => import('./modules/quotations/QuotationStatisticsModule').then((m) => ({ default: m.QuotationStatisticsModule })))
const InvoicesListModule = lazy(() => import('./modules/invoices/InvoicesListModule').then((m) => ({ default: m.InvoicesListModule })))
const InvoiceCreateModule = lazy(() => import('./modules/invoices/InvoiceCreateModule').then((m) => ({ default: m.InvoiceCreateModule })))
const InvoiceDetailModule = lazy(() => import('./modules/invoices/InvoiceDetailModule').then((m) => ({ default: m.InvoiceDetailModule })))
const QuickInvoiceCreateModule = lazy(() => import('./modules/invoices/QuickInvoiceCreateModule').then((m) => ({ default: m.QuickInvoiceCreateModule })))
const AbandonedInvoicesModule = lazy(() => import('./modules/invoices/AbandonedInvoicesModule').then((m) => ({ default: m.AbandonedInvoicesModule })))
const TemplateInvoicesModule = lazy(() => import('./modules/invoices/TemplateInvoicesModule').then((m) => ({ default: m.TemplateInvoicesModule })))
const PaymentsListModule = lazy(() => import('./modules/invoices/PaymentsListModule').then((m) => ({ default: m.PaymentsListModule })))
const PaymentsReportModule = lazy(() => import('./modules/invoices/PaymentsReportModule').then((m) => ({ default: m.PaymentsReportModule })))
const InvoiceStatisticsModule = lazy(() => import('./modules/invoices/InvoiceStatisticsModule').then((m) => ({ default: m.InvoiceStatisticsModule })))
const AdvancePaymentListModule = lazy(() => import('./modules/invoices/AdvancePaymentListModule').then((m) => ({ default: m.AdvancePaymentListModule })))
const PurchaseOrdersListModule = lazy(() => import('./modules/purchaseOrders/PurchaseOrdersListModule').then((m) => ({ default: m.PurchaseOrdersListModule })))
const PurchaseOrderCreateModule = lazy(() => import('./modules/purchaseOrders/PurchaseOrderCreateModule').then((m) => ({ default: m.PurchaseOrderCreateModule })))
const PurchaseOrderDetailModule = lazy(() => import('./modules/purchaseOrders/PurchaseOrderDetailModule').then((m) => ({ default: m.PurchaseOrderDetailModule })))
const SupplierProposalsListModule = lazy(() => import('./modules/supplierProposals/SupplierProposalsListModule').then((m) => ({ default: m.SupplierProposalsListModule })))
const SupplierProposalCreateModule = lazy(() => import('./modules/supplierProposals/SupplierProposalCreateModule').then((m) => ({ default: m.SupplierProposalCreateModule })))
const ProductsListModule = lazy(() => import('./modules/products/ProductsListModule').then((m) => ({ default: m.ProductsListModule })))
const ServicesListModule = lazy(() => import('./modules/products/ServicesListModule').then((m) => ({ default: m.ServicesListModule })))
const ProductAreaModule = lazy(() => import('./modules/products/ProductAreaModule').then((m) => ({ default: m.ProductAreaModule })))
const ProductCreateModule = lazy(() => import('./modules/products/ProductCreateModule').then((m) => ({ default: m.ProductCreateModule })))
const ProductDetailModule = lazy(() => import('./modules/products/ProductDetailModule').then((m) => ({ default: m.ProductDetailModule })))
const ProductEditModule = lazy(() => import('./modules/products/ProductEditModule').then((m) => ({ default: m.ProductEditModule })))
const ServiceCreateModule = lazy(() => import('./modules/products/ServiceCreateModule').then((m) => ({ default: m.ServiceCreateModule })))
const ProductStatisticsModule = lazy(() => import('./modules/products/ProductStatisticsModule').then((m) => ({ default: m.ProductStatisticsModule })))
const ServiceStatisticsModule = lazy(() => import('./modules/products/ServiceStatisticsModule').then((m) => ({ default: m.ServiceStatisticsModule })))
const ProductStocksModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.ProductStocksModule })))
const ProductStocksByLotModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.ProductStocksByLotModule })))
const LotsSerialsModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.LotsSerialsModule })))
const VariantAttributesModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.VariantAttributesModule })))
const ProductPriceListModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.ProductPriceListModule })))
const ProductTagsModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.ProductTagsModule })))
const ProductImportModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.ProductImportModule })))
const ProductVatUpdateModule = lazy(() => import('./modules/products/ProductStubModules').then((m) => ({ default: m.ProductVatUpdateModule })))
const AgendaModule = lazy(() => import('./modules/agenda/AgendaModule').then((m) => ({ default: m.AgendaModule })))

const PosLayout = lazy(() => import('./pos/layouts/DashboardLayout'))
const PosHome = lazy(() => import('./pos/features/pos/Components/PosHome'))
const PosProductsPage = lazy(() => import('./pos/features/products/Components/ProductsPage'))

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

// Wraps every route's element: Suspense covers the lazy-chunk download (a
// no-op for the two eager routes below), ErrorBoundary means a crash in one
// module blanks only that route's content, not the sidebar/navbar chrome
// around it or the rest of the app.
function RouteBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ErrorBoundary fallback={<FullPageError />}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidebarStyleProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<RouteBoundary><LoginModule /></RouteBoundary>} />
                <Route element={<ProtectedRoute />}>
                {/* Full-bleed, own chrome (PosNavbar/PosSidebar) — not wrapped in
                    AppLayout's admin Navbar/Sidebar, same as pos_standalone was
                    full-screen on its own. See src/pos/layouts/DashboardLayout.jsx. */}
                <Route path="/pos" element={<RouteBoundary><PosLayout /></RouteBoundary>}>
                  <Route index element={<RouteBoundary><PosHome /></RouteBoundary>} />
                  <Route path="products" element={<RouteBoundary><PosProductsPage /></RouteBoundary>} />
                </Route>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<RouteBoundary><DashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.home} element={<RouteBoundary><DashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.zra} element={<RouteBoundary><ZraModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraImport} element={<RouteBoundary><ZraImportModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraAutomaticPurchase} element={<RouteBoundary><ZraAutomaticPurchaseModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraUnuploadedCustomers} element={<RouteBoundary><ZraUnuploadedCustomersModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraPendingSales} element={<RouteBoundary><ZraPendingSalesModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraPendingPurchase} element={<RouteBoundary><ZraPendingPurchaseModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraUnuploadedStockMovements} element={<RouteBoundary><ZraUnuploadedStockModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraUnuploadedProducts} element={<RouteBoundary><ZraUnuploadProductsModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraInvoiceDetails} element={<RouteBoundary><ZraSalesLookupModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraCustomerInfo} element={<RouteBoundary><ZraCustomerInfoModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraItemDetails} element={<RouteBoundary><ZraItemDetailsModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraRrpItemList} element={<RouteBoundary><ZraRrpItemListModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraPrincipals} element={<RouteBoundary><ZraPrincipalsModule /></RouteBoundary>} />
                  <Route path={ROUTES.zraStockList} element={<RouteBoundary><ZraStockListModule /></RouteBoundary>} />
                  <Route path={ROUTES.asycudaPurchase} element={<RouteBoundary><AsycudaPurchaseInvoiceModule /></RouteBoundary>} />
                  <Route path={ROUTES.salesDashboard} element={<RouteBoundary><SalesModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchasesDashboard} element={<RouteBoundary><PurchasesModule /></RouteBoundary>} />
                  <Route path={ROUTES.warehouseDashboard} element={<RouteBoundary><WarehousesModule /></RouteBoundary>} />
                  <Route path={ROUTES.warehouseCreate} element={<RouteBoundary><WarehouseCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.warehouseList} element={<RouteBoundary><WarehouseListModule /></RouteBoundary>} />
                  <Route path={ROUTES.warehouseDetail} element={<RouteBoundary><WarehouseDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.inventoryCreate} element={<RouteBoundary><InventoryCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.inventoryList} element={<RouteBoundary><InventoryListModule /></RouteBoundary>} />
                  <Route path={ROUTES.inventoryDetail} element={<RouteBoundary><InventoryDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.landedCostCreate} element={<RouteBoundary><LandedCostCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.landedCostList} element={<RouteBoundary><LandedCostListModule /></RouteBoundary>} />
                  <Route path={ROUTES.shipmentList} element={<RouteBoundary><ShipmentSearchModule /></RouteBoundary>} />
                  <Route path={ROUTES.shipmentDraft} element={<RouteBoundary><ShipmentDraftModule /></RouteBoundary>} />
                  <Route path={ROUTES.shipmentValidated} element={<RouteBoundary><ShipmentValidatedModule /></RouteBoundary>} />
                  <Route path={ROUTES.shipmentProcessed} element={<RouteBoundary><ShipmentProcessedModule /></RouteBoundary>} />
                  <Route path={ROUTES.shipmentStatistics} element={<RouteBoundary><StatisticsShipmentModule /></RouteBoundary>} />
                  <Route path={ROUTES.packingList} element={<RouteBoundary><PackingListModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionsArea} element={<RouteBoundary><ReceptionsAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionCreate} element={<RouteBoundary><ReceptionCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionList} element={<RouteBoundary><ReceptionListModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionDraft} element={<RouteBoundary><ReceptionDraftModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionValidated} element={<RouteBoundary><ReceptionValidatedModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionProcessed} element={<RouteBoundary><ReceptionProcessedModule /></RouteBoundary>} />
                  <Route path={ROUTES.receptionStatistics} element={<RouteBoundary><ReceptionStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.creditNoteOrderList} element={<RouteBoundary><CreditNoteOrderListModule /></RouteBoundary>} />
                  <Route path={ROUTES.stockMovementsList} element={<RouteBoundary><StockMovementsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.boxBreak} element={<RouteBoundary><BoxBreakModule /></RouteBoundary>} />
                  <Route path={ROUTES.fefoDashboard} element={<RouteBoundary><FefoDashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.stockCorrection} element={<RouteBoundary><StockCorrectionModule /></RouteBoundary>} />
                  <Route path={ROUTES.stockTransfer} element={<RouteBoundary><StockTransferModule /></RouteBoundary>} />
                  <Route path={ROUTES.massStockTransfer} element={<RouteBoundary><MassStockTransferModule /></RouteBoundary>} />
                  <Route path={ROUTES.replenishment} element={<RouteBoundary><ReplenishmentModule /></RouteBoundary>} />
                  <Route path={ROUTES.racksArea} element={<RouteBoundary><RacksAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.shelvesList} element={<RouteBoundary><ShelvesModule /></RouteBoundary>} />
                  <Route path={ROUTES.racksList} element={<RouteBoundary><RacksListModule /></RouteBoundary>} />
                  <Route path={ROUTES.productRackAssign} element={<RouteBoundary><ProductRackAssignModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollDashboard} element={<RouteBoundary><PayrollModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollDateWiseAttendance} element={<RouteBoundary><DateWiseAttendanceModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollMarkAttendance} element={<RouteBoundary><MarkAttendanceModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollCalendarHolidays} element={<RouteBoundary><HolidayModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeAward} element={<RouteBoundary><AwardModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeTransfers} element={<RouteBoundary><TransferModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeResignation} element={<RouteBoundary><ResignationModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeTravel} element={<RouteBoundary><TravelModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeComplaints} element={<RouteBoundary><ComplaintModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeWarnings} element={<RouteBoundary><WarningModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeTerminations} element={<RouteBoundary><TerminationModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeIndicator} element={<RouteBoundary><IndicatorModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeAppraisal} element={<RouteBoundary><AppraisalModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollMarkSpecialShiftAttendance} element={<RouteBoundary><MarkSpecialShiftAttendanceModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollMarkHolidayAttendance} element={<RouteBoundary><MarkHolidayAttendanceModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollAdvanceSalary} element={<RouteBoundary><AdvanceSalaryModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollEmployeeLoan} element={<RouteBoundary><LoanModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollAssignShifts} element={<RouteBoundary><ShiftModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollSalaryTemplate} element={<RouteBoundary><SalaryTemplateModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollHourlyTemplate} element={<RouteBoundary><HourlyTemplateModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollManageSalary} element={<RouteBoundary><ManageSalaryModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollManageSalaryList} element={<RouteBoundary><ManageSalaryListModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollManageHolidaySalary} element={<RouteBoundary><ManageHolidaySalaryModule /></RouteBoundary>} />
                  <Route path={ROUTES.payrollManageSpecialShiftSalary} element={<RouteBoundary><ManageSpecialShiftSalaryModule /></RouteBoundary>} />
                  {PAYROLL_PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<RouteBoundary><PayrollPlaceholderModule /></RouteBoundary>} />
                  ))}
                  <Route path={ROUTES.bankingAccounts} element={<RouteBoundary><BankAccountsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingList} element={<RouteBoundary><BankAccountsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingEntries} element={<RouteBoundary><BankEntriesListModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingCategories} element={<RouteBoundary><BankAccountCategoriesListModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingLoanList} element={<RouteBoundary><LoanListModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingNewAccount} element={<RouteBoundary><BankAccountCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingNewLoan} element={<RouteBoundary><LoanCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingNewDeposit} element={<RouteBoundary><CheckDepositCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.bankingDepositList} element={<RouteBoundary><CheckDepositListModule /></RouteBoundary>} />
                  {BANKING_PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<RouteBoundary><BankingPlaceholderModule /></RouteBoundary>} />
                  ))}
                  <Route path={ROUTES.budget} element={<RouteBoundary><BudgetModule /></RouteBoundary>} />
                  <Route path={ROUTES.ticketList} element={<RouteBoundary><TicketsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.ticketMyAssigned} element={<RouteBoundary><MyAssignedTicketsModule /></RouteBoundary>} />
                  <Route path={ROUTES.ticketStatistics} element={<RouteBoundary><TicketStatisticsModule /></RouteBoundary>} />
                  {TICKET_PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<RouteBoundary><TicketPlaceholderModule /></RouteBoundary>} />
                  ))}
                  <Route path={ROUTES.expensesList} element={<RouteBoundary><ExpenseReportsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.specialExpenses} element={<RouteBoundary><SpecialExpensesModule /></RouteBoundary>} />
                  {EXPENSE_PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<RouteBoundary><ExpensePlaceholderModule /></RouteBoundary>} />
                  ))}
                  <Route path={ROUTES.ledgerDashboard} element={<RouteBoundary><LedgerModule /></RouteBoundary>} />
                  <Route path={ROUTES.ledgerList} element={<RouteBoundary><JournalsModule /></RouteBoundary>} />
                  <Route path={ROUTES.ledgerSubledger} element={<RouteBoundary><SubledgerModule /></RouteBoundary>} />
                  <Route path={ROUTES.ledgerCreate} element={<RouteBoundary><NewTransactionModule /></RouteBoundary>} />
                  <Route path={ROUTES.memberDashboard} element={<RouteBoundary><MembersDashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.memberList} element={<RouteBoundary><MembersListModule /></RouteBoundary>} />
                  {MEMBER_PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<RouteBoundary><MemberPlaceholderModule /></RouteBoundary>} />
                  ))}
                  <Route path={ROUTES.fixedAssetList} element={<RouteBoundary><AssetsListModule /></RouteBoundary>} />
                  {FIXED_ASSET_PLACEHOLDERS.map((p) => (
                    <Route key={p.path} path={p.path} element={<RouteBoundary><FixedAssetPlaceholderModule /></RouteBoundary>} />
                  ))}
                  <Route path={ROUTES.reportDetail} element={<RouteBoundary><ReportDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.stockMovements} element={<RouteBoundary><StockMovementsModule /></RouteBoundary>} />
                  <Route path={ROUTES.userGroupEdit} element={<RouteBoundary><GroupEditModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationCreateIntervention} element={<RouteBoundary><QuotationCreateInterventionModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationCreateContract} element={<RouteBoundary><QuotationCreateContractModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationCreateInvoice} element={<RouteBoundary><QuotationCreateInvoiceModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderCreateReception} element={<RouteBoundary><CreateReceptionModule /></RouteBoundary>} />
                  <Route path={ROUTES.ticketDetail} element={<RouteBoundary><TicketDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.productStockAtDate} element={<RouteBoundary><StockAtDateModule /></RouteBoundary>} />
                  <Route path={ROUTES.expenseReportDetail} element={<RouteBoundary><ExpenseReportDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationConsumptionHistory} element={<RouteBoundary><ConsumptionHistoryModule /></RouteBoundary>} />
                  <Route path={ROUTES.productLotSerialDetail} element={<RouteBoundary><LotSerialDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.productVariantAttributeDetail} element={<RouteBoundary><VariantAttributeDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.kitchenDashboard} element={<RouteBoundary><KitchenModule /></RouteBoundary>} />
                  <Route path={ROUTES.kitchenBeverageOrders} element={<RouteBoundary><BeverageOrdersModule /></RouteBoundary>} />
                  <Route path={ROUTES.kitchenCreateOrder} element={<RouteBoundary><CreateOrderModule /></RouteBoundary>} />
                  <Route path={ROUTES.bookingDashboard} element={<RouteBoundary><HotelModule /></RouteBoundary>} />
                  <Route path={ROUTES.usersDashboard} element={<RouteBoundary><UsersDashboardModule /></RouteBoundary>} />
                  <Route path={ROUTES.userCreate} element={<RouteBoundary><UserCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.userDetail} element={<RouteBoundary><UserDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.userGroupList} element={<RouteBoundary><GroupsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.userGroupCreate} element={<RouteBoundary><GroupCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.userTags} element={<RouteBoundary><TagsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.hrmArea} element={<RouteBoundary><HrmAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.leaveList} element={<RouteBoundary><LeaveListModule /></RouteBoundary>} />
                  <Route path={ROUTES.leaveRequest} element={<RouteBoundary><LeaveRequestModule /></RouteBoundary>} />
                  <Route path={ROUTES.timeSpent} element={<RouteBoundary><TimeSpentModule /></RouteBoundary>} />
                  <Route path={ROUTES.activitiesDetail} element={<RouteBoundary><ActivitiesDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.userDocuments} element={<RouteBoundary><LinkedFilesAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.userDocumentsManual} element={<RouteBoundary><LinkedFilesManualTreeModule /></RouteBoundary>} />
                  <Route path={ROUTES.userDocumentsAutomatic} element={<RouteBoundary><LinkedFilesAutomaticTreeModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerList} element={<RouteBoundary><CustomersListModule /></RouteBoundary>} />
                  <Route path={ROUTES.customersCreate} element={<RouteBoundary><CustomerCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerDetail} element={<RouteBoundary><CustomerDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.prospectList} element={<RouteBoundary><ProspectsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.prospectsCreate} element={<RouteBoundary><ProspectCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerGroupList} element={<RouteBoundary><CustomerGroupListModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerGroupCreate} element={<RouteBoundary><CustomerGroupCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerGroupEdit} element={<RouteBoundary><CustomerGroupCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.contactCreate} element={<RouteBoundary><ContactCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.contactList} element={<RouteBoundary><ContactListModule /></RouteBoundary>} />
                  <Route path={ROUTES.contactDetail} element={<RouteBoundary><ContactDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorList} element={<RouteBoundary><VendorsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorCreate} element={<RouteBoundary><VendorCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorTags} element={<RouteBoundary><VendorTagsModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderList} element={<RouteBoundary><OrdersListModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderCreate} element={<RouteBoundary><OrderCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderStats} element={<RouteBoundary><OrderStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.orderDetail} element={<RouteBoundary><OrderDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractList} element={<RouteBoundary><ContractsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractCreate} element={<RouteBoundary><ContractCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractServices} element={<RouteBoundary><ServicesDetailsModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractReport} element={<RouteBoundary><ContractReportModule /></RouteBoundary>} />
                  <Route path={ROUTES.contractDetail} element={<RouteBoundary><ContractDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationList} element={<RouteBoundary><QuotationsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationCreate} element={<RouteBoundary><QuotationCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationDetail} element={<RouteBoundary><QuotationDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.quotationStats} element={<RouteBoundary><QuotationStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceList} element={<RouteBoundary><InvoicesListModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceAbandoned} element={<RouteBoundary><AbandonedInvoicesModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceCreate} element={<RouteBoundary><InvoiceCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceCreateQuick} element={<RouteBoundary><QuickInvoiceCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceTemplates} element={<RouteBoundary><TemplateInvoicesModule /></RouteBoundary>} />
                  <Route path={ROUTES.paymentsList} element={<RouteBoundary><PaymentsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.paymentsReport} element={<RouteBoundary><PaymentsReportModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceStats} element={<RouteBoundary><InvoiceStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceAdvancePayments} element={<RouteBoundary><AdvancePaymentListModule /></RouteBoundary>} />
                  <Route path={ROUTES.invoiceDetail} element={<RouteBoundary><InvoiceDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.customerTags} element={<RouteBoundary><CustomerTagsModule /></RouteBoundary>} />
                  <Route path={ROUTES.contactTags} element={<RouteBoundary><ContactTagsModule /></RouteBoundary>} />
                  <Route path={ROUTES.importCustomers} element={<RouteBoundary><ImportCustomersModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderList} element={<RouteBoundary><PurchaseOrdersListModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderCreate} element={<RouteBoundary><PurchaseOrderCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderDetail} element={<RouteBoundary><PurchaseOrderDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.purchaseOrderStats} element={<RouteBoundary><PurchaseOrderStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.supplierProposalArea} element={<RouteBoundary><VendorProposalsAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.supplierProposalList} element={<RouteBoundary><SupplierProposalsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.supplierProposalCreate} element={<RouteBoundary><SupplierProposalCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorContactCreate} element={<RouteBoundary><VendorContactCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorContactList} element={<RouteBoundary><VendorContactListModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorContactDetail} element={<RouteBoundary><VendorContactDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorContactTags} element={<RouteBoundary><VendorContactTagsModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceCreateQuick} element={<RouteBoundary><QuickPurchaseCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceCreate} element={<RouteBoundary><DetailedPurchaseCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceList} element={<RouteBoundary><VendorInvoiceListModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoicePaid} element={<RouteBoundary><VendorInvoicePaidModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceUnpaid} element={<RouteBoundary><VendorInvoiceUnpaidModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceManual} element={<RouteBoundary><VendorInvoiceManualModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceAutomatic} element={<RouteBoundary><VendorInvoiceAutomaticModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorPaymentsList} element={<RouteBoundary><VendorPaymentsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorPaymentsReport} element={<RouteBoundary><VendorPaymentsReportModule /></RouteBoundary>} />
                  <Route path={ROUTES.vendorInvoiceStats} element={<RouteBoundary><VendorInvoiceStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectCreate} element={<RouteBoundary><ProjectCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectEdit} element={<RouteBoundary><ProjectEditModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectList} element={<RouteBoundary><ProjectListModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectDetail} element={<RouteBoundary><ProjectDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectOpenLeadsList} element={<RouteBoundary><ProjectOpenLeadsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectOpenProjectsList} element={<RouteBoundary><ProjectOpenProjectsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectStats} element={<RouteBoundary><ProjectStatsModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectTaskCreate} element={<RouteBoundary><ProjectTaskCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectTaskList} element={<RouteBoundary><ProjectTaskListModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectTimeSpent} element={<RouteBoundary><ProjectTimeSpentModule /></RouteBoundary>} />
                  <Route path={ROUTES.projectCategoryCreate} element={<RouteBoundary><ProjectCategoryCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.supplierProposalStats} element={<RouteBoundary><SupplierProposalStatsModule /></RouteBoundary>} />
                  <Route path={ROUTES.productList} element={<RouteBoundary><ProductsListModule /></RouteBoundary>} />
                  <Route path={ROUTES.serviceList} element={<RouteBoundary><ServicesListModule /></RouteBoundary>} />
                  <Route path={ROUTES.productArea} element={<RouteBoundary><ProductAreaModule /></RouteBoundary>} />
                  <Route path={ROUTES.productCreate} element={<RouteBoundary><ProductCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.productDetail} element={<RouteBoundary><ProductDetailModule /></RouteBoundary>} />
                  <Route path={ROUTES.productEdit} element={<RouteBoundary><ProductEditModule /></RouteBoundary>} />
                  <Route path={ROUTES.serviceCreate} element={<RouteBoundary><ServiceCreateModule /></RouteBoundary>} />
                  <Route path={ROUTES.productStats} element={<RouteBoundary><ProductStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.serviceStats} element={<RouteBoundary><ServiceStatisticsModule /></RouteBoundary>} />
                  <Route path={ROUTES.productStocks} element={<RouteBoundary><ProductStocksModule /></RouteBoundary>} />
                  <Route path={ROUTES.productStocksByLot} element={<RouteBoundary><ProductStocksByLotModule /></RouteBoundary>} />
                  <Route path={ROUTES.lotsSerials} element={<RouteBoundary><LotsSerialsModule /></RouteBoundary>} />
                  <Route path={ROUTES.variantAttributes} element={<RouteBoundary><VariantAttributesModule /></RouteBoundary>} />
                  <Route path={ROUTES.productPriceList} element={<RouteBoundary><ProductPriceListModule /></RouteBoundary>} />
                  <Route path={ROUTES.productTags} element={<RouteBoundary><ProductTagsModule /></RouteBoundary>} />
                  <Route path={ROUTES.productImport} element={<RouteBoundary><ProductImportModule /></RouteBoundary>} />
                  <Route path={ROUTES.productVatUpdate} element={<RouteBoundary><ProductVatUpdateModule /></RouteBoundary>} />
                  <Route path={ROUTES.agenda} element={<RouteBoundary><AgendaModule /></RouteBoundary>} />
                  <Route path={ROUTES.reports} element={<RouteBoundary><ReportsModule /></RouteBoundary>} />
                  <Route path="/settings" element={<RouteBoundary><SettingsModule /></RouteBoundary>} />
                  <Route path={ROUTES.setupLanding} element={<RouteBoundary><SetupLandingModule /></RouteBoundary>} />
                  <Route path={ROUTES.companyOrganization} element={<RouteBoundary><CompanyOrganizationModule /></RouteBoundary>} />
                  <Route path={ROUTES.menusSetup} element={<RouteBoundary><MenusSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.displaySetup} element={<RouteBoundary><DisplaySetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.translationSetup} element={<RouteBoundary><TranslationSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.defaultValuesSetup} element={<RouteBoundary><DefaultValuesSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.widgetsSetup} element={<RouteBoundary><WidgetsSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.alertsSetup} element={<RouteBoundary><AlertsSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.securitySetup} element={<RouteBoundary><SecuritySetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.limitsSetup} element={<RouteBoundary><LimitsSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.pdfSetup} element={<RouteBoundary><PdfSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.emailsSetup} element={<RouteBoundary><EmailsSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.emailTemplates} element={<RouteBoundary><EmailTemplatesModule /></RouteBoundary>} />
                  <Route path={ROUTES.smsSetup} element={<RouteBoundary><SmsSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.dictionaries} element={<RouteBoundary><DictionarySetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.otherSetup} element={<RouteBoundary><OtherSetupModule /></RouteBoundary>} />
                  <Route path={ROUTES.exportAssistant} element={<RouteBoundary><ExportAssistantModule /></RouteBoundary>} />
                  <Route path={ROUTES.importAssistant} element={<RouteBoundary><ImportAssistantModule /></RouteBoundary>} />
                  <Route path={ROUTES.cashflowSettings} element={<RouteBoundary><CashflowSettingsModule /></RouteBoundary>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
          </SidebarStyleProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

// Root fallback — only reached if something above every route boundary
// throws (a provider, AppShell/sidebar itself, or a bug in RouteBoundary),
// since any single route's own error is already caught closer to its source.
function FullPageError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
      <p className="text-lg font-semibold text-text">Something went wrong.</p>
      <p className="text-sm text-text-muted">Please reload the page. If this keeps happening, contact support.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
      >
        Reload page
      </button>
    </div>
  )
}

export default App
