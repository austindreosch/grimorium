import { useId } from 'react'
import { UserPlus } from 'lucide-react'
import { getRoleArt, PARCHMENT_TEXTURE, SHROUD_TEXTURE } from '../../lib/roles/art'
import { isUnassigned } from '../../lib/unassigned'
import { getRoleName } from '../../lib/i18n/registry'
import { useI18n } from '../../lib/i18n'
import { TeamId } from '../../lib/teams'
import { cn } from '../../lib/utils'

type Props = {
  roleId: string
  team: TeamId
  /** Player name, curved along the bottom arc. Omit for an art-only token. */
  name?: string
  nameTone?: 'board' | 'card'
  /** Token diameter in px. Board ~84, list/badge ~40, reveal ~160. */
  size?: number
  dead?: boolean
  centerArt?: boolean
  onClick?: () => void
  className?: string
}

/**
 * A Blood on the Clocktower character token — an aged-parchment disc with the
 * official character art and the player's name curved along the bottom arc,
 * matching the physical game piece. Dead players get a shroud overlay.
 */
export function CharacterToken({
  roleId,
  team,
  name,
  nameTone = 'board',
  size = 84,
  dead = false,
  centerArt = false,
  onClick,
  className,
}: Props) {
  const { t, language } = useI18n()
  const id = useId()
  const Tag = onClick ? 'button' : 'div'
  const nameIsCard = nameTone === 'card'

  // Player name — smaller and curved above the disc.
  const nameArc = name ? (
    <svg
      viewBox='0 0 180 18'
      className='pointer-events-none absolute bottom-full left-1/2 h-[22%] -translate-x-1/2 overflow-visible'
      style={{ width: Math.max(size * 1.75, name.length * 13) }}
      aria-hidden
    >
      <defs>
        <path id={`name-arc-${id}`} d='M 8 14 Q 90 6 172 14' fill='none' />
      </defs>
      <text
        fill={nameIsCard ? '#17110B' : '#F4EFE6'}
        className='font-body font-bold uppercase'
        style={{
          fontSize: 12,
          letterSpacing: '1.2px',
          textShadow: nameIsCard ? 'none' : '0 1px 3px rgba(0,0,0,0.85)',
        }}
      >
        <textPath href={`#name-arc-${id}`} startOffset='50%' textAnchor='middle'>
          {name}
        </textPath>
      </text>
    </svg>
  ) : null

  // Character name curved along the bottom arc — only on assigned tokens.
  const roleName = isUnassigned(roleId) ? '' : getRoleName(roleId, language)
  const roleLetterSpacing = 2.2
  const roleTextWidth =
    roleName.length * 20 * 0.58 + Math.max(0, roleName.length - 1) * roleLetterSpacing
  const fittedRoleWidth = roleTextWidth > 136 ? 136 : undefined
  const roleArc = name && roleName ? (
    <svg
      viewBox='0 0 100 100'
      className='absolute inset-0 h-full w-full overflow-visible'
      aria-hidden
    >
      <defs>
        <path id={`arc-${id}`} d='M 4 48 A 46 46 0 0 0 96 48' fill='none' />
      </defs>
      <text
        fill='#3A2A15'
        className='font-token uppercase'
        lengthAdjust={fittedRoleWidth ? 'spacingAndGlyphs' : undefined}
        textLength={fittedRoleWidth}
        style={{
          fontSize: 20,
          letterSpacing: `${roleLetterSpacing}px`,
        }}
      >
        <textPath href={`#arc-${id}`} startOffset='50%' textAnchor='middle'>
          {roleName}
        </textPath>
      </text>
    </svg>
  ) : null

  // Unassigned seat (Simple-Mode manual deal): a visibly distinct blank disc —
  // desaturated parchment, dashed ring, a userPlus glyph, and no team tint or art.
  if (isUnassigned(roleId)) {
    return (
      <Tag
        onClick={onClick}
        aria-label={t.game.board.unassignedSeat}
        style={{ width: size, height: size }}
        className={cn(
          'relative flex shrink-0 select-none items-center justify-center rounded-full',
          'border-2 border-dashed border-parchment-400/50',
          onClick && 'transition-transform active:scale-95',
          className,
        )}
      >
        {/* Desaturated parchment disc — cohesive with real tokens, clearly empty */}
        <div
          className='absolute inset-0 rounded-full bg-parchment-200 bg-cover bg-center opacity-40 grayscale'
          style={{ backgroundImage: `url(${PARCHMENT_TEXTURE})` }}
        />
        <UserPlus
          size={Math.round(size * 0.38)}
          strokeWidth={1.75}
          className='relative text-parchment-500/80'
        />
        {nameArc}
      </Tag>
    )
  }

  const art = getRoleArt(roleId, team)

  return (
    <Tag
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        'relative rounded-full shrink-0 select-none',
        'shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.25)]',
        onClick && 'transition-transform active:scale-95',
        className,
      )}
    >
      {/* Parchment disc */}
      <div
        className='absolute inset-0 rounded-full bg-parchment-200 bg-cover bg-center'
        style={{
          backgroundImage: `url(${PARCHMENT_TEXTURE})`,
          boxShadow: 'inset 0 0 8px rgba(60,40,20,0.45)',
        }}
      />

      {/* Character art */}
      <img
        src={art}
        alt=''
        draggable={false}
        className={cn(
          'absolute rounded-full object-contain',
          dead && 'opacity-70 saturate-50',
        )}
        style={centerArt
          ? { top: '8%', left: '8%', width: '84%', height: '84%' }
          : { top: '-5%', left: '8%', width: '84%', height: '84%' }}
      />

      {/* Character name curved along the bottom arc */}
      {roleArc}

      {/* Player name curved above the disc */}
      {nameArc}

      {/* Shroud — the real black swallowtail cloth draped over a dead token */}
      {dead && (
        <img
          src={SHROUD_TEXTURE}
          alt=''
          draggable={false}
          aria-hidden
          className='pointer-events-none absolute left-1/2 -translate-x-1/2'
          style={{
            top: '-6%',
            width: '52%',
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
          }}
        />
      )}
    </Tag>
  )
}
