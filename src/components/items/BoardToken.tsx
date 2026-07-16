import { useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import {
  BookmarkSimple,
  Note,
  PencilSimple,
  Swap,
  type IconProps as PhosphorIconProps,
} from '@phosphor-icons/react'
import { PlayerState, EffectInstance, isAlive } from '../../lib/types'
import { isUnassigned } from '../../lib/unassigned'
import { RoleDefinition } from '../../lib/roles/types'
import { IconName } from '../atoms/icon'
import { useI18n } from '../../lib/i18n'
import { cn } from '../../lib/utils'
import { CharacterToken } from './CharacterToken'
import { ReminderToken } from './ReminderToken'

export type PipView = {
  instance: EffectInstance
  icon: IconName
  iconSrc?: string
  tokenSrc?: string
  label: string
  tone: 'good' | 'evil' | 'neutral' | 'reminder'
}

type Props = {
  player: PlayerState
  role: RoleDefinition | undefined
  size: number
  /** Board zoom factor — reposition drags are divided by it so the token tracks
   *  the finger 1:1 even while the whole board layer is scaled. */
  zoom?: number
  expanded: boolean
  readOnly?: boolean
  pips: PipView[]
  /** Instance id of a pip currently being dragged off this seat (dim its source). */
  draggingPipId?: string | null
  /** True while an in-flight pip is hovering this seat — shows a drop ring. */
  isDropTarget?: boolean
  /** Committed cosmetic offset for this seat (added by the board). */
  offset: { x: number; y: number }
  boardCenter: { x: number; y: number }
  reminderScale?: number
  onTap: () => void
  /** Double-tap a filled seat: open the full-screen role-reveal console. */
  onReveal: () => void
  onOpenLibrary: () => void
  onToggleDeath: () => void
  onChangeCharacter: () => void
  onEditName: () => void
  onStartMove: (instance: EffectInstance, e: React.PointerEvent) => void
  onReposition: (dx: number, dy: number) => void
}

type SatelliteTone = 'black' | 'white' | 'purple' | 'gray' | 'blue'
type SatelliteAction = {
  Icon: React.ComponentType<PhosphorIconProps>
  tone: SatelliteTone
  weight?: PhosphorIconProps['weight']
  dimmed?: boolean
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
  zoom = 1,
  expanded,
  readOnly = false,
  pips,
  draggingPipId = null,
  isDropTarget = false,
  offset,
  boardCenter,
  reminderScale = 0.74,
  onTap,
  onReveal,
  onOpenLibrary,
  onToggleDeath,
  onChangeCharacter,
  onEditName,
  onStartMove,
  onReposition,
}: Props) {
  const { t } = useI18n()
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const lastTapRef = useRef(0)

  const alive = isAlive(player)
  // An unassigned seat has no character, so no reveal to open.
  const unassigned = isUnassigned(player.roleId)

  // Disc gestures: drag = cosmetic reposition; single tap = expand (satellites);
  // double tap = open the role-reveal console. Death is an explicit satellite,
  // not a disc-region tap — so an inspecting tap never kills a player by accident.
  // filterTaps keeps a tap from firing mid-drag.
  const bindReposition = useDrag(
    ({ tap, last, movement: [mx, my] }) => {
      if (readOnly) return
      if (tap) {
        // ponytail: touch double-tap via timing (dblclick is unreliable on
        // touch). The first tap already ran onTap (expand); a second within
        // 300ms opens the reveal console instead.
        const now = Date.now()
        if (!unassigned && now - lastTapRef.current < 300) {
          lastTapRef.current = 0
          onReveal()
        } else {
          lastTapRef.current = now
          onTap()
        }
        return
      }
      // Screen-space drag ÷ board zoom = board-space delta, so the token stays
      // pinned to the finger no matter how far the board is zoomed in/out.
      const bx = mx / zoom
      const by = my / zoom
      if (last) {
        setDrag({ x: 0, y: 0 })
        if (bx !== 0 || by !== 0) onReposition(bx, by)
      } else {
        setDrag({ x: bx, y: by })
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
  const inwardAngle = Math.atan2(boardCenter.y - offset.y, boardCenter.x - offset.x)
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
  const satellites: SatelliteAction[] = unassigned
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
          Icon: Note,
          tone: 'purple' as const,
          ariaLabel: t.game.board.allTokens,
          onClick: onOpenLibrary,
          angle: inwardAngle,
        },
        {
          Icon: BookmarkSimple,
          tone: 'gray' as const,
          weight: 'fill' as const,
          dimmed: !alive, // dead = disabled look; tap again revives
          ariaLabel: alive ? t.game.board.markDead : t.game.board.revive,
          onClick: onToggleDeath,
          angle: inwardAngle + Math.PI,
        },
      ] as SatelliteAction[])

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
        // Re-enable hits — the board's zoom/pan wrapper is pointer-events-none.
        pointerEvents: 'auto',
      }}
      data-seat-id={player.id}
      onClick={(e) => e.stopPropagation()}
    >
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
            // Expand the touch target to ~44px around small pips without moving
            // the art — the padding is invisible but grabbable.
            const hitPad = Math.max(0, Math.round((44 - pipSize) / 2))
            const isSource = pip.instance.id === draggingPipId
            return (
              <div
                key={pip.instance.id}
                className='absolute flex items-center justify-center'
                style={{
                  left: px - hitPad,
                  top: py - hitPad,
                  padding: hitPad,
                  zIndex: isSource ? 60 : pipLayer,
                  touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  if (readOnly) return
                  e.stopPropagation()
                  onStartMove(pip.instance, e)
                }}
              >
                <div
                  className='transition-[opacity,transform] duration-150'
                  // The in-flight pip is represented by the drag ghost — fade its
                  // origin so it reads as "lifted out" rather than duplicated.
                  style={isSource ? { opacity: 0.3, transform: 'scale(0.85)' } : undefined}
                >
                  <ReminderToken icon={pip.icon} iconSrc={pip.iconSrc} tokenSrc={pip.tokenSrc} label={pip.label} tone={pip.tone} size={pipSize} />
                </div>
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
              className={cn(
                expanded && 'ring-2 ring-[#21152E]/80',
                isDropTarget && 'ring-4 ring-board-gold ring-offset-2 ring-offset-board-ink/40',
              )}
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
                    dimmed={button.dimmed}
                    ariaLabel={button.ariaLabel}
                    onClick={button.onClick}
                  />
                )
              })}
            </>
          )}

        </>
    </div>
  )
}

