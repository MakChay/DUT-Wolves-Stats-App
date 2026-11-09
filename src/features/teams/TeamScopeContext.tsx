import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isDutTeamId, type Team } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAuth } from '@/features/auth/AuthContext'

const STORAGE_KEY = 'dws.teamScope'

interface TeamScopeValue {
  teams: Team[]
  teamId: string | null
  team: Team | null
  setTeamId: (id: string) => void
  loading: boolean
}

const TeamScopeContext = createContext<TeamScopeValue | null>(null)

export function TeamScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamIdState] = useState<string | null>(null)
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null)
  const loading = Boolean(user) && loadedForUserId !== user?.id

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setTeams([])
      setTeamIdState(null)
      setLoadedForUserId(null)
      return
    }
    repositories.teams.list().then((rows) => {
      if (cancelled) return
      const dutTeams = rows.filter((team) => isDutTeamId(team.id))
      const scoped =
        user.role === 'admin'
          ? dutTeams
          : dutTeams.filter((team) => user.teamIds.includes(team.id))
      setTeams(scoped)
      const stored = window.localStorage.getItem(STORAGE_KEY)
      const valid = scoped.find((team) => team.id === stored)
      setTeamIdState(valid?.id ?? scoped[0]?.id ?? null)
      setLoadedForUserId(user.id)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const setTeamId = useCallback((id: string) => {
    if (!teams.some((team) => team.id === id)) return
    setTeamIdState(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }, [teams])

  const value = useMemo<TeamScopeValue>(() => {
    const team = teams.find((entry) => entry.id === teamId) ?? null
    return { teams, teamId, team, setTeamId, loading }
  }, [teams, teamId, setTeamId, loading])

  return <TeamScopeContext.Provider value={value}>{children}</TeamScopeContext.Provider>
}

export function useTeamScope(): TeamScopeValue {
  const context = useContext(TeamScopeContext)
  if (!context) throw new Error('useTeamScope must be used inside TeamScopeProvider')
  return context
}
