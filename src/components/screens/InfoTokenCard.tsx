import { MouseEvent, ReactNode, useMemo, useState } from 'react'
import { User } from '@phosphor-icons/react'
import { GameState } from '../../lib/types'
import { getRole } from '../../lib/roles'
import { getScript, ScriptId } from '../../lib/scripts'
import { RoleDefinition } from '../../lib/roles/types'
import { useI18n } from '../../lib/i18n'
import {
  InfoTokenPreset,
  searchPresets,
} from '../../lib/infoTokens/catalog'
import { CharacterToken } from '../items/CharacterToken'
import { RolePickerGrid } from '../inputs/RolePickerGrid'
import { PlayerFacingScreen } from '../layouts'
import { Icon } from '../atoms'

type Props = {
  state: GameState
  scriptId: ScriptId
  /** Full script role list (persisted for imported scripts); falls back to the static table. */
  scriptRoleIds?: string[]
  /** Dismiss the whole flow, back to the board. */
  onClose: () => void
}

type View = 'library' | 'card'
type TokenChoice =
  | { kind: 'role'; roleId: string }
  | { kind: 'player'; playerId: string }
type PickerTab = 'players' | 'characters'

// The mockup palette: dark-plum stage, a raised lavender card, cream tokens,
// white serif copy with a single gold keyword. Deliberately its own world — the
// reveal is a physical prop the storyteller flashes, not a board panel.
const STAGE = '#39333f' // desaturated plum backdrop
const CARD = '#6d6488' // raised lavender card
const MAX_TOKENS = 3

const CARD_TOKEN_SIZE = 164

function GildedMessage({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <p className='text-center font-read text-5xl font-semibold uppercase leading-[1.1] tracking-wide text-white sm:text-6xl'>
      {text}
    </p>
  )
}

/**
 * The reveal card — a raised lavender panel with the character token straddling
 * its top edge and the message below. Shared by the player-facing "show" view
 * and the narrator editor so both read as the same physical prop.
 */
