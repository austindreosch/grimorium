import { PlayerState, EffectInstance, hasEffect } from '../../lib/types'
import { getRole } from '../../lib/roles'
import { Icon } from '../atoms'
import { cn } from '../../lib/utils'
import { CharacterToken } from './CharacterToken'

// =============================================================================
// Effect Visibility — effects with dedicated custom UI are hidden from badges
// =============================================================================

/** Effects rendered via custom UI instead of generic effect badges. */
const CUSTOM_UI_EFFECT_TYPES = new Set<string>(['dead', 'drunk'])

/** Filter out effects that have dedicated custom UI (dead, drunk). */
export function filterVisibleEffects(
  effects: EffectInstance[],
): EffectInstance[] {
  return effects.filter((e) => !CUSTOM_UI_EFFECT_TYPES.has(e.type))
}

// =============================================================================
// PlayerRoleIcon — real character token with dead / drunk status overlays
// =============================================================================

type Size = 'sm' | 'md' | 'lg'

const SIZE_PX: Record<Size, number> = { sm: 32, md: 40, lg: 64 }

type PlayerRoleIconProps = {
  player: PlayerState
  /** sm = 32px, md = 40px, lg = 64px */
  size?: Size
  /** @deprecated superseded by the character-token art; kept for call-site compat. */
  circleClassName?: string
  /** @deprecated superseded by the character-token art; kept for call-site compat. */
  iconClassName?: string
}

/**
 * A player's role rendered as the real Blood on the Clocktower character token.
 * Dead players are shrouded; a Drunk shows their believed role's token with a
 * small tell for the narrator.
 */
export function PlayerRoleIcon({ player, size = 'md' }: PlayerRoleIconProps) {
  const role = getRole(player.roleId)
  const isDead = hasEffect(player, 'dead')
  const isDrunk = hasEffect(player, 'drunk')
  const px = SIZE_PX[size]

  if (!role) {
    return (
      <div
        className='flex items-center justify-center rounded-full bg-parchment-500/10 border border-parchment-500/30'
        style={{ width: px, height: px }}
      >
        <Icon name='user' size={size === 'lg' ? '2xl' : 'md'} className='text-parchment-400' />
      </div>
    )
  }

  return (
    <div className='relative flex-shrink-0'>
      <CharacterToken roleId={role.id} team={role.team} size={px} dead={isDead} />

      {/* Drunk tell for the narrator (hidden when dead) */}
      {isDrunk && !isDead && (
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border bg-amber-950 border-amber-500/60',
            size === 'sm' ? 'w-[14px] h-[14px]' : 'w-[18px] h-[18px]',
          )}
        >
          <Icon name='beer' size='xs' className='text-amber-400' strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}
