import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { roleAreas } from '@/app/navigation'
import { AppShell } from '@/app/AppShell'
import { PublicLayout } from '@/app/PublicLayout'
import { RequireRole } from '@/app/RequireRole'
import { Button } from '@/components/ui/button'
import { LoginPage } from '@/features/auth/LoginPage'
import { ManagerDashboardPage } from '@/features/manager/ManagerDashboardPage'
import { ManagerMatchesPage } from '@/features/manager/ManagerMatchesPage'
import { ManagerPlayersPage } from '@/features/manager/ManagerPlayersPage'
import { ManagerRostersPage } from '@/features/manager/ManagerRostersPage'
import { ManagerCompetitionsPage } from '@/features/manager/ManagerCompetitionsPage'
import { ManagerStatsPage } from '@/features/manager/ManagerStatsPage'
import { ManagerReportsPage } from '@/features/manager/ManagerReportsPage'
import { ManagerSettingsPage } from '@/features/manager/ManagerSettingsPage'
import { ManagerLiveRedirectPage } from '@/features/manager/ManagerLiveRedirectPage'
import { ManagerChangeRequestsPage } from '@/features/manager/ManagerChangeRequestsPage'
import { CoachChangeRequestsPage } from '@/features/coach/CoachChangeRequestsPage'
import { LiveMatchPage } from '@/features/matches/LiveMatchPage'
import { CoachDashboardPage } from '@/features/coach/CoachDashboardPage'
import { CoachMatchesPage } from '@/features/coach/CoachMatchesPage'
import { CoachStatsPage } from '@/features/coach/CoachStatsPage'
import { CoachPlayersPage } from '@/features/coach/CoachPlayersPage'
import { CoachAnalyticsPage } from '@/features/coach/CoachAnalyticsPage'
import { CoachReportsPage } from '@/features/coach/CoachReportsPage'
import { PlayerDashboardPage } from '@/features/player/PlayerDashboardPage'
import { PlayerStatsPage } from '@/features/player/PlayerStatsPage'
import { PlayerHistoryPage } from '@/features/player/PlayerHistoryPage'
import { PlayerTeamPage } from '@/features/player/PlayerTeamPage'
import { PlayerProfilePage } from '@/features/player/PlayerProfilePage'
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage'
import { AdminTeamsPage } from '@/features/admin/AdminTeamsPage'
import { AdminUsersPage } from '@/features/admin/AdminUsersPage'
import { AdminCompetitionsPage } from '@/features/admin/AdminCompetitionsPage'
import { AdminMatchesPage } from '@/features/admin/AdminMatchesPage'
import { PublicHomePage } from '@/features/public/PublicHomePage'
import { PublicLivePage } from '@/features/public/PublicLivePage'
import { PublicFixturesPage } from '@/features/public/PublicFixturesPage'
import { PublicResultsPage } from '@/features/public/PublicResultsPage'
import { PublicTeamsPage } from '@/features/public/PublicTeamsPage'
import { PublicTeamPage } from '@/features/public/PublicTeamPage'
import { PublicPlayersPage } from '@/features/public/PublicPlayersPage'
import { PublicPlayerPage } from '@/features/public/PublicPlayerPage'
import { PublicStandingsPage } from '@/features/public/PublicStandingsPage'

function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="label-caps">404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<PublicHomePage />} />
        <Route path="live" element={<PublicLivePage />} />
        <Route path="fixtures" element={<PublicFixturesPage />} />
        <Route path="results" element={<PublicResultsPage />} />
        <Route path="teams" element={<PublicTeamsPage />} />
        <Route path="teams/:teamId" element={<PublicTeamPage />} />
        <Route path="players" element={<PublicPlayersPage />} />
        <Route path="players/:playerId" element={<PublicPlayerPage />} />
        <Route path="gallery" element={<Navigate to="/" replace />} />
        <Route path="standings" element={<PublicStandingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/manager"
        element={
          <RequireRole roles={['manager']}>
            <AppShell area={roleAreas.manager} />
          </RequireRole>
        }
      >
        <Route index element={<ManagerDashboardPage />} />
        <Route path="matches" element={<ManagerMatchesPage />} />
        <Route path="live" element={<ManagerLiveRedirectPage />} />
        <Route path="match/:matchId" element={<LiveMatchPage />} />
        <Route path="players" element={<ManagerPlayersPage />} />
        <Route path="requests" element={<ManagerChangeRequestsPage />} />
        <Route path="rosters" element={<ManagerRostersPage />} />
        <Route path="competitions" element={<ManagerCompetitionsPage />} />
        <Route path="stats" element={<ManagerStatsPage />} />
        <Route path="reports" element={<ManagerReportsPage />} />
        <Route path="settings" element={<ManagerSettingsPage />} />
      </Route>

      <Route
        path="/coach"
        element={
          <RequireRole roles={['coach']}>
            <AppShell area={roleAreas.coach} />
          </RequireRole>
        }
      >
        <Route index element={<CoachDashboardPage />} />
        <Route path="matches" element={<CoachMatchesPage />} />
        <Route path="stats" element={<CoachStatsPage />} />
        <Route path="players" element={<CoachPlayersPage />} />
        <Route path="analytics" element={<CoachAnalyticsPage />} />
        <Route path="requests" element={<CoachChangeRequestsPage />} />
        <Route path="reports" element={<CoachReportsPage />} />
      </Route>

      <Route
        path="/player"
        element={
          <RequireRole roles={['player']}>
            <AppShell area={roleAreas.player} />
          </RequireRole>
        }
      >
        <Route index element={<PlayerDashboardPage />} />
        <Route path="stats" element={<PlayerStatsPage />} />
        <Route path="history" element={<PlayerHistoryPage />} />
        <Route path="team" element={<PlayerTeamPage />} />
        <Route path="profile" element={<PlayerProfilePage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole roles={['admin']}>
            <AppShell area={roleAreas.admin} />
          </RequireRole>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="teams" element={<AdminTeamsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="competitions" element={<AdminCompetitionsPage />} />
        <Route path="matches" element={<AdminMatchesPage />} />
      </Route>

      <Route path="/index.html" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
