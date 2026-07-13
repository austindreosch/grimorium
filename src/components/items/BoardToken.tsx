import { useEffect, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import {
  BookmarkSimple,
  Heart,
  Info,
  Leaf,
  PencilSimple,
  Swap,
  type IconProps as PhosphorIconProps,
} from '@phosphor-icons/react'
import { PlayerState, EffectInstance, isAlive } from '../../lib/types'
import { isUnassigned } from '../../lib/unassigned'
import { RoleDefinition } from '../../lib/roles/types'
import { getRoleAbility } from '../../lib/i18n/registry'
import { IconName } from '../atoms/icon'
import { useI18n } from '../../lib/i18n'
import { cn } from '../../lib/utils'
import { CharacterToken } from './CharacterToken'
import { ReminderToken } from './ReminderToken'

export type PipView = {
  instance: EffectInstance
  icon: IconName
  iconSrc?: string
  label: string
  tone: 'good' | 'evil' | 'neutral' | 'reminder'
}

type Props = {
  player: PlayerState
  role: RoleDefinition | undefined
  size: number
  expanded: boolean
  readOnly?: boolean
  pips: PipView[]
  /** Committed cosmetic offset for this seat (added by the board). */
  offset: { x: number; y: number }
  boardCenter: { x: number; y: number }
  reminderScale?: number
  onTap: () => void
  onOpenLibrary: () => void
  onToggleDeath: () => void
  onChangeCharacter: () => void
  onEditName: () => void
  onStartMove: (instance: EffectInstance, e: React.PointerEvent) => void
  onReposition: (dx: number, dy: number) => void
}

type SatelliteTone = 'black' | 'white' | 'purple' | 'green' | 'blue'
type SatelliteAction = {
  Icon: React.ComponentType<PhosphorIconProps>
  tone: SatelliteTone
  weight?: PhosphorIconProps['weight']
  ariaLabel: string
  onClick: () => void
  angle: number
}

/**
 * One seat on the Grimoire Board: the real character token, its satellite
 * actions when expanded (info / character reminders / full library / life-death),
 * the reminder pips orbiting the disc, and the flip-to-ability info card.
 *
 * All pip drag + death routing is delegated up to the board — this component
 * only renders and starts gestures.
 */
export function BoardToken({
  player,
  role,
  size,
  expanded,
  readOnly = false,
  pips,
  offset,
  boardCenter,
  reminderScale = 0.74,
  onTap,
  onOpenLibrary,
  onToggleDeath,
  onChangeCharacter,
  onEditName,
  onStartMove,
  onReposition,
}: Props) {
  const { t, language } = useI18n()
  const [mode, setMode] = useState<'token' | 'info'>('token')
  const [drag, setDrag] = useState({ x: 0, y: 0 })

  const alive = isAlive(player)
  // An unassigned seat has no character, so no ability to flip to and reveal.
  const unassigned = isUnassigned(player.roleId)

  // Collapsing the seat (board sets expanded=false) resets its transient UI.
  useEffect(() => {
    if (!expanded) {
      setMode('token')
    }
  }, [expanded])

  // Disc gestures: drag = cosmetic reposition; tap = expand (satellites). Death is
  // an explicit satellite, not a disc-region tap — so an inspecting tap never kills
  // a player by accident. filterTaps keeps a tap from firing mid-drag.
  const bindReposition = useDrag(
    ({ tap, last, movement: [mx, my] }) => {
      if (readOnly) return
      if (tap) {
        onTap()
        return
      }
      if (last) {
        setDrag({ x: 0, y: 0 })
        if (mx !== 0 || my !== 0) onReposition(mx, my)
      } else {
        setDrag({ x: mx, y: my })
      }
    },
    { filterTaps: true, pointer: { touch: true } },
  )

  // Pip orbit geometry.
  const pipSize = Math.round(size * reminderScale)
  const orbit = size * 0.74
  const satOffset = size * 0.56
  // Hit-target floor (B4): satellites stay tappable at 20-player density even as
  // the art shrinks — overlap neighbours rather than drop below ~36px.
  const satSize = Math.max(Math.round(size * 0.28), 36)
  // Fixed cardinal placement (screen coords, y-down): E = 0, S = π/2, W = π.
  // Name-edit satellite — north on every seat; naming is the first thing a fresh
  // (unassigned) seat needs, and a quick correction on an assigned one.
  const nameSatellite: SatelliteAction = {
    Icon: PencilSimple,
    tone: 'white',
    weight: 'bold',
    ariaLabel: t.game.board.editName,
    onClick: onEditName,
    angle: -Math.PI / 2, // north
  }
  const satellites = unassigned
    ? [
        nameSatellite,
        {
          Icon: Swap,
          tone: 'blue' as const,
          weight: 'bold' as const,
          ariaLabel: t.game.board.changeCharacter,
          onClick: onChangeCharacter,
          angle: 0, // east
        },
      ]
    : ([
        {
          Icon: Info,
          tone: 'white' as const,
          ariaLabel: t.game.board.ability,
          onClick: () => setMode('info'),
          angle: Math.PI / 2, // south
        },
        {
          Icon: Leaf,
          tone: 'purple' as const,
          ariaLabel: t.game.board.allTokens,
          onClick: onOpenLibrary,
          angle: 0, // east
        },
        {
          Icon: alive ? BookmarkSimple : Heart,
          tone: alive ? 'black' as const : 'green' as const,
          weight: alive ? 'fill' as const : 'bold' as const,
          ariaLabel: alive ? t.game.board.markDead : t.game.board.revive,
          onClick: onToggleDeath,
          angle: Math.PI, // west
        },
      ] as SatelliteAction[])
  const infoOpensUp = offset.y > boardCenter.y

  return (
    <div
      className='absolute'
      style={{
        left: offset.x,
        top: offset.y,
        transform: `translate(-50%, -50%) translate(${drag.x}px, ${drag.y}px)`,
        width: size,
        height: size,
        zIndex: expanded ? 30 : 10,
        touchAction: 'none',
      }}
      data-seat-id={player.id}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Info card — the "flip the token over" ability view (never for a blank seat) */}
      {mode === 'info' && !unassigned ? (
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 rounded-2xl border border-board-gold/40 bg-parchment-200 bg-cover p-3 pt-10 shadow-xl',
            infoOpensUp ? 'bottom-0' : 'top-0',
          )}
          style={{ width: Math.max(180, size * 2.1), zIndex: 40 }}
        >
          <div className='absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 gap-2'>
            <button
              onClick={onChangeCharacter}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-board-good text-white shadow-md active:scale-95'
              aria-label={t.game.board.changeCharacter}
            >
              <Swap size={18} weight='bold' />
            </button>
            <button
              onClick={onEditName}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-white text-board-ink shadow-md active:scale-95'
              aria-label={t.game.board.editName}
            >
              <PencilSimple size={18} weight='bold' />
            </button>
          </div>
          <div className='flex flex-col items-center gap-2'>
            {/* The real character token (art only — its curved name is enough) */}
            <CharacterToken
              roleId={player.roleId}
              team={role?.team ?? 'townsfolk'}
              name={player.name}
              nameTone='card'
              size={Math.round(size * 0.9)}
            />
            <p className='text-center font-read text-base leading-snug text-board-ink'>
              {getRoleAbility(player.roleId, language)}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Orbiting reminder pips */}
          {pips.map((pip, i) => {
            // Stack pips in a short line toward board center. ponytail: compact
            // overlap beats a wide fan for the common 2-3 reminder case.
            const baseAngle = Math.atan2(
              boardCenter.y - offset.y,
              boardCenter.x - offset.x,
            )
            const step = pipSize * 0.76
            const distance = orbit + i * step
            const px = size / 2 + Math.cos(baseAngle) * distance - pipSize / 2
            const py = size / 2 + Math.sin(baseAngle) * distance - pipSize / 2
            const pipLayer = 20 + Math.max(0, Math.min(9, Math.round(((size - py) / size) * 9)))
            return (
              <div
                key={pip.instance.id}
                className='absolute'
                style={{ left: px, top: py, zIndex: pipLayer, touchAction: 'none' }}
                onPointerDown={(e) => {
                  if (readOnly) return
                  e.stopPropagation()
                  onStartMove(pip.instance, e)
                }}
              >
                <ReminderToken icon={pip.icon} iconSrc={pip.iconSrc} label={pip.label} tone={pip.tone} size={pipSize} />
              </div>
            )
          })}

          {/* The character token disc. Drag = reposition; tap = expand. A dead
              player wears the full shroud (CharacterToken dead) — life/death is
              toggled from the explicit skull/heart satellite below. */}
          <div
            {...bindReposition()}
            className='relative h-full w-full cursor-pointer'
            style={{ zIndex: 40, touchAction: 'none' }}
          >
            <CharacterToken
              roleId={player.roleId}
              team={role?.team ?? 'townsfolk'}
              name={player.name}
              size={size}
              dead={!alive}
              className={cn(expanded && 'ring-2 ring-[#21152E]/80')}
            />
          </div>

          {/* Satellite actions — only when expanded and interactive */}
          {expanded && !readOnly && (
            <>
              {satellites.map((button) => {
                return (
                  <Satellite
                    key={button.ariaLabel}
                    Icon={button.Icon}
                    pos={{
                      x: Math.cos(button.angle) * satOffset,
                      y: Math.sin(button.angle) * satOffset,
                    }}
                    size={satSize}
                    tone={button.tone}
                    weight={button.weight}
                    ariaLabel={button.ariaLabel}
                    onClick={button.onClick}
                  />
                )
              })}
            </>
          )}

        </>
      )}
    </div>
  )
}

