import type { AppNotification, Team } from '@/types/domain'
import { repositories } from '@/services/repositories'

/** Creates an in-app notification for one or more recipients. */
export async function notifyUsers(
  userIds: string[],
  notification: Omit<AppNotification, 'id' | 'userId' | 'createdAt' | 'readAt'>,
): Promise<void> {
  await Promise.all(
    userIds.map((userId) =>
      repositories.notifications.create({
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${userId}`,
        userId,
        createdAt: new Date().toISOString(),
      }),
    ),
  )
}

export function managerIdsForTeam(team: Team): string[] {
  return team.managerId ? [team.managerId] : []
}
