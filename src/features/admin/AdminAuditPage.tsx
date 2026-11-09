import { useMemo, useState } from 'react'
import { ScrollText, Search, ShieldCheck } from 'lucide-react'
import type { AuditAction, AuditEntry, AuditEntityType } from '@/types/domain'
import { repositories } from '@/services/repositories'
import { useAsync } from '@/hooks/useAsync'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableWrap, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatDateTime } from '@/utils/format'

const ACTION_TONE: Record<AuditAction, 'success' | 'warning' | 'danger' | 'accent' | 'neutral'> = {
  create: 'success',
  update: 'warning',
  delete: 'danger',
  publish: 'accent',
  archive: 'neutral',
  assign: 'accent',
  withdraw: 'neutral',
  submit: 'success',
  amend: 'warning',
  accept: 'success',
  reject: 'danger',
  complete: 'success',
  void: 'danger',
}

const ENTITY_OPTIONS: { value: AuditEntityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All entities' },
  { value: 'match', label: 'Matches' },
  { value: 'event', label: 'Events' },
  { value: 'player', label: 'Players' },
  { value: 'team', label: 'Teams' },
  { value: 'competition', label: 'Competitions' },
  { value: 'user', label: 'Users' },
  { value: 'report', label: 'Reports' },
  { value: 'change_request', label: 'Change requests' },
  { value: 'registration', label: 'Registrations' },
  { value: 'media', label: 'Media' },
]

const ACTION_OPTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'All actions' },
  ...(
    [
      'create',
      'update',
      'delete',
      'publish',
      'archive',
      'assign',
      'withdraw',
      'submit',
      'amend',
      'accept',
      'reject',
      'complete',
      'void',
    ] as AuditAction[]
  ).map((value) => ({ value, label: value })),
]

export function AdminAuditPage() {
  const { data, loading, error, reload } = useAsync<AuditEntry[]>(() => repositories.audit.list(300), [])
  const [query, setQuery] = useState('')
  const [entity, setEntity] = useState<AuditEntityType | 'all'>('all')
  const [action, setAction] = useState<AuditAction | 'all'>('all')
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  const entries = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data ?? []).filter((entry) => {
      if (entity !== 'all' && entry.entityType !== entity) return false
      if (action !== 'all' && entry.action !== action) return false
      if (!term) return true
      return [entry.summary, entry.actorName, entry.actorRole, entry.entityId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [data, query, entity, action])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={10} />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Audit log could not be loaded"
        description={error}
        action={<Button onClick={reload}>Try again</Button>}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Audit"
        title="Audit trail"
        description="Every official change is recorded with the actor, role and timestamp. Entries are append-only."
        actions={<Badge tone="neutral">{entries.length} shown</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative block">
            <span className="sr-only">Search audit entries</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actor or summary"
              className="pl-9"
            />
          </label>
          <Select
            label="Entity"
            value={entity}
            onValueChange={(value) => setEntity(value as AuditEntityType | 'all')}
            options={ENTITY_OPTIONS}
            className="w-full"
          />
          <Select
            label="Action"
            value={action}
            onValueChange={(value) => setAction(value as AuditAction | 'all')}
            options={ACTION_OPTIONS}
            className="w-full"
          />
          <div className="flex items-end justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('')
                setEntity('all')
                setAction('all')
              }}
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries match"
          description="Try clearing the search or filters. Entries appear after official records are changed."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Actor</TH>
                <TH>Entity</TH>
                <TH>Action</TH>
                <TH>Summary</TH>
                <TH><span className="sr-only">Details</span></TH>
              </tr>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <TR key={entry.id}>
                  <TD className="whitespace-nowrap text-xs text-ink-muted">{formatDateTime(entry.createdAt)}</TD>
                  <TD>
                    <p className="font-medium text-ink">{entry.actorName}</p>
                    <p className="text-[10px] uppercase tracking-wider text-ink-faint">{entry.actorRole}</p>
                  </TD>
                  <TD>
                    <p className="text-xs text-ink">{entry.entityType.replace('_', ' ')}</p>
                    <p className="max-w-[160px] truncate text-[10px] text-ink-faint">{entry.entityId}</p>
                  </TD>
                  <TD><Badge tone={ACTION_TONE[entry.action] ?? 'neutral'}>{entry.action}</Badge></TD>
                  <TD className="max-w-[380px] text-xs text-ink-muted">{entry.summary}</TD>
                  <TD>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(entry)}>
                      View
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => (!open ? setSelected(null) : undefined)}>
        {selected ? (
          <DialogContent
            title="Audit entry"
            description={`${selected.entityType.replace('_', ' ')} · ${selected.entityId}`}
            className="max-w-2xl"
            footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}
          >
            <div className="space-y-3 text-xs">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-control border border-line bg-canvas/40 p-2.5">
                  <p className="label-caps">Actor</p>
                  <p className="mt-0.5 text-ink">{selected.actorName} · {selected.actorRole}</p>
                </div>
                <div className="rounded-control border border-line bg-canvas/40 p-2.5">
                  <p className="label-caps">Recorded</p>
                  <p className="mt-0.5 text-ink">{formatDateTime(selected.createdAt)}</p>
                </div>
              </div>
              <div className="rounded-control border border-line bg-canvas/40 p-2.5">
                <p className="label-caps">Summary</p>
                <p className="mt-0.5 leading-relaxed text-ink-muted">{selected.summary}</p>
              </div>
              {selected.before ? (
                <div className="rounded-control border border-line bg-canvas/40 p-2.5">
                  <p className="label-caps">Before</p>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-ink-muted">
                    {JSON.stringify(selected.before, null, 2)}
                  </pre>
                </div>
              ) : null}
              {selected.after ? (
                <div className="rounded-control border border-line bg-canvas/40 p-2.5">
                  <p className="label-caps">After</p>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] text-ink-muted">
                    {JSON.stringify(selected.after, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}
