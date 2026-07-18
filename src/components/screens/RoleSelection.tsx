import { useState, useMemo, useCallback } from 'react'
import { ROLES } from '../../lib/roles'
import { RoleDefinition } from '../../lib/roles/types'
import {
  SCRIPTS,
  ScriptId,
  getRecommendedDistribution,
  applyDistributionModifiers,
} from '../../lib/scripts'
import { generateRolePools } from '../../lib/scripts/generator'
import { getTeam, TeamId } from '../../lib/teams'
import { useI18n } from '../../lib/i18n'
import { Button, Icon, BackButton } from '../atoms'
import { CharacterToken } from '../items/CharacterToken'
import { cn } from '../../lib/utils'
import {
  UsersThree,
  UserMinus,
  Sword,
  Skull,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'

// Phosphor team glyphs for the footer distribution row.
type PlayTeamId = Extract<TeamId, 'townsfolk' | 'outsider' | 'minion' | 'demon'>

const TEAM_PHOSPHOR: Record<PlayTeamId, PhosphorIcon> = {
  townsfolk: UsersThree,
  outsider: UserMinus,
  minion: Sword,
  demon: Skull,
}

type Props = {
  players: string[]
  scriptId: ScriptId
  onNext: (selectedRoles: string[]) => void
  onBack: () => void
}

const TEAM_ORDER: PlayTeamId[] = ['townsfolk', 'outsider', 'minion', 'demon']

// Faint per-team section tints — replaces the old divider bars.
const TEAM_SECTION_TINT: Record<PlayTeamId, string> = {
  townsfolk: 'bg-blue-500/[0.04]',
  outsider: 'bg-cyan-500/[0.04]',
  minion: 'bg-orange-500/[0.05]',
  demon: 'bg-red-500/[0.05]',
}

const TEAM_SELECTED_FILL: Record<PlayTeamId, string> = {
  townsfolk: 'bg-blue-500/15',
  outsider: 'bg-cyan-500/15',
  minion: 'bg-orange-500/15',
  demon: 'bg-red-500/15',
}

const isPlayTeam = (team: TeamId): team is PlayTeamId =>
  TEAM_ORDER.includes(team as PlayTeamId)

export function RoleSelection({ players, scriptId, onNext, onBack }: Props) {
  const { t } = useI18n()
  const script = SCRIPTS[scriptId]
  const isCustomMode = scriptId === 'custom'

  // ── State ──────────────────────────────────────────────────────────
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>(() => {
    return { imp: 1 }
  })

  const totalRoles = Object.values(roleCounts).reduce((a, b) => a + b, 0)
  const impCount = roleCounts['imp'] ?? 0

  // ── Computed ───────────────────────────────────────────────────────

  // Recommended distribution, adjusted for selected roles with modifiers
  const recommended = useMemo(() => {
    const base = getRecommendedDistribution(players.length)
    if (!base) return null
    const modifiers = Object.entries(roleCounts).flatMap(([roleId, count]) => {
      const role = ROLES[roleId as keyof typeof ROLES]
      return Array(count).fill(role?.distributionModifier) as (
        Partial<Record<PlayTeamId, number>> | undefined
      )[]
    })
    return applyDistributionModifiers(base, modifiers)
  }, [players.length, roleCounts])

  // Roles for this script, grouped by team
  const rolesByTeam = useMemo(() => {
    const result: Record<PlayTeamId, RoleDefinition[]> = {
      townsfolk: [],
      outsider: [],
      minion: [],
      demon: [],
    }
    for (const roleId of script.roles) {
      const role = ROLES[roleId]
      if (role && isPlayTeam(role.team)) {
        result[role.team].push(role)
      }
    }
    return result
  }, [script.roles])

  // Count currently selected roles per team
  const teamCounts = useMemo(() => {
    const counts: Record<PlayTeamId, number> = {
      townsfolk: 0,
      outsider: 0,
      minion: 0,
      demon: 0,
    }
    for (const [roleId, count] of Object.entries(roleCounts)) {
      const role = ROLES[roleId as keyof typeof ROLES]
      if (role && isPlayTeam(role.team)) {
        counts[role.team] += count
      }
    }
    return counts
  }, [roleCounts])

  // ── Handlers ───────────────────────────────────────────────────────

  const toggleRole = (roleId: string) => {
    const current = roleCounts[roleId] ?? 0
    if (current === 0) {
      setRoleCounts({ ...roleCounts, [roleId]: 1 })
    } else {
      const newCounts = { ...roleCounts }
      delete newCounts[roleId]
      setRoleCounts(newCounts)
    }
  }

  const incrementRole = (roleId: string) => {
    setRoleCounts({
      ...roleCounts,
      [roleId]: (roleCounts[roleId] ?? 0) + 1,
    })
  }

  const decrementRole = (roleId: string) => {
    const current = roleCounts[roleId] ?? 0
    if (current > 1) {
      setRoleCounts({ ...roleCounts, [roleId]: current - 1 })
    } else if (current === 1) {
      const newCounts = { ...roleCounts }
      delete newCounts[roleId]
      setRoleCounts(newCounts)
    }
  }

  const applyGeneratedRoles = (roles: string[]) => {
    const newCounts: Record<string, number> = {}
    for (const roleId of roles) {
      newCounts[roleId] = (newCounts[roleId] ?? 0) + 1
    }
    setRoleCounts(newCounts)
  }

  const generateBalancedPool = useCallback(() => {
    const pools = generateRolePools(script, players.length, 40).sort(
      (a, b) => a.totalChaos - b.totalChaos,
    )
    if (pools.length === 0) return

    const currentKey = Object.entries(roleCounts)
      .flatMap(([roleId, count]) => Array(count).fill(roleId))
      .sort()
      .join(',')
    const start = Math.floor(pools.length * 0.25)
    const end = Math.ceil(pools.length * 0.75)
    const balanced = pools.slice(start, end)
    const choices = (balanced.length ? balanced : pools).filter(
      (pool) => [...pool.roles].sort().join(',') !== currentKey,
    )
    const pool = (choices.length ? choices : pools)[
      Math.floor(Math.random() * (choices.length || pools.length))
    ]
    applyGeneratedRoles(pool.roles)
  }, [script, players.length, roleCounts])

  const handleNext = () => {
    const selectedRoles: string[] = []
    for (const [roleId, count] of Object.entries(roleCounts)) {
      for (let i = 0; i < count; i++) {
        selectedRoles.push(roleId)
      }
    }
    onNext(selectedRoles)
  }

  const canProceed = totalRoles >= players.length && impCount >= 1

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className='min-h-app bg-gradient-to-b from-grimoire-purple via-grimoire-dark to-grimoire-darker flex flex-col'>
      {/* Top bar — BACK · GENERATE · team counts · NEXT */}
      <div className='sticky top-0 z-10 bg-grimoire-dark/95 backdrop-blur-sm border-b border-mystic-gold/20'>
        <div className='mx-auto max-w-[1200px] px-3'>
          <div className='relative flex items-center gap-3 py-2.5'>
            {/* Left — back + script name */}
            <BackButton onClick={onBack} />
            <span className='font-token text-sm uppercase tracking-wide text-mystic-gold/90 truncate'>
              {scriptId}
            </span>

            {/* Center — generate + team completion counts */}
            <div className='absolute left-1/2 -translate-x-1/2 flex items-center gap-3'>
              <button
                type='button'
                onClick={generateBalancedPool}
                className='flex items-center justify-center gap-1.5 rounded-lg border border-mystic-gold/30 bg-mystic-gold/15 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-mystic-gold shadow-sm transition-transform active:scale-95'
              >
                <Icon name='dices' size='sm' />
                {t.scripts.generate}
              </button>

              {recommended && totalRoles > 0 && (
                <div className='flex items-center gap-3'>
                  {TEAM_ORDER.map((teamId) => {
                    const team = getTeam(teamId)
                    const target = recommended[teamId]
                    const current = teamCounts[teamId]
                    // Baron etc. can target more outsiders than the script has.
                    // The target still shows (e.g. 2/3), but you're "complete"
                    // once every available role of that team is picked — you
                    // physically can't reach the target, so max = green.
                    const attainable = Math.min(
                      target,
                      rolesByTeam[teamId].length,
                    )
                    const isMatch = current >= attainable && current <= target
                    const isOver = current > target
                    const TeamIcon = TEAM_PHOSPHOR[teamId]
                    const stateColor = isMatch
                      ? 'text-green-400'
                      : isOver
                        ? 'text-amber-400'
                        : current > 0
                          ? team.colors.text
                          : 'text-parchment-500'
                    return (
                      <div key={teamId} className='flex items-center gap-1.5'>
                        <TeamIcon
                          size={18}
                          weight='fill'
                          className={cn('transition-colors', stateColor)}
                        />
                        <span
                          className={cn(
                            'text-[11px] tabular-nums font-medium',
                            stateColor,
                          )}
                        >
                          {current}/{target}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceed}
              size='default'
              variant='gold'
              className='ml-auto'
            >
              {t.newGame.nextAssignRoles}
              <span className='ml-2 opacity-70 font-sans text-sm normal-case'>
                ({totalRoles}/{players.length})
              </span>
              <Icon name='arrowRight' size='sm' className='ml-1' />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto relative'>
        <ManualRoleGrid
          rolesByTeam={rolesByTeam}
          roleCounts={roleCounts}
          isCustomMode={isCustomMode}
          onToggle={toggleRole}
          onIncrement={incrementRole}
          onDecrement={decrementRole}
        />
      </div>
    </div>
  )
}

// ============================================================================
// ROLE GRID
// ============================================================================

type ManualRoleGridProps = {
  rolesByTeam: Record<PlayTeamId, RoleDefinition[]>
  roleCounts: Record<string, number>
  isCustomMode: boolean
  onToggle: (roleId: string) => void
  onIncrement: (roleId: string) => void
  onDecrement: (roleId: string) => void
}

function ManualRoleGrid({
  rolesByTeam,
  roleCounts,
  isCustomMode,
  onToggle,
  onIncrement,
  onDecrement,
}: ManualRoleGridProps) {
  return (
    <>
      {TEAM_ORDER.map((teamId, index) => {
        const roles = rolesByTeam[teamId]
        if (roles.length === 0) return null

        return (
          <TeamSection
            key={teamId}
            teamId={teamId}
            divider={index > 0}
            roles={roles}
            roleCounts={roleCounts}
            isCustomMode={isCustomMode}
            onToggle={onToggle}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        )
      })}
    </>
  )
}

// ============================================================================
// TEAM SECTION (sticky header + role card grid)
// ============================================================================

type TeamSectionProps = {
  teamId: PlayTeamId
  divider: boolean
  roles: RoleDefinition[]
  roleCounts: Record<string, number>
  isCustomMode: boolean
  onToggle: (roleId: string) => void
  onIncrement: (roleId: string) => void
  onDecrement: (roleId: string) => void
}

function TeamSection({
  teamId,
  divider,
  roles,
  roleCounts,
  isCustomMode,
  onToggle,
  onIncrement,
  onDecrement,
}: TeamSectionProps) {
  const team = getTeam(teamId)

  return (
    <div
      className={cn(
        'px-4 py-3',
        divider && 'border-t border-white/10',
        TEAM_SECTION_TINT[teamId],
      )}
    >
      <div className='mx-auto max-w-[1200px]'>
        {/* Role Grid */}
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6'>
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              team={team}
              count={roleCounts[role.id] ?? 0}
              isCustomMode={isCustomMode}
              onToggle={() => onToggle(role.id)}
              onIncrement={() => onIncrement(role.id)}
              onDecrement={() => onDecrement(role.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ROLE CARD
// ============================================================================

type RoleCardProps = {
  role: RoleDefinition
  team: ReturnType<typeof getTeam>
  count: number
  isCustomMode: boolean
  onToggle: () => void
  onIncrement: () => void
  onDecrement: () => void
}

function RoleCard({
  role,
  team,
  count,
  isCustomMode,
  onToggle,
  onIncrement,
  onDecrement,
}: RoleCardProps) {
  const isSelected = count > 0

  return (
    <button
      type='button'
      onClick={onToggle}
      className={cn(
        'relative flex flex-col items-center rounded-lg p-2 transition-colors',
        isSelected && isPlayTeam(role.team) && TEAM_SELECTED_FILL[role.team],
        isSelected ? 'hover:brightness-110' : 'hover:bg-white/[0.03]',
      )}
    >
      {/* Card body */}
      <div className='flex flex-col items-center text-center'>
        {/* Selected checkmark */}
        {isSelected && (
          <div className='absolute top-1 right-1'>
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                team.colors.badge,
              )}
            >
              <Icon name='check' size='xs' className={team.colors.badgeText} />
            </div>
          </div>
        )}

        {/* Real character-token art (locked "tokens are always real") */}
        <CharacterToken
          roleId={role.id}
          team={role.team}
          size={96}
          className={cn(!isSelected && 'opacity-70')}
        />
      </div>

      {/* +/- Controls (only when selected, only in custom mode) */}
      {isSelected && isCustomMode && (
        <div
          className='flex items-center justify-center gap-2 pt-2 pb-2.5 border-t border-white/10'
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type='button'
            onClick={onDecrement}
            className='w-6 h-6 flex items-center justify-center text-parchment-400 hover:text-parchment-100 hover:bg-white/10 rounded transition-colors'
          >
            <Icon name='minus' size='xs' />
          </button>
          <span
            className={cn(
              'text-sm font-medium min-w-[1.5rem] text-center',
              team.colors.text,
            )}
          >
            {count}
          </span>
          <button
            type='button'
            onClick={onIncrement}
            className='w-6 h-6 flex items-center justify-center text-parchment-400 hover:text-parchment-100 hover:bg-white/10 rounded transition-colors'
          >
            <Icon name='plus' size='xs' />
          </button>
        </div>
      )}
    </button>
  )
}
