import { useState } from 'react'
import { ShieldCheck, UsersRound } from 'lucide-react'
import { useUserPermissions, useToggleUserPermission } from '../../userPermissions.queries'
import { LegacyLoadingCard, LegacyErrorCard } from '../../../products/components/LegacyReportStates'

// Real per-module/per-right permission state from userprofile/api/
// permissions.php (see userPermissions.queries.ts's header comment for how
// this was found). Unchanged by this rebuild — already fully real.
export function PermissionsTab({
  userId,
  permModule,
  setPermModule,
  hasGroups,
}: {
  userId: string | undefined
  permModule: string | null
  setPermModule: (key: string) => void
  hasGroups: boolean
}) {
  const { data, isLoading, isError, error, refetch } = useUserPermissions(userId)
  const toggle = useToggleUserPermission(userId)
  const [selectAllPending, setSelectAllPending] = useState(false)

  if (isLoading) return <LegacyLoadingCard label="Loading permissions…" />
  if (isError || !data) return <LegacyErrorCard title="Couldn't load permissions" message={error instanceof Error ? error.message : 'Unknown error.'} onRetry={() => refetch()} />

  const activeModuleKey = permModule && data.modules.some((m) => m.id === permModule) ? permModule : (data.modules[0]?.id ?? null)
  const activeModule = data.modules.find((m) => m.id === activeModuleKey)
  const allGranted = activeModule ? activeModule.perms.every((r) => r.granted) : false

  // The "you must associate user with a group and one or more entities"
  // warning — the condition the reference page's own multicompany-module
  // banner is keyed on (userprofile/index.php?id=X#permissions shows it for
  // a user with 0 groups), reproduced here rather than a generic message.
  async function handleSelectAll() {
    if (!activeModule) return
    setSelectAllPending(true)
    try {
      const targets = activeModule.perms.filter((r) => r.granted === allGranted)
      for (const right of targets) {
        await toggle.mutateAsync({ rightId: right.id, grant: !allGranted })
      }
    } finally {
      setSelectAllPending(false)
    }
  }

  return (
    <div>
      {!hasGroups && (
        <div className="flex items-start gap-2 mb-3 rounded-md border border-warning-bg bg-warning-bg/40 px-3 py-2 text-xs text-warning-fg">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          You must associate this user with a group and one or more entities in order to define permissions.
        </div>
      )}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs text-text-faint">{data.nbRights} direct right(s) granted</p>
        {!data.canEdit && <p className="text-xs text-text-faint italic">Read-only — your account can't edit this user's permissions.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-0 border border-border rounded-lg overflow-hidden">
        <div className="border-b sm:border-b-0 sm:border-r border-border max-h-96 overflow-y-auto">
          {data.modules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPermModule(m.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm border-b border-border last:border-0 ${
                activeModuleKey === m.id ? 'bg-brand text-white' : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <span className="flex-1 truncate">{m.label}</span>
              <span className={`text-xs rounded px-1.5 ${activeModuleKey === m.id ? 'bg-white/20' : 'bg-surface text-text-faint'}`}>{m.perms.length}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col max-h-96">
          {activeModule ? (
            <>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface sticky top-0 z-10 shrink-0">
                <p className="flex items-center gap-2 font-semibold text-text!">
                  <UsersRound size={14} className="text-brand" /> {activeModule.label}
                </p>
                {data.canEdit && (
                  <label className="flex items-center gap-1.5 text-xs text-text-muted shrink-0">
                    <input
                      type="checkbox"
                      checked={allGranted}
                      disabled={selectAllPending || toggle.isPending}
                      onChange={handleSelectAll}
                      className="rounded border-input-border"
                    />
                    Select All
                  </label>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {activeModule.perms.map((right) => (
                    <label key={right.id} className={`flex items-center gap-2 py-1.5 text-sm ${right.granted ? 'text-text!' : 'text-text-muted'}`}>
                      <input
                        type="checkbox"
                        checked={right.granted}
                        disabled={!data.canEdit || toggle.isPending || selectAllPending}
                        onChange={(e) => toggle.mutate({ rightId: right.id, grant: e.target.checked })}
                        className="rounded border-input-border"
                      />
                      {right.label}
                      {right.inherited && !right.direct && <span className="text-xs text-text-faint italic">(via group)</span>}
                    </label>
                  ))}
                </div>
                {toggle.isError && <p className="text-sm text-danger mt-2">{toggle.error instanceof Error ? toggle.error.message : 'Failed to update permission.'}</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-faint italic p-4">No permission modules found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
