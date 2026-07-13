import { IconName } from '../../components/atoms/icon'
import { EffectId } from '../effects/types'
import { getRole } from '../roles'
import { getRoleArt } from '../roles/art'
import { EDITION_REMINDERS } from '../roles/editions'

export type ReminderDef = {
  label: string
  icon: IconName
  iconRoleId?: string
  iconSrc?: string
  tone?: 'good' | 'evil' | 'neutral' | 'reminder'
  effectType?: EffectId
}

const BASE = import.meta.env.BASE_URL

const ROLE_REMINDERS: Partial<Record<string, ReminderDef[]>> = {
  washerwoman: [
    { label: 'Townsfolk', icon: 'users', iconRoleId: 'washerwoman', tone: 'good' },
    { label: 'Wrong', icon: 'x', iconRoleId: 'washerwoman', tone: 'neutral' },
  ],
  librarian: [
    { label: 'Outsider', icon: 'userX', iconRoleId: 'librarian', tone: 'good' },
    { label: 'Wrong', icon: 'x', iconRoleId: 'librarian', tone: 'neutral' },
  ],
  investigator: [
    { label: 'Minion', icon: 'swords', iconRoleId: 'investigator', tone: 'evil' },
    { label: 'Wrong', icon: 'x', iconRoleId: 'investigator', tone: 'neutral' },
  ],
  fortune_teller: [
    { label: 'Red Herring', icon: 'fish', iconRoleId: 'fortune_teller', tone: 'evil', effectType: 'red_herring' },
  ],
  undertaker: [{ label: 'Died Today', icon: 'skull', iconRoleId: 'undertaker', tone: 'evil' }],
  monk: [{ label: 'Safe', icon: 'shield', iconRoleId: 'monk', tone: 'good', effectType: 'safe' }],
  slayer: [{ label: 'No Ability', icon: 'zapOff', iconRoleId: 'slayer', tone: 'neutral' }],
  virgin: [{ label: 'No Ability', icon: 'zapOff', iconRoleId: 'virgin', tone: 'neutral' }],
  butler: [{ label: 'Master', icon: 'handHeart', iconRoleId: 'butler', tone: 'good' }],
  drunk: [{ label: 'Is The Drunk', icon: 'beer', iconRoleId: 'drunk', tone: 'neutral', effectType: 'drunk' }],
  poisoner: [{ label: 'Poisoned', icon: 'flask', iconRoleId: 'poisoner', tone: 'evil', effectType: 'poisoned' }],
  scarlet_woman: [{ label: 'Is The Demon', icon: 'flame', iconRoleId: 'scarlet_woman', tone: 'evil' }],
  imp: [{ label: 'Dead', icon: 'skull', iconRoleId: 'imp', tone: 'evil' }],
}

const GLOBAL_REMINDERS: ReminderDef[] = [
  { label: 'Is The Drunk', icon: 'beer', iconRoleId: 'drunk', tone: 'neutral', effectType: 'drunk' },
]

const GENERIC_REMINDERS: ReminderDef[] = [
  { label: 'Good', icon: 'thumbsUp', iconSrc: `${BASE}assets/characters/generic/good.webp`, tone: 'good' },
  { label: 'Evil', icon: 'thumbsDown', iconSrc: `${BASE}assets/characters/generic/evil.webp`, tone: 'evil' },
  { label: 'Custom', icon: 'pencil', iconSrc: `${BASE}assets/characters/generic/custom.webp`, tone: 'neutral' },
]

export function getCharacterReminders(roleId: string): ReminderDef[] {
  return ROLE_REMINDERS[roleId] ?? EDITION_REMINDERS[roleId] ?? []
}

export function getReminderIconSrc(reminder: ReminderDef): string | undefined {
  if (reminder.iconSrc) return reminder.iconSrc
  if (!reminder.iconRoleId) return undefined
  const role = getRole(reminder.iconRoleId)
  if (!role) return undefined
  return getRoleArt(role.id, role.team)
}

export function getReminderByEffectType(effectType: EffectId): ReminderDef | undefined {
  return [
    ...Object.values(ROLE_REMINDERS).flat(),
    ...GLOBAL_REMINDERS,
    ...GENERIC_REMINDERS,
  ].find((reminder): reminder is ReminderDef => !!reminder && reminder.effectType === effectType)
}

/**
 * Every reminder token in the catalog, deduped by label. Placement is
 * unrestricted: any token may sit on any player, so the tray offers the full
 * set regardless of which characters are in play.
 */
export function getAllReminders(): ReminderDef[] {
  const seen = new Set<string>()
  const result: ReminderDef[] = []
  const push = (reminder: ReminderDef) => {
    if (seen.has(reminder.label)) return
    seen.add(reminder.label)
    result.push(reminder)
  }

  for (const list of Object.values(ROLE_REMINDERS)) list?.forEach(push)
  for (const list of Object.values(EDITION_REMINDERS)) list.forEach(push)
  GLOBAL_REMINDERS.forEach(push)
  GENERIC_REMINDERS.forEach(push)
  return result
}
