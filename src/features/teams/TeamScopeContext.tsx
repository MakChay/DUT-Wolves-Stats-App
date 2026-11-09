import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Team } from '@/types/domain'
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
      const scoped =
        user.role === 'admin'
          ? rows
          : rows.filter((team) => user.teamIds.includes(team.id))
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

  const setTeamId = (id: string) => {
    setTeamIdState(id)
    window.localStorage.setItem(STORAGE_KEY, id)
  }

  const value = useMemo<TeamScopeValue>(() => {
    const team = teams.find((entry) => entry.id === teamId) ?? null
    return { teams, teamId, team, setTeamId, loading }
  }, [teams, teamId, loading])

  return <TeamScopeContext.Provider value={value}>{children}</TeamScopeContext.Provider>
}

export function useTeamScope(): TeamScopeValue {
  const context = useContext(TeamScopeContext)
  if (!context) throw new Error('useTeamScope must be used inside TeamScopeProvider')
  return context
}
