// frontend/src/pages/TechnicianDashboard.tsx
import { UpcomingAppointments } from '@/components/UpcomingAppointments'
import { UpcomingPafDeadlines } from '@/components/dashboard/UpcomingPafDeadlines'

export function TechnicianDashboard() {
  return (
    <div className="space-y-6">
      {/* Layout de Grid para melhor uso do espaço em telas grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingAppointments />
          <UpcomingPafDeadlines />
      </div>
    </div>
  )
}