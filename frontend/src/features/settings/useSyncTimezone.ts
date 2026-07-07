// On load, tell the backend the browser's timezone so "today" (and streaks) are
// computed against the user's local midnight. Runs once, best-effort.

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { getBrowserTimezone } from '../../lib/date'
import { habitKeys } from '../habits/queries'

export function useSyncTimezone() {
  const qc = useQueryClient()
  useEffect(() => {
    const tz = getBrowserTimezone()
    let cancelled = false
    api
      .getSettings()
      .then((s) => {
        if (cancelled || s.timezone === tz) return
        return api.updateSettings({ timezone: tz }).then(() => {
          // streaks may shift once the correct tz is known
          qc.invalidateQueries({ queryKey: habitKeys.all })
        })
      })
      .catch(() => {
        /* non-critical */
      })
    return () => {
      cancelled = true
    }
  }, [qc])
}
