import { ReactNode } from 'react'
import { TeamId } from '../../lib/teams'
import { cn } from '../../lib/utils'
import { Icon } from '../atoms'
import { IconName } from '../atoms/icon'
import { CardShell } from './RoleCard/CardShell'
import { CardIcon } from './RoleCard/CardIcon'
import { TEAM_ACCENT, INK } from './RoleCard/boardAccent'

// ─── OracleCard ──────────────────────────────────────────────────────────────

type OracleCardProps = {
  icon: IconName
  teamId: TeamId
  title: string
  subtitle: string
  children: ReactNode
}

/**
 * Board-style information card — an aged-parchment face carrying an ability
 * result (a count, a vision, a role). Shares the parchment shell with the
 * role-reveal card; the team ink accent (blue = good, red = evil) lets the
 * card's colour communicate the information at a glance.
 */
export function OracleCard({
  icon,
  teamId,
  title,
  subtitle,
  children,
}: OracleCardProps) {
  const accent = TEAM_ACCENT[teamId]

  return (
    <CardShell teamId={teamId}>
      {/* Icon medallion */}
      <CardIcon icon={icon} teamId={teamId} />

      {/* Title */}
      <h1
        className='font-tarot text-xl sm:text-3xl font-bold text-center uppercase tracking-widest-xl mb-1.5'
        style={{ color: INK }}
      >
        {title}
      </h1>

      {/* Subtitle (role name) */}
      <p
        className='text-center text-[11px] tracking-[0.28em] uppercase font-semibold'
        style={{ color: accent }}
      >
        {subtitle}
      </p>

      {/* Divider */}
      <div
        className='mx-auto my-4 h-px w-16'
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
        }}
      />

      {/* Result content */}
      {children}
    </CardShell>
  )
}

// ─── NumberReveal ────────────────────────────────────────────────────────────

type NumberRevealProps = {
  value: number
  label: string
  teamId: TeamId
}

/**
 * Large dramatic number display for oracle cards.
 * Used by Chef (evil pairs) and Empath (evil neighbors).
 */
export function NumberReveal({ value, label, teamId }: NumberRevealProps) {
  const accent = TEAM_ACCENT[teamId]

  return (
    <div className='text-center py-2 sm:py-4'>
      <p
        className='text-sm tracking-wide mb-4 font-read'
        style={{ color: INK, opacity: 0.75 }}
      >
        {label}
      </p>

      <div
        className='inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-parchment-100'
        style={{ boxShadow: `inset 0 0 10px rgba(60,40,20,0.4), 0 0 0 3px ${accent}33` }}
      >
        <span
          className='font-tarot text-5xl sm:text-7xl font-bold'
          style={{ color: accent }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

// ─── VisionReveal ────────────────────────────────────────────────────────────

type VisionRevealProps = {
  players: [string, string]
  verdict: string
  verdictIcon: IconName
  teamId: TeamId
}

/**
 * Dramatic vision display for the Fortune Teller oracle card.
 * Shows the two checked player names and a verdict message.
 */
export function VisionReveal({
  players,
  verdict,
  verdictIcon,
  teamId,
}: VisionRevealProps) {
  const accent = TEAM_ACCENT[teamId]

  return (
    <div className='text-center py-2 sm:py-4'>
      {/* Player name chips */}
      <div className='space-y-2 mb-5'>
        {players.map((name, i) => (
          <div
            key={i}
            className='px-4 py-2.5 rounded-lg text-center bg-parchment-100'
            style={{ border: `1px solid ${accent}44` }}
          >
            <span
              className='font-tarot text-lg tracking-wide uppercase'
              style={{ color: INK }}
            >
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div className='flex flex-col items-center gap-2'>
        <span style={{ color: accent }}>
          <Icon name={verdictIcon} size='xl' />
        </span>
        <p
          className={cn(
            'font-tarot text-lg sm:text-xl uppercase tracking-wider leading-relaxed',
          )}
          style={{ color: INK }}
        >
          {verdict}
        </p>
      </div>
    </div>
  )
}
