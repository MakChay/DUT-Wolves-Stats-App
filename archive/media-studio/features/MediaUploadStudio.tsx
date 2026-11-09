import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  CloudUpload,
  ImagePlus,
  Info,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import type {
  Competition,
  Match,
  MediaAsset,
  MediaCategory,
  MediaStatus,
  Player,
  Team,
} from '@/types/domain'
import {
  MEDIA_CATEGORY_LABELS,
  MEDIA_FOLDERS,
  jerseyLabel,
} from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/features/auth/AuthContext'
import { canManageMedia } from '@/features/auth/permissions'
import { recordAudit } from '@/services/audit/record'
import { canUploadToCloudinary } from '@/services/firebase/config'
import { uploadToCloudinary, validateMediaFile } from '@/services/media/cloudinary'
import {
  CROP_PRESETS,
  cropRect,
  formatBytes,
  loadImage,
  mediaCropFor,
  processImage,
} from '@/services/media/image'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

interface MediaContext {
  teams: Team[]
  competitions: Competition[]
  players: Player[]
  matches: Match[]
}

async function loadContext(): Promise<MediaContext> {
  const [teams, competitions, players, matches] = await Promise.all([
    repositories.teams.list(),
    repositories.competitions.list(),
    repositories.players.listPublic(),
    repositories.matches.list(),
  ])
  return {
    teams,
    competitions,
    players: players.filter(
      (player) => player.teamId === 'team-men' || player.teamId === 'team-women',
    ),
    matches,
  }
}

interface SourceImage {
  file: File
  url: string
  width: number
  height: number
}

const CATEGORY_OPTIONS = (Object.keys(MEDIA_CATEGORY_LABELS) as MediaCategory[]).map(
  (value) => ({ value, label: MEDIA_CATEGORY_LABELS[value] }),
)

