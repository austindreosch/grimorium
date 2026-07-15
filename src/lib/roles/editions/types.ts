import { TeamId } from '../../teams'
import { IconName } from '../../../components/atoms/icon'
import { EffectId } from '../../effects/types'

/**
 * A reminder token belonging to an edition character. Placement is unrestricted
 * on the manual board, so these carry only display metadata (no effect wiring
 * unless it maps to an existing engine effect).
 */
export type EditionReminder = {
  label: string
  icon: IconName
  tone?: 'good' | 'evil' | 'neutral' | 'reminder'
  effectType?: EffectId
  /** Full pre-composed official token art, resolved at registration time. */
  tokenSrc?: string
}

/**
 * Compact, engine-free definition of a base-box character. These power the
 * manual Grimoire board: placeable character tokens, the script sheet, reminder
 * tokens, and the night-order reference. They have no night-action engine
 * (NightAction is null); the storyteller runs abilities by hand.
 *
 * `firstNight`/`otherNight` are the canonical BotC night-order positions (null =
 * does not act that night); only relative order matters. `setup` flags a
 * character that alters the bag at setup (kept for future guided-mode use).
 */
export type EditionRole = {
  id: string
  team: TeamId
  icon: IconName
  firstNight: number | null
  otherNight: number | null
  setup?: boolean
  name: string
  ability: string
  reminders: EditionReminder[]
}
