import { useI18n, interpolate } from '../../lib/i18n'
import { Icon, BackButton } from '../atoms'
import { IconName } from '../atoms/icon'
import { cn } from '../../lib/utils'

type Props = {
  /** Player names entered for this game. */
  players: string[]
  /** The chosen in-play character set ("bag"). */
  bag: string[]
  /** Shuffle & pass out — randomly deal the bag to the players. */
  onShuffle: () => void
  /** Assign manually — start every seat blank; assign on the board. */
  onManual: () => void
  onBack: () => void
}

const CHOICES: {
  id: 'shuffle' | 'manual'
  icon: IconName
  nameKey: 'dealShuffle' | 'dealManual'
  descKey: 'dealShuffleDesc' | 'dealManualDesc'
  gold: boolean
}[] = [
  {
    id: 'shuffle',
    icon: 'shuffle',
    nameKey: 'dealShuffle',
    descKey: 'dealShuffleDesc',
    gold: true,
  },
  {
    id: 'manual',
    icon: 'userPlus',
    nameKey: 'dealManual',
    descKey: 'dealManualDesc',
    gold: false,
  },
]

/**
 * Simple-Mode deal step: after the bag is chosen, the storyteller either
 * shuffles the characters out to the players or starts with blank seats to
 * assign by hand on the board. Either choice starts the game — the persistent
 * "N unassigned" nudge never blocks it (manual assignment is the whole point).
 */
export function DealScreen({ players, bag, onShuffle, onManual, onBack }: Props) {
  const { t } = useI18n()
  // Before dealing, every seat is unassigned — the nudge previews the manual path.
  const unassignedCount = players.length

  return (
    <div className='min-h-app bg-gradient-to-b from-grimoire-purple via-grimoire-dark to-grimoire-darker flex flex-col'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-grimoire-dark/95 backdrop-blur-sm border-b border-mystic-gold/20 px-4 py-3'>
        <div className='flex items-center gap-3 max-w-3xl mx-auto'>
          <BackButton onClick={onBack} />
          <div className='flex-1'>
            <h1 className='font-tarot text-lg text-parchment-100 tracking-wider uppercase'>
              {t.newGame.dealTitle}
            </h1>
            <p className='text-xs text-parchment-500'>
              {interpolate(t.newGame.dealSubtitle, {
                players: players.length,
                roles: bag.length,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Choices */}
      <div className='flex-1 px-4 py-6 max-w-3xl mx-auto w-full'>
        {/* Persistent unassigned nudge — informational, never blocks */}
        {unassignedCount > 0 && (
          <div className='mb-5 flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-amber-300'>
            <Icon name='alertTriangle' size='sm' />
            <span className='text-sm font-medium'>
              {interpolate(t.newGame.unassignedCount, {
                count: unassignedCount,
              })}
            </span>
          </div>
        )}

        <div className='grid gap-4 sm:grid-cols-2'>
          {CHOICES.map(({ id, icon, nameKey, descKey, gold }) => (
            <button
              key={id}
              type='button'
              onClick={id === 'shuffle' ? onShuffle : onManual}
              className={cn(
                'w-full rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98]',
                gold
                  ? 'border-mystic-gold/30 bg-gradient-to-br from-mystic-gold/10 to-mystic-gold/[0.02] hover:border-mystic-gold/50'
                  : 'border-parchment-500/30 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-parchment-400/40',
              )}
            >
              <div className='flex items-start gap-4'>
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    gold
                      ? 'bg-mystic-gold/10 border border-mystic-gold/30'
                      : 'bg-parchment-500/10 border border-parchment-500/20',
                  )}
                >
                  <Icon
                    name={icon}
                    size='lg'
                    className={gold ? 'text-mystic-gold' : 'text-parchment-400'}
                  />
                </div>

                <div className='flex-1 min-w-0'>
                  <h2
                    className={cn(
                      'font-tarot text-base tracking-wider uppercase mb-1',
                      gold ? 'text-mystic-gold' : 'text-parchment-200',
                    )}
                  >
                    {t.newGame[nameKey]}
                  </h2>
                  <p className='text-xs text-parchment-500 leading-relaxed'>
                    {t.newGame[descKey]}
                  </p>
                </div>

                <Icon
                  name='chevronRight'
                  size='md'
                  className={cn(
                    'flex-shrink-0 mt-1',
                    gold ? 'text-mystic-gold/50' : 'text-parchment-500/50',
                  )}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
