// Shared by shipmentStats.queries.ts and receptionStats.queries.ts — both
// real reference pages (expedition/stats/index.php, reception/stats/index.php)
// use the exact same real pattern: no JSON endpoint, but the actual Chart.js
// dataset is embedded directly in the page's own <script> block, anchored to
// a `canvas_<feature>nbinyear_<year>_png` element id, with two datasets (the
// selected year and the year before it, per both pages' own
// $startyear = $year - 1 / $endyear = $year logic).

export interface YearlyBarChartStats {
  datasets: { year: string; data: number[] }[]
}

// Finds the `[` right after `datasets:` and scans forward counting brackets
// to its true matching `]` — the datasets array contains each dataset's own
// nested `data: [...]` array, so a non-greedy regex like `\[([\s\S]*?)\]`
// stops at the FIRST `]` it meets (the first dataset's own data array),
// silently truncating every dataset after it. Balanced-bracket scanning is
// the only way to get the real, complete array text.
function extractBalancedBrackets(html: string, afterMarker: string, fromIndex = 0): string | null {
  const markerIdx = html.indexOf(afterMarker, fromIndex)
  if (markerIdx === -1) return null
  const start = html.indexOf('[', markerIdx)
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < html.length; i++) {
    if (html[i] === '[') depth++
    else if (html[i] === ']') {
      depth--
      if (depth === 0) return html.slice(start + 1, i)
    }
  }
  return null
}

// canvasIdSubstring: the feature-specific fragment of the real canvas id
// (e.g. "canvas_shipmentsnbinyear" or "canvas_receptionsnbinyear") — used to
// anchor the search so an unrelated "datasets:" elsewhere on the page can't
// be matched by accident.
export function parseYearlyBarChartStats(html: string, canvasIdSubstring: string): YearlyBarChartStats {
  const chartAnchor = html.indexOf(canvasIdSubstring)
  if (chartAnchor === -1) return { datasets: [] }
  const datasetsText = extractBalancedBrackets(html, 'datasets:', chartAnchor)
  if (!datasetsText) return { datasets: [] }

  const datasets: { year: string; data: number[] }[] = []
  const datasetRe = /label:\s*'(\d{4})'[\s\S]*?data:\s*\[([^\]]*)\]/g
  let m: RegExpExecArray | null
  while ((m = datasetRe.exec(datasetsText))) {
    datasets.push({ year: m[1], data: m[2].split(',').map((n) => Number(n.trim())) })
  }
  return { datasets }
}
