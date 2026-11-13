import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'

const REALTIME_CLEANUP_GRACE_MS = 250

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 *
 * `scopeKey` (4th argument) re-scopes the subscription per user/session:
 * when it changes the previous subscription is released (with a short
 * grace window so an obsolete clientId is never reused) and a new one
 * is opened for the current scope.
 *
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
  scopeKey?: string,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    const releaseSubscription = (fn: (() => Promise<void>) | undefined) => {
      if (!fn) return
      window.setTimeout(() => {
        fn().catch(() => {})
      }, REALTIME_CLEANUP_GRACE_MS)
    }

    pb.collection<TRecord>(collectionName)
      .subscribe('*', (e) => {
        callbackRef.current(e)
      })
      .then((fn) => {
        if (cancelled) {
          releaseSubscription(fn)
        } else {
          unsubscribeFn = fn
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      releaseSubscription(unsubscribeFn)
      unsubscribeFn = undefined
    }
  }, [collectionName, enabled, scopeKey])
}

export default useRealtime
