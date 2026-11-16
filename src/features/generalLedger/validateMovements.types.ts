// Types of the validateMovements page. The HTML parser that used to sit next to them was removed on 12 Nov 2026: the page reads its JSON endpoint now.

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
