import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CloudUpload,
  ImagePlus,
  ShieldCheck,
  Trash2,
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
import { MEDIA_CATEGORY_LABELS, MEDIA_FOLDERS, jerseyLabel } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAuth } from '@/features/auth/AuthContext'
import { canManageMedia } from '@/features/auth/permissions'
import { recordAudit } from '@/services/audit/record'
import { canUploadToCloudinary } from '@/services/firebase/config'
import { uploadToCloudinary, validateMediaFile } from '@/services/media/cloudinary'
import {
  CROP_PRESETS,
  formatBytes,
  loadImage,
  mediaCropFor,
  processImage,
} from '@/services/media/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Field } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface MediaEditorContext {
  teams: Team[]
  competitions: Competition[]
  players: Player[]
  matches: Match[]
}

interface EditorProps {
  asset: MediaAsset
  context: MediaEditorContext
  onClose: () => void
  onSaved: (asset: MediaAsset | null) => void
  onDeleted: (id: string) => void
}

const CATEGORY_OPTIONS = (Object.keys(MEDIA_CATEGORY_LABELS) as MediaCategory[]).map((value) => ({
  value,
  label: MEDIA_CATEGORY_LABELS[value],
}))

const STATUS_TONE: Record<MediaStatus, 'neutral' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
}

export function MediaAssetEditor({
  asset,
  context,
  onClose,
  onSaved,
  onDeleted,
}: EditorProps) {
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <MediaAssetEditorForm
        asset={asset}
        context={context}
        onClose={onClose}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </Dialog>
  )
}

