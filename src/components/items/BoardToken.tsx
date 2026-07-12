import { useEffect, useRef, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { PlayerState, EffectInstance, isAlive } from '../../lib/types'
import { isUnassigned } from '../../lib/unassigned'
import { RoleDefinition } from '../../lib/roles/types'
import { getRoleAbility, getRoleDescription, getRoleName } from '../../lib/i18n/registry'
import { ReminderDef } from '../../lib/reminders/catalog'
import { IconName } from '../atoms/icon'
import { Icon } from '../atoms'
import { useI18n } from '../../lib/i18n'
import { cn } from '../../lib/utils'
import { CharacterToken } from './CharacterToken'
import { ReminderToken } from './ReminderToken'

export type PipView = {
  instance: EffectInstance
  icon: IconName
  label: string
  tone: 'good' | 'evil' | 'neutral'
}

type Props = {
  player: PlayerState
  role: RoleDefinition | undefined
  size: number
  expanded: boolean
  readOnly?: boolean
  characterReminders: ReminderDef[]
  pips: PipView[]
  /** Committed cosmetic offset for this seat (added by the board). */
  offset: { x: number; y: number }
  onTap: () => void
  onOpenLibrary: () => void
  onToggleDeath: () => void
  onChangeCharacter: () => void
  onStartSpawn: (def: ReminderDef, e: React.PointerEvent) => void
  onStartMove: (instance: EffectInstance, e: React.PointerEvent) => void
  onReposition: (dx: number, dy: number) => void
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
  characterReminders,
  pips,
  offset,
  onTap,
  onOpenLibrary,
  onToggleDeath,
  onChangeCharacter,
  onStartSpawn,
  onStartMove,
  onReposition,
}: Props) {
  const { t, language } = useI18n()
  const [mode, setMode] = useState<'token' | 'info'>('token')
  const [showFan, setShowFan] = useState(false)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const discRef = useRef<HTMLDivElement>(null)

  const alive = isAlive(player)
  const hasReminders = characterReminders.length > 0
  // An unassigned seat has no character, so no ability to flip to and reveal.
  const unassigned = isUnassigned(player.roleId)

  // Collapsing the seat (board sets expanded=false) resets its transient UI.
  useEffect(() => {
    if (!expanded) {
      setMode('token')
      setShowFan(false)
    }
  }, [expanded])

  // Disc gestures: drag = cosmetic reposition; tap on the upper half expands,
  // tap on the lower/shroud half toggles life/death. filterTaps keeps a tap from
  // firing mid-drag; the lower/upper split is decided at pointer-up from the
  // pointer's Y vs the disc's mid-height (bounding-rect math), so it never fires
  // during a reposition drag.
  const bindReposition = useDrag(
    ({ tap, last, xy, movement: [mx, my] }) => {
      if (readOnly) return
      if (tap) {
        // ponytail: mid-height split heuristic. Lower half = shroud (life/death),
        // upper half = expand. Tune the 0.5 threshold if the shroud feels off.
        const rect = discRef.current?.getBoundingClientRect()
        if (rect && xy[1] > rect.top + rect.height / 2) onToggleDeath()
        else onTap()
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
  const pipSize = Math.round(size * 0.36)
  const orbit = size * 0.62
  const satOffset = size * 0.66
  // Hit-target floor (B4): satellites stay tappable at 20-player density even as
  // the art shrinks — overlap neighbours rather than drop below ~40px.
  const satSize = Math.max(Math.round(size * 0.34), 40)

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
          className='absolute left-1/2 top-0 -translate-x-1/2 rounded-2xl border border-board-gold/40 bg-parchment-200 bg-cover p-3 pt-9 shadow-xl'
          style={{ width: Math.max(180, size * 2.1), zIndex: 40 }}
        >
          <button
            onClick={() => setMode('token')}
            className='absolute left-1/2 top-2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-black text-white shadow-md active:scale-95'
            aria-label={t.common.back}
          >
            <Icon name='arrowLeft' size='sm' />
          </button>
          <div className='flex flex-col items-center gap-2'>
            <CharacterToken
              roleId={player.roleId}
              team={role?.team ?? 'townsfolk'}
              size={Math.round(size * 0.9)}
            />
            <p className='text-center font-tarot text-base uppercase tracking-wider text-board-ink'>
              {getRoleName(player.roleId, language)}
            </p>
            {/* Official verbatim ability */}
            <p className='text-center font-read text-sm leading-snug text-board-ink'>
              {getRoleAbility(player.roleId, language)}
            </p>
            {/* Plain-English paraphrase, kept alongside as a secondary note */}
            <p className='text-center font-read text-xs italic leading-snug text-board-ink/60'>
              {getRoleDescription(player.roleId, language)}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Orbiting reminder pips */}
          {pips.map((pip, i) => {
            const a = (i / pips.length) * Math.PI * 2 - Math.PI / 2
            const px = size / 2 + Math.cos(a) * orbit - pipSize / 2
            const py = size / 2 + Math.sin(a) * orbit - pipSize / 2
            return (
              <div
                key={pip.instance.id}
                className='absolute'
                style={{ left: px, top: py, zIndex: 20, touchAction: 'none' }}
                onPointerDown={(e) => {
                  if (readOnly) return
                  e.stopPropagation()
                  onStartMove(pip.instance, e)
                }}
              >
                <ReminderToken icon={pip.icon} label={pip.label} tone={pip.tone} size={pipSize} />
              </div>
            )
          })}

          {/* The character token disc. Drag = reposition; upper-half tap = expand;
              lower/shroud-half tap = toggle life/death (see bindReposition). */}
          <div
            ref={discRef}
            {...bindReposition()}
            className='relative h-full w-full cursor-pointer'
            style={{ touchAction: 'none' }}
          >
            <CharacterToken
              roleId={player.roleId}
              team={role?.team ?? 'townsfolk'}
              name={player.name}
              size={size}
              dead={!alive}
              className={cn(expanded && 'ring-2 ring-board-gold/70')}
            />
            {/* Persistent shroud fold line — makes the lower-half death-tap
                discoverable on alive assigned tokens. */}
            {alive && !unassigned && (
              <div
                aria-hidden
                className='pointer-events-none absolute left-[16%] right-[16%] bg-black/15'
                style={{ top: '62%', height: 1 }}
              />
            )}
          </div>

          {/* Satellite actions — only when expanded and interactive */}
          {expanded && !readOnly && (
            <>
              {!unassigned && (
                <Satellite
                  icon='info'
                  pos={{ x: 0, y: -satOffset }}
                  size={satSize}
                  tone='grey'
                  ariaLabel={t.game.board.ability}
                  onClick={() => setMode('info')}
                />
              )}
              {hasReminders && (
                <Satellite
                  icon='leaf'
                  pos={{ x: satOffset, y: 0 }}
                  size={satSize}
                  tone='orange'
                  ariaLabel={t.game.board.characterReminders}
                  onClick={() => setShowFan((v) => !v)}
                />
              )}
              <Satellite
                icon='layoutGrid'
                pos={{ x: -satOffset, y: 0 }}
                size={satSize}
                tone='purple'
                ariaLabel={t.game.board.allTokens}
                onClick={onOpenLibrary}
              />
              {/* South satellite is now Change Character; life/death moved to the
                  shroud-half tap on the disc (B1/B3). */}
              <Satellite
                icon='userPlus'
                pos={{ x: 0, y: satOffset }}
                size={satSize}
                tone='blue'
                ariaLabel={t.game.board.changeCharacter}
                onClick={onChangeCharacter}
              />
            </>
          )}

          {/* Character-reminder fan (orange) — this role's own tokens */}
          {expanded && showFan && (
            <div
              className='absolute left-full top-1/2 ml-2 flex -translate-y-1/2 gap-1.5'
              style={{ zIndex: 35 }}
            >
              {characterReminders.map((def) => (
                <div
                  key={def.label}
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onStartSpawn(def, e)
                  }}
                >
                  <ReminderToken icon={def.icon} label={def.label} tone='neutral' size={satSize + 4} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const TONE_CLASS: Record<string, string> = {
  grey: 'bg-neutral-700 text-neutral-100',
  orange: 'bg-orange-600 text-white',
  purple: 'bg-purple-700 text-white',
  red: 'bg-board-evil text-white',
  green: 'bg-emerald-700 text-white',
  blue: 'bg-board-good text-white',
}

function Satellite({
  icon,
  pos,
  size,
  tone,
  ariaLabel,
  onClick,
}: {
  icon: IconName
  pos: { x: number; y: number }
  size: number
  tone: keyof typeof TONE_CLASS
  ariaLabel?: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'absolute flex items-center justify-center rounded-full shadow-md transition-transform active:scale-90 animate-popover-in',
        TONE_CLASS[tone],
      )}
      style={{
        width: size,
        height: size,
        left: `calc(50% + ${pos.x}px)`,
        top: `calc(50% + ${pos.y}px)`,
        transform: 'translate(-50%, -50%)',
        zIndex: 32,
      }}
    >
      <Icon name={icon} size='sm' />
    </button>
  )
}