const TONE_CLASS: Record<SatelliteTone, string> = {
  black: 'bg-black text-white',
  white: 'bg-white text-black',
  purple: 'bg-purple-700 text-white',
  green: 'bg-emerald-700 text-white',
  blue: 'bg-board-good text-white',
}

function Satellite({
  Icon,
  pos,
  size,
  tone,
  weight = 'bold',
  ariaLabel,
  onClick,
}: {
  Icon: React.ComponentType<PhosphorIconProps>
  pos: { x: number; y: number }
  size: number
  tone: keyof typeof TONE_CLASS
  weight?: PhosphorIconProps['weight']
  ariaLabel?: string
  onClick: () => void
}) {
  // Centering lives on the wrapper; the popover-in animation drives the button's
  // own transform. Keeping them on separate elements avoids the animation
  // clobbering the -50%/-50% offset (which caused the disjoint-then-snap).
  return (
    <div
      className='absolute'
      style={{
        left: `calc(50% + ${pos.x}px)`,
        top: `calc(50% + ${pos.y}px)`,
        transform: 'translate(-50%, -50%)',
        // Above the disc (z-40) so satellites aren't hidden; pips stay below the disc.
        zIndex: 50,
      }}
    >
      <button
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'flex items-center justify-center rounded-full shadow-md transition-transform active:scale-90 animate-popover-in',
          TONE_CLASS[tone],
        )}
        style={{ width: size, height: size }}
      >
        <Icon size={18} weight={weight} />
      </button>
    </div>
  )
}