export function MediaUploadStudio() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading } = useAsync<MediaContext>(loadContext)

  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<MediaCategory>('player_profile')
  const [status, setStatus] = useState<MediaStatus>('draft')
  const [teamId, setTeamId] = useState('')
  const [competitionId, setCompetitionId] = useState('')
  const [matchId, setMatchId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [tags, setTags] = useState('')
  const [featured, setFeatured] = useState(false)

  const [source, setSource] = useState<SourceImage | null>(null)
  const [aspect, setAspect] = useState('1')
  const [zoom, setZoom] = useState(1)
  const [focusX, setFocusX] = useState(0.5)
  const [focusY, setFocusY] = useState(0.5)
  const [quality, setQuality] = useState(0.82)
  const [maxDimension, setMaxDimension] = useState('1600')
  const [dragOver, setDragOver] = useState(false)

  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState<'idle' | 'processing' | 'uploading' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<MediaAsset | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const aspectValue = Number(aspect)

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url)
    }
  }, [source])

  const teamOptions = useMemo(
    () => (data?.teams ?? []).map((team) => ({ value: team.id, label: team.name })),
    [data],
  )
  const competitionOptions = useMemo(
    () => (data?.competitions ?? []).map((competition) => ({ value: competition.id, label: competition.name })),
    [data],
  )
  const playerOptions = useMemo(() => {
    const rows = (data?.players ?? []).filter((player) => !teamId || player.teamId === teamId)
    return rows.map((player) => ({
      value: player.id,
      label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName}`,
    }))
  }, [data, teamId])
  const matchOptions = useMemo(() => {
    const teams = new Map((data?.teams ?? []).map((team) => [team.id, team]))
    return (data?.matches ?? []).map((match) => {
      const home = teams.get(match.homeTeamId)?.shortName ?? match.homeTeamId
      const away = teams.get(match.awayTeamId)?.shortName ?? match.awayTeamId
      return {
        value: match.id,
        label: `${formatDate(match.tipoff, { day: 'numeric', month: 'short' })} · ${home} vs ${away}`,
      }
    })
  }, [data])

  if (!user || !canManageMedia(user)) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Media permission required"
        description="Only the Media Manager or an administrator can upload media."
      />
    )
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={10} />
      </div>
    )
  }

  const acceptFile = async (file: File | null | undefined) => {
    setError(null)
    setLastSaved(null)
    if (!file) return
    const problem = validateMediaFile(file)
    if (problem) {
      setError(problem)
      return
    }
    try {
      const image = await loadImage(file)
      if (source) URL.revokeObjectURL(source.url)
      setSource({
        file,
        url: URL.createObjectURL(file),
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''))
      setZoom(1)
      setFocusX(0.5)
      setFocusY(0.5)
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not read that image.')
    }
  }

  const validateAssociations = (): string | null => {
    if (!source) return 'Choose an image first.'
    if (!title.trim()) return 'Give the asset a title.'
    if (category === 'player_profile' && !playerId) return 'Choose the player this portrait belongs to.'
    if (category === 'team_photo' && !teamId) return 'Choose the team for this photograph.'
    if (category === 'match_gallery' && !matchId) return 'Choose the match for this gallery.'
    if (category === 'poster' && !matchId && !competitionId)
      return 'Choose a match or competition for this poster.'
    return null
  }

  const upload = async () => {
    const problem = validateAssociations()
    if (problem) {
      setError(problem)
      return
    }
    if (!source) return

    setError(null)
    setLastSaved(null)
    setStage('processing')
    setProgress(4)
    try {
      const processed = await processImage(source.file, {
        aspect: aspectValue,
        zoom,
        focusX,
        focusY,
        maxDimension: Number(maxDimension),
        quality,
      })
      setStage('uploading')
      setProgress(12)

      let url = '/media/player-placeholder.svg'
      let publicId: string | undefined
      let width = processed.width
      let height = processed.height
      let bytes = processed.bytes
      let format = processed.mimeType.split('/')[1] ?? 'jpeg'

      if (canUploadToCloudinary) {
        const result = await uploadToCloudinary(processed.file, {
          folder: MEDIA_FOLDERS[category],
          onProgress: (percent) => setProgress(12 + Math.round(percent * 0.78)),
        })
        url = result.url
        publicId = result.publicId
        width = result.width || processed.width
        height = result.height || processed.height
        bytes = result.bytes || processed.bytes
        format = result.format || format
      } else {
        for (let i = 0; i <= 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 45))
          setProgress(12 + i * 4)
        }
        if (category === 'team_photo' || category === 'match_gallery') {
          url = '/media/team-placeholder.svg'
        } else if (category === 'player_profile') {
          url = '/media/player-placeholder.svg'
        } else {
          url = '/media/poster-placeholder.svg'
        }
      }

      setStage('saving')
      setProgress(94)
      const now = new Date().toISOString()
      const asset = await repositories.media.create({
        id: `media-${Date.now().toString(36)}`,
        title: title.trim(),
        caption: caption.trim() || undefined,
        description: description.trim() || undefined,
        category,
        status,
        teamId: teamId || undefined,
        competitionId: competitionId || undefined,
        matchId: matchId || undefined,
        playerId: playerId || undefined,
        url,
        thumbnailUrl: url,
        publicId,
        cloudinaryFolder: MEDIA_FOLDERS[category],
        width,
        height,
        bytes,
        format,
        crop: mediaCropFor(source.width, source.height, {
          aspect: aspectValue,
          zoom,
          focusX,
          focusY,
        }),
        featured,
        uploadedBy: user.id,
        uploadedByName: user.displayName,
        uploadedAt: now,
        publishedAt: status === 'published' ? now : undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      })

      await recordAudit({
        user,
        entityType: 'media',
        entityId: asset.id,
        action: 'create',
        summary: `Uploaded ${MEDIA_CATEGORY_LABELS[category].toLowerCase()} “${asset.title}” to ${MEDIA_FOLDERS[category]}.`,
        after: {
          category,
          status,
          folder: MEDIA_FOLDERS[category],
          bytes,
          width,
          height,
        },
      })

      setProgress(100)
      setStage('idle')
      setLastSaved(asset)
      toast({
        title: 'Media saved',
        description: canUploadToCloudinary
          ? 'Uploaded to Cloudinary and recorded in Firestore-ready metadata.'
          : 'Cloudinary is not configured, so the binary was simulated locally.',
        tone: 'success',
      })
      setTitle('')
      setCaption('')
      setDescription('')
      setTags('')
      setFeatured(false)
      setPlayerId('')
      setMatchId('')
      if (source) URL.revokeObjectURL(source.url)
      setSource(null)
    } catch (uploadError) {
      setStage('idle')
      setProgress(0)
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    }
  }

  const busy = stage !== 'idle'
  const crop = source
    ? cropRect(source.width, source.height, { aspect: aspectValue, zoom, focusX, focusY })
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Media studio"
        title="Upload media"
        description={
          canUploadToCloudinary
            ? 'Images are cropped and compressed in the browser, then uploaded to Cloudinary. Metadata is stored in the app repository.'
            : 'Cloudinary is not configured yet, so binaries are simulated. Cropping, compression and metadata still work.'
        }
        actions={
          <Badge tone={canUploadToCloudinary ? 'success' : 'warning'}>
            {canUploadToCloudinary ? 'Cloudinary ready' : 'Upload preset missing'}
          </Badge>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>1 · Image</CardTitle>
            <Badge tone="neutral">JPG · PNG · WebP · max 8 MB</Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <label
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragOver(false)
                void acceptFile(event.dataTransfer.files?.[0])
              }}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-4 py-8 text-center transition',
                dragOver
                  ? 'border-accent bg-accent/10'
                  : 'border-line bg-canvas/40 hover:border-accent/50 hover:bg-canvas/60',
              )}
            >
              <Upload className="h-8 w-8 text-ink-faint" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-ink">
                {source ? source.file.name : 'Drag and drop an image, or click to choose'}
              </p>
              <p className="mt-1 text-[11px] text-ink-faint">
                {source
                  ? `${source.width} × ${source.height}px · ${formatBytes(source.file.size)}`
                  : 'The file never leaves your browser until you upload.'}
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void acceptFile(event.target.files?.[0])}
              />
            </label>

            {source ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CROP_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAspect(preset.value)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                        aspect === preset.value
                          ? 'border-accent/60 bg-accent/15 text-accent'
                          : 'border-line bg-canvas/40 text-ink-muted hover:border-white/20',
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAspect(String(source.width / source.height))}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                      aspect === String(source.width / source.height)
                        ? 'border-accent/60 bg-accent/15 text-accent'
                        : 'border-line bg-canvas/40 text-ink-muted hover:border-white/20',
                    )}
                  >
                    Original
                  </button>
                </div>

                <div className="overflow-hidden rounded-card border border-line bg-black/30">
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ aspectRatio: String(aspectValue) }}
                  >
                    <img
                      src={source.url}
                      alt="Crop preview"
                      className="h-full w-full object-cover"
                      style={{
                        transform: `scale(${zoom})`,
                        objectPosition: `${focusX * 100}% ${focusY * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[11px] text-ink-muted">
                    Zoom · {zoom.toFixed(2)}×
                    <input
                      type="range"
                      min={1}
                      max={2.5}
                      step={0.01}
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                      className="mt-1 w-full accent-[rgb(var(--color-accent))]"
                    />
                  </label>
                  <label className="block text-[11px] text-ink-muted">
                    Compression quality · {Math.round(quality * 100)}%
                    <input
                      type="range"
                      min={0.5}
                      max={0.95}
                      step={0.01}
                      value={quality}
                      onChange={(event) => setQuality(Number(event.target.value))}
                      className="mt-1 w-full accent-[rgb(var(--color-accent))]"
                    />
                  </label>
                  <label className="block text-[11px] text-ink-muted">
                    Focus X
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={focusX}
                      onChange={(event) => setFocusX(Number(event.target.value))}
                      className="mt-1 w-full accent-[rgb(var(--color-accent))]"
                    />
                  </label>
                  <label className="block text-[11px] text-ink-muted">
                    Focus Y
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={focusY}
                      onChange={(event) => setFocusY(Number(event.target.value))}
                      className="mt-1 w-full accent-[rgb(var(--color-accent))]"
                    />
                  </label>
                  <Field label="Max output edge" htmlFor="studio-max-dimension">
                    <Select
                      value={maxDimension}
                      onValueChange={setMaxDimension}
                      label="Max output edge"
                      options={[
                        { value: '1200', label: '1200 px' },
                        { value: '1600', label: '1600 px' },
                        { value: '2000', label: '2000 px' },
                        { value: '2560', label: '2560 px' },
                      ]}
                      className="w-full"
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-canvas/40 px-3 py-2 text-[11px] text-ink-faint">
                  <span>
                    Output crop {crop?.width} × {crop?.height}px
                  </span>
                  <span>
                    Saved to <code className="text-ink-muted">{MEDIA_FOLDERS[category]}</code>
                  </span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>2 · Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <Field label="Title" htmlFor="studio-title">
                <Input
                  id="studio-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Fezile Hlongwa portrait"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Category" htmlFor="studio-category">
                  <Select
                    value={category}
                    onValueChange={(value) => setCategory(value as MediaCategory)}
                    label="Category"
                    options={CATEGORY_OPTIONS}
                    className="w-full"
                  />
                </Field>
                <Field label="Status" htmlFor="studio-status">
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as MediaStatus)}
                    label="Status"
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'published', label: 'Published' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                    className="w-full"
                  />
                </Field>
              </div>
              <Field label="Caption" htmlFor="studio-caption" hint="Shown under the image publicly.">
                <Input
                  id="studio-caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Short public caption"
                />
              </Field>
              <Field label="Description" htmlFor="studio-description">
                <textarea
                  id="studio-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="w-full rounded-control border border-line bg-canvas/60 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Internal or public description"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Team" htmlFor="studio-team">
                  <Select
                    value={teamId || 'none'}
                    onValueChange={(value) => {
                      setTeamId(value === 'none' ? '' : value)
                      setPlayerId('')
                    }}
                    label="Team"
                    options={[{ value: 'none', label: 'No team' }, ...teamOptions]}
                    className="w-full"
                  />
                </Field>
                <Field label="Competition" htmlFor="studio-competition">
                  <Select
                    value={competitionId || 'none'}
                    onValueChange={(value) => setCompetitionId(value === 'none' ? '' : value)}
                    label="Competition"
                    options={[{ value: 'none', label: 'No competition' }, ...competitionOptions]}
                    className="w-full"
                  />
                </Field>
                <Field label="Match" htmlFor="studio-match">
                  <Select
                    value={matchId || 'none'}
                    onValueChange={(value) => setMatchId(value === 'none' ? '' : value)}
                    label="Match"
                    options={[{ value: 'none', label: 'No match' }, ...matchOptions]}
                    className="w-full"
                  />
                </Field>
                <Field label="Player" htmlFor="studio-player">
                  <Select
                    value={playerId || 'none'}
                    onValueChange={(value) => setPlayerId(value === 'none' ? '' : value)}
                    label="Player"
                    options={[{ value: 'none', label: 'No player' }, ...playerOptions]}
                    className="w-full"
                  />
                </Field>
              </div>
              <Field label="Tags" htmlFor="studio-tags" hint="Comma separated, used for filtering.">
                <Input
                  id="studio-tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="portrait, women, preseason"
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                />
                Feature this asset on the public site
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3 · Publish</CardTitle>
              <Badge tone="neutral">{MEDIA_CATEGORY_LABELS[category]}</Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 p-3 text-[11px] leading-relaxed text-ink-faint">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Media permissions cover photography only. Official statistics, jersey numbers,
                positions, credentials and roles stay with the team manager and administrator.
              </div>

              {busy ? (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-faint">
                    {stage === 'processing'
                      ? 'Cropping and compressing…'
                      : stage === 'uploading'
                        ? `Uploading… ${progress}%`
                        : 'Saving metadata…'}
                  </p>
                </div>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
                >
                  {error}
                </p>
              ) : null}

              {lastSaved ? (
                <div className="rounded-control border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Saved · {lastSaved.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-success/80">
                    {lastSaved.width} × {lastSaved.height}px · {formatBytes(lastSaved.bytes ?? 0)} ·{' '}
                    {lastSaved.cloudinaryFolder}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void upload()} disabled={busy || !source || !title.trim()}>
                  <CloudUpload className="h-4 w-4" aria-hidden="true" />
                  {busy
                    ? 'Working…'
                    : canUploadToCloudinary
                      ? 'Compress & upload'
                      : 'Create draft asset'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => fileInput.current?.click()}
                  disabled={busy}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {source ? 'Replace image' : 'Choose image'}
                </Button>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Crop, compression and tags are stored with the metadata so the original context is
                never lost.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
