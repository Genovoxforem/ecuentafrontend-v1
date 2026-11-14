import { CalendarClock, ChartColumn, CirclePlus, Receipt, Settings, WalletCards } from 'lucide-react'
import { InstallmentDashboardPage } from '../../features/installments/components/InstallmentDashboardPage'
import { InstallmentListPage } from '../../features/installments/components/InstallmentListPage'
import { InstallmentCreatePage } from '../../features/installments/components/InstallmentCreatePage'
import { InstallmentPaymentsPage } from '../../features/installments/components/InstallmentPaymentsPage'
import { InstallmentReportsPage } from '../../features/installments/components/InstallmentReportsPage'
import { InstallmentSettingsPage } from '../../features/installments/components/InstallmentSettingsPage'
import { InstallmentDetailPage } from '../../features/installments/components/InstallmentDetailPage'
import { InstallmentPayPage } from '../../features/installments/components/InstallmentPayPage'
import { InstallmentReceiptPage } from '../../features/installments/components/InstallmentReceiptPage'

export const InstallmentDashboardModule = () => <InstallmentDashboardPage icon={ChartColumn} />
export const InstallmentListModule = () => <InstallmentListPage icon={CalendarClock} />
export const InstallmentNewModule = () => <InstallmentCreatePage icon={CirclePlus} />
export const InstallmentDetailModule = () => <InstallmentDetailPage icon={CalendarClock} />
export const InstallmentPayModule = () => <InstallmentPayPage icon={WalletCards} />
export const InstallmentPaymentsModule = () => <InstallmentPaymentsPage icon={WalletCards} />
export const InstallmentReceiptsModule = () => <InstallmentPaymentsPage icon={Receipt} receipts />
export const InstallmentReceiptDetailModule = () => <InstallmentReceiptPage icon={Receipt} />
export const InstallmentReportsModule = () => <InstallmentReportsPage icon={ChartColumn} />
export const InstallmentSettingsModule = () => <InstallmentSettingsPage icon={Settings} />
