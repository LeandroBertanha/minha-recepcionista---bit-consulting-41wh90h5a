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
 * Generic over the record type: pass your collection's interface as
 * `useRealtime<MyRecord>(...)` to get a typed subscription payload
 * instead of `unknown`.
 *
 * `scopeKey` (4th arg) narrows realtime events to the authenticated
 * user's records: updates for records outside the scope are ignored,
 * so one login never reacts to another user's WhatsApp instance.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
  scopeKey: string = '',
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    const releaseSubscription = () => {
      if (!unsubscribeFn) return
      unsubscribeFn().catch(() => {})
      unsubscribeFn = undefined
    }

    pb.collection<TRecord>(collectionName)
      .subscribe('*', (e) => {
        if (!scopeKey) {
          callbackRef.current(e)
          return
        }
        const record = e.record as
          | { id?: string; user_id?: string; organization_id?: string }
          | undefined
        const inScope =
          record?.user_id === scopeKey ||
          record?.organization_id === scopeKey ||
          record?.id === scopeKey
        if (inScope) {
          callbackRef.current(e)
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn().catch(() => {})
        } else {
          unsubscribeFn = fn
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
      window.setTimeout(releaseSubscription, REALTIME_CLEANUP_GRACE_MS)
    }
  }, [collectionName, enabled, scopeKey])
}

export default useRealtime
