import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGesture } from '@use-gesture/react'
import { CaretLeft, HandEye, UsersThree, CaretDoubleLeft, CaretDoubleRight, MagnifyingGlassMinus } from '@phosphor-icons/react'
import { Game, GameState, EffectInstance } from '../../lib/types'
import { getRole } from '../../lib/roles'
import { getInPlayRoleIds, getScriptRoleIds } from '../../lib/game'
import { ScriptId } from '../../lib/scripts'
import { getEffect } from '../../lib/effects'
import { getBoardPositions, setBoardPositions, getRoster } from '../../lib/storage'
import {
  getAllReminders,
  getReminderByEffectType,
  getReminderIconSrc,
  ReminderDef,
} from '../../lib/reminders/catalog'
import { getEffectName } from '../../lib/i18n/registry'
import { useI18n, interpolate } from '../../lib/i18n'
import { filterVisibleEffects } from '../items/PlayerRoleIcon'
import { BoardToken, PipView } from '../items/BoardToken'
import { CharacterToken } from '../items/CharacterToken'
import { ReminderToken } from '../items/ReminderToken'
import { RolePickerGrid } from '../inputs/RolePickerGrid'
import { ScriptSheetPanel, NightOrderPanel } from '../items/BoardReferencePanels'
import { InfoTokenCard } from './InfoTokenCard'
import { isUnassigned } from '../../lib/unassigned'
import { useShaderBackground } from '../../hooks/useShaderBackground'
import { GRIMOIRE_SHADER } from '../../lib/grimoireShader'
import { Icon } from '../atoms'
import { IconName } from '../atoms/icon'
import { cn } from '../../lib/utils'

// Mirrors PlayerEntry's cap; Simple Mode boards top out at 20 seats.
const MAX_PLAYERS = 20
// Board zoom bounds. 1 = standard (fully zoomed out); the whole board frame —
// backdrop + tokens — scales together. Pan is clamped so the frame always covers
// the surface (no void), and zooming back to 1 snaps to the standard view.
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const HIDDEN_BOARD_PIP_EFFECTS = new Set([
  'deflect',
  'demon_successor',
  'martyrdom',
  'misregister',
  'pure',
  'slayer_bullet',
  'used_dead_vote',
])

type Props = {
  game: Game
  state: GameState
  readOnly?: boolean
  onAddEffect: (playerId: string, effectType: string, data?: Record<string, unknown>) => void
  onMovePip: (fromId: string, toId: string, instanceId: string) => void
  onRemovePip: (playerId: string, instanceId: string) => void
  onToggleDeath: (playerId: string) => void
  onSetPlayerRole: (playerId: string, roleId: string) => void
  onAddPlayer: () => void
  onRemovePlayer: (playerId: string) => void
  onMovePlayer: (playerId: string, dir: 1 | -1) => void
  onRenamePlayer: (playerId: string, name: string) => void
  onBack: () => void
}

// Only existing pips are dragged (to reposition or delete). Placing a *new*
// token is a tap-to-hold / tap-a-player flow, not a drag — see pendingToken.
type DragData = { instance: EffectInstance; fromId: string }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Radius (px) of the centre delete target. A moved pip is only removed when
// released within this of board centre — matching the visible dashed circle —
// so a drop anywhere else on the board just cancels instead of deleting.
const REMOVE_RADIUS = 48

