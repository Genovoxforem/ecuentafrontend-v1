import { BookOpen, Info, Tags, FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/dashboard/DashboardKit'
import { ROUTES } from '../../../routes'

export type KnowledgeBaseScreenKind = 'articles' | 'new' | 'categories'

const SCREENS: Record<KnowledgeBaseScreenKind, { title: string; icon: typeof BookOpen; classic: string; shows: string }> = {
  articles: {
    title: 'Articles',
    icon: BookOpen,
    classic: 'knowledgemanagement/knowledgerecord_list.php',
    shows: 'The classic list has the columns Ref., Question, Language, Modification Date and Status.',
  },
  new: {
    title: 'New article',
    icon: FilePlus2,
    classic: 'knowledgemanagement/knowledgerecord_card.php?action=create',
    shows: 'The classic form asks for the Question, the Language, "Suggested on ticket creation" and the Solution.',
  },
  categories: {
    title: 'Tags/Categories',
    icon: Tags,
    classic: 'categories/index.php?type=13',
    shows: 'The classic page is the tree of the knowledge base tags/categories, with the counters Tags/categories, Parent tag/category, Linked items and Created this month.',
  },
}

// The three Knowledge Base screens of the classic Ticket menu (New Article, List Of Articles, Tags/Categories). The backend has no API for them
// (read on newecuenta, 10 Nov 2026: knowledgemanagement/fapi/list.php answers 404, and categories/fapi/list.php refuses the knowledge base type with
// 422 because it serves customer, supplier, contact, product and project tags only), so they say so instead of showing an empty table or a form that
// cannot save. The menu lists them like the classic one (master report AN-198).
export function KnowledgeBaseScreen({ kind }: { kind: KnowledgeBaseScreenKind }) {
  const s = SCREENS[kind]
  const Icon = s.icon
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-text-faint">Ticket &rsaquo; Knowledge Base</p>
        <h2 className="flex items-center gap-2 text-xl font-bold text-text!">
          <Icon size={20} className="text-brand" /> {s.title}
        </h2>
      </div>
      <Card className="!h-auto">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-info-fg" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-text!">Not available here yet</p>
            <p className="text-text-muted">
              The Knowledge Base has no JSON API to read or save its data. The classic screen is <code className="rounded bg-surface-hover px-1">{s.classic}</code>. {s.shows}
            </p>
            <p className="pt-1">
              <Link to={ROUTES.ticketList} className="text-brand hover:underline">
                Back to the tickets
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
