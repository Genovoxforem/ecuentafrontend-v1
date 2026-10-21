import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { fetchLegacyText } from '../../../shared/legacyHtmlFetch'
import { LegacyErrorCard, LegacyLoadingCard } from '../../products/components/LegacyReportStates'
import {
  parseLegacyBankingPage,
  type LegacyBankingPageField,
  type LegacyBankingPageForm,
} from '../legacyBankingPageParser'
import type { BankingPlaceholder } from '../bankingPlaceholders'

const BASE_FIELD_CLASS = 'block w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-text'

function resolveFormAction(action: string, baseUrl: string): URL {
  const target = new URL(action, new URL(baseUrl, window.location.origin))
  if (target.origin !== window.location.origin) {
    throw new Error('This legacy form points outside the current backend origin and cannot be submitted safely.')
  }
  return target
}

function RenderField({ field }: { field: LegacyBankingPageField }) {
  if (field.type === 'hidden') {
    return <input key={`${field.name}-hidden`} type="hidden" name={field.name} value={field.value} />
  }

  if (field.type === 'submit' || field.type === 'button' || field.type === 'reset' || field.type === 'image') return null

  if (field.type === 'select') {
    return (
      <label key={field.name} className="space-y-1 text-sm text-text">
        <span className="block font-medium">{field.label}</span>
        <select
          name={field.name}
          defaultValue={field.multiple ? [] : field.value}
          multiple={field.multiple}
          required={field.required}
          className={BASE_FIELD_CLASS}
        >
          {field.options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label key={field.name} className="space-y-1 text-sm text-text">
        <span className="block font-medium">{field.label}</span>
        <textarea name={field.name} defaultValue={field.value} required={field.required} className={BASE_FIELD_CLASS} rows={3} />
      </label>
    )
  }

  if (field.type === 'checkbox' || field.type === 'radio') {
    return (
      <label key={`${field.name}-${field.value}`} className="flex items-center gap-2 text-sm text-text">
        <input
          type={field.type}
          name={field.name}
          value={field.value}
          defaultChecked={field.checked}
          required={field.required}
        />
        <span>{field.label}</span>
      </label>
    )
  }

  return (
    <label key={`${field.name}-${field.type}`} className="space-y-1 text-sm text-text">
      <span className="block font-medium">{field.label}</span>
      <input
        type={field.type as InputHTMLAttributes<HTMLInputElement>['type']}
        name={field.name}
        defaultValue={field.type === 'file' ? undefined : field.value}
        required={field.required}
        className={BASE_FIELD_CLASS}
      />
    </label>
  )
}

function LegacyForm({
  form,
  submitting,
  onSubmit,
}: {
  form: LegacyBankingPageForm
  submitting: boolean
  onSubmit: (form: LegacyBankingPageForm, data: FormData) => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      if (submitter.name && !formData.has(submitter.name)) formData.append(submitter.name, submitter.value)
    }
    onSubmit(form, formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {form.fields.map((field, index) => <RenderField key={`${field.name}-${index}`} field={field} />)}
      </div>
      {form.submitButtons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {form.submitButtons.map((button, index) => (
            <button
              key={`${button.name ?? button.label}-${index}`}
              type={button.type}
              name={button.name}
              value={button.value}
              disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {button.label}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}

export function LegacyBankingPage({ entry }: { entry: BankingPlaceholder }) {
  const [requestUrl, setRequestUrl] = useState(entry.legacyPath)
  const [submittedHtml, setSubmittedHtml] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setRequestUrl(entry.legacyPath)
    setSubmittedHtml(null)
    setFormError(null)
  }, [entry.legacyPath])

  const pageQuery = useQuery({
    queryKey: ['banking', 'legacy-page', requestUrl],
    queryFn: () => fetchLegacyText(requestUrl),
    staleTime: 30_000,
  })

  const html = submittedHtml ?? pageQuery.data
  const page = useMemo(
    () => html ? parseLegacyBankingPage(html, requestUrl) : null,
    [html, requestUrl],
  )

  async function handleFormSubmit(form: LegacyBankingPageForm, data: FormData) {
    setFormError(null)
    let target: URL
    try {
      target = resolveFormAction(form.action, requestUrl)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'The form action is invalid.')
      return
    }

    if (form.method === 'get') {
      const params = new URLSearchParams()
      data.forEach((value, name) => {
        if (typeof value === 'string') params.append(name, value)
      })
      target.search = params.toString()
      setSubmittedHtml(null)
      setRequestUrl(`${target.pathname}${target.search}`)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(target.toString(), {
        method: 'POST',
        credentials: 'same-origin',
        body: data,
      })
      if (!response.ok) throw new Error(`Legacy backend returned ${response.status}.`)
      const result = await response.text()
      if (result.includes('name="password"') && result.includes('actionlogin')) {
        throw new Error('The legacy session expired. Sign out and back in, then try again.')
      }
      setSubmittedHtml(result)
      setRequestUrl(`${target.pathname}${target.search}`)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not submit the legacy form.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const PageIcon = entry.icon

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <PageIcon size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text">{page?.title || entry.title}</h1>
          <p className="text-xs text-text-faint">Live page content from the authenticated legacy backend</p>
        </div>
      </div>

      {pageQuery.isPending && !submittedHtml && <LegacyLoadingCard label="Loading page…" />}
      {pageQuery.isError && !submittedHtml && (
        <LegacyErrorCard
          title="Could not load this page"
          message={pageQuery.error instanceof Error ? pageQuery.error.message : 'Unknown error.'}
          onRetry={() => void pageQuery.refetch()}
        />
      )}
      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg p-3 text-sm text-danger-fg">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {page && (
        <>
          {page.messages.map((message, index) => (
            <Card key={`${message}-${index}`} className="text-sm text-text-muted">{message}</Card>
          ))}
          {page.forms.map((form, index) => (
            <Card key={`${form.action}-${index}`}>
              <LegacyForm form={form} submitting={isSubmitting} onSubmit={handleFormSubmit} />
            </Card>
          ))}
          {isSubmitting && (
            <p className="flex items-center gap-2 text-sm text-text-muted" role="status">
              <LoaderCircle size={16} className="animate-spin" /> Submitting…
            </p>
          )}
          {page.tables.map((table, tableIndex) => (
            <Card key={`${table.caption}-${tableIndex}`} className="!p-0 overflow-hidden">
              {table.caption && <h2 className="border-b border-border px-4 py-3 font-semibold text-text">{table.caption}</h2>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {table.headers.length > 0 && (
                    <thead className="bg-surface-alt">
                      <tr>
                        {table.headers.map((header, index) => (
                          <th key={`${header}-${index}`} className="whitespace-nowrap border-b border-border px-3 py-2 text-left font-medium text-text-muted">{header}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {table.rows.length === 0 ? (
                      <tr><td colSpan={Math.max(table.headers.length, 1)} className="px-4 py-6 text-center text-text-faint">No records found.</td></tr>
                    ) : table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border last:border-0">
                        {row.map((cell, cellIndex) => (
                          <td key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 text-text">
                            {cell.href ? <a href={cell.href} className="text-brand hover:underline">{cell.text}</a> : cell.text || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
          {page.forms.length === 0 && page.tables.length === 0 && page.messages.length === 0 && (
            <Card className="text-sm text-text-muted">
              The legacy page loaded, but it did not contain a form or table that can be rendered here.
            </Card>
          )}
          <button
            type="button"
            onClick={() => {
              setSubmittedHtml(null)
              void pageQuery.refetch()
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </>
      )}
    </div>
  )
}
