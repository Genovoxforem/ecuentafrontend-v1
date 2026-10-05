import { useState } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useDesignations, useSaveDesignation, useUpdateDesignation } from '../payrollAdminTabs.queries'

export function EmpDesignationTab() {
  const { data, isLoading, isError, error, refetch } = useDesignations()
  const saveDesignation = useSaveDesignation()
  const updateDesignation = useUpdateDesignation()

  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const pending = saveDesignation.isPending || updateDesignation.isPending

  function handleClear() {
    setName('')
    setEditingId(null)
    setFormError('')
  }

  function handleSubmit() {
    setFormError('')
    if (!name.trim()) return setFormError('Designation is required.')
    if (editingId) {
      updateDesignation.mutate(
        { id: editingId, name: name.trim() },
        { onSuccess: handleClear, onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not update.') },
      )
    } else {
      saveDesignation.mutate(name.trim(), { onSuccess: handleClear, onError: (e) => setFormError(e instanceof Error ? e.message : 'Could not save.') })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="!h-auto">
        <label className="block text-sm text-text mb-1.5">Designation:</label>
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClasses} flex-1 min-w-[200px]`} />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            {editingId ? 'Update' : 'Save'}
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-surface-hover">
            Clear
          </button>
        </div>
        {formError && <p className="text-sm text-danger mt-2">{formError}</p>}
      </Card>

      {isLoading ? (
        <LegacyLoadingCard label="Loading designations…" />
      ) : isError ? (
        <LegacyErrorCard title="Couldn't load designations" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />
      ) : (
        <Card className="!h-auto !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-faint uppercase tracking-wide border-b border-border bg-surface">
                <th className="font-medium px-4 py-2.5">Sl.No</th>
                <th className="font-medium px-4 py-2.5">Designation</th>
                <th className="font-medium px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-text-faint text-sm">
                    No designations yet.
                  </td>
                </tr>
              ) : (
                (data ?? []).map((row, i) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-text!">{i + 1}</td>
                    <td className="px-4 py-3 text-text-muted">{row.name}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title={`Edit ${row.name}`}
                        onClick={() => {
                          setEditingId(row.id)
                          setName(row.name)
                          setFormError('')
                        }}
                        className="text-text-faint hover:text-brand"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
