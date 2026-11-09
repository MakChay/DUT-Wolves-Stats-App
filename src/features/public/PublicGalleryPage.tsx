import { useMemo, useState } from 'react'
import { Camera, Image as ImageIcon, Maximize2, Shield } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { PublicGate } from '@/features/public/PublicGate'
import type { PublicData } from '@/features/public/usePublicData'
import {
  MEDIA_CATEGORY_LABELS,
  type MediaAsset,
  type MediaCategory,
} from '@/types/domain'
import { formatDate } from '@/utils/format'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All media' },
  ...(Object.keys(MEDIA_CATEGORY_LABELS) as MediaCategory[]).map((value) => ({
    value,
    label: MEDIA_CATEGORY_LABELS[value],
  })),
]

function GalleryContent({ data }: { data: PublicData }) {
  const [category, setCategory] = useState('all')
  const [teamId, setTeamId] = useState('all')
  const [selected, setSelected] = useState<MediaAsset | null>(null)

  const dutTeams = data.teams.filter(
    (team) => team.id === 'team-men' || team.id === 'team-women',
  )

  const assets = useMemo(() => {
    return data.media
      .filter((asset) => asset.status === 'published')
      .filter((asset) => category === 'all' || asset.category === category)
      .filter((asset) => teamId === 'all' || asset.teamId === teamId)
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1
        return (b.publishedAt ?? b.uploadedAt).localeCompare(a.publishedAt ?? a.uploadedAt)
      })
  }, [data.media, category, teamId])

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Media"
        title="DUT Wolves gallery"
        description="Published team photography, match galleries, posters and promotional graphics."
        actions={
          <Badge tone="accent">
            <Camera className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {data.media.length} published
          </Badge>
        }
      />

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
          <Select
            label="Media type"
            value={category}
            onValueChange={setCategory}
            options={CATEGORY_OPTIONS}
            className="w-full"
          />
          <Select
            label="Team"
            value={teamId}
            onValueChange={setTeamId}
            options={[
              { value: 'all', label: 'All teams' },
              ...dutTeams.map((team) => ({ value: team.id, label: team.name })),
            ]}
            className="w-full"
          />
        </CardContent>
      </Card>

      {assets.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No published media"
          description="Photography appears here once the Media Manager publishes it."
        />
      ) : (
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>*]:mb-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setSelected(asset)}
              className="group relative block w-full overflow-hidden rounded-control border border-line text-left"
            >
              <img
                src={asset.thumbnailUrl ?? asset.url}
                alt={asset.caption ?? asset.title}
                className="w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="absolute inset-x-0 bottom-0 translate-y-1 p-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <span className="line-clamp-1 block text-[11px] font-semibold text-white">
                  {asset.title}
                </span>
                <span className="block text-[10px] text-white/70">
                  {MEDIA_CATEGORY_LABELS[asset.category]}
                </span>
              </span>
              <span className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <Dialog open onOpenChange={(open) => (open ? undefined : setSelected(null))}>
          <DialogContent
            title={selected.title}
            description={selected.caption ?? MEDIA_CATEGORY_LABELS[selected.category]}
            className="max-w-3xl"
            footer={
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            }
          >
            <div className="space-y-3">
              <img
                src={selected.url}
                alt={selected.caption ?? selected.title}
                className="max-h-[60vh] w-full rounded-control object-contain"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{MEDIA_CATEGORY_LABELS[selected.category]}</Badge>
                {selected.teamId ? (
                  <Badge tone="accent">
                    <Shield className="mr-1 h-3 w-3" aria-hidden="true" />
                    {data.teamById.get(selected.teamId)?.shortName ?? 'Team'}
                  </Badge>
                ) : null}
                <span className="text-[11px] text-ink-faint">
                  {formatDate(selected.publishedAt ?? selected.uploadedAt)}
                </span>
              </div>
              {selected.description ? (
                <p className="text-xs leading-relaxed text-ink-muted">{selected.description}</p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <p className="text-[11px] text-ink-faint">
        Only published photography appears here. Uploads and drafts stay inside the Media Studio.
      </p>
    </div>
  )
}

export function PublicGalleryPage() {
  return (
    <PublicGate>{(data) => <GalleryContent data={data} />}</PublicGate>
  )
}
