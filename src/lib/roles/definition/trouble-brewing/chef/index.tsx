import { useState, useMemo } from 'react'
import { RoleDefinition } from '../../../types'
import {
  useI18n,
  interpolate,
  registerRoleTranslations,
  getRoleName,
  getRoleTranslations,
} from '../../../../i18n'
import { DefaultRoleReveal } from '../../../../../components/items/DefaultRoleReveal'
import {
  NarratorSetupLayout,
  NightStepListLayout,
  PlayerFacingScreen,
  HandbackCardLink,
} from '../../../../../components/layouts'
import type { NightStep } from '../../../../../components/layouts'
import {
  MalfunctionConfigStep,
  OracleCard,
  NumberReveal,
  TeamBackground,
} from '../../../../../components/items'
import { Icon } from '../../../../../components/atoms'
import { GameState, PlayerState, isAlive } from '../../../../types'
import { perceive, getAmbiguousPlayers } from '../../../../pipeline'
import { isMalfunctioning } from '../../../../effects'
import { cn } from '../../../../utils'

import en from './i18n/en'
import es from './i18n/es'

registerRoleTranslations('chef', 'en', en)
registerRoleTranslations('chef', 'es', es)

/**
 * Key for a per-pair alignment override: how `playerId` registers when
 * evaluated in the adjacency shared with `neighborId`.
 */
export function pairOverrideKey(playerId: string, neighborId: string): string {
  return `${playerId}@${neighborId}`
}

/**
 * Calculate the number of pairs of evil players sitting next to each other.
 * Dead players are skipped when determining neighbors.
 * Uses the perception system so roles like Recluse/Spy are properly handled.
 *
 * `pairOverrides` lets the narrator set how an ambiguous player registers for a
 * *specific* adjacency (keyed via `pairOverrideKey`). This supports the rule
 * that a Recluse/Spy may register as evil in one adjacent pair and good in the
 * other — misregistration is decided per pair, not once globally.
 */
export function countEvilPairs(
  state: GameState,
  observer: PlayerState,
  pairOverrides: Record<string, 'good' | 'evil'> = {},
): number {
  const aliveIndices = state.players
    .map((p, i) => (isAlive(p) ? i : -1))
    .filter((i) => i !== -1)
  if (aliveIndices.length < 2) return 0

  const registersEvil = (p: PlayerState, neighbor: PlayerState): boolean => {
    const override = pairOverrides[pairOverrideKey(p.id, neighbor.id)]
    if (override) return override === 'evil'
    return perceive(p, observer, 'alignment', state).alignment === 'evil'
  }

  let evilPairs = 0
  for (let i = 0; i < aliveIndices.length; i++) {
    const current = state.players[aliveIndices[i]]
    const next = state.players[aliveIndices[(i + 1) % aliveIndices.length]]
    if (registersEvil(current, next) && registersEvil(next, current)) {
      evilPairs++
    }
  }
  return evilPairs
}

/** An adjacent alive pair the narrator may need to configure. */
type PairToggle = { player: PlayerState; neighbor: PlayerState }

/**
 * Build the list of (ambiguous player, neighbor) toggles the narrator must
 * decide — one per adjacency an ambiguous player sits in. Generic: driven by
 * `getAmbiguousPlayers`, never role names.
 */
function buildPairToggles(state: GameState): PairToggle[] {
  const aliveIndices = state.players
    .map((p, i) => (isAlive(p) ? i : -1))
    .filter((i) => i !== -1)
  if (aliveIndices.length < 2) return []

  const ambiguousIds = new Set(
    getAmbiguousPlayers(state.players.filter(isAlive), 'alignment').map(
      (p) => p.id,
    ),
  )

  const toggles: PairToggle[] = []
  const seen = new Set<string>()
  for (let i = 0; i < aliveIndices.length; i++) {
    const a = state.players[aliveIndices[i]]
    const b = state.players[aliveIndices[(i + 1) % aliveIndices.length]]
    const pairKey = [a.id, b.id].sort().join('|')
    if (seen.has(pairKey)) continue
    seen.add(pairKey)
    if (ambiguousIds.has(a.id)) toggles.push({ player: a, neighbor: b })
    if (ambiguousIds.has(b.id)) toggles.push({ player: b, neighbor: a })
  }
  return toggles
}

