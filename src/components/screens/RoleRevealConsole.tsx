import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useDrag } from '@use-gesture/react'
import { ArrowsClockwise, UsersThree } from '@phosphor-icons/react'
import { GameState, PlayerState } from '../../lib/types'
import { getRole } from '../../lib/roles'
import { useI18n } from '../../lib/i18n'
import { deckForPlayer, DeckSlide, DeckToken } from '../../lib/infoTokens/deck'
import { RoleDefinition } from '../../lib/roles/types'
import { CharacterToken } from '../items/CharacterToken'
import { PlayerFacingScreen } from '../layouts'
import { RolePickerGrid } from '../inputs/RolePickerGrid'
import { Icon } from '../atoms'
import { cn } from '../../lib/utils'
import { getRevealState, setRevealState } from '../../lib/storage'

type Props = {
  player: PlayerState
  state: GameState
  /** Scopes the persisted storyteller choices (swap + deck fills) to this game. */
  gameId: string
  /** Full script role list — drives the demon's not-in-play bluffs. */
  scriptRoleIds: string[]
  /** Swap the seat's real role — the YOU ARE swap writes straight to the board. */
  onSetPlayerRole: (playerId: string, roleId: string) => void
  onClose: () => void
}

// Its own world: the desaturated-plum stage the reveal card floats on, matching
// InfoTokenCard so the two flows read as the same physical prop.
const STAGE = '#39333f'
const FRAME = `${import.meta.env.BASE_URL}assets/info-token-frame.png`
const KEYWORD = '#e8a94a' // gold highlight on the trailing word
const FRAME_TOKEN = 116

function formatPlayerName(name: string) {
  return name
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())
}

function GildedMessage({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <p className='text-center font-respira text-3xl font-normal uppercase leading-[1.24] tracking-wide text-white sm:text-[38px] md:text-[42px]'>
      {text}
    </p>
  )
}

/** A filled character token with a swap badge (bluffs + filled selectRole). */
function RoleTokenButton({ roleId, onEdit }: { roleId: string; onEdit?: () => void }) {
  const role = getRole(roleId)
  if (!role) return null
  const art = <CharacterToken roleId={role.id} team={role.team} size={FRAME_TOKEN} />
  if (!onEdit) return art
  return (
    <button
      type='button'
      onClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
      aria-label='Change character'
      className='relative transition-transform active:scale-95'
    >
      {art}
    </button>
  )
}

/** The name pill shown for a chosen player. */
function PlayerPill({ name, onEdit }: { name: string; onEdit?: () => void }) {
  const pill = (
    <span className='inline-flex items-center justify-center gap-3 rounded-[10px] border border-white/20 bg-white/10 px-4 py-1.5 text-center font-respira text-3xl font-normal leading-none tracking-[0.02em] shadow-[0_6px_18px_rgba(0,0,0,0.22)] sm:text-4xl md:text-[44px]' style={{ color: KEYWORD }}>
      <UsersThree size={42} weight='bold' className='mt-px shrink-0' />
      <span className='leading-none'>{formatPlayerName(name)}</span>
    </span>
  )
  if (!onEdit) return pill
  return (
    <button
      type='button'
      onClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
      aria-label='Change player'
      className='relative transition-transform active:scale-95'
    >
      {pill}
    </button>
  )
}

/** Empty tap-to-fill slot — a dashed character disc or name pill. */
function EmptySlot({ shape, onEdit }: { shape: 'role' | 'player'; onEdit: () => void }) {
  return (
    <button
      type='button'
      onClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
      aria-label={shape === 'role' ? 'Choose character' : 'Choose player'}
      className={cn(
        'flex items-center justify-center gap-1.5 border-2 border-dashed border-white/40 text-white/60 transition-transform active:scale-95 hover:border-white/60 hover:text-white/80',
        shape === 'role' ? 'rounded-full' : 'rounded-[10px] px-6 py-3',
      )}
      style={shape === 'role' ? { width: FRAME_TOKEN, height: FRAME_TOKEN } : undefined}
    >
      {shape === 'player' && <UsersThree size={22} weight='bold' />}
      <Icon name='plus' size={shape === 'role' ? 'lg' : 'sm'} />
    </button>
  )
}

