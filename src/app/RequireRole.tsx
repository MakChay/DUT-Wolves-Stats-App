import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types/domain'
import { homePathForRole, useAuth } from '@/features/auth/AuthContext'
import { LoadingScreen } from '@/components/brand/loading-screen'

export function RequireRole({
  roles,
  children,
}: {
  roles: Exclude<UserRole, 'public'>[]
  children: ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!roles.includes(user.role as Exclude<UserRole, 'public'>)) {
    return <Navigate to={homePathForRole(user)} replace />
  }

  return <>{children}</>
}
