import { getRole } from '../../../lib/roles'
import { TeamId } from '../../../lib/teams'
import { getRoleArt, PARCHMENT_TEXTURE } from '../../../lib/roles/art'
import {
  useI18n,
  interpolate,
  getRoleName as getRegistryRoleName,
  getRoleQuote as getRegistryRoleQuote,
  getRoleLines as getRegistryRoleLines,
} from '../../../lib/i18n'
import { Icon, type IconName } from '../../atoms'
import { cn } from '../../../lib/utils'

type Props = {
  roleId: string
}

// ─── Line type → icon mapping ───────────────────────────────────────────────

const LINE_TYPE_ICON: Record<string, IconName> = {
  // Timing
  NIGHT: 'moon',
  FIRST_NIGHT: 'cloudMoon',
  DAY: 'sun',
  // Information
  INFO: 'eye',
  TEAM: 'users',
  // Effects
  KILL: 'skull',
  PROTECT: 'shield',
  PASSIVE: 'star',
  // Setup
  SETUP: 'dices',
  // Consequences
  ON_DEATH: 'ghost',
  CAVEAT: 'alertTriangle',
  // Meta
  WIN: 'trophy',
  ADVICE: 'info',
}

// ─── Team ink accent (real-board palette) ───────────────────────────────────
// Good = townsfolk-blue / outsider lighter blue; evil = demon-red / minion
// orange-red. Mirrors the board.* Tailwind tokens.
const TEAM_ACCENT: Record<TeamId, string> = {
  townsfolk: '#2F5C8F',
  outsider: '#5E8CBA',
  minion: '#B84A2C',
  demon: '#8A2222',
}

const GOLD = '#C9A24B'
const INK = '#241C11'

// ─── Main component ─────────────────────────────────────────────────────────

/**
 * The role-reveal card — the "this is my token" moment.
 *
 * An aged-parchment card carrying the real Blood on the Clocktower character
 * token (official art), the role name in the display face, its ability lines,
 * and a flavour quote. Team identity is carried by a single ink accent
 * (townsfolk/outsider blue, minion/demon red) rather than decorative flair,
 * matching the physical board's leather-and-parchment language.
 *
 * Pure presentational component — wrap it in a board backdrop and add
 * context text / action links as siblings.
 */
export function RoleCard({ roleId }: Props) {
  const { t, language } = useI18n()
  const role = getRole(roleId)

  if (!role) {
    return (
      <p className='text-red-400 font-tarot text-center p-4'>
        {interpolate(t.ui.unknownRoleId, { roleId })}
      </p>
    )
  }

  const teamId = role.team as TeamId
  const accent = TEAM_ACCENT[teamId]

  const teamName = t.teams[teamId]?.name ?? teamId
  const roleName = getRegistryRoleName(role.id, language)
  const roleQuote = getRegistryRoleQuote(role.id, language)
  const roleLines = getRegistryRoleLines(role.id, language)
  const art = getRoleArt(role.id, teamId)

  return (
    <div className='animate-card-summon w-full max-w-sm mx-auto'>
      <div
        className='relative rounded-2xl overflow-hidden aspect-[2.5/3.5] flex flex-col p-[3px]'
        style={{
          // Leather-edged card body with a gilt hairline
          background: `linear-gradient(160deg, ${accent}55, ${INK} 55%)`,
          boxShadow: `0 12px 34px rgba(0,0,0,0.55), 0 0 0 1px ${GOLD}66`,
        }}
      >
        {/* Parchment face */}
        <div
          className='relative flex-1 rounded-[13px] bg-parchment-200 bg-cover bg-center flex flex-col items-center px-5 py-6 sm:px-7 sm:py-8'
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

          {/* Character token — the real board piece */}
          <div
            className='relative mb-4 rounded-full'
            style={{
              boxShadow: `0 4px 14px rgba(0,0,0,0.35), 0 0 0 3px ${accent}33`,
            }}
          >
            <img
              src={art}
              alt=''
              draggable={false}
              className='block h-32 w-32 sm:h-36 sm:w-36 rounded-full object-contain bg-parchment-100'
              style={{ boxShadow: 'inset 0 0 10px rgba(60,40,20,0.4)' }}
            />
          </div>

          {/* Role name */}
          <h1
            className='font-tarot text-2xl sm:text-3xl font-bold text-center uppercase tracking-widest-xl leading-none'
            style={{ color: INK }}
          >
            {roleName}
          </h1>

          {/* Team badge */}
          <p
            className='mt-1.5 text-center text-[11px] tracking-[0.28em] uppercase font-semibold'
            style={{ color: accent }}
          >
            {teamName}
          </p>

          {/* Divider */}
          <div
            className='my-4 h-px w-16'
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
            }}
          />

          {/* Ability lines */}
          {roleLines.length > 0 && (
            <div className='w-full space-y-2'>
              {roleLines.map((line, i) => (
                <div key={i} className='flex items-start gap-2'>
                  <span className='shrink-0 mt-px' style={{ color: accent }}>
                    <Icon
                      name={LINE_TYPE_ICON[line.type] ?? 'circle'}
                      size='sm'
                    />
                  </span>
                  <span
                    className={cn(
                      'text-xs sm:text-sm leading-snug font-read',
                      line.type === 'WIN' && 'font-semibold',
                    )}
                    style={{ color: INK, opacity: line.type === 'WIN' ? 1 : 0.82 }}
                  >
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Flavour quote */}
          {roleQuote && (
            <p
              className='mt-auto pt-4 text-center text-xs sm:text-sm italic leading-relaxed font-flavor'
              style={{ color: INK, opacity: 0.55 }}
            >
              "{roleQuote}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
