import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { track } from '../analytics'

const DiagnosticDialog = lazy(() => import('./DiagnosticDialog'))

export type OpenOptions = { origin: string; planId?: string }

type DiagnosticContextValue = { open: (options: OpenOptions) => void }

const DiagnosticContext = createContext<DiagnosticContextValue | null>(null)

export function DiagnosticProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; origin: string; planId?: string }>({
    open: false,
    origin: '',
  })
  const [mounted, setMounted] = useState(false)

  const open = useCallback((options: OpenOptions) => {
    track('diagnostic_start', { origin: options.origin, plan_id: options.planId ?? null })
    setMounted(true)
    setState({ open: true, origin: options.origin, planId: options.planId })
  }, [])

  const value = useMemo(() => ({ open }), [open])

  return (
    <DiagnosticContext.Provider value={value}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <DiagnosticDialog
            open={state.open}
            origin={state.origin}
            planId={state.planId}
            onOpenChange={(next) => setState((s) => ({ ...s, open: next }))}
          />
        </Suspense>
      )}
    </DiagnosticContext.Provider>
  )
}

export function useDiagnostic(): DiagnosticContextValue {
  const ctx = useContext(DiagnosticContext)
  if (!ctx) throw new Error('useDiagnostic precisa estar dentro de DiagnosticProvider')
  return ctx
}
