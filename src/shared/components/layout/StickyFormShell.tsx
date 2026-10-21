import { createContext, useContext, useState, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme, usesBlueLayout } from '../../../context/ThemeContext'

// The one correct way to build a create/edit page whose header stays pinned to the true top
// of AppShell's <main> and whose action bar stays pinned to the true bottom, with content
// scrolling between them — "true" meaning flush with main's own edges, not main's padding
// edge. Use this for every new create/edit page instead of rebuilding the pattern by hand;
// that's exactly how the header/footer padding and button layout drifted across the six pages
// this was extracted from.
//
// Two real bugs shaped this, both easy to reintroduce by hand:
//  1) position:sticky's top/bottom offset is always measured from the nearest scrolling
//     ancestor's own PADDING edge, never wherever an ancestor's negative margin visually
//     bleeds the content to. That's why this uses -top-6/-bottom-6 (not top-0/bottom-0) —
//     it shifts the stick point by exactly AppShell main's p-6 inset so it clamps flush
//     against main's true edge. A vertical negative margin on the sticky bars themselves
//     (rather than once on the outer -m-6 wrapper here) also shrinks their own contribution
//     to the column's flex stacking, making the next sibling start early and overlap them.
//  2) percentage min-height doesn't reliably resolve against main's content-box height
//     through the ancestor chain on a real (non-devtools) viewport — measured ~27px short,
//     leaving a gap under the footer whenever a step's content is shorter than the viewport.
//     flex-1 relies on AppShell main's own `flex flex-col` and flexbox's fill/overflow
//     algorithm instead, which doesn't have that problem.
export interface WizardStepDef {
  title: string
  subtitle: string
}

const WizardContext = createContext<number | null>(null)

// Wrap a form section in <WizardStep n={i}> to show it only on step i of a `wizard` shell. Outside a wizard it always renders.
export function WizardStep({ n, children }: { n: number; children: ReactNode }) {
  const active = useContext(WizardContext)
  if (active !== null && active !== n) return null
  return <>{children}</>
}

// Step indicator: numbered circles joined by a line, title and subtitle centred underneath. role=tablist keeps the page banner from hoisting it.
export function WizardStepper({ steps, step, onStep, canGoTo = () => true }: { steps: WizardStepDef[]; step: number; onStep: (i: number) => void; canGoTo?: (i: number) => boolean }) {
  return (
    <div role="tablist" className="flex items-center px-12 sm:px-16">
      {steps.map((w, i) => {
        const done = i < step
        const active = i === step
        return (
          <div key={w.title} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <button type="button" role="tab" aria-selected={active} onClick={() => canGoTo(i) && onStep(i)} title={w.subtitle} className="group flex flex-col items-center gap-1">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${done ? 'border-success bg-success text-white' : active ? 'border-brand bg-brand text-white shadow-sm shadow-brand/30' : 'border-border bg-surface text-text-faint group-hover:border-brand/40'}`}>
                {done ? <Check size={15} /> : i + 1}
              </span>
              <span className="hidden flex-col items-center sm:flex">
                <span className={`whitespace-nowrap text-xs ${active ? 'font-semibold text-text!' : 'text-text-faint'}`}>{w.title}</span>
                <span className="whitespace-nowrap text-[11px] text-text-faint">{w.subtitle}</span>
              </span>
            </button>
            {i < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${i < step ? 'bg-success' : 'bg-border'}`} />}
          </div>
        )
      })}
    </div>
  )
}

