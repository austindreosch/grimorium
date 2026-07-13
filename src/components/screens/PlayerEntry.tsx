import { useState, useRef, useEffect, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { useI18n } from '../../lib/i18n'
import { Button, Icon, BackButton } from '../atoms'
import { ScreenFooter } from '../layouts/ScreenFooter'
import {
  getLastGamePlayers,
  getRoster,
  addToRoster,
  removeFromRoster,
  seedRosterFromGames,
} from '../../lib/storage'

type Props = {
  onNext: (players: string[]) => void
  onBack: () => void
  /** Secondary affordance: switch to Guided mode (shown only in the Simple default flow). */
  onSwitchToGuided?: () => void
}

type PlayerItem = {
  id: string
  name: string
}

const MIN_PLAYERS = 5
const MAX_PLAYERS = 20

let _nextId = 0
function makePlayerItem(name: string): PlayerItem {
  return { id: `p-${_nextId++}`, name }
}

// First letter of the first two words, e.g. "Mary Jane" → "MJ", "Sam" → "S".
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function PlayerEntry({ onNext, onBack, onSwitchToGuided }: Props) {
  const { t } = useI18n()
  const [players, setPlayers] = useState<PlayerItem[]>(() => {
    _nextId = 0
    const lastPlayers = getLastGamePlayers()
    if (lastPlayers.length >= MIN_PLAYERS)
      return lastPlayers.map((n) => makePlayerItem(n))
    if (lastPlayers.length > 0) {
      return [
        ...lastPlayers.map((n) => makePlayerItem(n)),
        ...Array(MIN_PLAYERS - lastPlayers.length)
          .fill('')
          .map(() => makePlayerItem('')),
      ]
    }
    return Array(MIN_PLAYERS)
      .fill('')
      .map(() => makePlayerItem(''))
  })
  const [loadedFromLast] = useState(() => getLastGamePlayers().length > 0)
  const [roster, setRoster] = useState<string[]>(() => {
    seedRosterFromGames()
    return getRoster()
  })
  const lastInputRef = useRef<HTMLInputElement>(null)
  const prevLengthRef = useRef(players.length)

  // ── Drag-to-reorder ──────────────────────────────────────────────

  const [drag, setDrag] = useState<{
    index: number // index of the dragged item in the array
    targetIndex: number // where it would drop
    offsetY: number // raw Y offset of the dragged item
  } | null>(null)

  const rowHeightRef = useRef(0)
  const rowElsRef = useRef<(HTMLDivElement | null)[]>([])

  const measureRowHeight = useCallback(() => {
    for (const el of rowElsRef.current) {
      if (el) {
        // row height + space-y-3 gap (0.75rem = 12px)
        rowHeightRef.current = el.getBoundingClientRect().height + 12
        return rowHeightRef.current
      }
    }
    return 60
  }, [])

  const bindDrag = useDrag(
    ({ args: [rawIndex], active, movement: [, my], first, last }) => {
      const idx = rawIndex as number

      if (first) {
        measureRowHeight()
        setDrag({ index: idx, targetIndex: idx, offsetY: 0 })
        return
      }

      const rowH = rowHeightRef.current || 60
      const target = Math.max(
        0,
        Math.min(players.length - 1, idx + Math.round(my / rowH)),
      )

      if (active) {
        setDrag({ index: idx, targetIndex: target, offsetY: my })
      }

      if (last) {
        if (idx !== target) {
          setPlayers((prev) => {
            const next = [...prev]
            const [moved] = next.splice(idx, 1)
            next.splice(target, 0, moved)
            return next
          })
        }
        setDrag(null)
      }
    },
    {
      filterTaps: true,
      threshold: 5,
      axis: 'y',
      pointer: { touch: true },
    },
  )

  // Visual transform for each item during drag
  const getItemStyle = (index: number): React.CSSProperties => {
    if (!drag) return {}

    const { index: dragIdx, targetIndex, offsetY } = drag
    const rowH = rowHeightRef.current || 60

    if (index === dragIdx) {
      return {
        transform: `translateY(${offsetY}px) scale(1.02)`,
        zIndex: 50,
        position: 'relative',
        boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
        transition: 'box-shadow 200ms ease',
      }
    }

    // Items between dragged position and target shift to make room
    let shift = 0
    if (dragIdx < targetIndex) {
      // Dragging down: items in (dragIdx, targetIndex] shift up
      if (index > dragIdx && index <= targetIndex) shift = -rowH
    } else if (dragIdx > targetIndex) {
      // Dragging up: items in [targetIndex, dragIdx) shift down
      if (index >= targetIndex && index < dragIdx) shift = rowH
    }

    return {
      transform: shift ? `translateY(${shift}px)` : undefined,
      transition: 'transform 200ms ease',
    }
  }

  // ── List operations ────────────────────────────────────────────────

  useEffect(() => {
    if (players.length > prevLengthRef.current && lastInputRef.current) {
      lastInputRef.current.focus()
      lastInputRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
    prevLengthRef.current = players.length
  }, [players.length])

  const maxPlayersReached = players.length >= MAX_PLAYERS

  const addPlayer = () => {
    if (maxPlayersReached) return
    setPlayers([...players, makePlayerItem('')])
  }

  const updatePlayer = (index: number, name: string) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, name } : p)))
  }

  const removePlayer = (index: number) => {
    if (players.length <= MIN_PLAYERS) return
    setPlayers(players.filter((_, i) => i !== index))
  }

  // Fill the first empty slot with a saved name, or append a new row.
  const addFromRoster = (name: string) => {
    setPlayers((prev) => {
      const emptyIdx = prev.findIndex((p) => p.name.trim().length === 0)
      if (emptyIdx >= 0) {
        return prev.map((p, i) => (i === emptyIdx ? { ...p, name } : p))
      }
      if (prev.length >= MAX_PLAYERS) return prev
      return [...prev, makePlayerItem(name)]
    })
  }

  const deleteFromRoster = (name: string) => {
    removeFromRoster(name)
    setRoster(getRoster())
  }

  const handleNext = () => {
    const validPlayers = players.filter((p) => p.name.trim().length > 0)
    if (validPlayers.length >= MIN_PLAYERS) {
      const names = validPlayers.map((p) => p.name)
      addToRoster(names)
      onNext(names)
    }
  }

  const validCount = players.filter((p) => p.name.trim().length > 0).length
  const canProceed = validCount >= MIN_PLAYERS

  // Saved people not already entered in the current list.
  const enteredNames = new Set(
    players.map((p) => p.name.trim().toLowerCase()).filter(Boolean),
  )
  const availableRoster = roster.filter(
    (n) => !enteredNames.has(n.toLowerCase()),
  )

  return (
    <div className='min-h-app bg-gradient-to-b from-grimoire-purple via-grimoire-dark to-grimoire-darker flex flex-col'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-grimoire-dark/95 backdrop-blur-sm border-b border-mystic-gold/20 px-4 py-3'>
        <div className='flex items-center gap-3 max-w-3xl mx-auto'>
          <BackButton onClick={onBack} />
          <div>
            <h1 className='font-tarot text-lg text-parchment-100 tracking-wider uppercase'>
              {t.newGame.step1Title}
            </h1>
            <p className='text-xs text-parchment-500'>
              {t.newGame.step1Subtitle}
            </p>
          </div>
          {onSwitchToGuided && (
            <button
              onClick={onSwitchToGuided}
              className='ml-auto flex items-center gap-1 text-xs text-parchment-400 hover:text-mystic-gold transition-colors'
            >
              <Icon name='sparkles' size='xs' />
              {t.newGame.guidedModeLink}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 px-4 py-6 max-w-3xl mx-auto w-full'>
        {/* Player Count & Loaded indicator */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2 text-parchment-400'>
            <Icon name='users' size='sm' />
            <span className='text-sm tracking-wider'>
              {t.common.players} ({validCount})
            </span>
          </div>
          {loadedFromLast && (
            <span className='text-xs text-mystic-gold/60 flex items-center gap-1'>
              <Icon name='history' size='xs' />
              {t.newGame.loadedFromLastGame}
            </span>
          )}
        </div>

        {/* Player List */}
        <div className='space-y-3 mb-6'>
          {players.map((player, index) => (
            <div
              key={player.id}
              ref={(el) => {
                rowElsRef.current[index] = el
              }}
              className={`flex gap-2 items-center rounded-lg ${
                drag?.index === index
                  ? 'bg-white/5 ring-1 ring-mystic-gold/30'
                  : ''
              }`}
              style={getItemStyle(index)}
            >
              {/* Drag handle */}
              <div
                {...bindDrag(index)}
                className='flex items-center justify-center w-11 min-h-[44px] shrink-0 py-3 text-parchment-500/40 hover:text-parchment-400 cursor-grab active:cursor-grabbing touch-none select-none'
              >
                <Icon name='gripVertical' size='md' />
              </div>

              <input
                ref={index === players.length - 1 ? lastInputRef : undefined}
                type='text'
                value={player.name}
                onChange={(e) => updatePlayer(index, e.target.value)}
                placeholder={`${t.newGame.playerPlaceholder} ${index + 1}`}
                className='flex-1 bg-white/5 border border-parchment-500/30 text-parchment-100 placeholder-parchment-500 rounded-lg px-4 py-3 focus:outline-none focus:border-mystic-gold/50 focus:ring-1 focus:ring-mystic-gold/30 transition-colors'
              />
              {players.length > MIN_PLAYERS && (
                <button
                  onClick={() => removePlayer(index)}
                  className='p-3 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors'
                >
                  <Icon name='trash' size='md' />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Player Button */}
        {!maxPlayersReached && (
          <button
            onClick={addPlayer}
            className='w-full py-3 border border-dashed border-parchment-500/30 text-parchment-400 rounded-lg hover:border-parchment-400/50 hover:text-parchment-300 transition-colors flex items-center justify-center gap-2'
          >
            <Icon name='plus' size='md' />
            {t.newGame.addPlayer}
          </button>
        )}

        {/* Saved people — tap a circle to add */}
        {availableRoster.length > 0 && (
          <div className='mt-8'>
            <div className='flex items-center gap-2 mb-3 text-parchment-400'>
              <Icon name='users' size='xs' />
              <span className='text-xs tracking-wider uppercase'>
                {t.newGame.savedPeople}
              </span>
            </div>
            <div className='grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6 md:grid-cols-8'>
              {availableRoster.map((name) => (
                <div key={name} className='relative flex flex-col items-center'>
                  <button
                    onClick={() => addFromRoster(name)}
                    disabled={maxPlayersReached}
                    className='group flex flex-col items-center gap-1.5 w-full disabled:opacity-40'
                  >
                    <span className='flex items-center justify-center w-14 h-14 rounded-full bg-white/5 border border-parchment-500/30 text-parchment-100 font-tarot text-lg tracking-wide group-hover:border-mystic-gold/60 group-hover:bg-mystic-gold/10 group-active:scale-95 transition-all'>
                      {initials(name)}
                    </span>
                    <span className='text-xs text-parchment-300 text-center leading-tight w-full truncate px-0.5'>
                      {name}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteFromRoster(name)}
                    aria-label={`Remove ${name}`}
                    className='absolute -top-1 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-grimoire-darker border border-parchment-500/30 text-parchment-500/60 hover:text-red-400 hover:border-red-400/50 transition-colors'
                  >
                    <Icon name='x' size='xs' />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!canProceed && (
          <p className='text-center text-mystic-gold/60 text-sm mt-4'>
            {t.newGame.minPlayersWarning}
          </p>
        )}

        {!!maxPlayersReached && (
          <p className='text-center text-mystic-gold/60 text-sm mt-4'>
            {t.newGame.maxPlayersWarning}
          </p>
        )}
      </div>

      {/* Footer */}
      <ScreenFooter maxWidth='max-w-3xl'>
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          fullWidth
          size='lg'
          variant='gold'
        >
          {t.newGame.nextSelectRoles}
          <Icon name='arrowRight' size='md' className='ml-2' />
        </Button>
      </ScreenFooter>
    </div>
  )
}
