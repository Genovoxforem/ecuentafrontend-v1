import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLegacyDocument, looksLikeLegacyLoginPageText, NOT_SIGNED_IN_MESSAGE } from '../../shared/legacyHtmlFetch'
import { toastMessages } from './bindLines.queries'
import { cellText } from './legacyTable'

// The "Document Uploads" tab of accountancy/closure/financialvalidate.php?year=YYYY. Shapes from
// the dev backend's markup and the page's own PHP:
//   - while the year has no closing the tab only prints "Create Financial Year Ending to Upload
//     Documents"; once it has one it prints a count table ("Number of attached files/documents",
//     "Total size of attached files/documents"), an upload form (`#formuserfile`: hidden `token`,
//     `section_dir`, `section_id`, a multiple `userfile[]` and the submit `sendit`), the attached
//     files (`table#tablelines`, or a single "No documents uploaded" row) and the linked files;
//   - files are stored under the closing's year, chosen by the `year` parameter of the request. The
//     page's own form action leaves that parameter out (so it only reaches the current year's
//     closing); the upload here always carries the viewed year.

export interface ClosureDocument {
  name: string
  // Root-relative download link (document.php), null when the row has none.
  href: string | null
  size: string
  date: string
}

export interface ClosureLink {
  label: string
  href: string | null
  date: string
}

export interface FinancialClosureDocuments {
  // The year has a closing, so documents can be attached to it.
  enabled: boolean
  fileCount: string
  totalSize: string
  token: string
  files: ClosureDocument[]
  links: ClosureLink[]
}

const PATH = '/accountancy/closure/financialvalidate.php'

const relative = (href: string | null | undefined): string | null => {
  if (!href) return null
  if (!href.startsWith('http')) return href
  const url = new URL(href)
  return url.pathname + url.search
}

export function parseClosureDocuments(doc: Document): FinancialClosureDocuments {
  const pane = doc.querySelector('#profile')
  if (!pane) throw new Error('The document uploads on this backend page were not recognised.')

  const form = pane.querySelector('form#formuserfile')
  const counts = new Map<string, string>()
  pane.querySelectorAll('td.titlefield, .fichecenter tr').forEach((el) => {
    const row = el.closest('tr')
    if (row && row.children.length >= 2) counts.set(cellText(row.children[0]).toLowerCase(), cellText(row.children[1]))
  })

  const files: ClosureDocument[] = []
  pane.querySelectorAll('table#tablelines tr.oddeven').forEach((tr) => {
    const cells = Array.from(tr.children)
    const link = cells[0]?.querySelector('a')
    // The "No documents uploaded" row is a single spanning cell with no link.
    if (cells.length < 2 || !link) return
    files.push({ name: cellText(link), href: relative(link.getAttribute('href')), size: cellText(cells[1]), date: cellText(cells[2]) })
  })

  const links: ClosureLink[] = []
  pane.querySelectorAll('.table-list-of-links ~ form tbody tr.oddeven, .table-list-of-links ~ * tbody tr.oddeven').forEach((tr) => {
    const cells = Array.from(tr.children)
    const a = cells[0]?.querySelector('a')
    if (cells.length < 2 || !a) return
    links.push({ label: cellText(a), href: a.getAttribute('href'), date: cellText(cells[2] ?? cells[1]) })
  })

  return {
    enabled: !!form,
    fileCount: counts.get('number of attached files/documents') ?? String(files.length),
    totalSize: counts.get('total size of attached files/documents') ?? '',
    token: form?.querySelector<HTMLInputElement>('input[name="token"]')?.getAttribute('value') ?? '',
    files,
    links,
  }
}

const KEY = ['generalLedger', 'financialClosureDocuments'] as const

const fetchDocuments = async (year: number): Promise<FinancialClosureDocuments> => parseClosureDocuments(await fetchLegacyDocument(PATH, new URLSearchParams({ year: String(year) })))

export function useClosureDocuments(year: number, enabled: boolean) {
  return useQuery({ queryKey: [...KEY, year], queryFn: () => fetchDocuments(year), enabled, staleTime: 0 })
}

// The upload form: the page's own multipart POST (`sendit`), aimed at the viewed year.
export function useUploadClosureDocuments(year: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (files: File[]): Promise<string> => {
      const before = await fetchDocuments(year)
      if (!before.enabled) throw new Error('Create the year-end closing first: documents can only be attached to an existing closing.')
      const body = new FormData()
      body.set('token', before.token)
      body.set('section_dir', '')
      body.set('section_id', '0')
      body.set('sortfield', '')
      body.set('sortorder', '')
      body.set('max_file_size', '536870912')
      body.set('sendit', 'Upload')
      for (const file of files) body.append('userfile[]', file)
      const res = await fetch(`${PATH}?year=${year}&id=&uploadform=1`, { method: 'POST', credentials: 'same-origin', body })
      if (!res.ok) throw new Error(`Legacy backend returned ${res.status}.`)
      const html = await res.text()
      if (looksLikeLegacyLoginPageText(html)) throw new Error(NOT_SIGNED_IN_MESSAGE)
      const messages = toastMessages(html)
      const err = messages.find((m) => m.type === 'error')
      if (err) throw new Error(err.message)
      const after = await fetchDocuments(year)
      if (after.files.length <= before.files.length) throw new Error(messages.map((m) => m.message).join('\n') || 'The backend did not store the file.')
      return messages.map((m) => m.message).join('\n')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
