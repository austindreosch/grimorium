import { TeamId } from '../../../lib/teams'
import { Icon } from '../../atoms'
import { IconName } from '../../atoms/icon'
import { TEAM_ACCENT } from './boardAccent'

type CardIconProps = {
  icon: IconName
  teamId: TeamId
}

/**
 * Parchment medallion holding a result icon in the team's ink accent.
 * Used by the info-reveal cards (OracleCard).
 */
export function CardIcon({ icon, teamId }: CardIconProps) {
  const accent = TEAM_ACCENT[teamId]
  return (
    <div className='relative flex justify-center mb-4'>
      <div
        className='flex h-20 w-20 items-center justify-center rounded-full bg-parchment-100 sm:h-24 sm:w-24'
        style={{ boxShadow: `inset 0 0 10px rgba(60,40,20,0.4), 0 0 0 3px ${accent}33` }}
      >
        <span style={{ color: accent }}>
          <Icon name={icon} size='2xl' />
        </span>
      </div>
    </div>
  )
}
