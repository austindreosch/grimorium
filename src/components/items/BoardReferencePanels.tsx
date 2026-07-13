import { ComponentType, ReactNode, useMemo, useState } from 'react'
import {
  MaskHappy,
  UsersThree,
  type IconProps as PhosphorIconProps,
} from '@phosphor-icons/react'
import { getRole } from '../../lib/roles'
import { RoleDefinition } from '../../lib/roles/types'
import { getScript, ScriptId } from '../../lib/scripts'
import { TeamId } from '../../lib/teams'
import { getNightOrder } from '../../lib/nightOrder'
import { getRoleName, getRoleAbility, getRoleLines } from '../../lib/i18n/registry'
import { useI18n } from '../../lib/i18n'
import { CharacterToken } from './CharacterToken'
import { PARCHMENT_TEXTURE } from '../../lib/roles/art'
import { Icon } from '../atoms'
import { cn } from '../../lib/utils'

// Reference panels are full-screen on mobile; on desktop they sit as an
// isolated sidebar below the top-right controls.
const PANEL_CLASS = cn(
  'fixed inset-0 z-50 flex flex-col border-4 border-[#b9a7e8] bg-[#e8dcc0]',
  'md:bottom-4 md:left-auto md:right-4 md:top-20 md:w-[360px] md:overflow-hidden md:rounded-2xl md:shadow-2xl',
)
const PANEL_STYLE = {
  backgroundImage: `linear-gradient(rgba(247,240,224,0.55),rgba(247,240,224,0.55)), url(${PARCHMENT_TEXTURE})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
} as const
const CLEAR_RAIL = 'pr-4'

const TEAM_ORDER: TeamId[] = ['townsfolk', 'outsider', 'minion', 'demon']
const TEAM_RAIL: Record<TeamId, string> = {
  townsfolk: 'border-l-sky-400',
  outsider: 'border-l-parchment-100',
  minion: 'border-l-red-500',
  demon: 'border-l-red-950',
}

function PanelShell({
  title,
  controls,
  hideHeader = false,
  onClose,
  children,
}: {
  title: string
  controls?: ReactNode
  hideHeader?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div className={PANEL_CLASS} style={PANEL_STYLE}>
      {!hideHeader && (
        <div
          className={cn(
            'flex items-center gap-2 border-b border-board-ink/20 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]',
            CLEAR_RAIL,
          )}
        >
          <h2 className='flex-1 font-tarot text-xl text-board-ink'>{title}</h2>
          <button
            onClick={onClose}
            aria-label={t.ui.close}
            className='text-board-ink/70 active:scale-95'
          >
            <Icon name='x' size='md' />
          </button>
        </div>
      )}
      {controls && (
        <div
          className={cn(
            'border-b border-board-ink/15 px-4 pb-3',
            hideHeader ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : 'pt-2',
            CLEAR_RAIL,
          )}
        >
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
  scriptId,
  onClose,
}: {
  inPlayRoleIds: string[]
  scriptId: ScriptId
  onClose: () => void
}) {
  const { language } = useI18n()

  const groups = useMemo(() => {
    const roles = [...new Set(getScript(scriptId).roles)]
      .map(getRole)
      .filter((r): r is RoleDefinition => !!r)
    return TEAM_ORDER.map((team) => ({
      team,
      roles: roles.filter((r) => r.team === team),
    })).filter((g) => g.roles.length > 0)
  }, [scriptId])

  return (
    <PanelShell title='' hideHeader onClose={onClose}>
      {groups.map((g) => (
        <section key={g.team} className={cn('mb-5 border-l-2 pl-3', TEAM_RAIL[g.team])}>
          <ul className='flex flex-col gap-3'>
            {g.roles.map((r) => (
              <li key={r.id} className='flex items-center gap-3'>
                <CharacterToken roleId={r.id} team={r.team} size={40} centerArt />
                <div className='min-w-0 flex-1'>
                  <p className='font-body text-xs font-bold uppercase tracking-wide leading-tight text-board-ink'>
                    {getRoleName(r.id, language)}
                  </p>
                  <p className='font-body text-xs leading-[1.15] text-board-ink/70'>
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
  const [which, setWhich] = useState<'first' | 'other'>('other')

  const entries = useMemo(
    () => getNightOrder(which, inPlayRoleIds),
    [which, inPlayRoleIds],
  )

  const stepLabel: Record<'minion_info' | 'demon_info', string> = {
    minion_info: t.game.panels.minionInfo,
    demon_info: t.game.panels.demonInfo,
  }
  const stepHint: Record<'minion_info' | 'demon_info', string> = {
    minion_info: t.game.panels.minionInfoHint,
    demon_info: t.game.panels.demonInfoHint,
  }
  const stepIcon: Record<'minion_info' | 'demon_info', ComponentType<PhosphorIconProps>> = {
    minion_info: UsersThree,
    demon_info: MaskHappy,
  }

  const toggle = (
    <div className='flex items-center gap-2'>
      <div className='flex flex-1 rounded-[10px] border border-board-ink/30 bg-board-leather/10 p-0.5'>
      {(['first', 'other'] as const).map((w) => (
        <button
          key={w}
          onClick={() => setWhich(w)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-1 font-body text-xs active:scale-95',
            which === w ? 'bg-board-ink text-board-gold' : 'text-board-ink/70',
          )}
        >
          <Icon name={w === 'first' ? 'moon' : 'sunrise'} size='xs' />
          {w === 'first' ? t.game.panels.firstNight : t.game.panels.otherNights}
        </button>
      ))}
      </div>
    </div>
  )

  return (
    <PanelShell title={t.game.panels.nightOrder} controls={toggle} hideHeader onClose={onClose}>
      <ul className='flex flex-col gap-3'>
        {entries.map((e, i) => {
          if (e.kind === 'marker') {
            return null
          }
          if (e.kind === 'step') {
            const StepIcon = stepIcon[e.id]
            return (
              <li key={`s-${e.id}-${i}`} className='flex items-center gap-3'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-board-ink/30 bg-board-ink/5 text-board-ink/80'>
                  <StepIcon size={22} weight='regular' />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='font-body text-xs font-bold uppercase tracking-wide leading-tight text-board-ink'>
                    {stepLabel[e.id]}
                  </p>
                  <p className='font-body text-xs leading-[1.15] text-board-ink/70'>
                    {stepHint[e.id]}
                  </p>
                </div>
              </li>
            )
          }
          return (
            <li key={`r-${e.roleId}-${i}`} className='flex items-center gap-3'>
              <CharacterToken
                roleId={e.roleId}
                team={getRole(e.roleId)?.team ?? 'townsfolk'}
                size={40}
                centerArt
              />
              <div className='min-w-0 flex-1'>
                <p className='font-body text-xs font-bold uppercase tracking-wide leading-tight text-board-ink'>
                  {getRoleName(e.roleId, language)}
                </p>
                <p className='font-body text-xs leading-[1.15] text-board-ink/70'>
                  {nightText(e.roleId, language)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </PanelShell>
  )
}
