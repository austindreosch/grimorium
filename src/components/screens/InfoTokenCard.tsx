import { useMemo, useState } from 'react'
import { GameState } from '../../lib/types'
import { getRole } from '../../lib/roles'
import { getScript, ScriptId } from '../../lib/scripts'
import { RoleDefinition } from '../../lib/roles/types'
import { useI18n, getRoleName } from '../../lib/i18n'
import {
  InfoTokenPreset,
  InfoTokenCategory,
  searchPresets,
} from '../../lib/infoTokens/catalog'
import { CharacterToken } from '../items/CharacterToken'
import { RolePickerGrid } from '../inputs/RolePickerGrid'
import { PlayerFacingScreen } from '../layouts'
import { Icon } from '../atoms'
import { cn } from '../../lib/utils'

type Props = {
  state: GameState
  /** The in-play bag — the picker's default scope. */
  inPlayRoleIds: string[]
  scriptId: ScriptId
  /** Dismiss the whole flow, back to the board. */
  onClose: () => void
}

type View = 'library' | 'editor' | 'show'

// Category → board-palette tile accent (coloring only; see catalog.ts).
const CATEGORY_TILE: Record<InfoTokenCategory, string> = {
  evil: 'border-board-evil/60 text-board-evil',
  good: 'border-board-good/60 text-board-goodSoft',
  role: 'border-board-gold/60 text-board-gold',
  freeform: 'border-parchment-400/40 text-parchment-300',
}