/** The reminder pips shown around a player, from their visible effects. */
function pipsFor(effects: EffectInstance[], language: string): PipView[] {
  return filterVisibleEffects(effects)
    .filter((instance) => !HIDDEN_BOARD_PIP_EFFECTS.has(instance.type))
    .filter((instance) => !(instance.type === 'safe' && instance.expiresAt === 'never'))
    .map((instance) => {
      if (instance.type === 'reminder') {
        const data = instance.data as {
          label?: string
          icon?: IconName
          iconSrc?: string
          tokenSrc?: string
          tone?: PipView['tone']
        } | undefined
        return {
          instance,
          icon: (data?.icon ?? 'circleDot') as IconName,
          iconSrc: data?.iconSrc,
          tokenSrc: data?.tokenSrc,
          label: data?.label ?? '',
          tone: data?.tone ?? 'reminder',
        }
      }
      const reminder = getReminderByEffectType(instance.type as Parameters<typeof getReminderByEffectType>[0])
      const def = getEffect(instance.type)
      const tone = def?.defaultType === 'nerf' ? 'evil' : def?.defaultType === 'buff' ? 'good' : 'neutral'
      return {
        instance,
        icon: reminder?.icon ?? ((def?.icon ?? 'circleDot') as IconName),
        iconSrc: reminder ? getReminderIconSrc(reminder) : undefined,
        tokenSrc: reminder?.tokenSrc,
        label: reminder?.label ?? getEffectName(instance.type, language as 'en' | 'es'),
        tone: reminder?.tone ?? tone,
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
  onSetPlayerRole,
  onAddPlayer,
  onRemovePlayer,
  onMovePlayer,
  onRenamePlayer,
  onBack,
}: Props) {
  const { t, language } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  useShaderBackground(bgCanvasRef, GRIMOIRE_SHADER, 0.5, 240)
  const [dim, setDim] = useState({ w: 0, h: 0 })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // The seat whose "add token" button opened the tray. Tapping a token drops it
  // straight onto this player — no rules, any token on any character. null =
  // tray closed.
  const [libraryFor, setLibraryFor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showBluffs, setShowBluffs] = useState(false)
  const [positions, setPositions] = useState(() => getBoardPositions(game.id))
  const [drag, setDrag] = useState<{ data: DragData; x: number; y: number; startX: number; startY: number } | null>(null)
  // Which token / remove-target the in-flight pip is hovering — drives the live
  // drop highlight. null when not dragging or over empty space.
  const [hoverSeat, setHoverSeat] = useState<string | null>(null)
  const [hoverRemove, setHoverRemove] = useState(false)
  // Board pan+zoom. Only the token layer transforms; kept in a ref too so the
  // reposition math and gesture handlers read the latest value without stale
  // closures. translate is in the container's own (pre-scale) pixel space.
  const [view, setView] = useState({ x: 0, y: 0, z: 1 })
  const viewRef = useRef(view)
  viewRef.current = view
  // Change-Character picker: which seat is being reassigned, and whether the grid
  // is showing the full script (vs the in-play bag, the default).
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [pickerShowAll, setPickerShowAll] = useState(false)
  // Two-tap remove confirm — local only, writes no history until the 2nd tap.
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  // Name editor: which seat is being named, plus the working text field value.
  const [renameFor, setRenameFor] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  // Right-rail reference panel currently open (null = plain board view).
  const [activePanel, setActivePanel] = useState<'script' | 'nightOrder' | null>(null)
  const [renderedPanel, setRenderedPanel] = useState<'script' | 'nightOrder' | null>(null)
  // Info Token flow (player-facing card library/editor) — full-screen takeover.
  const [infoTokenOpen, setInfoTokenOpen] = useState(false)
  // Roster-edit mode — reveals add/remove-player chrome. Off by default so the
  // board reads as a clean surface to show players; toggled from the right rail.
  const [editing, setEditing] = useState(false)
  const editable = !readOnly && editing

  const players = state.players
  const bluffs = useMemo(() => getDemonBluffs(game), [game])

  // The in-play bag drives every reference panel (never the filled seats, so a
  // partially-dealt manual board still lists the whole bag).
  const inPlayRoleIds = useMemo(() => getInPlayRoleIds(game), [game])
  const activeRoleIds = useMemo(
    () => players.map((p) => p.roleId).filter((roleId) => !isUnassigned(roleId)),
    [players],
  )

  const unassignedCount = useMemo(
    () => players.filter((p) => isUnassigned(p.roleId)).length,
    [players],
  )

  // Roles offered in the Change-Character picker: the in-play bag first, with a
  // toggle to the full script. Both mapped to real RoleDefinitions.
  const pickerRoles = useMemo(() => {
    const ids = pickerShowAll
      ? getScriptRoleIds(game)
      : getInPlayRoleIds(game)
    return ids.map(getRole).filter((r): r is NonNullable<typeof r> => !!r)
  }, [pickerShowAll, game])

  const pickerCurrentRoleId = pickerFor
    ? players.find((p) => p.id === pickerFor)?.roleId ?? ''
    : ''

  const closePicker = () => {
    setPickerFor(null)
    setPickerShowAll(false)
  }

  // Saved account roster — read fresh each time the name editor opens.
  const roster = useMemo(() => getRoster(), [renameFor])

  const openRename = (playerId: string) => {
    const current = players.find((p) => p.id === playerId)?.name ?? ''
    setNameInput(current)
    setRenameFor(playerId)
    setExpandedId(null)
  }
  const closeRename = () => setRenameFor(null)
  const commitRename = (name: string) => {
    const trimmed = name.trim()
    if (renameFor && trimmed) onRenamePlayer(renameFor, trimmed)
    closeRename()
  }

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
    // Cap tracks available space so tokens shrink when the panel steals width —
    // a fixed cap stays pinned at max in both states and only spacing changes.
    const maxSize = clamp(Math.round(min * 0.135), 72, 108)
    const baseSize = clamp(Math.round(chord * 0.82), 44, maxSize)
    const scale = 1 + clamp((MAX_PLAYERS - n) / (MAX_PLAYERS - 1), 0, 1) * 0.35
    const size = Math.round(baseSize * scale)
    const reminderScale = 0.78 * clamp(min / 900, 0.72, 1)
    return players.map((p, i) => {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2
      const base = {
        x: dim.w / 2 + Math.cos(angle) * radius,
        y: dim.h / 2 + Math.sin(angle) * radius,
      }
      const off = positions[p.id] ?? { x: 0, y: 0 }
      return { player: p, size, reminderScale, x: base.x + off.x, y: base.y + off.y }
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

  const resetView = () => setView({ x: 0, y: 0, z: 1 })

  // Keep the (origin 0,0) board frame covering the surface: pan can't expose a
  // void, and any zoom back to standard (≤1) snaps to the centred default view.
  const clampView = (x: number, y: number, z: number) => {
    if (z <= 1) return { x: 0, y: 0, z: 1 }
    return { z, x: clamp(x, dim.w * (1 - z), 0), y: clamp(y, dim.h * (1 - z), 0) }
  }

  // Pinch (touch) + trackpad handle board zoom/pan. Bound to the board surface
  // only, so the reference panel and top chrome never scale. touch-action:none
  // on the surface stops the browser from page-zooming instead.
  useGesture(
    {
      // Touch two-finger pinch AND trackpad pinch (use-gesture routes ctrl+wheel
      // here). `offset` is the absolute clamped scale; we pin the layer point that
      // sat under the gesture origin so zoom tracks the fingers, and origin drift
      // gives two-finger pan for free.
      onPinch: ({ origin: [ox, oy], offset: [z], first, memo }) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return memo
        const px = ox - rect.left
        const py = oy - rect.top
        const anchor =
          first || !memo
            ? { ax: (px - viewRef.current.x) / viewRef.current.z, ay: (py - viewRef.current.y) / viewRef.current.z }
            : (memo as { ax: number; ay: number })
        setView(clampView(px - anchor.ax * z, py - anchor.ay * z, z))
        return anchor
      },
      // Plain trackpad scroll pans (ctrl+wheel is handled by onPinch above).
      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        if (ctrlKey) return
        event.preventDefault()
        setView((v) => clampView(v.x - dx, v.y - dy, v.z))
      },
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      pinch: {
        from: () => [viewRef.current.z, 0],
        scaleBounds: { min: MIN_ZOOM, max: MAX_ZOOM },
        rubberband: false,
      },
    },
  )

  // Shift a seat one place around the circle, clearing the swapped pair's cosmetic
  // offsets so they snap cleanly into their new positions.
  const moveSeat = (playerId: string, dir: 1 | -1) => {
    const i = players.findIndex((p) => p.id === playerId)
    if (i === -1 || players.length < 2) return
    const neighborId = players[(i + dir + players.length) % players.length].id
    setPositions((prev) => {
      if (!prev[playerId] && !prev[neighborId]) return prev
      const next = { ...prev }
      delete next[playerId]
      delete next[neighborId]
      setBoardPositions(game.id, next)
      return next
    })
    onMovePlayer(playerId, dir)
  }

  const startDrag = (data: DragData, e: React.PointerEvent) => {
    setExpandedId(null)
    setLibraryFor(null)
    setDrag({ data, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY })
  }

  // Place a chosen token on the seat the tray was opened for, then close it.
  const placeToken = (def: ReminderDef) => {
    const playerId = libraryFor
    if (!playerId) return
    if (def.effectType) onAddEffect(playerId, def.effectType)
    else
      onAddEffect(playerId, 'reminder', {
        label: def.label,
        icon: def.icon,
        iconSrc: getReminderIconSrc(def),
        tokenSrc: def.tokenSrc,
        tone: def.tone,
      })
    setLibraryFor(null)
  }

  // Global pointer tracking while a pip is in flight. The drag payload is
  // stable for the gesture (only x/y change), so we capture it from closure and
  // run mutations in the pointerup handler — never inside a setState updater.
  useEffect(() => {
    if (!drag) return
    const data = drag.data
    const hitTest = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      const seat = el?.closest('[data-seat-id]')?.getAttribute('data-seat-id') ?? null
      const rect = containerRef.current?.getBoundingClientRect()
      const overRemove =
        !!rect &&
        Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2)) <=
          REMOVE_RADIUS
      return { seat, overRemove }
    }
    const move = (e: PointerEvent) => {
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
      const { seat, overRemove } = hitTest(e.clientX, e.clientY)
      setHoverRemove(overRemove)
      setHoverSeat(overRemove ? null : seat && seat !== data.fromId ? seat : null)
    }
    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const seat = el?.closest('[data-seat-id]')?.getAttribute('data-seat-id') ?? null
      // Delete only when released on the centre target — measured by distance to
      // board centre, not a whole-board fallback. A drop in empty space cancels.
      const rect = containerRef.current?.getBoundingClientRect()
      const overRemove = !!rect &&
        Math.hypot(
          e.clientX - (rect.left + rect.width / 2),
          e.clientY - (rect.top + rect.height / 2),
        ) <= REMOVE_RADIUS
      const { instance, fromId } = data
      if (overRemove) {
        onRemovePip(fromId, instance.id)
      } else if (seat && seat !== fromId) {
        onMovePip(fromId, seat, instance.id)
      }
      // else: released in empty space → cancel, pip stays put.
      setDrag(null)
      setHoverSeat(null)
      setHoverRemove(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  const allReminders = useMemo(() => getAllReminders(), [])
  const filteredReminders = useMemo(
    () => allReminders.filter((r) => r.label.toLowerCase().includes(search.toLowerCase())),
    [allReminders, search],
  )

  const dragging = drag !== null
  const panelReserve = activePanel === 'script' ? '560px' : activePanel === 'nightOrder' ? '376px' : '0px'

  useEffect(() => {
    if (activePanel) {
      setRenderedPanel(activePanel)
      return
    }
    const id = window.setTimeout(() => setRenderedPanel(null), 200)
    return () => window.clearTimeout(id)
  }, [activePanel])

  return (
    <div className='fixed inset-0 z-40 flex flex-col bg-grimoire-darker'>
      {/* Board surface */}
      <div
        ref={containerRef}
        className={cn(
          'relative flex-1 overflow-hidden bg-grimoire-darker transition-[margin-right] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] md:mr-[var(--panel-reserve)]',
        )}
        style={{ '--panel-reserve': panelReserve, touchAction: 'none' } as React.CSSProperties}
        onClick={() => {
          setExpandedId(null)
          setLibraryFor(null)
          setConfirmRemoveId(null)
        }}
      >
        {/* Centre drop zone — remove target while moving a pip */}
        <div
          data-dropzone='remove'
          className='pointer-events-none absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed transition-all duration-150'
          style={{
            // Idle center belongs to the add-player cluster; the remove target
            // only appears while a pip is being moved, and flares when hovered.
            opacity: dragging ? 1 : 0,
            borderColor: hoverRemove ? '#E5484D' : '#C9A24B',
            backgroundColor: hoverRemove ? 'rgba(229,72,77,0.18)' : 'transparent',
            transform: `translate(-50%, -50%) scale(${hoverRemove ? 1.18 : 1})`,
          }}
        >
          <Icon
            name='trash'
            size='md'
            className={hoverRemove ? 'text-board-evil' : 'text-board-gold/80'}
          />
        </div>

        {/* Board frame — backdrop + tokens scale/pan together as one surface.
            pointer-events-none so gaps fall through for tap-to-close + pinch;
            each token and edit control re-enables its own hits. */}
        <div
          className='pointer-events-none absolute inset-0'
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Animated arcane backdrop — shares the board circle's coordinate space. */}
          <canvas
            ref={bgCanvasRef}
            className='pointer-events-none absolute inset-0 h-full w-full'
          />
          {layout.map(({ player, size, reminderScale, x, y }) => {
            const role = getRole(player.roleId)
            return (
              <BoardToken
                key={player.id}
                player={player}
                role={role}
                size={size}
                zoom={view.z}
                expanded={expandedId === player.id}
                readOnly={readOnly}
                pips={pipsFor(player.effects, language)}
                draggingPipId={drag && drag.data.fromId === player.id ? drag.data.instance.id : null}
                isDropTarget={hoverSeat === player.id}
                offset={{ x, y }}
                boardCenter={{ x: dim.w / 2, y: dim.h / 2 }}
                reminderScale={reminderScale}
                onTap={() => setExpandedId((cur) => (cur === player.id ? null : player.id))}
                onOpenLibrary={() => setLibraryFor(player.id)}
                onToggleDeath={() => {
                  onToggleDeath(player.id)
                  setExpandedId(null)
                }}
                onChangeCharacter={() => {
                  setPickerFor(player.id)
                  setExpandedId(null)
                }}
                onEditName={() => openRename(player.id)}
                onStartMove={(instance, e) => startDrag({ instance, fromId: player.id }, e)}
                onReposition={(dx, dy) => commitReposition(player.id, dx, dy)}
              />
            )
          })}

          {/* Per-token edit chrome — seat-move arrows + remove (✕). Two-tap remove
              confirm; hidden while dragging pips. */}
          {editable && !dragging &&
            layout.map(({ player, size, x, y }) => {
              const confirming = confirmRemoveId === player.id
              return (
                <div key={`edit-${player.id}`}>
                  {players.length > 1 && (
                    <>
                      <button
                        aria-label={t.game.board.moveCounter}
                        onClick={(e) => {
                          e.stopPropagation()
                          moveSeat(player.id, -1)
                        }}
                        className='pointer-events-auto absolute flex h-6 w-6 items-center justify-center rounded-full bg-board-ink/80 text-parchment-200 shadow-md transition-transform active:scale-90'
                        style={{ left: x - size * 0.5 - 6, top: y, transform: 'translate(-50%, -50%)', zIndex: 26 }}
                      >
                        <CaretDoubleLeft size={13} weight='bold' />
                      </button>
                      <button
                        aria-label={t.game.board.moveClockwise}
                        onClick={(e) => {
                          e.stopPropagation()
                          moveSeat(player.id, 1)
                        }}
                        className='pointer-events-auto absolute flex h-6 w-6 items-center justify-center rounded-full bg-board-ink/80 text-parchment-200 shadow-md transition-transform active:scale-90'
                        style={{ left: x + size * 0.5 + 6, top: y, transform: 'translate(-50%, -50%)', zIndex: 26 }}
                      >
                        <CaretDoubleRight size={13} weight='bold' />
                      </button>
                    </>
                  )}
                  <button
                    aria-label={confirming ? t.game.board.confirmRemove : t.game.board.removePlayer}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirming) {
                        onRemovePlayer(player.id)
                        setConfirmRemoveId(null)
                      } else {
                        setConfirmRemoveId(player.id)
                      }
                    }}
                    className={cn(
                      'pointer-events-auto absolute flex items-center justify-center rounded-full shadow-md transition-transform active:scale-90',
                      confirming
                        ? 'bg-board-evil text-white'
                        : 'bg-board-ink/80 text-parchment-300/80',
                    )}
                    style={{
                      left: x,
                      top: y + size * 0.5 + 2,
                      width: confirming ? 26 : 20,
                      height: confirming ? 26 : 20,
                      transform: 'translate(-50%, 0)',
                      zIndex: 25,
                    }}
                  >
                    <Icon name={confirming ? 'trash' : 'x'} size='xs' />
                  </button>
                </div>
              )
            })}
        </div>

        {/* Center cluster — add player + unassigned nudge (idle only). */}
        {editable && !dragging && (
          <div className='pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2'>
            {unassignedCount > 0 && (
              <span className='rounded-full bg-board-evil/90 px-3 py-1 font-body text-xs font-semibold text-white shadow'>
                {interpolate(t.newGame.unassignedCount, { count: unassignedCount })}
              </span>
            )}
            <button
              onClick={onAddPlayer}
              disabled={players.length >= MAX_PLAYERS}
              aria-label={t.game.board.addPlayer}
              className='pointer-events-auto flex items-center gap-1.5 rounded-full border border-board-gold/40 bg-board-ink/80 px-4 py-2 text-board-gold shadow-lg transition-transform active:scale-95 disabled:opacity-40'
            >
              <Icon name='plus' size='sm' />
              <span className='font-body text-sm'>
                {players.length}/{MAX_PLAYERS}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Reset zoom/pan — only while the board is off its default view. */}
      {(view.z !== 1 || view.x !== 0 || view.y !== 0) && (
        <button
          onClick={resetView}
          aria-label={t.game.board.resetView}
          className='absolute bottom-4 left-1/2 z-[55] flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-board-gold/30 bg-board-ink/85 text-board-gold/80 shadow-lg transition-transform active:scale-90'
        >
          <MagnifyingGlassMinus size={22} weight='regular' />
        </button>
      )}

      {/* Pip-drag hint — brief guidance while a reminder is in flight. */}
      {drag && (
        <div className='pointer-events-none absolute left-1/2 top-4 z-[55] -translate-x-1/2 rounded-full bg-board-ink/85 px-4 py-1.5 shadow-lg'>
          <span className='font-body text-xs text-parchment-200'>{t.game.board.dragHint}</span>
        </div>
      )}

      {/* Drag ghost */}
      {drag && (
        <div
          className='pointer-events-none fixed z-[60]'
          style={{
            left: drag.x,
            top: drag.y,
            transform: 'translate(-50%, -50%) scale(1.12)',
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))',
          }}
        >
          <ReminderToken
            icon={pipsFor([drag.data.instance], language)[0]?.icon ?? 'circleDot'}
            iconSrc={pipsFor([drag.data.instance], language)[0]?.iconSrc}
            tokenSrc={pipsFor([drag.data.instance], language)[0]?.tokenSrc}
            label={pipsFor([drag.data.instance], language)[0]?.label ?? ''}
            tone={pipsFor([drag.data.instance], language)[0]?.tone ?? 'reminder'}
            size={64}
          />
        </div>
      )}

      {/* Token library tray (purple) — opened for one seat; tap a token to place */}
      {libraryFor && (
        <div className='absolute inset-0 z-[60]' onClick={() => setLibraryFor(null)}>
          <div
            className='absolute left-1/2 top-1/2 flex max-h-[min(25rem,calc(100vh-2rem))] w-[min(30rem,calc(100vw-5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border-2 border-purple-600/70 bg-board-ink/95 shadow-2xl'
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
              <button onClick={() => setLibraryFor(null)} className='text-parchment-300 active:scale-95'>
                <Icon name='x' size='md' />
              </button>
            </div>
            <div className='grid grid-cols-4 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-5'>
              {filteredReminders.map((def) => (
                <button
                  key={def.label}
                  className='flex justify-center active:scale-95'
                  onClick={(e) => {
                    e.stopPropagation()
                    placeToken(def)
                  }}
                >
                  <ReminderToken
                    icon={def.icon}
                    iconSrc={getReminderIconSrc(def)}
                    tokenSrc={def.tokenSrc}
                    label={def.label}
                    tone={def.tone}
                    size={72}
                  />
                </button>
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

      {/* Change Character picker (blue) — reassign a seat's role */}
      {pickerFor && (
        <div className='absolute inset-0 z-[60]' onClick={closePicker}>
          <div
            className='absolute right-16 top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[min(42rem,calc(100vh-2rem))] w-[min(30rem,calc(100vw-5rem))] flex-col overflow-hidden rounded-2xl border-2 border-purple-600/70 bg-[#f5ecd5] shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-2 border-b border-board-ink/15 p-3'>
              <Icon name='userPlus' size='sm' className='text-board-ink/70' />
              <span className='flex-1 font-body text-board-ink'>
                {t.game.board.changeCharacter}
              </span>
              <button
                onClick={() => setPickerShowAll((v) => !v)}
                className='rounded-full border border-board-ink/15 bg-board-ink/5 px-3 py-1 font-body text-xs text-board-ink/70 active:scale-95'
              >
                {pickerShowAll ? t.game.board.inPlay : t.game.board.allCharacters}
              </button>
              <button onClick={closePicker} className='text-board-ink/60 active:scale-95'>
                <Icon name='x' size='md' />
              </button>
            </div>
            <div className='overflow-y-auto p-3'>
              <RolePickerGrid
                roles={pickerRoles}
                state={state}
                selected={pickerCurrentRoleId ? [pickerCurrentRoleId] : []}
                onSelect={(roleId) => {
                  onSetPlayerRole(pickerFor, roleId)
                  closePicker()
                }}
                selectionCount={1}
                variant='cards'
                surface='light'
              />
            </div>
          </div>
        </div>
      )}

      {/* Name editor (gold) — type a name or tap a saved one from the roster */}
      {renameFor && (
        <div className='absolute inset-0 z-[60]' onClick={closeRename}>
          <div
            className='absolute right-16 top-[max(0.75rem,env(safe-area-inset-top))] flex max-h-[min(25rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-5rem))] flex-col overflow-hidden rounded-2xl border-2 border-board-gold/60 bg-board-ink/95 shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                commitRename(nameInput)
              }}
              className='flex items-center gap-2 border-b border-board-gold/25 p-3'
            >
              <Icon name='userPlus' size='sm' className='text-board-gold' />
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={t.game.board.namePlaceholder}
                className='flex-1 bg-transparent font-body text-parchment-100 outline-none placeholder:text-parchment-400/60'
              />
              <button
                type='submit'
                className='rounded-full border border-board-gold/40 px-3 py-1 font-body text-xs text-board-gold active:scale-95'
              >
                {t.game.board.save}
              </button>
            </form>
            {roster.length > 0 && (
              <div className='overflow-y-auto p-3'>
                <p className='mb-2 px-1 font-body text-xs uppercase tracking-wide text-parchment-400/70'>
                  {t.game.board.savedNames}
                </p>
                <div className='flex flex-wrap gap-2'>
                  {roster.map((name) => (
                    <button
                      key={name}
                      onClick={() => commitRename(name)}
                      className='rounded-full border border-board-gold/25 bg-board-leather/40 px-3 py-1.5 font-body text-sm text-parchment-100 active:scale-95'
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Demon bluffs overlay */}
      {showBluffs && bluffs && (
        <div
          className='absolute inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-board-leather/95 p-6'
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

      {/* Reference panels (read-only) — full-screen slide-over on mobile,
          docked sidebar on tablet/desktop, driven by the in-play bag. */}
      {renderedPanel === 'script' && (
        <ScriptSheetPanel
          activeRoleIds={activeRoleIds}
          active={activePanel === 'script'}
          scriptId={game.scriptId as ScriptId}
          scriptRoleIds={getScriptRoleIds(game)}
          onClose={() => setActivePanel(null)}
        />
      )}
      {renderedPanel === 'nightOrder' && (
        <NightOrderPanel
          active={activePanel === 'nightOrder'}
          inPlayRoleIds={inPlayRoleIds}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Info Token card flow — player-facing card library + editor. Ephemeral
          projection aid; writes no game history. */}
      {infoTokenOpen && !readOnly && (
        <InfoTokenCard
          state={state}
          scriptId={game.scriptId as ScriptId}
          scriptRoleIds={getScriptRoleIds(game)}
          onClose={() => setInfoTokenOpen(false)}
        />
      )}

      <button
        onClick={onBack}
        aria-label={t.common.back}
        className='absolute left-4 top-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-board-gold/30 bg-board-ink/80 text-board-gold/70 shadow-lg transition-transform active:scale-90'
      >
        <CaretLeft size={24} weight='bold' />
      </button>

      {/* Top-right nav — always visible; swaps reference and editing panels. */}
      <nav className='absolute right-4 top-4 z-[55] flex items-center gap-3'>
        {[
          {
            id: 'script',
            icon: <Icon name='scrollText' size='md' />,
            label: t.game.panels.script,
            onPress: () => setActivePanel((p) => (p === 'script' ? null : 'script')),
            active: activePanel === 'script',
          },
          {
            id: 'nightOrder',
            icon: <Icon name='moon' size='md' />,
            label: t.game.panels.nightOrder,
            onPress: () => setActivePanel((p) => (p === 'nightOrder' ? null : 'nightOrder')),
            active: activePanel === 'nightOrder',
          },
          ...(bluffs && !readOnly
            ? [
                {
                  id: 'bluffs',
                  icon: <Icon name='drama' size='md' />,
                  label: t.game.board.demonBluffs,
                  onPress: () => setShowBluffs(true),
                  active: showBluffs,
                },
              ]
            : []),
          {
            id: 'infoToken',
            icon: <HandEye size={22} weight='regular' />,
            label: t.game.infoTokens.showCard,
            onPress: () => setInfoTokenOpen(true),
            active: infoTokenOpen,
          },
          ...(readOnly
            ? []
            : [
                {
                  id: 'edit',
                  icon: <UsersThree size={22} weight='regular' />,
                  label: t.game.board.editRoster,
                  onPress: () => setEditing((e) => !e),
                  active: editing,
                },
              ]),
        ].map((item) => (
          <button
            key={item.id}
            onClick={item.onPress}
            aria-label={item.label}
            aria-pressed={item.active}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-90',
              item.active ? 'bg-[#a78bda]' : 'bg-[#3a3654]',
            )}
          >
            {item.icon}
          </button>
        ))}
      </nav>
    </div>
  )
}
