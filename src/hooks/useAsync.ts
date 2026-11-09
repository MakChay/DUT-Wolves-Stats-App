import { useCallback, useEffect, useState, type DependencyList } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  version: string | null
}

export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null, version: null })
  const [reloadKey, setReloadKey] = useState(0)
  const version = `${JSON.stringify(deps)}#${reloadKey}`

  useEffect(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true, error: null, version }))
    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null, version })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Something went wrong.'
        setState({ data: null, loading: false, error: message, version })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return {
    data: state.data,
    error: state.error,
    loading: state.loading || state.version !== version,
    reload,
  }
}
