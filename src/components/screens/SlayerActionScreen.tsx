import { useState } from 'react'
import { isAlive } from '../../lib/types'
import { isMalfunctioning } from '../../lib/effects'
import { useI18n, getRoleName } from '../../lib/i18n'
import { DayActionProps } from '../../lib/pipeline/types'
// Import perception helpers from the perception module directly, NOT the
// pipeline barrel. This component is pulled into the effects module graph
// (via the slayer_bullet effect), and importing the heavy pipeline/index
// barrel there creates an effects↔pipeline import cycle that breaks module
// mocking in tests.
import {
  perceive,
  getAmbiguousPlayers,
  applyPerceptionOverrides,
} from '../../lib/pipeline/perception'
import { Perception } from '../../lib/pipeline/types'
import { Button, Icon, BackButton } from '../atoms'
import { MysticDivider, PerceptionConfigStep } from '../items'
import { PlayerPickerList } from '../inputs'
import { ScreenFooter } from '../layouts/ScreenFooter'

/**
 * Day action component for the Slayer's ability.
 *
 * The Slayer picks a target to shoot. If the target *registers* as the Demon,
 * they die. The kill is routed through the pipeline as a `kill` intent so that
 * effects like Scarlet Woman succession trigger correctly (previously the
 * Slayer applied `dead` directly, letting a Slayer+SW game end in an instant,
 * incorrect Good win).
 *
 * Registration goes through `perceive()`, so a Recluse the narrator decides
 * registers as the Demon can be killed by a Slayer shot (GH#13). When the
 * target is ambiguous (Recluse/Spy), a narrator perception step is shown first.
 */
export function SlayerActionScreen({
  state,
  playerId,
  onComplete,
  onBack,
}: DayActionProps) {
  const { t, language } = useI18n()
  const [phase, setPhase] = useState<'select' | 'configure'>('select')
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)

  const slayer = state.players.find((p) => p.id === playerId)
  const alivePlayers = state.players.filter((p) => isAlive(p))
  const malfunctioning = slayer ? isMalfunctioning(slayer) : true

  const target = state.players.find((p) => p.id === selectedTarget)
  // A malfunctioning Slayer always misses, so no perception step is needed.
  const ambiguousTargets =
    !malfunctioning && target ? getAmbiguousPlayers([target], 'team') : []

  const resolve = (overrides: Record<string, Partial<Perception>>) => {
    if (!selectedTarget || !slayer) return

    const effState = applyPerceptionOverrides(state, overrides)
    const effTarget = effState.players.find((p) => p.id === selectedTarget)
    const effSlayer = effState.players.find((p) => p.id === playerId) ?? slayer
    if (!effTarget) return

    const registersDemon =
      !malfunctioning &&
      perceive(effTarget, effSlayer, 'team', effState).team === 'demon'

    if (registersDemon) {
      onComplete({
        entries: [
          {
            type: 'slayer_shot',
            message: [
              {
                type: 'i18n',
                key: 'roles.slayer.history.killedDemon',
                params: { slayer: playerId, target: selectedTarget },
              },
            ],
            data: { slayerId: playerId, targetId: selectedTarget, hit: true },
          },
        ],
        removeEffects: { [playerId]: ['slayer_bullet'] },
        // Route the kill through the pipeline (Scarlet Woman succession, etc.)
        intent: {
          type: 'kill',
          sourceId: playerId,
          targetId: selectedTarget,
          cause: 'slayer',
        },
      })
    } else {
      onComplete({
        entries: [
          {
            type: 'slayer_shot',
            message: [
              {
                type: 'i18n',
                key: 'roles.slayer.history.missed',
                params: { slayer: playerId, target: selectedTarget },
              },
            ],
            data: {
              slayerId: playerId,
              targetId: selectedTarget,
              hit: false,
              ...(malfunctioning ? { malfunctioned: true } : {}),
            },
          },
        ],
        removeEffects: { [playerId]: ['slayer_bullet'] },
      })
    }
  }

  const handleConfirm = () => {
    if (!selectedTarget || !slayer) return
    // Ambiguous target (Recluse/Spy) → let the narrator decide registration.
    if (ambiguousTargets.length > 0) {
      setPhase('configure')
      return
    }
    resolve({})
  }

  if (phase === 'configure') {
    return (
      <PerceptionConfigStep
        ambiguousPlayers={ambiguousTargets}
        context='team'
        state={state}
        roleIcon='crosshair'
        roleName={getRoleName('slayer', language)}
        playerName={slayer?.name ?? ''}
        onComplete={(overrides) => resolve(overrides)}
      />
    )
  }

  return (
    <div className='min-h-app bg-gradient-to-b from-amber-950 via-orange-950 to-grimoire-dark flex flex-col'>
      {/* Header */}
      <div className='bg-gradient-to-b from-amber-900/50 to-transparent px-4 py-4'>
        <div className='max-w-lg mx-auto'>
          <div className='flex items-center mb-4'>
            <BackButton onClick={onBack} />
            <span className='text-parchment-500 text-xs ml-1'>
              {t.common.back}
            </span>
          </div>

          <div className='text-center'>
            <div className='flex justify-center mb-2'>
              <Icon
                name='crosshair'
                size='3xl'
                className='text-red-400 text-glow-red'
              />
            </div>
            <h1 className='font-tarot text-2xl text-parchment-100 tracking-widest-xl uppercase'>
              {t.game.slayerAction}
            </h1>
            <p className='text-parchment-400 text-sm'>
              {t.game.slayerActionDescription}
            </p>
            {slayer && (
              <p className='text-amber-400 text-sm mt-1 font-medium'>
                {slayer.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 px-4 pb-4 max-w-lg mx-auto w-full overflow-y-auto'>
        <MysticDivider className='mb-6' />

        {/* Select Target */}
        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-3 px-1'>
            <span className='w-6 h-6 rounded-full bg-red-700 text-parchment-100 text-sm font-bold flex items-center justify-center'>
              1
            </span>
            <span className='font-tarot text-sm text-parchment-100 tracking-wider uppercase'>
              {t.game.selectTarget}
            </span>
          </div>
          <PlayerPickerList
            players={alivePlayers}
            selected={selectedTarget ? [selectedTarget] : []}
            onSelect={setSelectedTarget}
            selectionCount={1}
            variant='red'
          />
        </div>
      </div>

      {/* Footer */}
      <ScreenFooter borderColor='border-red-500/30'>
        <Button
          onClick={handleConfirm}
          disabled={!selectedTarget}
          fullWidth
          size='lg'
          variant='slayer'
        >
          <Icon name='crosshair' size='md' className='mr-2' />
          {t.game.confirmSlayerShot}
        </Button>
      </ScreenFooter>
    </div>
  )
}
