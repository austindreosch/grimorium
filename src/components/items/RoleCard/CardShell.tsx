import { ReactNode } from 'react'
import { TeamId } from '../../../lib/teams'
import { PARCHMENT_TEXTURE } from '../../../lib/roles/art'
import { TEAM_ACCENT, GOLD, INK } from './boardAccent'

// ─── CardShell ───────────────────────────────────────────────────────────────

type CardShellProps = {
  teamId: TeamId
  children: ReactNode
}

/**
 * Shared board-style card shell — an aged-parchment face with a gilt hairline
 * and a single team ink accent (townsfolk/outsider blue, minion/demon red),
 * matching the physical grimoire's leather-and-parchment language.
 *
 * Used by the info-reveal cards (OracleCard). The role-reveal card renders its
 * own equivalent face.
 */
export function CardShell({ teamId, children }: CardShellProps) {
  const accent = TEAM_ACCENT[teamId]

  return (
    <div className='animate-card-summon w-full max-w-sm mx-auto'>
      <div
        className='relative rounded-2xl overflow-hidden aspect-[2.5/3.5] flex flex-col p-[3px]'
        style={{
          background: `linear-gradient(160deg, ${accent}55, ${INK} 55%)`,
          boxShadow: `0 12px 34px rgba(0,0,0,0.55), 0 0 0 1px ${GOLD}66`,
        }}
      >
        <div
          className='relative flex-1 rounded-[13px] bg-parchment-200 bg-cover bg-center flex flex-col justify-center px-5 py-6 sm:px-7 sm:py-8'
          style={{
            backgroundImage: `url(${PARCHMENT_TEXTURE})`,
            boxShadow: 'inset 0 0 18px rgba(60,40,20,0.35)',
          }}
        >
          {/* Gilt inner frame */}
          <div
            className='pointer-events-none absolute inset-2 rounded-[10px]'
            style={{ border: `1px solid ${accent}44` }}
          />
          {children}
        </div>
      </div>
    </div>
  )
}
