import { useState } from 'react'

// A boolean toggle (e.g. "show the filter fields") remembered per browser, so someone who hides the
// filters to see more of a table keeps that choice the next time the page opens.
export function useRememberedToggle(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored === null ? initial : stored === '1'
    } catch {
      return initial
    }
  })
  const toggle = () =>
    setValue((prev) => {
      try {
        localStorage.setItem(key, prev ? '0' : '1')
      } catch {
        // storage unavailable — the choice just isn't remembered
      }
      return !prev
    })
  return [value, toggle] as const
}
