import { ComponentType, HTMLAttributes, ReactNode, useMemo, useState } from 'react'
import {
  MaskHappy,
  MoonStars,
  Sun,
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
import { getRoleArt, hasRoleArt, getTokenArt, BLANK_TOKEN } from '../../lib/roles/art'
import { Icon } from '../atoms'
import { cn } from '../../lib/utils'

// Reference panels are full-screen on mobile; on desktop they sit as an
// isolated sidebar below the top-right controls.
const PANEL_CLASS = cn(
  'fixed inset-0 z-50 flex flex-col overflow-hidden rounded-lg border-4 border-[#716887] bg-[#e8dcc0]',
  'md:bottom-4 md:left-auto md:right-4 md:top-4 md:overflow-hidden md:shadow-2xl',
)
const SCRIPT_SHEET_TEXTURE = `${import.meta.env.BASE_URL}assets/textures/parchment_texture_a4_lightened.jpg`
const PANEL_STYLE = {
  backgroundImage: `linear-gradient(rgba(247,240,224,0.55),rgba(247,240,224,0.55)), url(${SCRIPT_SHEET_TEXTURE})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
} as const
const CLEAR_RAIL = ''

const TEAM_ORDER: TeamId[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
]
const FOOTER_TEAM_ORDER: TeamId[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller']
const TEAM_RAIL_BG: Record<TeamId, string> = {
  townsfolk: 'bg-board-good',
  outsider: 'bg-board-goodSoft',
  minion: 'bg-board-evilSoft',
  demon: 'bg-board-evil',
  traveller: 'bg-board-ink/30',
  fabled: 'bg-board-gold/40',
}
// Official script-sheet ink: good roles navy, evil roles red.
const TEAM_NAME_COLOR: Record<TeamId, string> = {
  townsfolk: 'text-board-good',
  outsider: 'text-board-good',
  traveller: 'text-board-ink/70',
  fabled: 'text-board-gold',
  minion: 'text-board-evil',
  demon: 'text-board-evil',
}

// Shared list-row typography, tuned to the printed BotC sheet: serif name in
// team ink, sans ability in dark ink.
const ROW_NAME_CLASS = 'font-sheet text-[13px] font-bold leading-none'
const ROW_ABILITY_CLASS = 'font-sheetSans text-[10px] leading-tight text-board-ink'
const SCRIPT_DIVIDER_CLASS =
  'relative before:absolute before:left-0 before:right-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-board-ink/30 before:via-board-ink/15 before:to-transparent'

/** A role list row: bare character art (no token disc) + name + ability. */
function RoleRow({
  roleId,
  team,
  name,
  ability,
  fixedHeight = false,
  inPlay = false,
}: {
  roleId: string
  team: TeamId
  name: string
  ability: string
  fixedHeight?: boolean
  inPlay?: boolean
}) {
  return (
    <li className={cn('flex items-center gap-2', fixedHeight && 'h-[58px] w-[240px] overflow-hidden')}>
      <div className='h-9 w-9 shrink-0 overflow-hidden'>
        {/* Bare cropped art for roles that have it (TB); real token PNG for
            every other edition, which ships only as a composed token. */}
        {hasRoleArt(roleId) ? (
          <img
            src={getRoleArt(roleId, team)}
            alt=''
            className='h-full w-full scale-[1.45] object-contain'
            draggable={false}
          />
        ) : (
          <img
            src={getTokenArt(roleId)}
            alt=''
            className='h-full w-full object-contain'
            draggable={false}
            onError={(e) => {
              e.currentTarget.src = BLANK_TOKEN
            }}
          />
        )}
      </div>
      <div className='min-w-0 flex-1 overflow-hidden'>
        <p className={cn(ROW_NAME_CLASS, TEAM_NAME_COLOR[team])}>
          <span>{name}</span>
          {inPlay && (
            <span
              aria-label='In play'
              className='ml-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-board-gold align-middle shadow-[0_0_4px_rgba(214,174,90,0.85)]'
            />
          )}
        </p>
        <p className={cn(ROW_ABILITY_CLASS, fixedHeight && 'line-clamp-3')}>{ability}</p>
      </div>
    </li>
  )
}

function PanelShell({
  title,
  controls,
  hideHeader = false,
  wide = false,
  bodyClassName,
  panelDragProps,
  active,
  onClose,
  children,
}: {
  title: string
  controls?: ReactNode
  hideHeader?: boolean
  wide?: boolean
  bodyClassName?: string
  panelDragProps?: HTMLAttributes<HTMLDivElement>
  active: boolean
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useI18n()
  return (
    <div
      {...panelDragProps}
      aria-hidden={!active}
      className={cn(
        PANEL_CLASS,
        'cursor-grab select-none active:cursor-grabbing',
        'transform-gpu transition-[opacity,transform,width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
        wide ? 'md:w-[550px]' : 'md:w-[360px]',
        active ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-full opacity-0 md:translate-x-5',
        panelDragProps?.className,
      )}
      style={{ ...PANEL_STYLE, touchAction: 'pan-y', ...panelDragProps?.style }}
    >
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
      <div className={cn('flex flex-1 flex-col overflow-y-auto px-2 py-0', bodyClassName, CLEAR_RAIL)}>
        {children}
      </div>
    </div>
  )
}

// ─── Script sheet ────────────────────────────────────────────────────────────

export function ScriptSheetPanel({
  activeRoleIds,
  active,
  scriptId,
  scriptRoleIds,
  panelDragProps,
  onClose,
}: {
  activeRoleIds: string[]
  active: boolean
  scriptId: ScriptId
  /** Full script role list (persisted for imported scripts); falls back to the static table. */
  scriptRoleIds?: string[]
  panelDragProps?: HTMLAttributes<HTMLDivElement>
  onClose: () => void
}) {
  const { t, language } = useI18n()
  const activeRoleSet = useMemo(() => new Set(activeRoleIds), [activeRoleIds])

  const groups = useMemo(() => {
    const roles = [...new Set(scriptRoleIds ?? getScript(scriptId).roles)]
      .map(getRole)
      .filter((r): r is RoleDefinition => !!r)
    return TEAM_ORDER.map((team) => ({
      team,
      roles: roles.filter((r) => r.team === team),
    })).filter((g) => g.roles.length > 0)
  }, [scriptId, scriptRoleIds])
  const activeCounts = useMemo(() => {
    const counts: Record<TeamId, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveller: 0, fabled: 0 }
    for (const roleId of activeRoleIds) {
      const team = getRole(roleId)?.team
      if (team) counts[team] += 1
    }
    return counts
  }, [activeRoleIds])

  return (
    <PanelShell title='' hideHeader wide active={active} panelDragProps={panelDragProps} onClose={onClose}>
      <div className='-mx-2 flex'>
        <div className={cn('w-2 shrink-0 self-stretch', TEAM_RAIL_BG.townsfolk)} />
        <div className='flex-1 py-3 pl-3 pr-2 text-center'>
          <h2 className='font-cinzel text-[25px] leading-none text-[#5a1f2a]'>
            {t.scripts[scriptId as keyof typeof t.scripts] ?? t.game.panels.script}
          </h2>
        </div>
      </div>
      {groups.map((g) => (
        <section
          key={g.team}
          className={cn(
            '-mx-2 flex',
            SCRIPT_DIVIDER_CLASS,
          )}
        >
          <div className={cn('w-2 shrink-0 self-stretch', TEAM_RAIL_BG[g.team])} />
          <div className='flex-1 py-3 pl-3 pr-2'>
            <ul className='grid w-[500px] max-w-full grid-cols-1 gap-x-4 gap-y-2.5 md:grid-cols-2'>
              {g.roles.map((r) => (
                <RoleRow
                  key={r.id}
                  roleId={r.id}
                  team={r.team}
                  name={getRoleName(r.id, language)}
                  ability={getRoleAbility(r.id, language)}
                  fixedHeight
                  inPlay={activeRoleSet.has(r.id)}
                />
              ))}
            </ul>
          </div>
        </section>
      ))}
      <div className={cn('-mx-2 mt-auto flex', SCRIPT_DIVIDER_CLASS)}>
        <div className='w-2 shrink-0 self-stretch bg-board-ink/30' />
        <div className='flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 font-sheetSans text-[10px] uppercase tracking-[0.12em] text-board-ink/70'>
          <span className='text-board-ink'>
            {activeRoleIds.length} {activeRoleIds.length === 1 ? 'Player' : 'Players'}
          </span>
          {FOOTER_TEAM_ORDER.map((team) => (
            <span key={team} className={TEAM_NAME_COLOR[team]}>
              {t.teams[team].name} <span>{activeCounts[team]}</span>
            </span>
          ))}
        </div>
      </div>
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
  active,
  panelDragProps,
  onClose,
}: {
  inPlayRoleIds: string[]
  active: boolean
  panelDragProps?: HTMLAttributes<HTMLDivElement>
  onClose: () => void
}) {
  const { t, language } = useI18n()
  const [which, setWhich] = useState<'first' | 'other'>('other')

  const entries = useMemo(
    () => getNightOrder(which, inPlayRoleIds),
    [which, inPlayRoleIds],
  )

  // Fixed narrator steps (Dusk/Dawn markers + Minion/Demon info) share the
  // parchment-sheet row style; only the icon and copy differ.
  type MetaId = 'dusk' | 'dawn' | 'minion_info' | 'demon_info'
  const metaLabel: Record<MetaId, string> = {
    dusk: t.game.panels.dusk,
    dawn: t.game.panels.dawn,
    minion_info: t.game.panels.minionInfo,
    demon_info: t.game.panels.demonInfo,
  }
  const metaHint: Record<MetaId, string> = {
    dusk: t.game.panels.duskHint,
    dawn: t.game.panels.dawnHint,
    minion_info: t.game.panels.minionInfoHint,
    demon_info: t.game.panels.demonInfoHint,
  }
  const metaIcon: Record<MetaId, ComponentType<PhosphorIconProps>> = {
    dusk: MoonStars,
    dawn: Sun,
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
    <PanelShell title={t.game.panels.nightOrder} controls={toggle} hideHeader bodyClassName='px-4 py-3' active={active} panelDragProps={panelDragProps} onClose={onClose}>
      <ul className='flex flex-col gap-3'>
        {entries.map((e, i) => {
          if (e.kind === 'marker' || e.kind === 'step') {
            const MetaIcon = metaIcon[e.id]
            return (
              <li key={`m-${e.id}-${i}`} className='flex items-center gap-2'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center text-board-ink/70'>
                  <MetaIcon size={24} weight='regular' />
                </div>
                <div className='min-w-0 flex-1'>
                  <p className={cn(ROW_NAME_CLASS, 'text-board-ink')}>
                    {metaLabel[e.id]}
                  </p>
                  <p className={ROW_ABILITY_CLASS}>{metaHint[e.id]}</p>
                </div>
              </li>
            )
          }
          const team = getRole(e.roleId)?.team ?? 'townsfolk'
          return (
            <RoleRow
              key={`r-${e.roleId}-${i}`}
              roleId={e.roleId}
              team={team}
              name={getRoleName(e.roleId, language)}
              ability={nightText(e.roleId, language)}
            />
          )
        })}
      </ul>
    </PanelShell>
  )
}