type Phase =
  | 'step_list'
  | 'configure_perceptions'
  | 'configure_malfunction'
  | 'show_result'

const definition: RoleDefinition = {
  id: 'chef',
  team: 'townsfolk',
  icon: 'chefHat',
  nightOrder: 13,
  chaos: 20,
  shouldWake: (game, player) =>
    isAlive(player) && game.history.at(-1)?.stateAfter.round === 1,

  nightSteps: [
    {
      id: 'configure_malfunction',
      icon: 'flask',
      getLabel: (t) => t.game.stepConfigureMalfunction,
      condition: (_game, player) => isMalfunctioning(player),
      audience: 'narrator',
    },
    {
      id: 'configure_perceptions',
      icon: 'hatGlasses',
      getLabel: (t) => t.game.stepConfigurePerceptions,
      condition: (_game, player, state) =>
        !isMalfunctioning(player) && buildPairToggles(state).length > 0,
      audience: 'narrator',
    },
    {
      id: 'show_result',
      icon: 'chefHat',
      getLabel: (t) => t.game.stepShowResult,
      audience: 'player_reveal',
    },
  ],

  RoleReveal: DefaultRoleReveal,

  NightAction: ({ state, player, onComplete }) => {
    const { t, language } = useI18n()
    const [phase, setPhase] = useState<Phase>('step_list')
    const [pairOverrides, setPairOverrides] = useState<
      Record<string, 'good' | 'evil'>
    >({})
    const [malfunctionValue, setMalfunctionValue] = useState<number | null>(
      null,
    )

    const malfunctioning = isMalfunctioning(player)

    // Per-pair toggles for ambiguous players (Recluse/Spy). Only when NOT
    // malfunctioning — a malfunctioning Chef gets a narrator-chosen number.
    const pairToggles = useMemo(
      () => (malfunctioning ? [] : buildPairToggles(state)),
      [state, malfunctioning],
    )
    const needsPerceptionConfig = pairToggles.length > 0

    const [perceptionConfigDone, setPerceptionConfigDone] = useState(false)
    const [malfunctionConfigDone, setMalfunctionConfigDone] = useState(false)

    const roleT = getRoleTranslations('chef', language)

    const steps: NightStep[] = useMemo(() => {
      const result: NightStep[] = []

      if (malfunctioning) {
        result.push({
          id: 'configure_malfunction',
          icon: 'flask',
          label: t.game.stepConfigureMalfunction,
          status: malfunctionConfigDone ? 'done' : 'pending',
          audience: 'narrator' as const,
        })
      }

      if (needsPerceptionConfig) {
        result.push({
          id: 'configure_perceptions',
          icon: 'hatGlasses',
          label: t.game.stepConfigurePerceptions,
          status: perceptionConfigDone ? 'done' : 'pending',
          audience: 'narrator' as const,
        })
      }

      result.push({
        id: 'show_result',
        icon: 'chefHat',
        label: t.game.stepShowResult,
        status: 'pending',
        audience: 'player_reveal' as const,
      })

      return result
    }, [
      malfunctioning,
      needsPerceptionConfig,
      perceptionConfigDone,
      malfunctionConfigDone,
      t,
    ])

    const handleSelectStep = (stepId: string) => {
      if (stepId === 'configure_malfunction') {
        setPhase('configure_malfunction')
      } else if (stepId === 'configure_perceptions') {
        setPhase('configure_perceptions')
      } else if (stepId === 'show_result') {
        setPhase('show_result')
      }
    }

    const handleMalfunctionComplete = (value: number) => {
      setMalfunctionValue(value)
      setMalfunctionConfigDone(true)
      setPhase('step_list')
    }

    const setPairValue = (
      p: PlayerState,
      neighbor: PlayerState,
      value: 'good' | 'evil',
    ) => {
      setPairOverrides((prev) => ({
        ...prev,
        [pairOverrideKey(p.id, neighbor.id)]: value,
      }))
    }

    const calculatedEvilPairs = useMemo(
      () => countEvilPairs(state, player, pairOverrides),
      [state, player, pairOverrides],
    )

    const displayedEvilPairs = malfunctionValue ?? calculatedEvilPairs

    const handleComplete = () => {
      onComplete({
        entries: [
          {
            type: 'night_action',
            message: [
              {
                type: 'i18n',
                key: 'roles.chef.history.sawEvilPairs',
                params: {
                  player: player.id,
                  count: displayedEvilPairs.toString(),
                },
              },
            ],
            data: {
              roleId: 'chef',
              playerId: player.id,
              action: 'count_evil_pairs',
              evilPairs: displayedEvilPairs,
              ...(malfunctioning
                ? {
                    malfunctioned: true,
                    actualEvilPairs: calculatedEvilPairs,
                  }
                : {}),
              pairOverrides:
                Object.keys(pairOverrides).length > 0
                  ? pairOverrides
                  : undefined,
            },
          },
        ],
      })
    }

    // Phase: Step List
    if (phase === 'step_list') {
      return (
        <NightStepListLayout
          icon='chefHat'
          roleName={getRoleName('chef', language)}
          playerName={player.name}
          steps={steps}
          onSelectStep={handleSelectStep}
        />
      )
    }

    // Phase: Configure Malfunction
    if (phase === 'configure_malfunction') {
      return (
        <MalfunctionConfigStep
          type='number'
          roleIcon='chefHat'
          roleName={getRoleName('chef', language)}
          playerName={player.name}
          numberRange={{
            min: 0,
            max: Math.floor(state.players.filter(isAlive).length / 2),
          }}
          onComplete={handleMalfunctionComplete}
        />
      )
    }

    // Phase: Configure Perceptions — per-pair registration for ambiguous players
    if (phase === 'configure_perceptions') {
      return (
        <NarratorSetupLayout
          icon='chefHat'
          roleName={getRoleName('chef', language)}
          playerName={player.name}
          audience='narrator'
          onShowToPlayer={() => {
            setPerceptionConfigDone(true)
            setPhase('step_list')
          }}
          showToPlayerLabel={t.common.confirm}
        >
          <div className='text-center mb-4'>
            <h3 className='text-lg font-semibold text-amber-200'>
              {t.game.perceptionConfigTitle}
            </h3>
            <p className='text-sm text-stone-400 mt-1'>
              {roleT.pairPerceptionHint}
            </p>
          </div>

          <div className='space-y-3'>
            {pairToggles.map(({ player: amb, neighbor }) => {
              const key = pairOverrideKey(amb.id, neighbor.id)
              const value =
                pairOverrides[key] ??
                perceive(amb, player, 'alignment', state).alignment
              return (
                <div
                  key={key}
                  className='bg-white/5 rounded-xl border border-white/10 p-4'
                >
                  <div className='text-sm text-parchment-200 mb-3'>
                    {interpolate(roleT.pairRegistersLabel, {
                      player: amb.name,
                      neighbor: neighbor.name,
                    })}
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setPairValue(amb, neighbor, 'good')}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border',
                        value === 'good'
                          ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-parchment-500 hover:bg-white/10',
                      )}
                    >
                      <Icon name='shield' size='sm' className='inline mr-1.5' />
                      {t.game.registerAsGood}
                    </button>
                    <button
                      onClick={() => setPairValue(amb, neighbor, 'evil')}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border',
                        value === 'evil'
                          ? 'bg-red-900/40 border-red-500/50 text-red-300'
                          : 'bg-white/5 border-white/10 text-parchment-500 hover:bg-white/10',
                      )}
                    >
                      <Icon name='skull' size='sm' className='inline mr-1.5' />
                      {t.game.registerAsEvil}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </NarratorSetupLayout>
      )
    }

    // Phase: Show Result — dynamic theme based on result
    const resultTeam = displayedEvilPairs > 0 ? 'minion' : 'townsfolk'

    return (
      <PlayerFacingScreen playerName={player.name}>
        <TeamBackground teamId={resultTeam}>
          <OracleCard
            icon='chefHat'
            teamId={resultTeam}
            title={roleT.info}
            subtitle={getRoleName('chef', language)}
          >
            <NumberReveal
              value={displayedEvilPairs}
              label={roleT.evilPairsCount}
              teamId={resultTeam}
            />
          </OracleCard>
          <HandbackCardLink
            onClick={handleComplete}
            isEvil={resultTeam !== 'townsfolk'}
          >
            {t.common.continue}
          </HandbackCardLink>
        </TeamBackground>
      </PlayerFacingScreen>
    )
  },
}

export default definition
