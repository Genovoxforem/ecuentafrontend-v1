// Shared imperative handle every posAdmin tab exposes to the shell's one
// sticky Save button (matches the real page's own single bottom-right Save
// per tab — see TerminalSetupPage.tsx's own top comment).
export interface TabHandle {
  save: () => Promise<void>
  isSaving: boolean
}
