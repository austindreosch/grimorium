import { useId } from 'react'
import { getRoleArt, PARCHMENT_TEXTURE } from '../../lib/roles/art'
import { TeamId } from '../../lib/teams'
import { cn } from '../../lib/utils'

type Props = {
  roleId: string
  team: TeamId
  /** Player name, curved along the bottom arc. Omit for an art-only token. */
  name?: string
  /** Token diameter in px. Board ~84, list/badge ~40, reveal ~160. */
  size?: number
  dead?: boolean
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
  size = 84,
  dead = false,
  onClick,
  className,
}: Props) {
  const id = useId()
  const art = getRoleArt(roleId, team)
  const Tag = onClick ? 'button' : 'div'

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
        style={{ inset: '8%', width: '84%', height: '84%' }}
      />

      {/* Curved name along the bottom arc */}
      {name && (
        <svg
          viewBox='0 0 100 100'
          className='absolute inset-0 h-full w-full overflow-visible'
          aria-hidden
        >
          <defs>
            <path id={`arc-${id}`} d='M 15 55 A 35 35 0 0 0 85 55' fill='none' />
          </defs>
          <text
            fill='#3A2A15'
            className='font-token uppercase'
            style={{
              fontSize: name.length > 9 ? 8 : 10,
              letterSpacing: '0.5px',
            }}
          >
            <textPath href={`#arc-${id}`} startOffset='50%' textAnchor='middle'>
              {name}
            </textPath>
          </text>
        </svg>
      )}

      {/* Shroud — draped over the top of a dead player's token */}
      {dead && (
        <div
          className='pointer-events-none absolute inset-0 rounded-full'
          style={{
            background:
              'linear-gradient(180deg, rgba(15,15,18,0.82) 0%, rgba(20,20,24,0.6) 45%, rgba(20,20,24,0.15) 75%, transparent 100%)',
          }}
        />
      )}
    </Tag>
  )
}
