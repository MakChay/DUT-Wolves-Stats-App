import type { AuditAction, AuditEntityType, User } from '@/types/domain'
import { repositories } from '@/services/repositories'

interface RecordAuditInput {
  user: User | null
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  summary: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

/**
 * Appends an immutable audit entry. The actor is always taken from the signed-in
 * demo user; callers cannot spoof it.
 */
export async function recordAudit({
  user,
  entityType,
  entityId,
  action,
  summary,
  before = null,
  after = null,
}: RecordAuditInput): Promise<void> {
  if (!user) return
  await repositories.audit.record({
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    entityType,
    entityId,
    action,
    actorUserId: user.id,
    actorName: user.displayName,
    actorRole: user.role,
    summary,
    before,
    after,
    createdAt: new Date().toISOString(),
  })
}
