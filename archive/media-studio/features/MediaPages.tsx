import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Cloud,
  CloudOff,
  Image as ImageIcon,
  Pencil,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/features/auth/AuthContext'
import { canManageMedia } from '@/features/auth/permissions'
import { repositories } from '@/services/repositories'
import { canUploadToCloudinary } from '@/services/firebase/config'
import type {
  Competition,
  MediaAsset,
  MediaStatus,
} from '@/types/domain'
import { MEDIA_CATEGORY_LABELS, jerseyLabel } from '@/types/domain'
import { formatDate } from '@/utils/format'
import { MediaUploadStudio } from '@/features/media/MediaUploadStudio'
import {
  MediaAssetEditor,
  type MediaEditorContext,
} from '@/features/media/MediaAssetEditor'

const CATEGORY_LABEL = MEDIA_CATEGORY_LABELS

const STATUS_TONE: Record<MediaStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
}

interface MediaData {
  assets: MediaAsset[]
  context: MediaEditorContext
}

async function loadMedia(): Promise<MediaData> {
  const [assets, teams, competitions, players, matches] = await Promise.all([
    repositories.media.list(),
    repositories.teams.list(),
    repositories.competitions.list(),
    repositories.players.listPublic(),
    repositories.matches.list(),
  ])
  return {
    assets,
    context: {
      teams,
      competitions: competitions as Competition[],
      players: players.filter(
        (player) => player.teamId === 'team-men' || player.teamId === 'team-women',
      ),
      matches,
    },
  }
}

function teamName(context: MediaEditorContext, teamId?: string): string | null {
  if (!teamId) return null
  return context.teams.find((team) => team.id === teamId)?.shortName ?? teamId
}

function playerName(context: MediaEditorContext, playerId?: string): string | null {
  if (!playerId) return null
  const player = context.players.find((row) => row.id === playerId)
  return player ? `${player.firstName} ${player.lastName}` : playerId
}

