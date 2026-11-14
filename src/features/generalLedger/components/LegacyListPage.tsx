import { useMemo, type ComponentProps } from 'react'
import { classicListLoader } from '../legacyList.queries'
import { JsonListPage } from './JsonListPage'
import type { LegacyTable } from '../legacyTable'

type ListProps = ComponentProps<typeof JsonListPage>

// A real classic list page, rendered natively (legacyTable.ts): the page is read with its own `limit` / `page` / `search_*` GET params. A list that has
// a JSON endpoint uses JsonListPage with its own loader instead (`load` here is the older way to say the same and is still accepted).
export function LegacyListPage({
  path,
  firstHeader,
  hasHeader,
  load,
  ...rest
}: Omit<ListProps, 'queryKey' | 'load'> & {
  path: string
  firstHeader: RegExp
  // pins the table when firstHeader is empty (a leading selection-checkbox column)
  hasHeader?: RegExp
  load?: (params: Record<string, string>) => Promise<LegacyTable>
}) {
  const classic = useMemo(() => load ?? classicListLoader(path, firstHeader, hasHeader), [load, path, firstHeader, hasHeader])
  return <JsonListPage {...rest} load={classic} queryKey={`${path}|${firstHeader.source}|${hasHeader?.source ?? ''}|${load ? 'fapi' : 'page'}`} />
}