/**
 * One placed token inside a slide. `override` holds the storyteller's choice for
 * a swappable/selectable slot (a roleId for role/selectRole, a playerId for
 * selectPlayer); empty selector slots render a tap-to-fill placeholder.
 */
function TokenView({
  token,
  state,
  override,
  onEdit,
}: {
  token: DeckToken
  state: GameState
  override?: string
  onEdit?: () => void
}) {
  if (token.kind === 'role' || token.kind === 'selectRole') {
    const roleId = token.kind === 'role' ? override ?? token.roleId : override
    if (!roleId) return <EmptySlot shape='role' onEdit={onEdit ?? (() => {})} />
    return <RoleTokenButton roleId={roleId} onEdit={onEdit} />
  }
  if (token.kind === 'value') {
    const value = override ?? token.value
    const num = (
      <span
        className='font-read text-8xl font-bold leading-none sm:text-[128px]'
        style={{ color: KEYWORD }}
      >
        {value}
      </span>
    )
    if (!onEdit) return num
    return (
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        aria-label='Change number'
        className='relative inline-flex px-2 transition-transform active:scale-95'
      >
        {num}
      </button>
    )
  }
  if (token.kind === 'selectPlayer') {
    const chosen = override ? state.players.find((p) => p.id === override) : null
    if (!chosen) return <EmptySlot shape='player' onEdit={onEdit ?? (() => {})} />
    return <PlayerPill name={chosen.name} onEdit={onEdit} />
  }
  const playerId = override ?? token.playerId
  const player = state.players.find((p) => p.id === playerId)
  return player ? <PlayerPill name={player.name} onEdit={onEdit} /> : null
}

/** The ornate purple info-token frame with its content laid out inside the border. */
function FrameCard({ children }: { children: ReactNode }) {
  return (
    <div
      className='relative mx-auto aspect-[1548/1214] max-w-full'
      style={{
        backgroundImage: `url(${FRAME})`,
        backgroundSize: '100% 100%',
        width: 'min(60rem, calc((100vh - 8rem) * 1548 / 1214), 100%)',
        filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.55))',
      }}
    >
      <div className='absolute inset-[10%] flex flex-col items-center justify-center gap-6'>
        {children}
      </div>
    </div>
  )
}

// Every placed token is editable — tap it to swap the character, player, or number.
const EDITABLE_KINDS = new Set<DeckToken['kind']>([
  'role',
  'player',
  'selectRole',
  'selectPlayer',
  'value',
])

/** A single slide's inner content: token row above the gilded line. */
function Slide({
  slide,
  state,
  overrides,
  onEditToken,
}: {
  slide: DeckSlide
  state: GameState
  overrides: Record<string, string>
  onEditToken: (key: string, kind: DeckToken['kind']) => void
}) {
  // Arrow between the token row/value and the line, pointing back to the thing
  // the sentence is describing.
  const hasTokenReference = slide.tokens.length > 0

  return (
    <FrameCard>
      {slide.tokens.length > 0 && (
        <div className='flex flex-wrap items-center justify-center gap-4'>
          {slide.tokens.map((token, i) => {
            const key = `${slide.id}:${i}`
            return (
              <TokenView
                key={i}
                token={token}
                state={state}
                override={overrides[key]}
                onEdit={
                  EDITABLE_KINDS.has(token.kind)
                    ? () => onEditToken(key, token.kind)
                    : undefined
                }
              />
            )
          })}
        </div>
      )}
      {hasTokenReference && (
        <div className='h-0 w-0 border-x-[8px] border-b-[10px] border-x-transparent border-b-white/65' />
      )}
      <GildedMessage text={slide.message} />
    </FrameCard>
  )
}

