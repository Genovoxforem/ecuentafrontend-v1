import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { useProjectCategoryCreateForm, useCreateProjectCategory } from '../projectCategories.queries'
import { ROUTES } from '../../../routes'

const inputCls = 'h-9 px-3 rounded-md border border-input-border bg-input-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 w-full'

export function ProjectCategoryCreateForm() {
  const navigate = useNavigate()
  const { data: form, isLoading, isError, error } = useProjectCategoryCreateForm()
  const createCategory = useCreateProjectCategory()

  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [parent, setParent] = useState('-1')
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSubmit() {
    setFormError('')
    if (!label.trim()) return setFormError('Ref. is required!')
    createCategory.mutate(
      { label: label.trim(), description, color, parent },
      {
        onSuccess: () => {
          setSaved(true)
          setLabel('')
          setDescription('')
          setColor('')
        },
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to create category.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
        <Tag size={20} className="text-brand" /> Create tag/category
      </h2>

      {isError && (
        <Card className="!h-auto !bg-danger-bg border-danger/40 text-danger-fg text-sm font-medium">{error instanceof Error ? error.message : 'Failed to load this form.'}</Card>
      )}
      {saved && <Card className="!h-auto !bg-success-bg border-success/40 text-success-fg text-sm font-medium">Category created.</Card>}

      <Card className="!h-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Ref.*</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Color</label>
            <input type="color" value={color || '#000000'} onChange={(e) => setColor(e.target.value)} className="h-9 w-full rounded-md border border-input-border bg-input-bg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-faint mb-1">Add in</label>
            <select value={parent} onChange={(e) => setParent(e.target.value)} className={inputCls + ' appearance-none'} disabled={isLoading}>
              <option value="-1">—</option>
              {form?.parentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formError && <p className="text-sm font-medium text-danger mb-3">{formError}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(ROUTES.projectList)} className="rounded-lg border border-input-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createCategory.isPending || isLoading}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createCategory.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </Card>
    </div>
  )
}
