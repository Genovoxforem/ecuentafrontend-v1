// One row of a Dictionary-style list (DictListPage): the cells in column order, the row id the actions use and the active flag.
// Rows come from a JSON endpoint (chartModelsFapi.ts, personalizedGroupsFapi.ts); no classic link is carried.
export interface DictRow {
  rowid: string
  cells: string[]
  active: boolean
}
