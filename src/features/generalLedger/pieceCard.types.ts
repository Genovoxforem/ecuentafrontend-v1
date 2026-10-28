// One accounting transaction (accountancy/fapi/piece.php, mapped in pieceFapi.ts), shaped like the classic
// "Modification of a transaction" page (accountancy/bookkeeping/card.php?piece_num=N[&mode=_tmp]). A transaction lives
// in the ledger (mode '') or, while it is being entered, in a scratch table (mode `_tmp`).

export interface PieceCardLine {
  id: string
  account: string
  accountLabel: string
  subledger: string
  subledgerLabel: string
  label: string
  currency: string
  exchangeRate: string
  debit: string
  debitConverted: string
  credit: string
  creditConverted: string
  // The line id while the line can be deleted, null when it cannot.
  deleteHref: string | null
}

export interface PieceCardOption {
  value: string
  label: string
}

export interface PieceCardAddRow {
  accountOptions: PieceCardOption[]
  currencyOptions: PieceCardOption[]
  currency: string
  exchangeRate: string
}

export interface PieceCard {
  pieceNum: string
  mode: string
  date: string
  journal: string
  accountingDoc: string
  docType: string
  creationDate: string
  // Currency of the debit / credit columns, e.g. "ZMW".
  currencyLabel: string
  lines: PieceCardLine[]
  add: PieceCardAddRow | null
  token: string
  hidden: Record<string, string>
}

