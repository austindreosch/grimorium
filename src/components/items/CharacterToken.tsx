import { useId } from 'react'
import { UserPlus } from 'lucide-react'
import { BLANK_TOKEN, getRoleArt, getTokenArt, PARCHMENT_TEXTURE, SHROUD_TEXTURE } from '../../lib/roles/art'
import { isUnassigned } from '../../lib/unassigned'
import { useI18n } from '../../lib/i18n'
import { TeamId } from '../../lib/teams'
import { cn } from '../../lib/utils'

type Props = {
  roleId: string
  /** Baked into the token PNG now; kept so existing callers still type-check. */
  team?: TeamId
  /** Player name, curved along the bottom arc. Omit for an art-only token. */
  name?: string
  nameTone?: 'board' | 'card'
  /** Token diameter in px. Board ~84, list/badge ~40, reveal ~160. */
  size?: number
  dead?: boolean
  onClick?: () => void
  className?: string
}

/**
 * A Blood on the Clocktower character token. The disc itself is a single
 * pre-composed PNG (parchment, border, character art, and the role name all
 * baked in — the physical game piece). The player's name is curved above the
 * disc, and dead players get a shroud overlay.
 */
export function CharacterToken({
  roleId,
  team,
  name,
  nameTone = 'board',
  size = 84,
  dead = false,
  onClick,
  className,
}: Props) {
  const { t } = useI18n()
  const id = useId()
  const Tag = onClick ? 'button' : 'div'
  const nameIsCard = nameTone === 'card'

  // Player name — smaller and curved above the disc.
  const nameArc = name ? (
    <svg
      viewBox='0 -10 180 42'
      className='pointer-events-none absolute bottom-[92%] left-1/2 h-[24%] -translate-x-1/2 overflow-visible'
      style={{ width: Math.max(size * 1.75, name.length * 13) }}
      aria-hidden
    >
      <defs>
        <path id={`name-arc-${id}`} d='M 8 30 Q 90 -24 172 30' fill='none' />
      </defs>
      <text
        fill={nameIsCard ? '#17110B' : '#F4EFE6'}
        className='font-body font-bold uppercase'
        style={{
          fontSize: 14,
          letterSpacing: '1px',
          textShadow: nameIsCard ? 'none' : '0 1px 3px rgba(0,0,0,0.85)',
        }}
      >
        <textPath href={`#name-arc-${id}`} startOffset='50%' textAnchor='middle'>
          {name}
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

  return (
    <Tag
      onClick={onClick}
      style={{ width: size, height: size, backgroundImage: `url(${PARCHMENT_TEXTURE})` }}
      className={cn(
        'relative rounded-full shrink-0 select-none',
        'bg-parchment-200 bg-cover bg-center',
        'shadow-[0_2px_6px_rgba(0,0,0,0.5)]',
        onClick && 'transition-transform active:scale-95',
        className,
      )}
    >
      {/* Full pre-composed token — parchment, art, and role name baked into one PNG */}
      <img
        src={getTokenArt(roleId)}
        alt=''
        draggable={false}
        onError={(e) => {
          // Custom/unknown role with no baked token — fall back to generic role art.
          if (team && !e.currentTarget.src.endsWith('.webp')) {
            e.currentTarget.src = getRoleArt(roleId, team)
            return
          }
          if (e.currentTarget.src.endsWith('_blank.png')) return
          e.currentTarget.src = BLANK_TOKEN
        }}
        className={cn(
          'absolute inset-0 h-full w-full rounded-full object-contain',
          dead && 'opacity-70 saturate-50',
        )}
      />

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
