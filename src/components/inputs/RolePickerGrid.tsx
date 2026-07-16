import { useMemo } from 'react'
import { RoleDefinition } from '../../lib/roles/types'
import { getTeam, TeamId } from '../../lib/teams'
import { GameState, PlayerState, hasEffect } from '../../lib/types'
import { getEffect } from '../../lib/effects'
import {
  useI18n,
  getRoleName as getRegistryRoleName,
  getRoleDescription as getRegistryRoleDescription,
} from '../../lib/i18n'
import { Icon } from '../atoms'
import { IconName } from '../atoms/icon'
import { CharacterToken } from '../items/CharacterToken'
import { filterVisibleEffects } from '../items/PlayerRoleIcon'
import { SCRIPTS } from '../../lib/scripts'
import { cn } from '../../lib/utils'

const TEAM_ORDER: TeamId[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled']

// Script ordering for the flat picker: Trouble Brewing → Bad Moon Rising →
// Sects & Violets, everything else last. Built once from static SCRIPTS.
const SCRIPT_RANK: Record<string, number> = (() => {
  const order = ['trouble-brewing', 'bad-moon-rising', 'sects-and-violets']
  const map: Record<string, number> = {}
  order.forEach((sid, i) => {
    for (const rid of SCRIPTS[sid as keyof typeof SCRIPTS]?.roles ?? []) {
      if (!(rid in map)) map[rid] = i
    }
  })
  return map
})()

type RolePickerGridProps = {
  /** All roles available for selection. Pre-filtered by the caller. */
  roles: RoleDefinition[]

  /** Current game state — used to resolve which players hold each role. */
  state: GameState

  /** Currently selected role ID(s). */
  selected: string[]

  /** Called when a role is tapped. */
  onSelect: (roleId: string) => void

  /**
   * How many roles must/can be selected.
   * - A number (e.g. 1, 3) caps selection at that count.
   *   When exactly 1, tapping a new card replaces the previous selection (radio behavior).
   *   When > 1, tapping toggles (checkbox behavior, capped at max).
   * - `null` means free selection (any number).
   */
  selectionCount?: number | null

  /**
   * Visual variant for the selected card accent.
   * - "team": uses the team colors of each role for its card border/checkmark (default).
   * - "neutral": uses amber/gold tones for all cards regardless of team.
   */
  colorMode?: 'neutral' | 'team'
  variant?: 'cards' | 'tokens'
  surface?: 'dark' | 'light'
  /** Denser card grid with no ability subtext (used in the info-token picker). */
  compact?: boolean
  hideTeamHeaders?: boolean
  /**
   * Render one continuous grid instead of per-team sections. Roles are sorted:
   * in-play first, then by team (townsfolk→outsider→minion→demon→traveller),
   * then by script (Trouble Brewing→Bad Moon Rising→Sects & Violets).
   * Implies `hideTeamHeaders`.
   */
  flat?: boolean
}

export function RolePickerGrid({
  roles,
  state,
  selected,
  onSelect,
  selectionCount = 1,
  colorMode = 'team',
  variant = 'cards',
  surface = 'dark',
  compact = false,
  hideTeamHeaders = false,
  flat = false,
}: RolePickerGridProps) {
  const { t, language } = useI18n()

  // Group roles by team
  const rolesByTeam = useMemo(() => {
    const grouped: Record<TeamId, RoleDefinition[]> = {
      townsfolk: [],
      outsider: [],
      minion: [],
      demon: [],
      traveller: [],
      fabled: [],
    }
    for (const role of roles) {
      grouped[role.team].push(role)
    }
    return grouped
  }, [roles])

  // Build a map of roleId → PlayerState[] for annotations
  const playersByRole = useMemo(() => {
    const map = new Map<string, PlayerState[]>()
    for (const p of state.players) {
      const existing = map.get(p.roleId)
      if (existing) {
        existing.push(p)
      } else {
        map.set(p.roleId, [p])
      }
    }
    return map
  }, [state.players])

  const getRoleName = (roleId: string) => getRegistryRoleName(roleId, language)

  const getRoleDescription = (roleId: string) =>
    getRegistryRoleDescription(roleId, language)

  const getTeamName = (teamId: TeamId) => {
    const key = teamId as keyof typeof t.teams
    return t.teams[key]?.name ?? teamId
  }

  // Only multi-select (count > 1) blocks at max. Count === 1 is radio behavior —
  // tapping any card replaces the current pick, so nothing is ever disabled.
  const isAtMax =
    selectionCount !== null &&
    selectionCount !== undefined &&
    selectionCount > 1 &&
    selected.length >= selectionCount

  const gridClass = cn(
    'grid gap-2',
    variant === 'tokens'
      ? 'grid-cols-4 content-start gap-3 sm:grid-cols-5'
      : compact
        ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
        : 'grid-cols-2',
  )

  const renderRoleCard = (role: RoleDefinition) => {
    const team = getTeam(role.team)
    const isSelected = selected.includes(role.id)
    const isDisabled = !isSelected && isAtMax
    const assignedPlayers = playersByRole.get(role.id) ?? []
    const desc = getRoleDescription(role.id)

    // Determine colors based on colorMode
    const borderClass =
      colorMode === 'team' ? team.colors.cardBorder : 'border-amber-500/50'
    const badgeBg = colorMode === 'team' ? team.colors.badge : 'bg-amber-500/20'
    const badgeTextClass =
      colorMode === 'team' ? team.colors.badgeText : 'text-amber-200'

    if (variant === 'tokens') {
      return (
        <button
          key={role.id}
          type='button'
          disabled={isDisabled}
          onClick={() => onSelect(role.id)}
          className={cn(
            'relative flex justify-center rounded-full transition-transform active:scale-95',
            isDisabled && 'cursor-not-allowed opacity-40',
          )}
          aria-label={getRoleName(role.id)}
        >
          <CharacterToken
            roleId={role.id}
            team={role.team}
            size={72}
            className={cn(isSelected && 'ring-2 ring-board-gold')}
          />
        </button>
      )
    }

    return (
      <button
        key={role.id}
        type='button'
        disabled={isDisabled}
        onClick={() => onSelect(role.id)}
        className={cn(
          'rounded-xl border-2 transition-all relative flex flex-col',
          isSelected
            ? cn(
                borderClass,
                surface === 'light' ? 'bg-board-ink/5' : 'bg-gradient-to-b from-white/10 to-white/5',
              )
            : surface === 'light'
              ? 'border-board-ink/10 bg-white/20 hover:bg-white/30'
              : 'border-white/10 bg-white/5 hover:bg-white/[0.08]',
          isDisabled && 'opacity-40 cursor-not-allowed',
        )}
        style={
          isSelected
            ? {
                boxShadow: `0 0 16px ${team.colors.cardGlow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }
            : undefined
        }
      >
        {/* Card body */}
        <div className={cn('text-center flex-1', compact ? 'px-2 py-3' : 'px-3 pt-4 pb-3')}>
          {/* Selected checkmark */}
          {isSelected && (
            <div className='absolute top-2 right-2'>
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center',
                  badgeBg,
                )}
              >
                <Icon name='check' size='xs' className={badgeTextClass} />
              </div>
            </div>
          )}

          {/* Real character-token art (locked "tokens are always real") */}
          <div className='flex justify-center'>
            <CharacterToken roleId={role.id} team={role.team} size={compact ? 100 : 44} />
          </div>

          {/* Role name */}
          {!compact && (
            <div
              className={cn(
                'text-[11px] font-tarot tracking-wider uppercase mt-2',
                surface === 'light'
                  ? 'text-board-ink'
                  : isSelected
                    ? 'text-parchment-100'
                    : 'text-parchment-300',
              )}
            >
              {getRoleName(role.id)}
            </div>
          )}

          {/* Role description */}
          {desc && !compact && (
            <p className={cn(
              'text-[11px] line-clamp-2 mt-1 leading-snug text-left',
              surface === 'light' ? 'text-board-ink/70' : 'text-parchment-500',
            )}>
              {desc}
            </p>
          )}
        </div>

        {/* Player badge — overlaid top-left, only when players are assigned */}
        {assignedPlayers.length > 0 && (
          <div className={cn(
            'absolute top-1.5 left-1.5 max-w-[85%] rounded-md px-1.5 py-0.5 space-y-0.5 backdrop-blur-sm',
            surface === 'light' ? 'bg-board-ink/10' : 'bg-black/60',
          )}>
            {assignedPlayers.map((p) => (
              <PlayerRow key={p.id} player={p} surface={surface} />
            ))}
          </div>
        )}
      </button>
    )
  }

  // Flat mode: one continuous grid, sorted in-play → team → script.
  if (flat) {
    const sorted = [...roles].sort((a, b) => {
      const aIn = playersByRole.has(a.id) ? 0 : 1
      const bIn = playersByRole.has(b.id) ? 0 : 1
      if (aIn !== bIn) return aIn - bIn
      const teamDiff = TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team)
      if (teamDiff !== 0) return teamDiff
      return (SCRIPT_RANK[a.id] ?? 99) - (SCRIPT_RANK[b.id] ?? 99)
    })
    return <div className={gridClass}>{sorted.map(renderRoleCard)}</div>
  }

  return (
    <div className={hideTeamHeaders ? 'space-y-2' : 'space-y-4'}>
      {TEAM_ORDER.map((teamId) => {
        const teamRoles = rolesByTeam[teamId]
        if (teamRoles.length === 0) return null
        const team = getTeam(teamId)

        return (
          <div key={teamId}>
            {!hideTeamHeaders && (
              <div className='flex items-center gap-2 mb-2 ml-1'>
                <Icon name={team.icon} size='sm' className={team.colors.text} />
                <span
                  className={cn(
                    'text-xs font-tarot tracking-wider uppercase',
                    team.colors.text,
                  )}
                >
                  {getTeamName(teamId)}
                </span>
              </div>
            )}

            {/* Card Grid */}
            <div className={gridClass}>{teamRoles.map(renderRoleCard)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// PLAYER ROW (card footer)
// ============================================================================

function PlayerRow({ player, surface }: { player: PlayerState; surface: 'dark' | 'light' }) {
  const isDead = hasEffect(player, 'dead')
  const isDrunk = hasEffect(player, 'drunk')

  // Get visible effect icons (skip effects with dedicated custom UI)
  const effectIcons = filterVisibleEffects(player.effects)
    .map((e) => {
      const def = getEffect(e.type)
      return def ? { id: e.type, icon: def.icon as IconName } : null
    })
    .filter((e): e is { id: string; icon: IconName } => e !== null)

  return (
    <div
      className={cn('flex items-center gap-1 min-w-0', isDead && 'opacity-60')}
    >
      <Icon
        name={isDead ? 'skull' : isDrunk ? 'beer' : 'user'}
        size='xs'
        className={cn(
          'flex-shrink-0',
          isDrunk && !isDead ? 'text-amber-400' : surface === 'light' ? 'text-black' : 'text-parchment-500',
        )}
      />
      <span
        className={cn(
          'text-[11px] truncate flex-1',
          isDead
            ? cn(surface === 'light' ? 'text-board-ink/45' : 'text-parchment-500', 'line-through')
            : surface === 'light'
              ? 'text-black'
              : 'text-parchment-400',
        )}
      >
        {player.name}
      </span>
      {effectIcons.length > 0 && (
        <div className='flex items-center gap-0.5 flex-shrink-0'>
          {effectIcons.map((e) => (
            <Icon
              key={e.id}
              name={e.icon}
              size='xs'
              className={surface === 'light' ? 'text-board-ink/35' : 'text-parchment-600'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