export function InfoTokenCard({ state, inPlayRoleIds, scriptId, onClose }: Props) {
  const { t, language } = useI18n()
  const [view, setView] = useState<View>('library')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [tokenRoleId, setTokenRoleId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerShowAll, setPickerShowAll] = useState(false)

  const results = useMemo(() => searchPresets(search, t), [search, t])

  const pickerRoles = useMemo<RoleDefinition[]>(() => {
    const ids = pickerShowAll ? getScript(scriptId).roles : inPlayRoleIds
    return [...new Set(ids)]
      .map(getRole)
      .filter((r): r is RoleDefinition => !!r)
  }, [pickerShowAll, scriptId, inPlayRoleIds])

  const openEditor = (preset: InfoTokenPreset | null) => {
    setMessage(preset ? preset.getDefaultMessage(t) : '')
    setTokenRoleId(null)
    setView('editor')
  }

  const tokenTeam = tokenRoleId ? getRole(tokenRoleId)?.team ?? 'townsfolk' : 'townsfolk'

  // ── Show (player-facing) ───────────────────────────────────────────────────
  // D2: only the mounted PlayerFacingScreen renders here — no library/editor DOM.
  if (view === 'show') {
    return (
      <PlayerFacingScreen>
        <div className='fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-board-leather px-6 text-center'>
          <button
            onClick={() => setView('editor')}
            aria-label={t.common.back}
            className='absolute left-4 top-[max(1rem,env(safe-area-inset-top))] text-parchment-400/50 active:scale-95'
          >
            <Icon name='arrowLeft' size='lg' />
          </button>

          {message.trim() && (
            <p className='font-tarot text-4xl uppercase leading-tight tracking-widest text-board-gold sm:text-5xl'>
              {message}
            </p>
          )}

          {tokenRoleId && (
            <div className='flex flex-col items-center gap-4'>
              <CharacterToken roleId={tokenRoleId} team={tokenTeam} size={220} />
              <span className='font-tarot text-3xl uppercase tracking-widest text-parchment-100'>
                {getRoleName(tokenRoleId, language)}
              </span>
            </div>
          )}
        </div>
      </PlayerFacingScreen>
    )
  }

  // ── Narrator chrome (library + editor) ──────────────────────────────────────
  return (
    <div className='fixed inset-0 z-[60] flex flex-col bg-board-leather'>
      {view === 'library' ? (
        <>
          {/* Header + search */}
          <div className='flex items-center gap-2 border-b border-board-gold/20 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]'>
            <Icon name='search' size='sm' className='text-board-gold/70' />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.game.infoTokens.searchPlaceholder}
              className='flex-1 bg-transparent font-body text-parchment-100 outline-none placeholder:text-parchment-400/60'
            />
            <button
              onClick={onClose}
              aria-label={t.ui.close}
              className='text-parchment-300 active:scale-95'
            >
              <Icon name='x' size='md' />
            </button>
          </div>

          {/* Preset tiles + Custom */}
          <div className='grid grid-cols-2 content-start gap-3 overflow-y-auto p-4 sm:grid-cols-3'>
            {results.map((preset) => (
              <button
                key={preset.id}
                onClick={() => openEditor(preset)}
                className={cn(
                  'flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-board-ink/60 p-3 text-center transition-transform active:scale-95',
                  CATEGORY_TILE[preset.category],
                )}
              >
                <span className='font-tarot text-sm uppercase tracking-wide'>
                  {preset.getLabel(t)}
                </span>
                <span className='font-flavor text-xs leading-snug text-parchment-400/80'>
                  {preset.getDefaultMessage(t)}
                </span>
              </button>
            ))}

            {/* Custom (blank) tile — always available regardless of search. */}
            <button
              onClick={() => openEditor(null)}
              className='flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-board-gold/40 bg-board-ink/40 p-3 text-board-gold transition-transform active:scale-95'
            >
              <Icon name='pencil' size='lg' />
              <span className='font-tarot text-sm uppercase tracking-wide'>
                {t.game.infoTokens.custom}
              </span>
            </button>

            {results.length === 0 && (
              <p className='col-span-full py-8 text-center font-body text-parchment-400'>
                {t.game.infoTokens.noResults}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Editor header */}
          <div className='flex items-center gap-2 border-b border-board-gold/20 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]'>
            <button
              onClick={() => setView('library')}
              aria-label={t.common.back}
              className='text-parchment-300 active:scale-95'
            >
              <Icon name='arrowLeft' size='md' />
            </button>
            <h2 className='flex-1 font-tarot text-xl text-board-gold'>
              {t.game.infoTokens.title}
            </h2>
            <button
              onClick={onClose}
              aria-label={t.ui.close}
              className='text-parchment-300 active:scale-95'
            >
              <Icon name='x' size='md' />
            </button>
          </div>

          {/* Card being authored */}
          <div className='flex flex-1 flex-col items-center gap-6 overflow-y-auto px-6 py-8'>
            {/* Token / swap-token control */}
            <button
              onClick={() => setPickerOpen(true)}
              className='relative flex flex-col items-center gap-2 active:scale-95'
            >
              {tokenRoleId ? (
                <>
                  <CharacterToken roleId={tokenRoleId} team={tokenTeam} size={144} />
                  <span className='flex items-center gap-1 font-body text-xs text-board-gold/80'>
                    <Icon name='shuffle' size='xs' />
                    {getRoleName(tokenRoleId, language)}
                  </span>
                </>
              ) : (
                <div className='flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed border-board-gold/40 text-board-gold/70'>
                  <Icon name='plus' size='xl' />
                  <span className='font-body text-xs'>{t.game.infoTokens.chooseToken}</span>
                </div>
              )}
            </button>

            {/* Freeform message field */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.game.infoTokens.messagePlaceholder}
              rows={2}
              className='w-full max-w-md resize-none rounded-2xl border-2 border-dashed border-board-gold/40 bg-transparent px-4 py-3 text-center font-tarot text-2xl uppercase tracking-wide text-parchment-50 outline-none placeholder:font-body placeholder:text-base placeholder:normal-case placeholder:tracking-normal placeholder:text-parchment-400/60'
            />
          </div>

          {/* Show button */}
          <div className='border-t border-board-gold/15 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3'>
            <button
              onClick={() => setView('show')}
              className='flex w-full items-center justify-center gap-2 rounded-full bg-board-gold py-3 font-tarot text-lg uppercase tracking-wide text-board-ink transition-transform active:scale-95'
            >
              <Icon name='eye' size='md' />
              {t.game.infoTokens.show}
            </button>
          </div>
        </>
      )}

      {/* Character picker overlay (editor only) */}
      {pickerOpen && (
        <div
          className='absolute inset-0 z-[65] flex flex-col bg-board-leather/95'
          onClick={() => setPickerOpen(false)}
        >
          <div
            className='m-3 mt-[max(0.75rem,env(safe-area-inset-top))] flex flex-1 flex-col overflow-hidden rounded-2xl border-2 border-board-good/70 bg-board-ink/90'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center gap-2 border-b border-board-good/30 p-3'>
              <span className='flex-1 font-tarot text-lg tracking-wide text-board-gold'>
                {t.game.infoTokens.chooseToken}
              </span>
              <button
                onClick={() => setPickerShowAll((v) => !v)}
                className='rounded-full border border-board-gold/30 px-3 py-1 font-body text-xs text-board-gold active:scale-95'
              >
                {pickerShowAll ? t.game.board.inPlay : t.game.board.allCharacters}
              </button>
              <button
                onClick={() => setPickerOpen(false)}
                aria-label={t.ui.close}
                className='text-parchment-300 active:scale-95'
              >
                <Icon name='x' size='md' />
              </button>
            </div>
            <div className='overflow-y-auto p-3'>
              <RolePickerGrid
                roles={pickerRoles}
                state={state}
                selected={tokenRoleId ? [tokenRoleId] : []}
                onSelect={(roleId) => {
                  setTokenRoleId(roleId)
                  setPickerOpen(false)
                }}
                selectionCount={1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
