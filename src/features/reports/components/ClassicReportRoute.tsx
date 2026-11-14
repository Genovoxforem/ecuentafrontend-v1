import { STATEMENTS, TABLE_REPORTS } from '../classicReports.data'
import { BalanceSheetView, ClassicStatementView, ClassicTableReportView } from './ClassicReportViews'

// Picks the view of a page read from the classic page: a table report or a statement.
export function ClassicReportView({ reportKey }: { reportKey: string }) {
  if (TABLE_REPORTS[reportKey]) return <ClassicTableReportView reportKey={reportKey} />
  if (reportKey === 'balance-horizontal' || reportKey === 'balance-vertical') return <BalanceSheetView vertical={reportKey === 'balance-vertical'} title={STATEMENTS[reportKey].title} />
  if (STATEMENTS[reportKey]) return <ClassicStatementView reportKey={reportKey} />
  return <p className="text-sm text-danger">Unknown report.</p>
}
