import { useEffect, useState } from 'react'
import type {
  Competition,
  Match,
  MatchEventData,
  MediaAsset,
  PlayerGameStats,
  PublicPlayer,
  Team,
} from '@/types/domain'
import { isDutTeamId } from '@/types/domain'
import {
  aggregate,
  derivePlayerGameStats,
  matchScore,
} from '@/services/analytics/stats'
import type { AggregatedStats } from '@/services/analytics/stats'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'

/**
 * A public season row. It carries only the sanitised `PublicPlayer` shape so
 * private identifiers (student number, campus, injury notes) cannot leak into
 * the public bundle.
 */
export interface PublicSeasonRow {
  player: PublicPlayer
  perGame: PlayerGameStats[]
  totals: AggregatedStats
}

export interface PublicData {
  teams: Team[]
  players: PublicPlayer[]
  matches: Match[]
  competitions: Competition[]
  media: MediaAsset[]
  liveMatches: Match[]
  upcoming: Match[]
  recent: Match[]
  eventsByMatch: Map<string, MatchEventData[]>
  topScorers: PublicSeasonRow[]
  teamById: Map<string, Team>
  playerById: Map<string, PublicPlayer>
  competitionById: Map<string, Competition>
}

type PublicDataBase = Pick<PublicData, 'teams' | 'players' | 'competitions' | 'media'> & {
  allTeams?: Team[]
}

function derivePublicData(
  base: PublicDataBase,
  matches: Match[],
  eventsByMatch: Map<string, MatchEventData[]>,
): PublicData {
  const publicMatches = matches.filter((match) => match.publicVisible)
  const completed = publicMatches.filter((match) => match.status === 'completed')
  const completedByTeam = new Map<string, Match[]>()
  completed.forEach((match) => {
    completedByTeam.set(match.homeTeamId, [...(completedByTeam.get(match.homeTeamId) ?? []), match])
    completedByTeam.set(match.awayTeamId, [...(completedByTeam.get(match.awayTeamId) ?? []), match])
  })

  const topScorers: PublicSeasonRow[] = base.players
    .map((player) => {
      const teamMatches = completedByTeam.get(player.teamId) ?? []
      const perGame: PlayerGameStats[] = teamMatches.map((match) =>
        derivePlayerGameStats(eventsByMatch.get(match.id) ?? [], player.id, player.teamId, match.id),
      )
      return { player, perGame, totals: aggregate(perGame) }
    })
    .filter((row) => row.totals.games > 0)
    .sort((a, b) => b.totals.ppg - a.totals.ppg)
    .slice(0, 10)

  return {
    ...base,
    matches: publicMatches,
    liveMatches: publicMatches.filter((match) => match.status === 'live' || match.status === 'paused'),
    upcoming: publicMatches
      .filter((match) => match.status === 'scheduled')
      .sort((a, b) => a.tipoff.localeCompare(b.tipoff)),
    recent: completed.sort((a, b) => b.tipoff.localeCompare(a.tipoff)),
    eventsByMatch,
    topScorers,
    teamById: new Map((base.allTeams ?? base.teams).map((team) => [team.id, team])),
    playerById: new Map(base.players.map((player) => [player.id, player])),
    competitionById: new Map(base.competitions.map((competition) => [competition.id, competition])),
  }
}

async function loadPublicData(): Promise<PublicData> {
  // Public pages only ever call sanitised, publicly readable repositories.
  const [allTeams, publicPlayersRaw, matches, competitions, media] = await Promise.all([
    repositories.teams.listPublic(),
    repositories.players.listPublic(),
    repositories.matches.listPublic(),
    repositories.competitions.list(),
    repositories.media.listPublished(),
  ])

  // Only published media is ever sent to public pages.
  const publishedMedia = media.filter((asset) => asset.status === 'published')
  const portraitByPlayer = new Map<string, string>()
  for (const asset of publishedMedia) {
    if (asset.category === 'player_profile' && asset.playerId && !portraitByPlayer.has(asset.playerId)) {
      portraitByPlayer.set(asset.playerId, asset.url)
    }
  }

  const publicPlayers: PublicPlayer[] = publicPlayersRaw
    .filter((player) => player.publicVisible && isDutTeamId(player.teamId))
    .map((player) => ({
      ...player,
      photoUrl: player.photoUrl ?? portraitByPlayer.get(player.id),
    }))

  const publicTeams = allTeams.filter((team) => isDutTeamId(team.id))
  const archivedCompetitionIds = new Set(
    competitions.filter((competition) => competition.status === 'archived').map((competition) => competition.id),
  )
  const visibleCompetitions = competitions.filter(
    (competition) => competition.status !== 'archived' && competition.publicVisible,
  )
  const publicMatches = matches.filter(
    (match) => match.publicVisible && !archivedCompetitionIds.has(match.competitionId),
  )
  const eventLists = await Promise.all(
    publicMatches.map((match) => repositories.events.listPublicByMatch(match.id)),
  )
  const eventsByMatch = new Map(
    publicMatches.map((match, index) => [match.id, eventLists[index] ?? []]),
  )

  return derivePublicData(
    {
      teams: publicTeams,
      players: publicPlayers,
      competitions: visibleCompetitions,
      media: publishedMedia,
      allTeams,
    },
    publicMatches,
    eventsByMatch,
  )
}

export function usePublicData() {
  const query = useAsync<PublicData>(loadPublicData)
  const [streamedData, setStreamedData] = useState<PublicData | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.data) {
      setStreamedData(null)
      return
    }

    let active = true
    let generation = 0
    let matches = query.data.matches
    let stopEvents = () => {}
    setStreamedData(query.data)
    setStreamError(null)

    const streamEvents = (matchIds: string[], currentGeneration: number) => {
      stopEvents()
      stopEvents = repositories.events.subscribePublicByMatches(
        matchIds,
        (events) => {
          if (!active || currentGeneration !== generation) return
          const eventsByMatch = new Map<string, MatchEventData[]>()
          for (const match of matches) eventsByMatch.set(match.id, [])
          for (const event of events) eventsByMatch.get(event.matchId)?.push(event)
          setStreamedData(derivePublicData(query.data!, matches, eventsByMatch))
          setStreamError(null)
        },
        (error) => {
          if (active && currentGeneration === generation) setStreamError(error.message)
        },
      )
    }

    const stopMatches = repositories.matches.subscribePublic(
      (nextMatches) => {
        if (!active) return
        matches = nextMatches.filter(
          (match) =>
            match.publicVisible &&
            (isDutTeamId(match.homeTeamId) || isDutTeamId(match.awayTeamId)),
        )
        generation += 1
        const currentGeneration = generation
        setStreamedData((current) =>
          current ? derivePublicData(query.data!, matches, current.eventsByMatch) : query.data,
        )
        streamEvents(matches.map((match) => match.id), currentGeneration)
      },
      (error) => {
        if (active) setStreamError(error.message)
      },
    )

    return () => {
      active = false
      stopMatches()
      stopEvents()
    }
  }, [query.data])

  return {
    ...query,
    data: streamedData ?? query.data,
    error: streamError ?? query.error,
  }
}

export function scoreForMatch(data: PublicData, match: Match): { home: number; away: number } {
  return matchScore(data.eventsByMatch.get(match.id) ?? [], match)
}
