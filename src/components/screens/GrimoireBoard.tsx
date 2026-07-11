import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Game, GameState, EffectInstance } from '../../lib/types'
import { getRole } from '../../lib/roles'
import { getEffect } from '../../lib/effects'
import { getBoardPositions, setBoardPositions } from '../../lib/storage'
import { getCharacterReminders, getAllReminders, ReminderDef } from '../../lib/reminders/catalog'
import { getEffectName } from '../../lib/i18n/registry'
import { useI18n } from '../../lib/i18n'
import { filterVisibleEffects } from '../items/PlayerRoleIcon'
import { BoardToken, PipView } from '../items/BoardToken'
import { CharacterToken } from '../items/CharacterToken'
import { ReminderToken } from '../items/ReminderToken'
import { Icon } from '../atoms'
import { IconName } from '../atoms/icon'

type Props = {
  game: Game
  state: GameState
  readOnly?: boolean
  onAddEffect: (playerId: string, effectType: string, data?: Record<string, unknown>) => void
  onMovePip: (fromId: string, toId: string, instanceId: string) => void
  onRemovePip: (playerId: string, instanceId: string) => void
  onToggleDeath: (playerId: string) => void
  onBack: () => void
}

type DragData =
  | { kind: 'spawn'; def: ReminderDef }
  | { kind: 'move'; instance: EffectInstance; fromId: string }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** The reminder pips shown around a player, from their visible effects. */
function pipsFor(effects: EffectInstance[], language: string): PipView[] {
  return filterVisibleEffects(effects).map((instance) => {
    if (instance.type === 'reminder') {
      const data = instance.data as { label?: string; icon?: IconName } | undefined
      return {
        instance,
        icon: (data?.icon ?? 'circleDot') as IconName,
        label: data?.label ?? '',
        tone: 'neutral' as const,
      }
    }
    const def = getEffect(instance.type)
    const tone = def?.defaultType === 'nerf' ? 'evil' : def?.defaultType === 'buff' ? 'good' : 'neutral'
    return {
      instance,
      icon: (def?.icon ?? 'circleDot') as IconName,
      label: getEffectName(instance.type, language as 'en' | 'es'),
      tone,
    }
  })
}

/** Read the Imp's recorded first-night demon bluffs, if any. */
function getDemonBluffs(game: Game): string[] | null {
  for (let i = game.history.length - 1; i >= 0; i--) {
    const data = game.history[i].data as { action?: string; bluffRoleIds?: string[] }
    if (data?.action === 'first_night_info' && Array.isArray(data.bluffRoleIds)) {
      return data.bluffRoleIds
    }
  }
  return null
}

