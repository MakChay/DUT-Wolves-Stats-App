import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types/domain'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export interface RoleArea {
  role: Exclude<UserRole, 'public' | 'media_manager'>
  label: string
  base: string
  items: NavItem[]
}

export const roleAreas: Record<Exclude<UserRole, 'public' | 'media_manager'>, RoleArea> = {
  manager: {
    role: 'manager',
    label: 'Team manager',
    base: '/manager',
    items: [
      { label: 'Overview', to: '/manager', icon: LayoutDashboard, end: true },
      { label: 'Matches', to: '/manager/matches', icon: CalendarDays },
      { label: 'Live Match Centre', to: '/manager/live', icon: Radio },
      { label: 'Players', to: '/manager/players', icon: Users },
      { label: 'Change requests', to: '/manager/requests', icon: ClipboardCheck },
      { label: 'Rosters', to: '/manager/rosters', icon: ClipboardList },
      { label: 'Competitions', to: '/manager/competitions', icon: Trophy },
      { label: 'Statistics', to: '/manager/stats', icon: BarChart3 },
      { label: 'Reports', to: '/manager/reports', icon: FileText },
      { label: 'Settings', to: '/manager/settings', icon: Settings },
    ],
  },
  coach: {
    role: 'coach',
    label: 'Coach',
    base: '/coach',
    items: [
      { label: 'Overview', to: '/coach', icon: LayoutDashboard, end: true },
      { label: 'Matches', to: '/coach/matches', icon: CalendarDays },
      { label: 'Team Statistics', to: '/coach/stats', icon: BarChart3 },
      { label: 'Players', to: '/coach/players', icon: Users },
      { label: 'Performance Analytics', to: '/coach/analytics', icon: Trophy },
      { label: 'Change requests', to: '/coach/requests', icon: ClipboardCheck },
      { label: 'Reports', to: '/coach/reports', icon: FileText },
    ],
  },
  player: {
    role: 'player',
    label: 'Player',
    base: '/player',
    items: [
      { label: 'My Dashboard', to: '/player', icon: LayoutDashboard, end: true },
      { label: 'My Statistics', to: '/player/stats', icon: BarChart3 },
      { label: 'Match History', to: '/player/history', icon: CalendarDays },
      { label: 'Team Statistics', to: '/player/team', icon: Users },
      { label: 'My Profile', to: '/player/profile', icon: UserRound },
    ],
  },
  admin: {
    role: 'admin',
    label: 'System administrator',
    base: '/admin',
    items: [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Teams', to: '/admin/teams', icon: ShieldCheck },
      { label: 'Users', to: '/admin/users', icon: Users },
      { label: 'Competitions', to: '/admin/competitions', icon: Trophy },
      { label: 'Matches', to: '/admin/matches', icon: CalendarDays },
    ],
  },
}

export const publicNav: NavItem[] = [
  { label: 'Home', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Live Scores', to: '/live', icon: Radio },
  { label: 'Fixtures', to: '/fixtures', icon: CalendarDays },
  { label: 'Results', to: '/results', icon: Trophy },
  { label: 'Teams', to: '/teams', icon: Users },
  { label: 'Player Stats', to: '/players', icon: BarChart3 },
  { label: 'Standings', to: '/standings', icon: FileText },
]
