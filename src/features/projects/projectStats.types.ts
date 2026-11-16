// Types of the statsHtml page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

// Shared parsing for the legacy Dolibarr "Statistics" pages used by both
// Project Statistics (projet/stats/index.php) and Vendor Proposal
// Statistics (comm/propal/stats/index.php?mode=supplier) — both render the
// same shape: a Year filter, a results table, and 2-3 Chart.js charts whose
// full labels/datasets are embedded inline as JS object literals in a
// <script> tag (not a static image). Extracting the numbers out of that JS
// text (there is no separate chart-data endpoint) is what lets this render
// an actual chart instead of a blank placeholder.

export interface SelectOption {
  value: string
  label: string
}
export interface StatsResultsTable {
  headers: string[]
  rows: string[][]
}
export interface StatsChart {
  title: string
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  labels: string[]
  datasets: { label: string; data: number[] }[]
}
