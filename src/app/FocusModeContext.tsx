import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface FocusModeValue {
  focusMode: boolean
  setFocusMode: (value: boolean) => void
}

const FocusModeContext = createContext<FocusModeValue | null>(null)

/**
 * Hides the application sidebar and header for courtside work. This is a layout
 * mode, not a permission boundary.
 */
export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)
  const value = useMemo(() => ({ focusMode, setFocusMode }), [focusMode])
  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>
}

export function useFocusMode(): FocusModeValue {
  const value = useContext(FocusModeContext)
  if (!value) throw new Error('useFocusMode must be used inside FocusModeProvider')
  return value
}
