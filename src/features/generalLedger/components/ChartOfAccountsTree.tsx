import { useMemo, useState } from 'react'
import { ListTree, ChevronRight, ChevronDown, Pencil, Trash2, Plus, Check, X as XIcon, Loader2, Info, AlertTriangle } from 'lucide-react'
import { Card, fmtZMW } from '../../../shared/components/dashboard/DashboardKit'
import {
  useChartOfAccountsTree,
  useCreateAccount,
  useUpdateAccountLabel,
  useDeleteAccount,
  type CoaNode,
} from '../generalLedgerSetup.queries'

function splitText(text: string): { accountNumber: string; label: string } {
  const idx = text.indexOf('-')
  if (idx === -1) return { accountNumber: '', label: text }
  return { accountNumber: text.slice(0, idx), label: text.slice(idx + 1) }
}

function NewAccountRow({
  parent,
  onCancel,
}: {
  parent: CoaNode | null // null = new root account
  onCancel: () => void
}) {
  const [label, setLabel] = useState('')
  const [labelshort, setLabelshort] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const createAccount = useCreateAccount()
  const [error, setError] = useState('')

  function handleSave() {
    if (!label.trim()) return setError('Label is required.')
    setError('')
    createAccount.mutate(
      {
        label: label.trim(),
        labelshort: labelshort.trim(),
        accountParentId: parent?.id ?? 0,
        accountParentText: parent?.text ?? '',
        accountNumber,
      },
      { onSuccess: onCancel, onError: (e) => setError(e instanceof Error ? e.message : 'Create failed.') },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5 pl-2 bg-brand/5 rounded-md">
      <input
        autoFocus
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="Account # (auto if blank)"
        className="w-40 text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label *"
        className="w-56 text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1"
      />
      <input
        value={labelshort}
        onChange={(e) => setLabelshort(e.target.value)}
        placeholder="Short label"
        className="w-40 text-xs rounded-md border border-input-border bg-input-bg text-text px-2 py-1"
      />
      <button type="button" onClick={handleSave} disabled={createAccount.isPending} className="p-1.5 rounded-md bg-success-bg text-success-fg hover:brightness-95">
        {createAccount.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button type="button" onClick={onCancel} className="p-1.5 rounded-md bg-neutral-bg text-neutral-fg hover:brightness-95">
        <XIcon size={13} />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

function TreeNode({ node, depth }: { node: CoaNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [editing, setEditing] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const [draft, setDraft] = useState(node.text)
  const [error, setError] = useState('')
  const updateLabel = useUpdateAccountLabel()
  const deleteAccount = useDeleteAccount()
  const { accountNumber, label } = splitText(node.text)
  const hasChildren = !!node.items?.length

  function handleSave() {
    updateLabel.mutate(
      { id: node.id, text: draft },
      { onSuccess: () => setEditing(false), onError: (e) => setError(e instanceof Error ? e.message : 'Update failed.') },
    )
  }

  function handleDelete() {
    if (!window.confirm(`Delete account ${accountNumber}-${label}?`)) return
    deleteAccount.mutate(node.id, { onError: (e) => setError(e instanceof Error ? e.message : 'Delete failed.') })
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 py-1 rounded-md hover:bg-surface-hover group" style={{ paddingLeft: depth * 20 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`shrink-0 w-5 h-5 grid place-items-center text-text-faint ${hasChildren ? '' : 'invisible'}`}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {editing ? (
          <>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 text-sm rounded-md border border-input-border bg-input-bg text-text px-2 py-1"
            />
            <button type="button" onClick={handleSave} disabled={updateLabel.isPending} className="p-1 rounded text-success-fg hover:bg-success-bg">
              {updateLabel.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="p-1 rounded text-text-faint hover:bg-neutral-bg">
              <XIcon size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-text! font-mono">{accountNumber}</span>
            <span className="text-sm text-text-muted flex-1 truncate">{label}</span>
            <span className="text-xs tabular-nums text-text-faint mr-2">{node.formatted_amount}</span>
            <div className="hidden group-hover:flex items-center gap-1">
              <button type="button" title="Add child account" onClick={() => setAddingChild((v) => !v)} className="p-1 rounded text-brand hover:bg-brand/10">
                <Plus size={13} />
              </button>
              <button type="button" title="Rename" onClick={() => setEditing(true)} className="p-1 rounded text-text-faint hover:bg-surface-hover">
                <Pencil size={13} />
              </button>
              <button type="button" title="Delete" onClick={handleDelete} disabled={deleteAccount.isPending} className="p-1 rounded text-danger hover:bg-danger-bg">
                {deleteAccount.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger" style={{ paddingLeft: depth * 20 + 24 }}>
          {error}
        </p>
      )}
      {addingChild && (
        <div style={{ paddingLeft: (depth + 1) * 20 }}>
          <NewAccountRow parent={node} onCancel={() => setAddingChild(false)} />
        </div>
      )}
      {expanded && hasChildren && (
        <div>
          {node.items!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ChartOfAccountsTree() {
  const { data: tree, isLoading, isError, error, refetch } = useChartOfAccountsTree()
  const [addingRoot, setAddingRoot] = useState(false)

  const totalAmount = useMemo(() => (tree ?? []).reduce((sum, n) => sum + n.amount, 0), [tree])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-text!">
          <ListTree size={20} className="text-brand" /> Chart Of Accounts
        </h2>
        <button
          type="button"
          onClick={() => setAddingRoot(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-hover"
        >
          <Plus size={14} /> Add Account
        </button>
      </div>

      <Card className="!h-auto flex items-start gap-2 bg-info-bg/40">
        <Info size={15} className="text-info-fg mt-0.5 shrink-0" />
        <p className="text-xs text-info-fg">
          Backend page: <code className="font-mono">accountancy/admin/accountjstree.php</code>. This tree is real — read from{' '}
          <code className="font-mono">fetch.php</code> and saved through <code className="font-mono">updatecoa.php</code>, the same JSON endpoints the real
          page uses. Add/rename/delete here genuinely change the backend's chart of accounts.
        </p>
      </Card>

      {isError && (
        <Card className="!bg-danger-bg border-danger/40 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger-fg shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger-fg">Couldn't load the chart of accounts</p>
            <p className="text-xs text-danger-fg/80 mt-0.5">{error instanceof Error ? error.message : 'Unknown error.'}</p>
            <button type="button" onClick={() => refetch()} className="text-xs font-medium text-danger-fg underline mt-2">
              Retry
            </button>
          </div>
        </Card>
      )}

      {isLoading && (
        <Card className="items-center justify-center gap-2 py-10 text-center">
          <Loader2 size={20} className="animate-spin text-brand" />
          <p className="text-sm text-text-faint">Loading the real chart of accounts…</p>
        </Card>
      )}

      {tree && (
        <Card className="!h-auto">
          <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-border text-xs font-medium text-text-faint uppercase tracking-wide">
            <span>Account</span>
            <span>Balance</span>
          </div>
          {addingRoot && <NewAccountRow parent={null} onCancel={() => setAddingRoot(false)} />}
          {tree.length === 0 && !addingRoot ? (
            <p className="text-sm text-text-faint italic py-4">No accounts found.</p>
          ) : (
            tree.map((node) => <TreeNode key={node.id} node={node} depth={0} />)
          )}
          <div className="flex items-center justify-between px-1 pt-2 mt-1 border-t border-border text-sm font-semibold text-text!">
            <span>Total</span>
            <span className="tabular-nums">{fmtZMW(totalAmount)}</span>
          </div>
        </Card>
      )}
    </div>
  )
}
