import { useQuery } from '@tanstack/react-query'
import { fetchQuotations, type QuotationRow as ApiQuotationRow } from '../../api/quotations'

export interface QuotationRow {
  id: number
  ref: string
  refCustomer: string
  projectRef: string
  thirdParty: string
  socid: number
  city: string
  zipCode: string
  date: string
  endDate: string
  amountExclTax: number
  author: string
  salesRep: string
  status: string
  isLate: boolean
  documentUrl: string | null
}

export interface QuotationsSummary {
  totalProposals: number
  proposalsThisMonth: number
  totalProposalAmount: number
  validatedCount: number
  draftCount: number
  quotations: QuotationRow[]
}

function formatDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && numeric > 1000000000 ? new Date(numeric * 1000) : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US')
}

function toRow(row: ApiQuotationRow): QuotationRow {
  return {
    id: row.id,
    ref: row.ref,
    refCustomer: row.ref_client ?? '',
    projectRef: row.project_ref ?? '',
    thirdParty: row.third_party_name ?? '',
    socid: row.fk_soc,
    city: row.third_party_town ?? '',
    zipCode: '',
    date: formatDate(row.date_propal),
    endDate: formatDate(row.fin_validite),
    amountExclTax: row.total_ht,
    author: [row.author_firstname, row.author_lastname].filter(Boolean).join(' ') || row.author_login,
    salesRep: '',
    status: row.status_label,
    isLate: false,
    documentUrl: null,
  }
}

async function fetchAllQuotations(): Promise<ApiQuotationRow[]> {
  const firstPage = await fetchQuotations({ page: 1, limit: 100 })
  const rows = [...firstPage.items]
  for (let page = 2; page <= firstPage.pagination.pages; page += 5) {
    const results = await Promise.all(
      Array.from({ length: Math.min(5, firstPage.pagination.pages - page + 1) }, (_, index) =>
        fetchQuotations({ page: page + index, limit: 100 }),
      ),
    )
    rows.push(...results.flatMap((result) => result.items))
  }
  return rows
}

export function useQuotationsSummary() {
  return useQuery({
    queryKey: ['quotations', 'list'],
    queryFn: async (): Promise<QuotationsSummary> => {
      const apiRows = await fetchAllQuotations()
      const rows = apiRows.map(toRow)
      const now = new Date()
      const proposalsThisMonth = apiRows.filter((row) => {
        const raw = row.date_propal
        const numeric = Number(raw)
        const date = Number.isFinite(numeric) && numeric > 1000000000 ? new Date(numeric * 1000) : new Date(raw ?? '')
        return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
      }).length
      return {
        totalProposals: apiRows.length,
        proposalsThisMonth,
        totalProposalAmount: apiRows.reduce((sum, row) => sum + row.total_ht, 0),
        validatedCount: apiRows.filter((row) => row.fk_statut === 1).length,
        draftCount: apiRows.filter((row) => row.fk_statut === 0).length,
        quotations: rows,
      }
    },
    staleTime: 1000 * 30,
  })
}