function InfoCard({
  token,
  hasToken,
  children,
  onClick,
}: {
  token: ReactNode
  hasToken: boolean
  children: ReactNode
  onClick?: (e: MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className='relative aspect-[4/5] h-[min(85vh,44rem)] max-w-[90vw] rounded-[2rem] border border-white/15 px-8 pb-10 pt-28 shadow-2xl'
      style={{ backgroundColor: CARD }}
    >
      <div className='absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2'>
        {token}
      </div>
      <div
        className={`absolute left-8 right-8 flex -translate-y-1/2 flex-col items-center justify-center gap-5 ${
          hasToken ? 'top-[70%]' : 'top-1/2'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

/** Tan circular chrome button (back / menu), matching the mockup corners. */
function ChromeButton({
  onClick,
  icon,
  label,
  accent,
}: {
  onClick: () => void
  icon: 'arrowLeft' | 'x'
  label: string
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className='flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95'
      style={{ backgroundColor: accent ? '#8b7fb0' : '#a8a294', color: '#2b2733' }}
    >
      <Icon name={icon} size='md' />
    </button>
  )
}

function PlayerNameToken({ name }: { name: string }) {
  return (
    <div className='flex shrink-0 items-center justify-center gap-2 px-3 text-center font-sheet text-5xl font-semibold uppercase leading-none tracking-wide text-white'>
      <User size={34} weight='bold' className='shrink-0' />
      {name}
    </div>
  )
}

/** Renders a single placed token (role art or a player name disc). */
function TokenView({
  choice,
  state,
  size,
}: {
  choice: TokenChoice
  state: GameState
  size: number
}) {
  if (choice.kind === 'role') {
    const role = getRole(choice.roleId)
    return role ? <CharacterToken roleId={role.id} team={role.team} size={size} /> : null
  }
  const player = state.players.find((p) => p.id === choice.playerId)
  return player ? <PlayerNameToken name={player.name} /> : null
}

export function InfoTokenCard({ state, scriptId, scriptRoleIds, onClose }: Props) {
  const { t } = useI18n()
  const [view, setView] = useState<View>('library')
  const [editing, setEditing] = useState(false)
  // Only the blank Custom card lets you type free text; presets are fixed.
  const [custom, setCustom] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [tokens, setTokens] = useState<TokenChoice[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const results = useMemo(() => searchPresets(search, t), [search, t])

  const pickerRoles = useMemo<RoleDefinition[]>(() => {
    return [...new Set(scriptRoleIds ?? getScript(scriptId).roles)]
      .map(getRole)
      .filter((r): r is RoleDefinition => !!r)
  }, [scriptId, scriptRoleIds])

  const openEditor = (preset: InfoTokenPreset | null) => {
    setMessage(preset ? preset.getDefaultMessage(t) : '')
    setTokens([])
    setCustom(!preset)
    // Presets open on the clean reveal; a blank Custom card opens in edit mode
    // (nothing to type yet).
    setEditing(!preset)
    setView('card')
  }

  const size = CARD_TOKEN_SIZE

  // ── Card (reveal + inline edit) ──────────────────────────────────────────────
  // Clean reveal by default; tap the card to show edit chrome, tap the stage
  // (anywhere outside the card) to dismiss it back to the clean reveal.
  if (view === 'card') {
    return (
      <PlayerFacingScreen>
        <div
          onClick={() => setEditing(false)}
          className='fixed inset-0 z-[70] flex flex-col items-center justify-center px-6'
          style={{ backgroundColor: STAGE }}
        >
          <div className='absolute left-4 top-[max(1rem,env(safe-area-inset-top))]'>
            <ChromeButton
              onClick={() => setView('library')}
              icon='arrowLeft'
              label={t.common.back}
            />
          </div>
          <div className='absolute right-4 top-[max(1rem,env(safe-area-inset-top))]'>
            <ChromeButton onClick={onClose} icon='x' label={t.ui.close} />
          </div>

          <InfoCard
            hasToken={tokens.length > 0 || editing}
            onClick={(e) => {
              // Card taps must not bubble to the stage (which would dismiss).
              e.stopPropagation()
              if (!editing) setEditing(true)
            }}
            token={
              tokens.length === 0 && !editing ? null : (
                <div className='flex items-center justify-center gap-3'>
                  {tokens.map((choice, i) =>
                    editing ? (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation()
                          setTokens((prev) => prev.filter((_, j) => j !== i))
                        }}
                        aria-label={t.ui.close}
                        className='relative block transition-transform active:scale-95'
                      >
                        <TokenView choice={choice} state={state} size={size} />
                        <span className='absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-board-evil text-white shadow-lg'>
                          <Icon name='x' size='sm' />
                        </span>
                      </button>
                    ) : (
                      <TokenView key={i} choice={choice} state={state} size={size} />
                    ),
                  )}
                  {editing && tokens.length === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPickerOpen(true)
                      }}
                      aria-label={t.game.infoTokens.chooseToken}
                      className='flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white/85 shadow-xl transition-transform active:scale-95'
                    >
                      <Icon name='plus' size='lg' />
                    </button>
                  )}
                  {editing && tokens.length > 0 && tokens.length < MAX_TOKENS && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPickerOpen(true)
                      }}
                      aria-label={t.game.infoTokens.chooseToken}
                      className='absolute left-[calc(100%+0.5rem)] top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white/85 shadow-xl transition-transform active:scale-95'
                    >
                      <Icon name='plus' size='lg' />
                    </button>
                  )}
                </div>
              )
            }
          >
            {editing && custom ? (
              <textarea
                value={message}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.game.infoTokens.messagePlaceholder}
                rows={3}
                className='w-full resize-none rounded-2xl border-2 border-dashed border-white/35 bg-transparent px-4 py-3 text-center font-read text-4xl font-semibold uppercase leading-tight tracking-wide text-white outline-none placeholder:font-body placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-white/50 sm:text-5xl'
              />
            ) : (
              <GildedMessage text={message} />
            )}
          </InfoCard>

          {pickerOpen && (
            <TokenPicker
              state={state}
              roles={pickerRoles}
              selected={tokens}
              onSelect={(nextToken) => {
                setTokens((prev) =>
                  prev.length >= MAX_TOKENS ? prev : [...prev, nextToken],
                )
                setPickerOpen(false)
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </PlayerFacingScreen>
    )
  }

  // ── Library ──────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={onClose}
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4'
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className='flex max-h-full w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-[2rem] bg-parchment-200 p-3 shadow-2xl'
      >
        {/* Search pill */}
        <div className='flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-inner'>
          <Icon name='search' size='sm' className='text-board-ink/50' />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.game.infoTokens.searchPlaceholder}
            className='flex-1 bg-transparent font-body text-board-ink outline-none placeholder:text-board-ink/40'
          />
          <button
            onClick={onClose}
            aria-label={t.ui.close}
            className='text-board-ink/50 transition-transform active:scale-95'
          >
            <Icon name='x' size='md' />
          </button>
        </div>

        {/* Preset tiles + Custom */}
        <div className='grid grid-cols-2 content-start gap-3 overflow-y-auto sm:grid-cols-3'>
          {results.map((preset) => (
            <button
              key={preset.id}
              onClick={() => openEditor(preset)}
              className='flex min-h-[120px] flex-col items-center justify-center rounded-2xl px-4 py-5 text-center shadow-md transition-transform active:scale-95'
              style={{ backgroundColor: CARD }}
            >
              <TilePreview text={preset.getDefaultMessage(t)} />
            </button>
          ))}

          {/* Custom (blank) tile — always available regardless of search. */}
          <button
            onClick={() => openEditor(null)}
            className='flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-board-ink/25 px-4 py-5 text-board-ink/60 transition-transform active:scale-95'
          >
            <Icon name='pencil' size='lg' />
            <span className='font-tarot text-sm uppercase tracking-wide'>
              {t.game.infoTokens.custom}
            </span>
          </button>

          {results.length === 0 && (
            <p className='col-span-full py-8 text-center font-body text-board-ink/50'>
              {t.game.infoTokens.noResults}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** A headline sized for the library tile. */
function TilePreview({ text }: { text: string }) {
  return (
    <span className='font-read text-lg font-semibold uppercase leading-tight tracking-wide text-white'>
      {text}
    </span>
  )
}

/** Character picker popover — a parchment tray, matching the mockup. */
function TokenPicker({
  state,
  roles,
  selected,
  onSelect,
  onClose,
}: {
  state: GameState
  roles: RoleDefinition[]
  selected: TokenChoice[]
  onSelect: (token: TokenChoice) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const [tab, setTab] = useState<PickerTab>('characters')
  return (
    <div
      className='absolute inset-0 z-[65] flex items-center justify-center p-4'
      style={{ backgroundColor: 'rgba(57,51,63,0.85)' }}
      onClick={onClose}
    >
      <div
        className='flex h-[85vh] w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-xl bg-parchment-200 p-3 shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex gap-3'>
          <div className='flex h-9 flex-1 items-center gap-3 rounded-[10px] bg-white px-4'>
            <Icon name='search' size='sm' className='text-board-ink/50' />
            <span className='flex-1 font-body text-xs text-board-ink/80'>
              {t.game.infoTokens.chooseToken}
            </span>
          </div>
          <div className='grid h-9 w-[22rem] grid-cols-2 rounded-[10px] border border-board-ink/15 bg-board-ink/10 p-1'>
            {(['characters', 'players'] as PickerTab[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 font-body text-xs transition-transform active:scale-95 ${
                  tab === key ? 'bg-board-ink text-parchment-100' : 'text-board-ink/65'
                }`}
              >
                {key === 'players' ? t.common.players : t.game.board.allCharacters}
              </button>
            ))}
          </div>
        </div>
        <div className='min-h-0 flex-1 overflow-y-auto rounded-2xl bg-board-ink/10 p-3'>
          {tab === 'players' ? (
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4'>
              {state.players.map((player) => {
                const isSelected = selected.some(
                  (s) => s.kind === 'player' && s.playerId === player.id,
                )
                return (
                  <button
                    key={player.id}
                    onClick={() => onSelect({ kind: 'player', playerId: player.id })}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-transform active:scale-95 ${
                      isSelected
                        ? 'border-board-ink/70 bg-white/40'
                        : 'border-board-ink/10 bg-white/20'
                    }`}
                  >
                    <Icon name='user' size='md' className='shrink-0 text-board-ink/60' />
                    <span className='min-w-0 flex-1 truncate font-body text-sm font-bold text-board-ink'>
                      {player.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <RolePickerGrid
              roles={roles}
              state={state}
              selected={[]}
              onSelect={(roleId) => onSelect({ kind: 'role', roleId })}
              selectionCount={MAX_TOKENS}
              surface='light'
              compact
              flat
            />
          )}
        </div>
      </div>
    </div>
  )
}
