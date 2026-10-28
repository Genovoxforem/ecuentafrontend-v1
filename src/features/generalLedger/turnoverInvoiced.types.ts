// "TURNOVER INVOICED" (Reporting > ReportTurnover, classic compta/stats/index.php), filled from
// compta/stats/fapi/turnover.php (reportsFapi.ts). One block of columns per year in the period
// ("Amount (inc. tax)" and "Delta"; Claims-and-debts mode adds "Amount (excl. tax)"), then 12 month rows and a Total row.

export interface TurnoverGroup {
  year: string
  labels: string[]
}

export interface TurnoverReport {
  title: string
  period: string
  start: string // MM/dd/yyyy
  end: string
  basis: string
  groups: TurnoverGroup[]
  months: { month: string; cells: string[] }[]
  totalLabel: string
  totals: string[]
}
