export interface DailySummaryRow {
  id: string | number
  ref: string
  thirdPartyName?: string
  modeLabel?: string
  amount: number
}

export interface DailySummaryData {
  date: string
  opening: { cashInHand: number; bankBalance: number; total: number }
  income: { rows: DailySummaryRow[] }
  expenses: { rows: DailySummaryRow[] }
  profitLoss: { salesRevenue: number; operatingExpenses: number }
}

// Stubbed: the real version reconstructs today's VAT/P&L summary from this
// app's backend bank/payment tables. This project has no backend of its
// own, so DailySummaryPanel just shows its loading-complete empty state
// (no data means no tables render below the panel header).
export function useDailySummary() {
  return { data: undefined as DailySummaryData | undefined, isLoading: false }
}