export function StickyFormShell({
  header,
  headerClassName = 'py-3',
  footerLeft,
  footerRight,
  footerBar,
  scrollsInternally = false,
  wizard: wizardProp,
  children,
}: {
  header: ReactNode
  // Vertical padding for the header bar — override when the header has more than one
  // stacked row (e.g. a title plus a step indicator) and needs tighter spacing.
  headerClassName?: string
  // Left side of the footer bar — conventionally the Cancel link, or a status message.
  footerLeft?: ReactNode
  // Right side of the footer bar — the secondary/primary action button(s), grouped together.
  // A page with neither side (a read-only or save-as-you-go page) gets no footer bar at all.
  footerRight?: ReactNode
  // A ready-made full-width bar (e.g. <ListPagination />) drawn as the last row, pinned to the page bottom like the footer.
  footerBar?: ReactNode
  // Leave false (the default) for any page whose content may be taller than the viewport —
  // every create/edit form. The wrapper's min-height then stays content-based: it still grows
  // to fill the viewport when content is short (no gap under the footer), but never shrinks
  // below taller content, so the footer's sticky containing block always covers the true
  // content height and the page scrolls as a whole via AppShell's own scrollport.
  //
  // Set true only for a page whose content is a card that scrolls inside itself (a list
  // panel with its own overflow-auto): min-h-0 lets the wrapper shrink to the scrollport so
  // that card's own scrolling engages. Anything taller than the viewport then spills past
  // the wrapper's undersized box and the footer (laid out right after that box, not after
  // the spillover) ends up stuck mid-content — which is why this used to be the default
  // and showed up as a footer floating over half-hidden sections on the longer forms.
  scrollsInternally?: boolean
  // Splits the form into steps: shows a step indicator in the header, Back/Next in the footer, and the page's own footerRight (the submit action) only on the last step.
  wizard?: WizardStepDef[]
  children: ReactNode
}) {
  const [step, setStep] = useState(0)
  // A single step is just a form: only show a wizard when there are at least two pages to move between.
  const wizard = wizardProp && wizardProp.length > 1 ? wizardProp : undefined
  const { theme } = useTheme()
  const compact = usesBlueLayout(theme)
  const hasFooter = footerLeft != null || footerRight != null || wizard != null
  const isLast = !wizard || step >= wizard.length - 1
  const stepper = wizard && <WizardStepper steps={wizard} step={step} onStep={setStep} />
  const navBtn = 'flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover'
  const footerRightNode = !wizard ? footerRight : (
    <>
      {step > 0 && (
        <button type="button" onClick={() => setStep((n) => n - 1)} className={navBtn}>
          <ChevronLeft size={14} /> Back
        </button>
      )}
      {isLast ? footerRight : (
        <button type="button" onClick={() => setStep((n) => n + 1)} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover">
          Next: {wizard[step + 1].title} <ChevronRight size={14} />
        </button>
      )}
    </>
  )
  return (
    <WizardContext.Provider value={wizard ? step : null}>
    <div className={`blue-density-form -m-6 flex-1 flex flex-col ${scrollsInternally ? 'min-h-0' : ''}`}>
      <div className={`blue-density-header sticky -top-6 z-10 border-b border-border bg-white px-[16px] dark:bg-gray-950 ${compact ? 'py-2' : headerClassName}`}>{header}{stepper}</div>
      {/* flex flex-col (not just flex-1): lets a single-card page opt its Card into flex-1
          too, so the card's own box stretches down to meet the footer instead of leaving a
          bare gap below a short field grid — same fill-or-overflow reasoning as this wrapper
          itself. min-h-0 (scrollsInternally only) lets it shrink below its content's
          intrinsic size when a child card handles its own internal scrolling (needed for that
          child's overflow-auto to engage at all, per the usual nested-flexbox-scroll gotcha). */}
      <div className={`blue-density-form-content flex-1 flex flex-col ${scrollsInternally ? 'min-h-0' : ''} ${compact ? 'space-y-3 px-[16px] py-3' : 'space-y-4 px-[16px] py-4'}`}>{children}</div>
      {footerBar}
      {hasFooter && (
        <div className={`blue-density-footer sticky -bottom-6 z-10 flex items-center justify-between border-t border-border bg-white px-0 pb-0 pt-[3px] dark:bg-gray-950 ${compact ? 'gap-2' : 'gap-3'}`}>
          <div className={`flex min-w-0 items-center ${compact ? 'gap-2' : 'gap-3'}`}>{footerLeft}</div>
          <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>{footerRightNode}</div>
        </div>
      )}
    </div>
    </WizardContext.Provider>
  )
}
