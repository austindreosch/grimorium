import { EffectDefinition, EffectDescriptionProps } from '../../types'
import {
  registerEffectTranslations,
  getEffectTranslations,
} from '../../../i18n'
import type { Language } from '../../../i18n'

import en from './i18n/en'
import es from './i18n/es'

registerEffectTranslations('reminder', 'en', en)
registerEffectTranslations('reminder', 'es', es)

function ReminderDescription({ instance, language }: EffectDescriptionProps) {
  const t = getEffectTranslations('reminder', language as Language)
  const label = (instance.data?.label as string | undefined) ?? (t.name as string)
  return <span>{label}</span>
}

/**
 * Reminder — a pure marker effect for narrator-placed reminder tokens on the
 * Grimoire Board (e.g. "Poisoned", "Red Herring", custom notes).
 *
 * Instance data: `{ label: string; icon: IconName; sourceRoleId?: string }`.
 * No handlers, no perception, no mechanical effect — purely informational.
 */
const definition: EffectDefinition = {
  id: 'reminder',
  icon: 'circleDot',
  defaultType: 'marker',
  Description: ReminderDescription,
}

export default definition
