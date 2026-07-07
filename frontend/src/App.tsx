import { Ambient } from './components/Ambient'
import { TodayView } from './features/dashboard/TodayView'
import { useSyncTimezone } from './features/settings/useSyncTimezone'

export default function App() {
  useSyncTimezone()
  return (
    <>
      <Ambient />
      <TodayView />
    </>
  )
}
