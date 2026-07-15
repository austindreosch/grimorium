import { IconName } from '../../components/atoms/icon'
import { EffectId } from '../effects/types'
import { getRole } from '../roles'
import { getRoleArt } from '../roles/art'
import { EDITION_REMINDERS } from '../roles/editions'
import { getReminderTokenArt } from './tokenArt'

export type ReminderDef = {
  label: string
  icon: IconName
  iconRoleId?: string
  iconSrc?: string
  /** Full pre-composed official token art (disc + icon + label). */
  tokenSrc?: string
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

// Only the freehand Custom token remains hand-drawn; every other reminder is
// official token art. Good/Evil were removed in favour of image-based tokens.
const GENERIC_REMINDERS: ReminderDef[] = [
  { label: 'Custom', icon: 'pencil', iconSrc: `${BASE}assets/characters/generic/custom.webp`, tone: 'neutral' },
]

// Attach official token art to every catalog reminder that has one. Keyed by
// the owning role id so the art resolver can find the baked-in disc image.
for (const [roleId, reminders] of Object.entries(ROLE_REMINDERS)) {
  for (const reminder of reminders ?? []) {
    reminder.tokenSrc = getReminderTokenArt(roleId, reminder.label)
  }
}
for (const reminder of GLOBAL_REMINDERS) {
  reminder.tokenSrc = getReminderTokenArt(reminder.effectType === 'drunk' ? 'drunk' : reminder.label, reminder.label)
}

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
 * Every placeable reminder token: official token art only (deduped by art), plus
 * the single freehand Custom token. Reminders without art (e.g. Lunatic's
 * Attack pips) are omitted — the tray is image-based. Placement is unrestricted:
 * any token may sit on any player, regardless of which characters are in play.
 */
export function getAllReminders(): ReminderDef[] {
  const seen = new Set<string>()
  const result: ReminderDef[] = []
  const push = (reminder: ReminderDef) => {
    if (!reminder.tokenSrc || seen.has(reminder.tokenSrc)) return
    seen.add(reminder.tokenSrc)
    result.push(reminder)
  }

  for (const list of Object.values(ROLE_REMINDERS)) list?.forEach(push)
  for (const list of Object.values(EDITION_REMINDERS)) list.forEach(push)
  GLOBAL_REMINDERS.forEach(push)
  result.push(...GENERIC_REMINDERS) // the freehand Custom token
  return result
}
