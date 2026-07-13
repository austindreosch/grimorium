import { useI18n } from '../../lib/i18n'
import { GameMode } from '../../lib/types'
import { Icon, BackButton } from '../atoms'
import { IconName } from '../atoms/icon'
import { cn } from '../../lib/utils'

type Props = {
  onSelect: (mode: GameMode) => void
  onBack: () => void
}

const MODES: {
  mode: GameMode
  icon: IconName
  nameKey: 'guidedModeName' | 'simpleModeName'
  descKey: 'guidedModeDesc' | 'simpleModeDesc'
  gold: boolean
}[] = [
  {
    mode: 'guided',
    icon: 'sparkles',
    nameKey: 'guidedModeName',
    descKey: 'guidedModeDesc',
    gold: true,
  },
  {
    mode: 'simple',
    icon: 'layoutGrid',
    nameKey: 'simpleModeName',
    descKey: 'simpleModeDesc',
    gold: false,
  },
]

export function ModeSelect({ onSelect, onBack }: Props) {
  const { t } = useI18n()

  return (
    <div className='min-h-app bg-gradient-to-b from-grimoire-purple via-grimoire-dark to-grimoire-darker flex flex-col'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-grimoire-dark/95 backdrop-blur-sm border-b border-mystic-gold/20 px-4 py-3'>
        <div className='flex items-center gap-3 max-w-3xl mx-auto'>
          <BackButton onClick={onBack} />
          <div className='flex-1'>
            <h1 className='font-tarot text-lg text-parchment-100 tracking-wider uppercase'>
              {t.newGame.chooseMode}
            </h1>
            <p className='text-xs text-parchment-500'>
              {t.newGame.chooseModeSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Mode cards */}
      <div className='flex-1 px-4 py-6 max-w-3xl mx-auto w-full'>
        <div className='grid gap-4 sm:grid-cols-2'>
          {MODES.map(({ mode, icon, nameKey, descKey, gold }) => (
            <button
              key={mode}
              type='button'
              onClick={() => onSelect(mode)}
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
