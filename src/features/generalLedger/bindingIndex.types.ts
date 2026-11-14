// Types of the bindingIndex page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// accountancy/{customer,supplier,expensereport}/index.php — the "binding" overviews. From the pages'
// own PHP and markup:
//   - the year is in the title (`?year=`); an info box explains the binding, with bold phrases and
//     line breaks;
//   - sections follow one another: a title bar (`.ecnta-title`) and the table(s) under it. The first
//     section's title bar holds the "Bind Automatically" link — a GET `?action=validatehistory&token=…
//     &year=…` that binds, in one go, every line whose product has an accounting account;
//   - the tables are months × amounts (Account | Label | Jan … Dec | Total, or a label | Jan … Dec |
//     Total for "Other information"); a label cell can hold a link (the "Lines to bind" list).

// A run of text in a cell or the info box, optionally bold or a link (root-relative as printed).
export interface BindingSegment {
  text: string
  bold?: boolean
  href?: string
}
export interface BindingCell {
  segments: BindingSegment[]
  text: string
  bold: boolean
}
export interface BindingTable {
  headers: string[]
  rows: BindingCell[][]
}
export interface BindingSection {
  title: string
  // "Bind Automatically" and its link (carries the token), when the section has one.
  action: { label: string; href: string } | null
  tables: BindingTable[]
}
export interface BindingIndex {
  year: number
  // The info box, one entry per line.
  info: BindingSegment[][]
  sections: BindingSection[]
}