export function RoleRevealConsole({ player, state, gameId, scriptRoleIds, onSetPlayerRole, onClose }: Props) {
  const { t } = useI18n()
  // Restore the storyteller's prior choices for this seat, so reopening shows
  // what was last displayed. Persisted per game+player, never to game.history.
  const saved = useMemo(
    () => getRevealState(gameId, player.id),
    [gameId, player.id],
  )
  // Which picker is open, keyed to a deck slot `${slideId}:${index}`:
  //  - youare  → swap the left "YOU ARE" character
  //  - role    → fill/swap a character slot (bluffs, selectRole)
  //  - player  → fill/swap a player slot (selectPlayer)
  const [picker, setPicker] = useState<
    | { kind: 'youare' }
    | { kind: 'role'; key: string }
    | { kind: 'player'; key: string }
    | { kind: 'number'; key: string }
    | null
  >(null)
  // Storyteller fills for deck slots, keyed by slide+index. A value is a roleId
  // for character slots, a playerId for player slots. Ephemeral — writes no
  // history, same as the YOU ARE swap.
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>(
    saved?.tokenOverrides ?? {},
  )

  // Persist deck fills whenever they change so they survive close/reopen + reload.
  useEffect(() => {
    setRevealState(gameId, player.id, { tokenOverrides })
  }, [gameId, player.id, tokenOverrides])
  // The YOU ARE role is the board's real role — swapping it writes to the board,
  // so the deck (and vice versa: board changes) always reflects player.roleId.
  const slides = deckForPlayer(player, state, scriptRoleIds, t)
  const pickerRoles = useMemo<RoleDefinition[]>(() => {
    return [...new Set(scriptRoleIds)]
      .map(getRole)
      .filter((r): r is RoleDefinition => !!r)
  }, [scriptRoleIds])

  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const [dismissY, setDismissY] = useState(0)
  const last = slides.length - 1

  // Horizontal swipe between slides — snap on release (flick OR quarter-drag).
  const bindSwipe = useDrag(
    ({ last: released, movement: [mx], swipe: [sx] }) => {
      if (!released) {
        setDx(mx)
        return
      }
      let next = index
      if (sx < 0 || mx < -80) next = Math.min(index + 1, last)
      else if (sx > 0 || mx > 80) next = Math.max(index - 1, 0)
      setIndex(next)
      setDx(0)
    },
    { axis: 'x', filterTaps: true },
  )
  const bindDismiss = useDrag(
    ({ last: released, tap, movement: [, my] }) => {
      if (tap) return
      const y = Math.max(0, my)
      if (!released) {
        setDismissY(y)
        return
      }
      if (y > 96) onClose()
      else setDismissY(0)
    },
    { axis: 'y', filterTaps: true },
  )

  return (
    <PlayerFacingScreen>
      <div
        className='fixed inset-0 z-[70] flex select-none items-center justify-center bg-black/60 p-3 md:p-6'
        onClick={onClose}
      >
      <div
        {...bindDismiss()}
        className='relative h-full w-full max-w-[80rem] cursor-grab overflow-hidden rounded-2xl border border-white/10 shadow-2xl active:cursor-grabbing'
        style={{
          backgroundColor: STAGE,
          transform: `translateY(${dismissY}px)`,
          opacity: 1 - Math.min(0.28, dismissY / 520),
          transition: dismissY === 0 ? 'transform 0.22s cubic-bezier(0.23,1,0.32,1), opacity 0.22s cubic-bezier(0.23,1,0.32,1)' : 'none',
          touchAction: 'pan-x',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='absolute left-1/2 top-3 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/25 shadow-[0_1px_2px_rgba(0,0,0,0.28)]' />
        <div className='absolute left-4 top-4 z-20 flex items-center gap-2'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              setPicker({ kind: 'youare' })
            }}
            aria-label='Swap character token'
            className='flex h-11 w-11 items-center justify-center rounded-full bg-[#8b7fb0] text-white shadow-xl transition-transform active:scale-95'
          >
            <ArrowsClockwise size={24} weight='bold' />
          </button>
        </div>

        <div className='flex h-full min-h-0 items-center justify-center px-6 py-6'>
        <div className='flex h-full min-h-0 w-full flex-col items-center justify-center md:max-w-[66rem]'>
          {slides.length === 0 ? (
            <FrameCard>
              <p className='text-center font-read text-2xl uppercase tracking-wide text-white/60'>
                {t.game.infoTokens.noResults}
              </p>
            </FrameCard>
          ) : (
            <>
              <div
                {...bindSwipe()}
                className='-m-12 flex min-h-0 w-[calc(100%+6rem)] flex-1 items-center justify-center overflow-hidden p-12'
                style={{ touchAction: 'pan-y' }}
              >
                <div
                  className='flex h-full w-full items-center'
                  style={{
                    transform: `translateX(calc(${-index * 100}% + ${dx}px))`,
                    transition: dx === 0 ? 'transform 0.28s cubic-bezier(0.23,1,0.32,1)' : 'none',
                  }}
                >
                  {slides.map((slide) => (
                    <div key={slide.id} className='flex h-full w-full shrink-0 items-center justify-center'>
                      <Slide
                        slide={slide}
                        state={state}
                        overrides={tokenOverrides}
                        onEditToken={(key, kind) =>
                          setPicker(
                            kind === 'player' || kind === 'selectPlayer'
                              ? { kind: 'player', key }
                              : kind === 'value'
                                ? { kind: 'number', key }
                                : { kind: 'role', key },
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {slides.length > 1 && (
                <div className='mt-6 flex items-center justify-center gap-2.5'>
                  {slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      onClick={() => setIndex(i)}
                      aria-label={`${i + 1}`}
                      className={cn(
                        'h-2.5 w-2.5 rounded-full transition-colors',
                        i === index ? 'bg-[#c7a2f0]' : 'bg-white/25',
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </div>
        {picker && (
          <div
            className='absolute inset-0 z-20 flex items-center justify-center bg-[#39333f]/85 p-4'
            onClick={(e) => {
              e.stopPropagation()
              setPicker(null)
            }}
          >
            <div
              className='flex max-h-[min(34rem,calc(100vh-3rem))] w-[min(44rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl bg-parchment-200 p-3 shadow-2xl'
              onClick={(e) => e.stopPropagation()}
            >
              <div className='mb-3 flex items-center justify-between gap-3 rounded-[10px] bg-white px-4 py-3'>
                <span className='font-body text-sm font-bold uppercase tracking-wide text-board-ink'>
                  {picker.kind === 'player'
                    ? 'Choose player'
                    : picker.kind === 'number'
                      ? 'Choose number'
                      : 'Choose character'}
                </span>
                <button
                  type='button'
                  onClick={() => setPicker(null)}
                  aria-label={t.ui.close}
                  className='text-board-ink/55 transition-transform active:scale-95'
                >
                  <Icon name='x' size='md' />
                </button>
              </div>
              <div className='min-h-0 flex-1 overflow-y-auto rounded-xl bg-board-ink/10 p-3'>
                {picker.kind === 'number' ? (
                  <div className='grid grid-cols-3 gap-2 sm:grid-cols-5'>
                    {Array.from({ length: 9 }, (_, i) => String(i + 1)).map((n) => {
                      const key = picker.key
                      const selected = tokenOverrides[key] === n
                      return (
                        <button
                          key={n}
                          type='button'
                          onClick={() => {
                            setTokenOverrides((prev) => ({ ...prev, [key]: n }))
                            setPicker(null)
                          }}
                          className={cn(
                            'flex aspect-square items-center justify-center rounded-xl border-2 font-read text-3xl font-bold transition-transform active:scale-95',
                            selected
                              ? 'border-board-ink/70 bg-white/50 text-board-ink'
                              : 'border-board-ink/10 bg-white/20 text-board-ink/80 hover:bg-white/30',
                          )}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                ) : picker.kind === 'player' ? (
                  <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                    {state.players.map((p) => {
                      const key = picker.key
                      const selected = tokenOverrides[key] === p.id
                      return (
                        <button
                          key={p.id}
                          type='button'
                          onClick={() => {
                            setTokenOverrides((prev) => ({ ...prev, [key]: p.id }))
                            setPicker(null)
                          }}
                          className={cn(
                            'flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-transform active:scale-95',
                            selected
                              ? 'border-board-ink/70 bg-white/50'
                              : 'border-board-ink/10 bg-white/20 hover:bg-white/30',
                          )}
                        >
                          <UsersThree size={20} weight='bold' className='shrink-0 text-board-ink/60' />
                          <span className='min-w-0 flex-1 truncate font-body text-sm font-bold text-board-ink'>
                            {p.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <RolePickerGrid
                    roles={pickerRoles}
                    state={state}
                    selected={
                      picker.kind === 'youare'
                        ? [player.roleId]
                        : tokenOverrides[picker.key]
                          ? [tokenOverrides[picker.key]]
                          : []
                    }
                    onSelect={(roleId) => {
                      if (picker.kind === 'youare') onSetPlayerRole(player.id, roleId)
                      else setTokenOverrides((prev) => ({ ...prev, [picker.key]: roleId }))
                      setPicker(null)
                    }}
                    selectionCount={1}
                    surface='light'
                    compact
                    flat
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </PlayerFacingScreen>
  )
}
