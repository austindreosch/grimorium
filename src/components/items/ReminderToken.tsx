import { useId } from 'react'
import { Icon } from '../atoms'
import { IconName } from '../atoms/icon'
import { cn } from '../../lib/utils'

type Props = {
  icon: IconName
  iconSrc?: string
  /**
   * Full pre-composed reminder token art (disc, icon, and label all baked in).
   * When present it replaces the styled pip entirely — the official game piece.
   */
  tokenSrc?: string
  label: string
  /** Pip diameter in px. Board ~48. */
  size?: number
  tone?: 'good' | 'evil' | 'neutral' | 'reminder'
  onClick?: () => void
  className?: string
}

const TONE_ICON: Record<NonNullable<Props['tone']>, string> = {
  good: '#54BFEF',
  evil: '#D24A4A',
  neutral: '#54BFEF',
  reminder: '#54BFEF',
}

/**
 * A reminder token — a small dark reminder pip placed next to a player on the
 * grimoire to track an effect (Poisoned, Safe, Dead, Red Herring…).
 */
export function ReminderToken({
  icon,
  iconSrc,
  tokenSrc,
  label,
  size = 48,
  tone = 'neutral',
  onClick,
  className,
}: Props) {
  const Tag = onClick ? 'button' : 'div'
  const arcId = useId()

  // Official reminder token art already bakes in the disc, icon, and label —
  // render it full-bleed and skip the styled pip below.
  if (tokenSrc) {
    return (
      <Tag
        onClick={onClick}
        style={{ width: size, height: size }}
        className={cn(
          'relative shrink-0 select-none rounded-full',
          'shadow-[0_2px_8px_rgba(0,0,0,0.55)]',
          onClick && 'transition-transform active:scale-95',
          className,
        )}
      >
        <img
          src={tokenSrc}
          alt={label}
          draggable={false}
          className='h-full w-full rounded-full object-cover'
        />
      </Tag>
    )
  }
  const upperLabel = label.toUpperCase()
  const labelSize = Math.max(8, Math.min(14, 15.5 - upperLabel.length * 0.28))
  const labelSpacing = upperLabel.length > 6 ? 2.2 : 3.2
  const estimatedLabelWidth =
    upperLabel.length * labelSize * 0.62 + Math.max(0, upperLabel.length - 1) * labelSpacing
  const fittedLabelWidth = estimatedLabelWidth > 88 ? 88 : undefined
  const iconPx = Math.round(size * 1.24)

  return (
    <Tag
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-full shrink-0 select-none overflow-visible text-center',
        'bg-[#21152E] shadow-[0_2px_8px_rgba(0,0,0,0.55),inset_0_0_16px_rgba(0,0,0,0.35)]',
        onClick && 'transition-transform active:scale-95',
        className,
      )}
    >
      <div
        className='absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.12),transparent_34%),linear-gradient(160deg,rgba(50,35,68,0.98),rgba(23,15,34,0.98))]'
        aria-hidden
      />
      <span
        className='absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2'
        style={{ color: TONE_ICON[tone] }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt=''
            draggable={false}
            className='object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)]'
            style={{ width: iconPx, height: iconPx }}
          />
        ) : (
          <Icon name={icon} size={size >= 64 ? '2xl' : 'xl'} strokeWidth={2.4} />
        )}
      </span>
      <svg
        className='absolute inset-0 h-full w-full overflow-visible'
        viewBox='0 0 100 100'
        aria-hidden
      >
        <defs>
          <path id={arcId} d='M 5 66 Q 50 108 95 66' />
        </defs>
        <text
          className='font-body font-black uppercase'
          fill='#F3EEE1'
          fontSize={labelSize}
          letterSpacing={labelSpacing}
          lengthAdjust={fittedLabelWidth ? 'spacingAndGlyphs' : undefined}
          textLength={fittedLabelWidth}
        >
          <textPath href={`#${arcId}`} startOffset='50%' textAnchor='middle'>
            {upperLabel}
          </textPath>
        </text>
      </svg>
    </Tag>
  )
}
