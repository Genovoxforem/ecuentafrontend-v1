import { useState } from 'react'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { Field, inputClasses } from '../../../shared/components/forms/FormField'
import { LegacyLoadingCard, LegacyErrorCard } from '../../products/components/LegacyReportStates'
import { useBuildCards, useCardFormOptions, type BuildCardsInput, type CardFormat } from '../memberCards.data'

function FormatSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: CardFormat[] }) {
  return (
    <select className={inputClasses} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// adherents/cartes/carte.php — "Generate visit cards": business cards for all members, for one member (by login), and address sheets.
export function MemberCardsPage() {
  const { data, isLoading, isError, error, refetch } = useCardFormOptions()
  const build = useBuildCards()
  const [allFormat, setAllFormat] = useState('')
  const [oneFormat, setOneFormat] = useState('')
  const [login, setLogin] = useState('')
  const [labelFormat, setLabelFormat] = useState<string | null>(null)
  const [running, setRunning] = useState<BuildCardsInput['mode'] | null>(null)

  const run = (input: BuildCardsInput) => {
    setRunning(input.mode)
    build.mutate(input, { onSettled: () => setRunning(null) })
  }

  if (isLoading) return <LegacyLoadingCard label="Loading the card formats…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load the card formats" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const buildButton = (mode: BuildCardsInput['mode'], onClick: () => void) => (
    <button type="button" onClick={onClick} disabled={build.isPending} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
      {build.isPending && running === mode ? 'Building…' : 'Build Doc'}
    </button>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">This screen allows you to generate PDF files with business cards for all your members or a particular member.</p>

      <Card className="!h-auto space-y-3">
        <h3 className="text-sm font-semibold text-text!">Generate business cards for all members</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Format of cards page">
              <FormatSelect value={allFormat} onChange={setAllFormat} options={data.cardFormats} />
            </Field>
          </div>
          {buildButton('card', () => run({ mode: 'card', format: allFormat }))}
        </div>
      </Card>

      <Card className="!h-auto space-y-3">
        <h3 className="text-sm font-semibold text-text!">Generate business cards for a particular member</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Format of cards page">
              <FormatSelect value={oneFormat} onChange={setOneFormat} options={data.cardFormats} />
            </Field>
          </div>
          <div className="min-w-64 flex-1">
            <Field label="Login">
              <input className={inputClasses} value={login} onChange={(e) => setLogin(e.target.value)} />
            </Field>
          </div>
          {buildButton('cardlogin', () => run({ mode: 'cardlogin', format: oneFormat, login }))}
        </div>
      </Card>

      <Card className="!h-auto space-y-3">
        <h3 className="text-sm font-semibold text-text!">Generate address sheets</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Field label="Format of cards page">
              <FormatSelect value={labelFormat ?? data.labelDefault} onChange={setLabelFormat} options={data.labelFormats} />
            </Field>
          </div>
          {buildButton('label', () => run({ mode: 'label', format: labelFormat ?? data.labelDefault }))}
        </div>
      </Card>

      {build.isError && <p className="text-sm text-danger whitespace-pre-line">{build.error instanceof Error ? build.error.message : 'The document was not built.'}</p>}
    </div>
  )
}
