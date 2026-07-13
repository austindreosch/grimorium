import { ReactNode, useMemo, useState } from 'react'
import { getRole } from '../../lib/roles'
import { RoleDefinition } from '../../lib/roles/types'
import { getScript, ScriptId } from '../../lib/scripts'
import { TeamId } from '../../lib/teams'
import { getNightOrder } from '../../lib/nightOrder'
import { getRoleName, getRoleAbility, getRoleLines } from '../../lib/i18n/registry'
import { useI18n } from '../../lib/i18n'
import { CharacterToken } from './CharacterToken'
import { Icon } from '../atoms'
import { cn } from '../../lib/utils'

// Reference panels are all read-only. On mobile they cover the whole screen
// (a slide-over); on tablet/desktop they dock as a right sidebar just inside
// the nav rail. The nav rail floats above them (higher z), so content is
// padded on the right to clear it on mobile.
const PANEL_CLASS = cn(
  'fixed inset-0 z-50 flex flex-col bg-board-leather',
  'md:left-auto md:right-[60px] md:w-[360px] md:border-l md:border-board-gold/25 md:shadow-2xl',
)
const CLEAR_RAIL = 'pr-16 md:pr-4'

const TEAM_ORDER: TeamId[] = ['townsfolk', 'outsider', 'minion', 'demon']

function PanelShell({
  title,
  controls,
  onClose,
  children,
}: {
  title: string
  controls?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className={PANEL_CLASS}>
      <div
        className={cn(
          'flex items-center gap-2 border-b border-board-gold/20 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]',
          CLEAR_RAIL,
        )}
      >
        <h2 className='flex-1 font-tarot text-xl text-board-gold'>{title}</h2>
        <button
          onClick={onClose}
          aria-label={t.ui.close}
          className='text-parchment-300 active:scale-95'
        >
          <Icon name='x' size='md' />
        </button>
      </div>
      {controls && (
        <div className={cn('border-b border-board-gold/10 px-4 py-2', CLEAR_RAIL)}>
          {controls}
        </div>
      )}
      <div className={cn('flex-1 overflow-y-auto px-4 py-3', CLEAR_RAIL)}>
        {children}
      </div>
    </div>
  )
}

// ─── Script sheet ────────────────────────────────────────────────────────────

export function ScriptSheetPanel({
  inPlayRoleIds,
  scriptId,
  onClose,
}: {
  inPlayRoleIds: string[]
  scriptId: ScriptId
  onClose: () => void
}) {
  const { t, language } = useI18n()
  const [showFull, setShowFull] = useState(false)

  const groups = useMemo(() => {
    const ids = showFull ? getScript(scriptId).roles : inPlayRoleIds
    const roles = [...new Set(ids)]
      .map(getRole)
      .filter((r): r is RoleDefinition => !!r)
    return TEAM_ORDER.map((team) => ({
      team,
      roles: roles.filter((r) => r.team === team),
    })).filter((g) => g.roles.length > 0)
  }, [showFull, scriptId, inPlayRoleIds])

  const toggle = (
    <button
      onClick={() => setShowFull((v) => !v)}
      aria-pressed={showFull}
      className={cn(
        'rounded-full border px-3 py-1 font-body text-xs active:scale-95',
        showFull
          ? 'border-board-gold bg-board-gold/20 text-board-gold'
          : 'border-board-gold/30 text-board-gold/80',
      )}
    >
      {t.game.panels.fullScript}
    </button>
  )

  return (
    <PanelShell title={t.game.panels.script} controls={toggle} onClose={onClose}>
      {groups.map((g) => (
        <section key={g.team} className='mb-5'>
          <h3 className='mb-2 font-tarot text-sm uppercase tracking-wide text-board-gold/80'>
            {t.teams[g.team].name}
          </h3>
          <ul className='flex flex-col gap-3'>
            {g.roles.map((r) => (
              <li key={r.id} className='flex items-start gap-3'>
                <CharacterToken roleId={r.id} team={r.team} size={44} />
                <div className='min-w-0 flex-1'>
                  <p className='font-tarot text-base leading-tight text-parchment-100'>
                    {getRoleName(r.id, language)}
                  </p>
                  <p className='font-flavor text-sm leading-snug text-parchment-300/85'>
                    {getRoleAbility(r.id, language)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PanelShell>
  )
}

// ─── Night order ─────────────────────────────────────────────────────────────

/** Night-specific reminder text when the role has one, else its ability. */
function nightText(roleId: string, language: 'en' | 'es'): string {
  const night = getRoleLines(roleId, language).find((l) => l.type === 'NIGHT')
  return night?.text ?? getRoleAbility(roleId, language)
}

export function NightOrderPanel({
  inPlayRoleIds,
  onClose,
}: {
  inPlayRoleIds: string[]
  onClose: () => void
}) {
  const { t, language } = useI18n()
  const [which, setWhich] = useState<'first' | 'other'>('first')

  const entries = useMemo(
    () => getNightOrder(which, inPlayRoleIds),
    [which, inPlayRoleIds],
  )

  const markerLabel: Record<string, string> = {
    dusk: t.game.panels.dusk,
    dawn: t.game.panels.dawn,
    minion_info: t.game.panels.minionInfo,
    demon_info: t.game.panels.demonInfo,
  }

  const toggle = (
    <div className='inline-flex rounded-full border border-board-gold/30 p-0.5'>
      {(['first', 'other'] as const).map((w) => (
        <button
          key={w}
          onClick={() => setWhich(w)}
          className={cn(
            'rounded-full px-3 py-1 font-body text-xs active:scale-95',
            which === w ? 'bg-board-gold text-board-ink' : 'text-board-gold/80',
          )}
        >
          {w === 'first' ? t.game.panels.firstNight : t.game.panels.otherNights}
        </button>
      ))}
    </div>
  )

  return (
    <PanelShell title={t.game.panels.nightOrder} controls={toggle} onClose={onClose}>
      <ul className='flex flex-col gap-3'>
        {entries.map((e, i) =>
          e.kind === 'marker' ? (
            <li key={`m-${e.id}-${i}`} className='flex items-center gap-3 py-1'>
              <span className='h-px flex-1 bg-board-gold/25' />
              <span className='font-tarot text-xs uppercase tracking-[0.2em] text-board-gold/70'>
                {markerLabel[e.id]}
              </span>
              <span className='h-px flex-1 bg-board-gold/25' />
            </li>
          ) : (
            <li key={`r-${e.roleId}-${i}`} className='flex items-center gap-3'>
              <CharacterToken
                roleId={e.roleId}
                team={getRole(e.roleId)?.team ?? 'townsfolk'}
                size={40}
              />
              <div className='min-w-0 flex-1'>
                <p className='font-tarot text-sm leading-tight text-parchment-100'>
                  {getRoleName(e.roleId, language)}
                </p>
                <p className='font-flavor text-xs leading-snug text-parchment-300/75'>
                  {nightText(e.roleId, language)}
                </p>
              </div>
            </li>
          ),
        )}
      </ul>
    </PanelShell>
  )
}
