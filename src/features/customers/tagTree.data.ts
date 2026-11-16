import { fapiGet } from '../../api/fapiEnvelope'

// The generic tag tree of categories/fapi/list.php?type=… for the kinds that have their own screen: account (bank accounts, type 5), user (7), member (3) and project (6).
// Since 11 Nov 2026 the endpoint serves account, user and member next to customer / supplier / contact / product / project (the permission-less
// categories/tag-sidebarlist-ajax.php is no longer read). A tag is {id, label, description, color, parent_id, visible, ref_ext, entity, count, children}: it has NO
// creation date, so the "Created" column the classic list printed stays empty. newecuenta holds no account, user or member tag, so only the project, product and
// customer shapes have been seen.
export type TagKind = 'account' | 'user' | 'member'

interface Tag {
  id: number
  label: string
  color?: string
  children?: Tag[]
}

export interface TagRow {
  id: number
  label: string
  // "Parent >> Child", as the classic tree prints it
  fullLabel: string
  color: string
}

export function flattenTags(nodes: Tag[], path = ''): TagRow[] {
  return nodes.flatMap((n) => {
    const fullLabel = path ? `${path} >> ${n.label}` : n.label
    return [{ id: n.id, label: n.label, fullLabel, color: n.color || '' }, ...flattenTags(n.children ?? [], fullLabel)]
  })
}

export async function loadTagRows(kind: TagKind): Promise<TagRow[]> {
  const d = await fapiGet<{ tree: Tag[] }>('/categories/fapi/list.php', { type: kind })
  return flattenTags(d.tree ?? [])
}
