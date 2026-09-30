import type { ComponentType } from 'react'
import { Trash2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useConfirm } from '../../../shared/components/ConfirmDialog'
import { PayrollRecordList, type PayrollListColumn } from '../../../shared/components/payroll/PayrollRecordList'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import { useDeletePayrollRecord } from '../payrollActions.queries'
import type { PayrollLegacyRow } from '../payrollLegacyTable'
import { PAYROLL_LIST_PAGES, usePayrollLegacyList, type PayrollListKey } from '../payrollLists.queries'

// "MM/DD/YYYY [hh:mm AM]" -> a string that sorts chronologically; numbers sort
// numerically; everything else sorts as lower-case text.
function sortValueOf(cell: string): string | number {
  const date = cell.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)$/)
  if (date) return `${date[3]}-${date[1]}-${date[2]}${date[4]}`
  const n = Number(cell.replace(/,/g, ''))
  if (cell !== '' && Number.isFinite(n)) return n
  return cell.toLowerCase()
}

// A Payroll list page: the real rows of the legacy page's own table (columns are
// the page's own headers), with the page's real delete action, and a link to the
// native create form. Records are created and deleted on the backend; nothing is
// kept in the browser.
export function PayrollLegacyList({
  listKey,
  icon,
  title,
  addLabel,
  addPath,
}: {
  listKey: PayrollListKey
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  addLabel?: string
  addPath?: string
}) {
  const { data, isLoading, isError, error, refetch } = usePayrollLegacyList(listKey)
  const deleteRecord = useDeletePayrollRecord(listKey)
  const confirm = useConfirm()
  const canDelete = !!PAYROLL_LIST_PAGES[listKey].deleteParam

  if (isLoading) return <LegacyLoadingCard label={`Loading ${title.toLowerCase()}…`} />
  if (isError || !data) {
    return <LegacyErrorCard title={`Couldn't load ${title.toLowerCase()}`} message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
  }

  async function handleDelete(row: PayrollLegacyRow) {
    if (!row.id) return
    if (!(await confirm({ title: 'Delete record?', message: 'Are you sure you want to delete this record?' }))) return
    deleteRecord.mutate(row.id)
  }

  const columns: PayrollListColumn<PayrollLegacyRow, string>[] = data.headers.map((header, i) => {
    if (i === data.actionIndex) {
      return {
        key: `c${i}`,
        label: header,
        render: (row) =>
          canDelete && row.id ? (
            <button
              type="button"
              onClick={() => handleDelete(row)}
              disabled={deleteRecord.isPending}
              className="flex items-center gap-1 text-xs text-danger hover:underline disabled:opacity-50"
            >
              <Trash2 size={12} /> Delete
            </button>
          ) : (
            ''
          ),
      }
    }
    return {
      key: `c${i}`,
      label: header,
      render: (row) => row.cells[i] || '—',
      sortValue: (row) => sortValueOf(row.cells[i]),
      exportValue: (row) => row.cells[i],
    }
  })

  return (
    <PayrollRecordList
      icon={icon}
      title={title}
      addLabel={addLabel}
      addPath={addPath}
      columns={columns}
      rows={data.rows}
      getRowKey={(row) => row.id ?? row.cells.join('|')}
      getSearchText={(row) => row.cells.join(' ')}
      exportTitle={title}
      notice={
        deleteRecord.isError ? (
          <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">
            <p role="alert">{deleteRecord.error instanceof Error ? deleteRecord.error.message : 'Delete failed.'}</p>
          </Card>
        ) : undefined
      }
    />
  )
}
