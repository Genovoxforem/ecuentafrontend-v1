import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'blue-metal'

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem('theme')
  return savedTheme === 'dark' || savedTheme === 'blue-metal' ? savedTheme : 'light'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // Layout effect + transitions off for the switch: the html class/attribute must change before the
  // browser paints, otherwise one frame shows new-theme components on old-theme tokens, and every
  // transition-colors element then animates between the two (visible as flicker in the sidebar).
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('theme-switching')
    root.classList.toggle('dark', theme !== 'light')
    root.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    const t = window.setTimeout(() => root.classList.remove('theme-switching'), 80)
    return () => window.clearTimeout(t)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