function MediaAssetEditorForm({ asset, context, onClose, onSaved, onDeleted }: EditorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const allowed = canManageMedia(user)

  const [title, setTitle] = useState(asset.title)
  const [caption, setCaption] = useState(asset.caption ?? '')
  const [description, setDescription] = useState(asset.description ?? '')
  const [category, setCategory] = useState<MediaCategory>(asset.category)
  const [status, setStatus] = useState<MediaStatus>(asset.status)
  const [teamId, setTeamId] = useState(asset.teamId ?? '')
  const [competitionId, setCompetitionId] = useState(asset.competitionId ?? '')
  const [matchId, setMatchId] = useState(asset.matchId ?? '')
  const [playerId, setPlayerId] = useState(asset.playerId ?? '')
  const [tags, setTags] = useState(asset.tags.join(', '))
  const [featured, setFeatured] = useState(Boolean(asset.featured))

  const [replacement, setReplacement] = useState<{
    file: File
    url: string
    width: number
    height: number
  } | null>(null)
  const [aspect, setAspect] = useState(String(asset.crop?.aspect ?? 1))
  const [zoom, setZoom] = useState(1)
  const [focusX, setFocusX] = useState(0.5)
  const [focusY, setFocusY] = useState(0.5)
  const [quality, setQuality] = useState(0.82)
  const [progress, setProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  useEffect(
    () => () => {
      if (replacement) URL.revokeObjectURL(replacement.url)
    },
    [replacement],
  )

  const teamOptions = useMemo(
    () => context.teams.map((team) => ({ value: team.id, label: team.name })),
    [context.teams],
  )
  const competitionOptions = useMemo(
    () => context.competitions.map((row) => ({ value: row.id, label: row.name })),
    [context.competitions],
  )
  const playerOptions = useMemo(() => {
    const rows = context.players.filter((player) => !teamId || player.teamId === teamId)
    return rows.map((player) => ({
      value: player.id,
      label: `${jerseyLabel(player.jerseyNumber)} ${player.firstName} ${player.lastName}`,
    }))
  }, [context.players, teamId])
  const matchOptions = useMemo(() => {
    const teamMap = new Map(context.teams.map((team) => [team.id, team]))
    return context.matches.map((match) => {
      const home = teamMap.get(match.homeTeamId)?.shortName ?? match.homeTeamId
      const away = teamMap.get(match.awayTeamId)?.shortName ?? match.awayTeamId
      return {
        value: match.id,
        label: `${formatDate(match.tipoff, { day: 'numeric', month: 'short' })} · ${home} vs ${away}`,
      }
    })
  }, [context.matches, context.teams])

  const chooseReplacement = async (file: File | null | undefined) => {
    setError(null)
    if (!file) return
    const problem = validateMediaFile(file)
    if (problem) {
      setError(problem)
      return
    }
    try {
      const image = await loadImage(file)
      if (replacement) URL.revokeObjectURL(replacement.url)
      setReplacement({
        file,
        url: URL.createObjectURL(file),
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Could not read that image.')
    }
  }

  const saveMetadata = async () => {
    if (!user || !allowed) return
    setError(null)
    if (!title.trim()) {
      setError('Give the asset a title.')
      return
    }
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const updated = await repositories.media.update(asset.id, {
        title: title.trim(),
        caption: caption.trim() || undefined,
        description: description.trim() || undefined,
        category,
        status,
        teamId: teamId || undefined,
        competitionId: competitionId || undefined,
        matchId: matchId || undefined,
        playerId: playerId || undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        featured,
        publishedAt:
          status === 'published' ? (asset.publishedAt ?? now) : asset.publishedAt,
      })
      if (!updated) throw new Error('That asset could not be found.')

      await recordAudit({
        user,
        entityType: 'media',
        entityId: updated.id,
        action: 'update',
        summary:
          asset.status !== updated.status
            ? `Changed “${updated.title}” from ${asset.status} to ${updated.status}.`
            : `Updated media metadata for “${updated.title}”.`,
        before: {
          title: asset.title,
          status: asset.status,
          category: asset.category,
          teamId: asset.teamId ?? null,
        },
        after: {
          title: updated.title,
          status: updated.status,
          category: updated.category,
          teamId: updated.teamId ?? null,
        },
      })

      toast({
        title: 'Asset updated',
        description:
          updated.status === 'published'
            ? 'The asset is published and visible on the public site.'
            : `Saved as ${updated.status}.`,
        tone: 'success',
      })
      onSaved(updated)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the asset.')
    } finally {
      setSaving(false)
    }
  }

  const replaceImage = async () => {
    if (!user || !allowed || !replacement) return
    setError(null)
    setReplacing(true)
    setProgress(4)
    try {
      const processed = await processImage(replacement.file, {
        aspect: Number(aspect),
        zoom,
        focusX,
        focusY,
        quality,
        maxDimension: 1600,
      })
      setProgress(14)

      let url = asset.url
      let publicId = asset.publicId
      let width = processed.width
      let height = processed.height
      let bytes = processed.bytes
      let format = processed.mimeType.split('/')[1] ?? 'jpeg'

      if (canUploadToCloudinary) {
        const result = await uploadToCloudinary(processed.file, {
          folder: MEDIA_FOLDERS[category],
          onProgress: (percent) => setProgress(14 + Math.round(percent * 0.76)),
        })
        url = result.url
        publicId = result.publicId
        width = result.width || processed.width
        height = result.height || processed.height
        bytes = result.bytes || processed.bytes
        format = result.format || format
      } else {
        for (let i = 0; i <= 20; i++) {
          await new Promise((resolve) => setTimeout(resolve, 40))
          setProgress(14 + i * 3)
        }
      }

      setProgress(94)
      const updated = await repositories.media.update(asset.id, {
        url,
        thumbnailUrl: url,
        publicId,
        cloudinaryFolder: MEDIA_FOLDERS[category],
        width,
        height,
        bytes,
        format,
        crop: mediaCropFor(replacement.width, replacement.height, {
          aspect: Number(aspect),
          zoom,
          focusX,
          focusY,
        }),
      })
      if (!updated) throw new Error('That asset could not be found.')

      await recordAudit({
        user,
        entityType: 'media',
        entityId: updated.id,
        action: 'update',
        summary: `Replaced the image for “${updated.title}” in ${MEDIA_FOLDERS[category]}.`,
        before: { url: asset.url, publicId: asset.publicId ?? null },
        after: { url: updated.url, publicId: updated.publicId ?? null },
      })

      setProgress(100)
      setReplacement(null)
      toast({
        title: 'Image replaced',
        description: canUploadToCloudinary
          ? 'The new binary is on Cloudinary and metadata was updated.'
          : 'Cloudinary is not configured, so the replacement was recorded locally.',
        tone: 'success',
      })
      onSaved(updated)
    } catch (replaceError) {
      setError(
        replaceError instanceof Error ? replaceError.message : 'Could not replace the image.',
      )
    } finally {
      setReplacing(false)
    }
  }

  const remove = async () => {
    if (!user || !allowed) return
    setSaving(true)
    setError(null)
    try {
      await repositories.media.remove(asset.id)
      await recordAudit({
        user,
        entityType: 'media',
        entityId: asset.id,
        action: 'delete',
        summary: `Deleted media asset “${asset.title}” (${MEDIA_CATEGORY_LABELS[asset.category]}).`,
        before: { title: asset.title, status: asset.status, url: asset.url },
      })
      toast({ title: 'Asset deleted', description: `“${asset.title}” was removed.`, tone: 'success' })
      onDeleted(asset.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete the asset.')
      setSaving(false)
    }
  }

  const busy = saving || replacing
  const previewUrl = replacement?.url ?? asset.thumbnailUrl ?? asset.url

  if (!allowed) {
    return (
      <DialogContent title="Media permission required">
        <p className="text-sm text-ink-muted">
          Only the Media Manager or an administrator can edit, replace or delete media.
        </p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    )
  }

  return (
    <DialogContent
      title="Edit media asset"
      description={`${MEDIA_CATEGORY_LABELS[asset.category]} · uploaded ${formatDate(asset.uploadedAt)}`}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button onClick={() => void saveMetadata()} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {saving && !replacing ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
          <div className="space-y-2">
            <div className="overflow-hidden rounded-card border border-line bg-black/30">
              <div className="relative w-full" style={{ aspectRatio: String(Number(aspect) || 1) }}>
                <img
                  src={previewUrl}
                  alt={asset.title}
                  className="h-full w-full object-cover"
                  style={
                    replacement
                      ? {
                          transform: `scale(${zoom})`,
                          objectPosition: `${focusX * 100}% ${focusY * 100}%`,
                        }
                      : undefined
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={STATUS_TONE[status]}>{status}</Badge>
              {asset.publicId ? <Badge tone="neutral">Cloudinary</Badge> : null}
              {featured ? <Badge tone="accent">Featured</Badge> : null}
            </div>
            <p className="text-[11px] text-ink-faint">
              {asset.width && asset.height ? `${asset.width} × ${asset.height}px` : 'Dimensions unknown'}
              {asset.bytes ? ` · ${formatBytes(asset.bytes)}` : ''}
            </p>
            <p className="break-all text-[10px] text-ink-faint">
              {asset.cloudinaryFolder ?? MEDIA_FOLDERS[asset.category]}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="w-full"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              {replacement ? 'Choose another' : 'Replace image'}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => void chooseReplacement(event.target.files?.[0])}
            />
          </div>

          <div className="space-y-3">
            <Field label="Title" htmlFor="editor-title">
              <Input
                id="editor-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Asset title"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category" htmlFor="editor-category">
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as MediaCategory)}
                  label="Category"
                  options={CATEGORY_OPTIONS}
                  className="w-full"
                />
              </Field>
              <Field label="Status" htmlFor="editor-status">
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
            <Field label="Caption" htmlFor="editor-caption">
              <Input
                id="editor-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Short public caption"
              />
            </Field>
            <Field label="Description" htmlFor="editor-description">
              <textarea
                id="editor-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                className="w-full rounded-control border border-line bg-canvas/60 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Internal or public description"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Team" htmlFor="editor-team">
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
              <Field label="Competition" htmlFor="editor-competition">
                <Select
                  value={competitionId || 'none'}
                  onValueChange={(value) => setCompetitionId(value === 'none' ? '' : value)}
                  label="Competition"
                  options={[{ value: 'none', label: 'No competition' }, ...competitionOptions]}
                  className="w-full"
                />
              </Field>
              <Field label="Match" htmlFor="editor-match">
                <Select
                  value={matchId || 'none'}
                  onValueChange={(value) => setMatchId(value === 'none' ? '' : value)}
                  label="Match"
                  options={[{ value: 'none', label: 'No match' }, ...matchOptions]}
                  className="w-full"
                />
              </Field>
              <Field label="Player" htmlFor="editor-player">
                <Select
                  value={playerId || 'none'}
                  onValueChange={(value) => setPlayerId(value === 'none' ? '' : value)}
                  label="Player"
                  options={[{ value: 'none', label: 'No player' }, ...playerOptions]}
                  className="w-full"
                />
              </Field>
            </div>
            <Field label="Tags" htmlFor="editor-tags" hint="Comma separated.">
              <Input
                id="editor-tags"
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
          </div>
        </div>

        {replacement ? (
          <div className="space-y-3 rounded-card border border-line bg-canvas/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink">Replacement crop</p>
              <span className="text-[11px] text-ink-faint">
                {replacement.width} × {replacement.height}px · {formatBytes(replacement.file.size)}
              </span>
            </div>
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
                onClick={() => setAspect(String(replacement.width / replacement.height))}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                  aspect === String(replacement.width / replacement.height)
                    ? 'border-accent/60 bg-accent/15 text-accent'
                    : 'border-line bg-canvas/40 text-ink-muted hover:border-white/20',
                )}
              >
                Original
              </button>
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
                Quality · {Math.round(quality * 100)}%
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
            </div>
            {replacing ? (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-ink-faint">Replacing image… {progress}%</p>
              </div>
            ) : null}
            <Button type="button" onClick={() => void replaceImage()} disabled={busy}>
              <CloudUpload className="h-4 w-4" aria-hidden="true" />
              {replacing ? 'Uploading…' : canUploadToCloudinary ? 'Upload replacement' : 'Save replacement'}
            </Button>
          </div>
        ) : null}

        <div className="flex items-start gap-2 rounded-control border border-line bg-canvas/40 p-3 text-[11px] leading-relaxed text-ink-faint">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Media permissions cover photography only. Official statistics, jersey numbers, positions,
          credentials and roles stay with the team manager and administrator.
        </div>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        <div className="rounded-control border border-danger/30 bg-danger/[0.05] p-3">
          {confirmDelete ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-muted">
                Delete “{asset.title}” permanently? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={saving}>
                  Keep asset
                </Button>
                <Button variant="danger" size="sm" onClick={() => void remove()} disabled={saving}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete permanently
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-muted">Archive keeps the asset. Delete removes it.</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStatus('archived')}
                  disabled={busy}
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                  Mark archived
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  )
}
