import { IconName } from '../../components/atoms/icon'
import { EffectId } from '../effects/types'
import { GameState } from '../types'

export type ReminderDef = {
  label: string
  icon: IconName
  effectType?: EffectId
}

const ROLE_REMINDERS: Partial<Record<string, ReminderDef[]>> = {
  washerwoman: [
    { label: 'Townsfolk', icon: 'users' },
    { label: 'Wrong', icon: 'x' },
  ],
  librarian: [
    { label: 'Outsider', icon: 'userX' },
    { label: 'Wrong', icon: 'x' },
  ],
  investigator: [
    { label: 'Minion', icon: 'swords' },
    { label: 'Wrong', icon: 'x' },
  ],
  fortune_teller: [
    { label: 'Red Herring', icon: 'fish', effectType: 'red_herring' },
  ],
  undertaker: [{ label: 'Died Today', icon: 'skull' }],
  monk: [{ label: 'Safe', icon: 'shield', effectType: 'safe' }],
  slayer: [{ label: 'No Ability', icon: 'zapOff' }],
  virgin: [{ label: 'No Ability', icon: 'zapOff' }],
  butler: [{ label: 'Master', icon: 'handHeart' }],
  drunk: [{ label: 'Is The Drunk', icon: 'beer', effectType: 'drunk' }],
  poisoner: [{ label: 'Poisoned', icon: 'flask', effectType: 'poisoned' }],
  scarlet_woman: [{ label: 'Is The Demon', icon: 'ghost' }],
  imp: [{ label: 'Dead', icon: 'skull' }],
}

const GENERIC_REMINDERS: ReminderDef[] = [
  { label: 'Good', icon: 'thumbsUp' },
  { label: 'Evil', icon: 'thumbsDown' },
  { label: 'Custom', icon: 'pencil' },
]

export function getCharacterReminders(roleId: string): ReminderDef[] {
  return ROLE_REMINDERS[roleId] ?? []
}

export function getAllReminders(state: GameState): ReminderDef[] {
  const seen = new Set<string>()
  const result: ReminderDef[] = []

  for (const player of state.players) {
    for (const reminder of getCharacterReminders(player.roleId)) {
      if (seen.has(reminder.label)) continue
      seen.add(reminder.label)
      result.push(reminder)
    }
  }

  for (const reminder of GENERIC_REMINDERS) {
    if (seen.has(reminder.label)) continue
    seen.add(reminder.label)
    result.push(reminder)
  }

  return result
}
