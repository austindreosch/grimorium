import { Icon } from '../atoms'
import { IconName } from '../atoms/icon'
import { PARCHMENT_TEXTURE } from '../../lib/roles/art'
import { cn } from '../../lib/utils'

type Props = {
  icon: IconName
  label: string
  /** Pip diameter in px. Board ~48. */
  size?: number
  tone?: 'good' | 'evil' | 'neutral'
  onClick?: () => void
  className?: string
}

const TONE_ICON: Record<NonNullable<Props['tone']>, string> = {
  good: '#2F5C8F',
  evil: '#8A2222',
  neutral: '#4A3A22',
}

/**
 * A reminder token — the small parchment pip placed next to a player on the
 * grimoire to track an effect (Poisoned, Safe, Dead, Red Herring…). Icon on
 * top, small-caps label below, matching the physical reminder tokens.
 */
export function ReminderToken({
  icon,
  label,
  size = 48,
  tone = 'neutral',
  onClick,
  className,
}: Props) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-full shrink-0 select-none bg-parchment-200 bg-cover bg-center text-center',
        'shadow-[0_1px_4px_rgba(0,0,0,0.5),inset_0_0_5px_rgba(60,40,20,0.4)]',
        onClick && 'transition-transform active:scale-95',
        className,
      )}
    >
      <div
        className='absolute inset-0 rounded-full opacity-60'
        style={{ backgroundImage: `url(${PARCHMENT_TEXTURE})` }}
        aria-hidden
      />
      <span className='relative' style={{ color: TONE_ICON[tone] }}>
        <Icon name={icon} size='sm' />
      </span>
      <span
        className='relative mt-0.5 font-body font-semibold uppercase leading-none tracking-wide text-[#3A2A15]'
        style={{ fontSize: Math.max(6, size * 0.15) }}
      >
        {label}
      </span>
    </Tag>
  )
}
