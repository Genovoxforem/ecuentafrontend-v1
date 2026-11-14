import { KnowledgeBaseScreen, type KnowledgeBaseScreenKind } from '../../features/tickets/components/KnowledgeBaseScreen'

export function KnowledgeBaseModule({ kind }: { kind: KnowledgeBaseScreenKind }) {
  return <KnowledgeBaseScreen kind={kind} />
}