const TONE_CLASS: Record<SatelliteTone, string> = {
  black: 'bg-black text-white',
  white: 'bg-white text-black',
  purple: 'bg-[#2b2146] text-white',
  gray: 'bg-neutral-700 text-white',
  blue: 'bg-board-good text-white',
}

function Satellite({
  Icon,
  pos,
  size,
  tone,
  weight = 'bold',
  dimmed = false,
  ariaLabel,
  onClick,
}: {
  Icon: React.ComponentType<PhosphorIconProps>
  pos: { x: number; y: number }
  size: number
  tone: keyof typeof TONE_CLASS
  weight?: PhosphorIconProps['weight']
  dimmed?: boolean
  ariaLabel?: string
  onClick: () => void
}) {
  // Centering lives on the wrapper; the popover-in animation drives the button's
  // own transform. Keeping them on separate elements avoids the animation
  // clobbering the -50%/-50% offset (which caused the disjoint-then-snap).
  return (
    <div
      // Dim lives here, not on the button: the button runs animate-popover-in,
      // whose keyframe drives opacity 0→1 and would clobber an opacity utility
      // mid-animation (full-color flash, then snap to dim). The wrapper isn't
      // animated, so its opacity composes cleanly with the button's fade-in.
      className={cn('absolute', dimmed && 'opacity-40')}
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
          'flex items-center justify-center rounded-full shadow-[0_10px_22px_rgba(0,0,0,0.55)] transition-transform active:scale-90 animate-popover-in',
          TONE_CLASS[tone],
        )}
        style={{ width: size, height: size }}
      >
        <Icon size={18} weight={weight} />
      </button>
    </div>
  )
}