export function GrimoireBoard({
  game,
  state,
  readOnly = false,
  onAddEffect,
  onMovePip,
  onRemovePip,
  onToggleDeath,
  onBack,
}: Props) {
  const { t, language } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dim, setDim] = useState({ w: 0, h: 0 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showBluffs, setShowBluffs] = useState(false)
  const [positions, setPositions] = useState(() => getBoardPositions(game.id))
  const [drag, setDrag] = useState<{ data: DragData; x: number; y: number } | null>(null)

  const players = state.players
  const bluffs = useMemo(() => getDemonBluffs(game), [game])

  // Measure the board so the circle scales to the viewport.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setDim({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Circle geometry.
  const layout = useMemo(() => {
    const n = players.length
    const min = Math.min(dim.w, dim.h)
    const radius = min * 0.37
    const chord = n > 1 ? 2 * radius * Math.sin(Math.PI / n) : radius
    const size = clamp(Math.round(chord * 0.82), 44, 92)
    return players.map((p, i) => {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2
      const base = {
        x: dim.w / 2 + Math.cos(angle) * radius,
        y: dim.h / 2 + Math.sin(angle) * radius,
      }
      const off = positions[p.id] ?? { x: 0, y: 0 }
      return { player: p, size, x: base.x + off.x, y: base.y + off.y }
    })
  }, [players, dim, positions])

  const commitReposition = (playerId: string, dx: number, dy: number) => {
    setPositions((prev) => {
      const cur = prev[playerId] ?? { x: 0, y: 0 }
      const next = { ...prev, [playerId]: { x: cur.x + dx, y: cur.y + dy } }
      setBoardPositions(game.id, next)
      return next
    })
  }

  const startDrag = (data: DragData, e: React.PointerEvent) => {
    setExpandedId(null)
    setLibraryOpen(false)
    setDrag({ data, x: e.clientX, y: e.clientY })
  }

  // Global pointer tracking while a pip is in flight. The drag payload is
  // stable for the gesture (only x/y change), so we capture it from closure and
  // run mutations in the pointerup handler — never inside a setState updater.
  useEffect(() => {
    if (!drag) return
    const data = drag.data
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const seat = el?.closest('[data-seat-id]')?.getAttribute('data-seat-id') ?? null
      const overRemove = !!el?.closest('[data-dropzone="remove"]')
      if (data.kind === 'spawn') {
        if (seat && !overRemove) {
          const { def } = data
          if (def.effectType) onAddEffect(seat, def.effectType)
          else onAddEffect(seat, 'reminder', { label: def.label, icon: def.icon })
        }
      } else {
        const { instance, fromId } = data
        if (seat && seat !== fromId && !overRemove) {
          onMovePip(fromId, seat, instance.id)
        } else if (overRemove || !seat) {
          onRemovePip(fromId, instance.id)
        }
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  const allReminders = useMemo(() => getAllReminders(state), [state])
  const filteredReminders = useMemo(
    () => allReminders.filter((r) => r.label.toLowerCase().includes(search.toLowerCase())),
    [allReminders, search],
  )

  const dragging = drag !== null

  return (
    <div className='fixed inset-0 z-40 flex flex-col bg-board-leather'>
      {/* Top bar */}
      <div className='flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2'>
        <button
          onClick={onBack}
          className='flex h-10 items-center gap-1.5 rounded-full border border-board-gold/30 bg-board-ink/70 px-3 text-board-gold active:scale-95'
        >
          <Icon name='arrowLeft' size='sm' />
          <span className='font-body text-sm'>{t.common.back}</span>
        </button>
        <h2 className='font-tarot text-xl text-board-gold'>{t.game.board.title}</h2>
        {bluffs && !readOnly ? (
          <button
            onClick={() => setShowBluffs(true)}
            className='flex h-10 items-center gap-1.5 rounded-full border border-board-gold/30 bg-board-ink/70 px-3 text-board-gold active:scale-95'
          >
            <Icon name='drama' size='sm' />
            <span className='font-body text-sm'>{t.game.board.demonBluffs}</span>
          </button>
        ) : (
          <div className='w-10' />
        )}
      </div>

      {/* Board surface */}
      <div
        ref={containerRef}
        className='relative flex-1 overflow-hidden'
        onClick={() => {
          setExpandedId(null)
          setLibraryOpen(false)
        }}
      >
        {/* Centre drop zone — remove target while moving a pip */}
        <div
          data-dropzone='remove'
          className='pointer-events-none absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed transition-opacity'
          style={{
            opacity: dragging && drag?.data.kind === 'move' ? 1 : 0.12,
            borderColor: '#C9A24B',
          }}
        >
          <Icon name='trash' size='md' className='text-board-gold/80' />
        </div>

        {layout.map(({ player, size, x, y }) => {
          const role = getRole(player.roleId)
          return (
            <BoardToken
              key={player.id}
              player={player}
              role={role}
              size={size}
              expanded={expandedId === player.id}
              readOnly={readOnly}
              characterReminders={getCharacterReminders(player.roleId)}
              pips={pipsFor(player.effects, language)}
              offset={{ x, y }}
              onTap={() => setExpandedId((cur) => (cur === player.id ? null : player.id))}
              onOpenLibrary={() => setLibraryOpen(true)}
              onToggleDeath={() => {
                onToggleDeath(player.id)
                setExpandedId(null)
              }}
              onStartSpawn={(def, e) => startDrag({ kind: 'spawn', def }, e)}
              onStartMove={(instance, e) => startDrag({ kind: 'move', instance, fromId: player.id }, e)}
              onReposition={(dx, dy) => commitReposition(player.id, dx, dy)}
            />
          )
        })}
      </div>

      {/* Drag hint */}
      {!readOnly && (
        <p className='px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-center font-body text-xs text-parchment-400/70'>
          {t.game.board.dragHint}
        </p>
      )}

      {/* Drag ghost */}
      {drag && (
        <div
          className='pointer-events-none fixed z-[60]'
          style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, -50%)' }}
        >
          <ReminderToken
            icon={drag.data.kind === 'spawn' ? drag.data.def.icon : pipsFor([drag.data.instance], language)[0]?.icon ?? 'circleDot'}
            label={drag.data.kind === 'spawn' ? drag.data.def.label : pipsFor([drag.data.instance], language)[0]?.label ?? ''}
            size={52}
          />
        </div>
      )}

      {/* Full library panel (purple) */}
      {libraryOpen && (
        <div className='absolute inset-0 z-50 flex flex-col bg-board-leather/95' onClick={() => setLibraryOpen(false)}>
          <div
            className='m-3 mt-[max(0.75rem,env(safe-area-inset-top))] flex flex-1 flex-col overflow-hidden rounded-2xl border-2 border-purple-600/70 bg-board-ink/80'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-2 border-b border-purple-600/30 p-3'>
              <Icon name='search' size='sm' className='text-purple-300' />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.game.board.search}
                className='flex-1 bg-transparent font-body text-parchment-100 outline-none placeholder:text-parchment-400/60'
              />
              <button onClick={() => setLibraryOpen(false)} className='text-parchment-300 active:scale-95'>
                <Icon name='x' size='md' />
              </button>
            </div>
            <div className='grid grid-cols-4 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-5'>
              {filteredReminders.map((def) => (
                <div
                  key={def.label}
                  className='flex justify-center'
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    startDrag({ kind: 'spawn', def }, e)
                  }}
                >
                  <ReminderToken icon={def.icon} label={def.label} size={56} />
                </div>
              ))}
              {filteredReminders.length === 0 && (
                <p className='col-span-full py-8 text-center font-body text-parchment-400'>
                  {t.game.board.noReminders}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Demon bluffs overlay */}
      {showBluffs && bluffs && (
        <div
          className='absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-board-leather/95 p-6'
          onClick={() => setShowBluffs(false)}
        >
          <h3 className='font-tarot text-2xl text-board-gold'>{t.game.board.demonBluffs}</h3>
          <div className='flex flex-wrap items-center justify-center gap-5'>
            {bluffs.map((roleId) => {
              const r = getRole(roleId)
              return (
                <CharacterToken
                  key={roleId}
                  roleId={roleId}
                  team={r?.team ?? 'townsfolk'}
                  size={96}
                />
              )
            })}
          </div>
          <button
            onClick={() => setShowBluffs(false)}
            className='mt-2 rounded-full border border-board-gold/40 bg-board-ink/70 px-5 py-2 font-body text-board-gold active:scale-95'
          >
            {t.common.back}
          </button>
        </div>
      )}
    </div>
  )
}
