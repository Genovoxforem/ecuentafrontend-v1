import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type SidebarStyle = 'legacy' | 'modern'

interface SidebarStyleContextValue {
  sidebarStyle: SidebarStyle
  setSidebarStyle: (style: SidebarStyle) => void
}

const SidebarStyleContext = createContext<SidebarStyleContextValue | null>(null)

export function SidebarStyleProvider({ children }: { children: ReactNode }) {
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyle>(() => (localStorage.getItem('sidebarStyle') as SidebarStyle) || 'legacy')

  useEffect(() => {
    localStorage.setItem('sidebarStyle', sidebarStyle)
  }, [sidebarStyle])

  return <SidebarStyleContext.Provider value={{ sidebarStyle, setSidebarStyle }}>{children}</SidebarStyleContext.Provider>
}

export function useSidebarStyle() {
  const ctx = useContext(SidebarStyleContext)
  if (!ctx) throw new Error('useSidebarStyle must be used within SidebarStyleProvider')
  return ctx
}
