import { cellText } from './legacyTable'

// accountancy/closure/validate.php ("Validate movements"). From the page's own PHP and live markup:
//   - a description of what validating means, then one table: a header row of the twelve months and
//     Total, and a row of movement counts by month for the chosen year (`?year=`);
//   - "Validate movements" is a plain link (`?month=<year>&action=validate`, the year travels in a
//     parameter called `month`). The page prints no result and no per-movement validation state, so
//     nothing on it can confirm what a validation did.

export interface ValidateMovements {
  year: number
  // The page's own explanation.
  description: string
  // The heading over the table (the backend prints its untranslated key, "SelectMonthAndValidate").
  heading: string
  months: { label: string; count: string }[]
  total: string
  // The Validate link is there (the user may validate).
  canValidate: boolean
}

// "SelectMonthAndValidate" -> "Select Month And Validate"
const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').trim()

export function readValidateMovements(doc: Document): ValidateMovements {
  const table = Array.from(doc.querySelectorAll('table.newCustomUItable')).find((t) => /^Jan/i.test(cellText(t.querySelector('tr'))))
  if (!table) throw new Error('The movements table on this backend page was not recognised.')
  const rows = Array.from(table.querySelectorAll('tr'))
  const labels = Array.from(rows[0].children, (c) => cellText(c))
  const counts = Array.from(rows[1]?.children ?? [], (c) => cellText(c))
  const monthLabels = labels.slice(0, 12)

  return {
    year: Number(/Year\s+(\d{4})/.exec(cellText(doc.querySelector('.ecnta-title .titlewithicon')))?.[1]) || new Date().getFullYear(),
    description: cellText(doc.querySelector('.createLightBoxShadowDiv .mb-15')),
    heading: humanize(cellText(doc.querySelector('table.ecnta-event-details .titlewithicon'))),
    months: monthLabels.map((label, i) => ({ label, count: counts[i] ?? '' })),
    total: counts[12] ?? '',
    canValidate: !!doc.querySelector('a.butAction[href*="action=validate"]'),
  }
}
