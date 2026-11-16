// Types of the journalsList page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/bookkeeping/list.php ("Operations - Journals"). Notes from the page's own PHP and
// its live markup:
//   - one row per accounting line, sorted by `t.piece_num, t.rowid`, server-paginated with `limit`
//     and `page` (no total is printed, only a next/previous arrow);
//   - the shown columns are the user's own choice (the `selectedfields` picker in the last header
//     cell); only ticked columns are printed, in the picker's order;
//   - while the "Include docs already exported" switch (constant ACCOUNTING_REEXPORT) is off, lines
//     that already have an export date are left out of the list;
//   - the edit / delete icons of a row only exist when the user may act and the line has not been
//     exported; the trash icon deletes the whole transaction (its `mvt_num` is the piece number);
//   - without any date parameter (and without `formfilteraction`) the backend applies the current
//     fiscal year and prints it back in the date filter.

export interface JournalColumn {
  // The picker's own key, e.g. `t.piece_num`.
  key: string
  label: string
  visible: boolean
}
export interface JournalCell {
  text: string
  // First link of the cell as printed (an invoice for `t.doc_ref`, …), root-relative.
  href: string | null
}
export interface JournalRow {
  pieceNum: string
  cells: Record<string, JournalCell>
  canEdit: boolean
  canDelete: boolean
}
export interface JournalOption {
  value: string
  label: string
}
export interface JournalsList {
  columns: JournalColumn[]
  rows: JournalRow[]
  // Page totals by column key (`t.debit`, `t.credit`); empty when the page prints none.
  totals: Record<string, string>
  // Filter values as the page shows them, by the backend's own parameter names. Dates are ISO
  // (yyyy-mm-dd) or ''.
  filters: Record<string, string>
  accountOptions: JournalOption[]
  limit: number
  limitOptions: number[]
  // 0-based
  page: number
  hasPrev: boolean
  hasNext: boolean
  // "Include docs already exported" is on.
  reexport: boolean
  token: string
  // Tooltip of the export button (it names the configured export format), null when the user has
  // no export right.
  exportTitle: string | null
}
