import { lazy } from 'react'
import { EffectDefinition } from '../../types'
import { DayActionDefinition } from '../../../pipeline/types'
import { isAlive, hasEffect } from '../../../types'
import { registerEffectTranslations } from '../../../i18n'

// Lazy-load the screen so the effects module graph does NOT eagerly pull in
// SlayerActionScreen → perception → effects. That eager cycle caused
// `perception.ts` to be first loaded (and bound to the real getEffect) inside
// the effects mock's importOriginal(), defeating getEffect mocks in role tests.
const SlayerActionScreen = lazy(() =>
  import('../../../../components/screens/SlayerActionScreen').then((m) => ({
    default: m.SlayerActionScreen,
  })),
)

import en from './i18n/en'
import es from './i18n/es'

registerEffectTranslations('slayer_bullet', 'en', en)
registerEffectTranslations('slayer_bullet', 'es', es)

const slayerDayAction: DayActionDefinition = {
  id: 'slayer_shot',
  icon: 'crosshair',
  getLabel: (t) => t.game.slayerAction,
  getDescription: (t) => t.game.slayerActionDescription,
  condition: (player) => isAlive(player) && hasEffect(player, 'slayer_bullet'),
  ActionComponent: SlayerActionScreen,
}

const definition: EffectDefinition = {
  id: 'slayer_bullet',
  icon: 'crosshair',
  defaultType: 'buff',
  dayActions: [slayerDayAction],
}

export default definition