export function MediaDashboardPage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync<MediaData>(loadMedia)
  const [editing, setEditing] = useState<MediaAsset | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Camera}
        title="Media could not be loaded"
        description={error ?? 'The media repository returned no data.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  const assets = data.assets
  const published = assets.filter((asset) => asset.status === 'published').length
  const drafts = assets.filter((asset) => asset.status === 'draft').length
  const portraits = assets.filter((asset) => asset.category === 'player_profile').length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Media studio"
        title="Media overview"
        description="Player portraits, team photography, match galleries, posters and homepage banners."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={canUploadToCloudinary ? 'success' : 'warning'}>
              {canUploadToCloudinary ? 'Cloudinary ready' : 'Simulated uploads'}
            </Badge>
            <Button size="sm" onClick={() => navigate('/media/upload')}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total assets', value: assets.length, Icon: Camera },
          { label: 'Published', value: published, Icon: ImageIcon },
          { label: 'Drafts', value: drafts, Icon: Upload },
          { label: 'Player portraits', value: portraits, Icon: Users },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 pt-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-control bg-accent/10 text-accent">
                <item.Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="stat-num text-2xl text-ink">{item.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-ink-faint">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Storage pipeline</CardTitle>
          <Badge tone={canUploadToCloudinary ? 'success' : 'warning'}>
            {canUploadToCloudinary ? 'Cloudinary connected' : 'Not connected'}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-3 pt-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 p-3">
            {canUploadToCloudinary ? (
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            )}
            <div>
              <p className="text-xs font-semibold text-ink">Binaries · Cloudinary</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                {canUploadToCloudinary
                  ? 'Unsigned preset configured. Images upload to player-profiles, team-photos, match-galleries, promotional-graphics and homepage-banners.'
                  : 'Add VITE_CLOUDINARY_UPLOAD_PRESET to .env.local to upload binaries. Until then crop, compression and metadata are still simulated.'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-ink">Metadata · Firestore-ready</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                No Firebase Storage is used. Media metadata, audit entries and permissions are
                stored in Firestore. Only published assets reach the public site.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent uploads</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/media/library')}>
            View library
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {assets.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-faint">No media has been uploaded yet.</p>
          ) : (
            assets.slice(0, 6).map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setEditing(asset)}
                className="flex w-full items-center gap-3 rounded-control border border-line px-3 py-2.5 text-left transition hover:border-white/20"
              >
                <img
                  src={asset.thumbnailUrl ?? asset.url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-control object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{asset.title}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {CATEGORY_LABEL[asset.category]} · {formatDate(asset.uploadedAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[asset.status]}>{asset.status}</Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {editing ? (
        <MediaAssetEditor
          asset={editing}
          context={data.context}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
          onDeleted={() => {
            setEditing(null)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}

export function MediaLibraryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync<MediaData>(loadMedia)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [teamId, setTeamId] = useState('all')
  const [competitionId, setCompetitionId] = useState('all')
  const [editing, setEditing] = useState<MediaAsset | null>(null)
  const allowed = canManageMedia(user)

  const assets = useMemo(() => {
    if (!data) return []
    const term = query.trim().toLowerCase()
    return data.assets.filter((asset) => {
      if (category !== 'all' && asset.category !== category) return false
      if (status !== 'all' && asset.status !== status) return false
      if (teamId !== 'all' && asset.teamId !== teamId) return false
      if (competitionId !== 'all' && asset.competitionId !== competitionId) return false
      if (!term) return true
      return [asset.title, asset.caption, asset.description, ...asset.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [data, query, category, status, teamId, competitionId])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={8} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Camera}
        title="Media could not be loaded"
        description={error ?? 'The media repository returned no data.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Media library"
        title="All media assets"
        description="Search, filter, edit, replace, publish or archive every asset."
      />

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="relative block">
            <span className="sr-only">Search media</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, captions and tags"
              className="pl-9"
            />
          </label>
          <Select
            label="Category"
            value={category}
            onValueChange={setCategory}
            options={[
              { value: 'all', label: 'All categories' },
              ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label })),
            ]}
            className="w-full"
          />
          <Select
            label="Status"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
            className="w-full"
          />
          <Select
            label="Team"
            value={teamId}
            onValueChange={setTeamId}
            options={[
              { value: 'all', label: 'All teams' },
              ...data.context.teams.map((team) => ({ value: team.id, label: team.name })),
            ]}
            className="w-full"
          />
          <Select
            label="Competition"
            value={competitionId}
            onValueChange={setCompetitionId}
            options={[
              { value: 'all', label: 'All competitions' },
              ...data.context.competitions.map((row) => ({ value: row.id, label: row.name })),
            ]}
            className="w-full"
          />
          <div className="flex items-end justify-between gap-2">
            <p className="pb-2 text-[11px] text-ink-faint">
              {assets.length} asset{assets.length === 1 ? '' : 's'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('')
                setCategory('all')
                setStatus('all')
                setTeamId('all')
                setCompetitionId('all')
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {assets.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No assets match"
          description="Try clearing the search or filters, or upload a new asset."
          action={<Button onClick={() => navigate('/media/upload')}>Upload media</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Card key={asset.id}>
              <CardContent className="space-y-3 pt-4">
                <div className="relative overflow-hidden rounded-control">
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt={asset.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge tone={STATUS_TONE[asset.status]}>{asset.status}</Badge>
                    {asset.featured ? <Badge tone="accent">Featured</Badge> : null}
                  </div>
                </div>
                <div>
                  <p className="truncate text-sm font-semibold text-ink">{asset.title}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {CATEGORY_LABEL[asset.category]} · {formatDate(asset.uploadedAt)}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-ink-muted">
                    {[
                      teamName(data.context, asset.teamId),
                      playerName(data.context, asset.playerId),
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No team or player'}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-faint"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {allowed ? (
                    <Button size="sm" variant="secondary" onClick={() => setEditing(asset)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing ? (
        <MediaAssetEditor
          asset={editing}
          context={data.context}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
          onDeleted={() => {
            setEditing(null)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}

export function MediaUploadPage() {
  return <MediaUploadStudio />
}

export function MediaPlayersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync<MediaData>(loadMedia)
  const [editing, setEditing] = useState<MediaAsset | null>(null)
  const allowed = canManageMedia(user)

  if (loading) return <SkeletonCard lines={6} />
  if (error || !data)
    return (
      <EmptyState
        icon={Users}
        title="Could not load"
        description={error ?? 'No data.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )

  const portraits = data.assets.filter((asset) => asset.category === 'player_profile')
  const grouped = new Map<string, MediaAsset[]>()
  for (const asset of portraits) {
    const key = asset.playerId ?? 'unassigned'
    grouped.set(key, [...(grouped.get(key) ?? []), asset])
  }
  const missing = data.context.players.filter(
    (player) => !portraits.some((asset) => asset.playerId === player.id),
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Player photos"
        title="Player profile photography"
        description="Assign and replace portrait images for players. Only published portraits appear publicly."
        actions={
          <Button size="sm" onClick={() => navigate('/media/upload')}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Upload portrait
          </Button>
        }
      />

      {portraits.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No portraits uploaded"
          description={`${missing.length} players still need a portrait. Upload one to get started.`}
          action={<Button onClick={() => navigate('/media/upload')}>Upload portrait</Button>}
        />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[...grouped.entries()].map(([key, items]) => (
            <Card key={key}>
              <CardContent className="space-y-3 pt-4">
                <div className="relative">
                  <img
                    src={items[0]!.thumbnailUrl ?? items[0]!.url}
                    alt={items[0]!.title}
                    className="aspect-square w-full rounded-control object-cover"
                  />
                  {items.length > 1 ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {items.length} photos
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="truncate text-sm font-semibold text-ink">
                    {playerName(data.context, items[0]!.playerId) ?? 'Unassigned portrait'}
                  </p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {teamName(data.context, items[0]!.teamId) ?? 'No team'} ·{' '}
                    {items[0]!.status}
                  </p>
                </div>
                {allowed ? (
                  <Button size="sm" variant="secondary" onClick={() => setEditing(items[0]!)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Manage
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {missing.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Missing portraits</CardTitle>
            <Badge tone="warning">{missing.length}</Badge>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="flex flex-wrap gap-1.5">
              {missing.map((player) => (
                <span
                  key={player.id}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted"
                >
                  {jerseyLabel(player.jerseyNumber)} {player.firstName} {player.lastName}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <MediaAssetEditor
          asset={editing}
          context={data.context}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
          onDeleted={() => {
            setEditing(null)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}

export function MediaGalleriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync<MediaData>(loadMedia)
  const [editing, setEditing] = useState<MediaAsset | null>(null)
  const allowed = canManageMedia(user)

  if (loading) return <SkeletonCard lines={6} />
  if (error || !data)
    return (
      <EmptyState
        icon={Camera}
        title="Could not load"
        description={error ?? 'No data.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )

  const groups = data.assets.reduce<Record<string, MediaAsset[]>>((acc, asset) => {
    const key = CATEGORY_LABEL[asset.category]
    acc[key] = [...(acc[key] ?? []), asset]
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Galleries"
        title="Match, team and event galleries"
        description="Grouped photography for match galleries, squads, posters and banners."
        actions={
          <Button size="sm" onClick={() => navigate('/media/upload')}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Add photo
          </Button>
        }
      />

      {Object.keys(groups).length === 0 ? (
        <EmptyState icon={Camera} title="No galleries yet" description="Upload photography to build galleries." />
      ) : (
        Object.entries(groups).map(([label, items]) => (
          <section key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
                {label} · {items.length}
              </h2>
              <span className="text-[11px] text-ink-faint">
                {items.filter((asset) => asset.status === 'published').length} published
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => (allowed ? setEditing(asset) : undefined)}
                  className="group relative overflow-hidden rounded-control border border-line text-left"
                >
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt={asset.title}
                    className="aspect-square w-full object-cover transition group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <span className="line-clamp-1 block text-[11px] font-medium text-white">
                      {asset.title}
                    </span>
                    <span className="block text-[10px] text-white/70">{asset.status}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {editing ? (
        <MediaAssetEditor
          asset={editing}
          context={data.context}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
          onDeleted={() => {
            setEditing(null)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}

export function MediaPublishingPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync<MediaData>(loadMedia)
  const [editing, setEditing] = useState<MediaAsset | null>(null)
  const allowed = canManageMedia(user)

  if (loading) return <SkeletonCard lines={6} />
  if (error || !data)
    return (
      <EmptyState
        icon={Camera}
        title="Could not load"
        description={error ?? 'No data.'}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )

  const drafts = data.assets.filter((asset) => asset.status !== 'published')
  const published = data.assets.filter((asset) => asset.status === 'published')

  const setStatus = async (asset: MediaAsset, status: MediaStatus) => {
    await repositories.media.update(asset.id, {
      status,
      publishedAt: status === 'published' ? (asset.publishedAt ?? new Date().toISOString()) : asset.publishedAt,
    })
    await reload()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Publishing"
        title="Publishing controls"
        description="Review drafts, publish authorised content and archive outdated assets."
        actions={
          <Badge tone={canUploadToCloudinary ? 'success' : 'warning'}>
            {canUploadToCloudinary ? 'Cloudinary ready' : 'Simulated storage'}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Awaiting publication</CardTitle>
          <Badge tone="warning">{drafts.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {drafts.length === 0 ? (
            <p className="py-4 text-center text-xs text-ink-faint">
              Every asset is currently published.
            </p>
          ) : (
            drafts.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col gap-3 rounded-control border border-line p-3 sm:flex-row sm:items-center"
              >
                <img
                  src={asset.thumbnailUrl ?? asset.url}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-control object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{asset.title}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {CATEGORY_LABEL[asset.category]} · {formatDate(asset.uploadedAt)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[asset.status]}>{asset.status}</Badge>
                {allowed ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => void setStatus(asset, 'published')}>
                      Publish
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(asset)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published</CardTitle>
          <Badge tone="success">{published.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {published.length === 0 ? (
            <p className="py-4 text-center text-xs text-ink-faint">Nothing is published yet.</p>
          ) : (
            published.map((asset) => (
              <div
                key={asset.id}
                className="flex flex-col gap-3 rounded-control border border-line p-3 sm:flex-row sm:items-center"
              >
                <img
                  src={asset.thumbnailUrl ?? asset.url}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-control object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{asset.title}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {CATEGORY_LABEL[asset.category]} · published{' '}
                    {asset.publishedAt ? formatDate(asset.publishedAt) : formatDate(asset.uploadedAt)}
                  </p>
                </div>
                {allowed ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => void setStatus(asset, 'archived')}>
                      Archive
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(asset)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing ? (
        <MediaAssetEditor
          asset={editing}
          context={data.context}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
          onDeleted={() => {
            setEditing(null)
            void reload()
          }}
        />
      ) : null}
    </div>
  )
}
