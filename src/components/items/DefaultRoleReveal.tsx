import { getRole } from '../../lib/roles'
import { getTeam } from '../../lib/teams'
import { useI18n } from '../../lib/i18n'
import { RoleCard } from './RoleCard'
import { CardLink } from './TeamBackground'
import { cn } from '../../lib/utils'
import type { RoleRevealProps } from '../../lib/roles/types'
import { useHandback } from '../context/PlayerFacingContext'

// Team ink accent for the leather backdrop's tint (mirrors RoleCard).
const TEAM_GLOW: Record<string, string> = {
  townsfolk: 'rgba(47,92,143,0.28)',
  outsider: 'rgba(94,140,186,0.24)',
  minion: 'rgba(184,74,44,0.26)',
  demon: 'rgba(138,34,34,0.32)',
}

/**
 * Standard role revelation screen used by most roles.
 * Shows "You are the..." text, the role card, and "I understand my role" link
 * on a black-leather board backdrop with a subtle team-tinted glow.
 *
 * Roles that need a custom reveal (e.g., showing extra context or player names)
 * should compose a backdrop + RoleCard + CardLink directly instead.
 */
export function DefaultRoleReveal({ player, onContinue }: RoleRevealProps) {
  const { t } = useI18n()
  const { requestHandback } = useHandback()
  const role = getRole(player.roleId)
  const teamId = role?.team ?? 'townsfolk'
  const isEvil = getTeam(teamId).isEvil

  return (
    <div className='relative min-h-app flex flex-col items-center justify-center p-4 bg-board-leather overflow-hidden'>
      {/* Team-tinted glow rising behind the card */}
      <div
        className='pointer-events-none absolute inset-0'
        style={{
          background: `radial-gradient(120% 80% at 50% 42%, ${TEAM_GLOW[teamId]}, transparent 70%)`,
        }}
      />

      <div className='relative flex flex-col items-center'>
        <p
          className={cn(
            'text-center text-sm uppercase tracking-widest font-semibold mb-5',
            isEvil ? 'text-board-evilSoft' : 'text-parchment-300/80',
          )}
        >
          {t.common.youAreThe}
        </p>

        <RoleCard roleId={player.roleId} />

        <CardLink onClick={() => requestHandback(onContinue)} isEvil={isEvil}>
          {t.common.iUnderstandMyRole}
        </CardLink>
      </div>
    </div>
  )
}
