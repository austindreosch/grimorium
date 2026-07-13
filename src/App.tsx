import { useEffect, useMemo, useState } from 'react'
import { createGame, PlayerSetup, UNASSIGNED_ROLE_ID } from './lib/game'
import { resolveRoleAssignments } from './lib/roleAssignment'
import {
  saveGame,
  setCurrentGameId,
  getGame,
  clearCurrentGame,
} from './lib/storage'
import {
  MainMenu,
  ModeSelect,
  PlayerEntry,
  ScriptSelection,
  RoleSelection,
  DealScreen,
  RoleAssignment,
  GameScreen,
  RolesLibrary,
  HowToPlayScreen,
} from './components/screens'
import { useRouter } from './hooks/useRouter'
import { RoleId } from './lib/roles/types'
import { GameMode } from './lib/types'
import { getRole } from './lib/roles'
import { ScriptId } from './lib/scripts'

// Internal screens for the new-game wizard (not routed — stays on "/")
// `mode` is chosen first and carried through every subsequent step.
type NewGameScreen =
  | { type: 'new_game_mode' }
  | { type: 'new_game_players'; mode: GameMode }
  | { type: 'new_game_script'; mode: GameMode; players: string[] }
  | {
    type: 'new_game_roles'
    mode: GameMode
    players: string[]
    scriptId: ScriptId
  }
  | {
    type: 'new_game_assign'
    mode: GameMode
    players: string[]
    scriptId: ScriptId
    selectedRoles: string[]
  }
  // Simple-Mode deal step (replaces guided's manual-assign screen)
  | {
    type: 'new_game_deal'
    mode: GameMode
    players: string[]
    scriptId: ScriptId
    selectedRoles: string[]
  }

// sessionStorage key for the in-progress new-game wizard (survives refresh).
const NEW_GAME_KEY = 'grimoire_new_game'

function App() {
  const { path, navigate, replace } = useRouter()

  // New-game wizard state (lives entirely on the "/" route). Persisted to
  // sessionStorage so a refresh mid-setup restores the exact step + data
  // instead of dumping the storyteller back to the home splash.
  const [newGameScreen, setNewGameScreen] = useState<NewGameScreen | null>(
    () => {
      try {
        const raw = sessionStorage.getItem(NEW_GAME_KEY)
        return raw ? (JSON.parse(raw) as NewGameScreen) : null
      } catch {
        return null
      }
    },
  )

  useEffect(() => {
    try {
      if (newGameScreen)
        sessionStorage.setItem(NEW_GAME_KEY, JSON.stringify(newGameScreen))
      else sessionStorage.removeItem(NEW_GAME_KEY)
    } catch {
      // ignore storage quota / private-mode failures
    }
  }, [newGameScreen])

  // Parse route segments once
  const segments = useMemo(() => path.split('/').filter(Boolean), [path])

  const routeType = segments[0] ?? 'home'

  // ========================================================================
  // Side effects for route changes
  // ========================================================================

  // Redirect invalid /game/:id to /
  useEffect(() => {
    if (routeType === 'game' && segments[1]) {
      const game = getGame(segments[1])
      if (!game) {
        replace('/')
      }
    }
  }, [routeType, segments, replace])

  // Track current game ID in localStorage
  useEffect(() => {
    if (routeType === 'game' && segments[1]) {
      const game = getGame(segments[1])
      if (game) {
        setCurrentGameId(segments[1])
      }
    }
  }, [routeType, segments])

  // Clear new-game wizard when navigating away from home
  useEffect(() => {
    if (routeType !== 'home') {
      setNewGameScreen(null)
    }
  }, [routeType])

  // ========================================================================
  // New-game wizard handlers
  // ========================================================================

  // New Game lands directly in the Simple-mode setup by default (zero extra taps).
  // Guided stays reachable via a link on the first setup screen → ModeSelect.
  const handleNewGame = () => {
    setNewGameScreen({ type: 'new_game_players', mode: 'simple' })
  }

  const handleModeNext = (mode: GameMode) => {
    setNewGameScreen({ type: 'new_game_players', mode })
  }

  const handlePlayersNext = (mode: GameMode, players: string[]) => {
    setNewGameScreen({ type: 'new_game_script', mode, players })
  }

  const handleScriptNext = (
    mode: GameMode,
    players: string[],
    scriptId: ScriptId,
  ) => {
    setNewGameScreen({ type: 'new_game_roles', mode, players, scriptId })
  }

  const handleRolesNext = (
    mode: GameMode,
    players: string[],
    scriptId: ScriptId,
    selectedRoles: string[],
  ) => {
    // Simple Mode: the bag is chosen → go to the deal step (shuffle / manual).
    // Guided Mode: keep the existing per-player assignment screen.
    setNewGameScreen({
      type: mode === 'simple' ? 'new_game_deal' : 'new_game_assign',
      mode,
      players,
      scriptId,
      selectedRoles,
    })
  }

  // Create + persist a game and open it. `inPlayRoleIds` is the chosen bag —
  // set for both Simple deal paths so the reference panels read it directly.
  const createAndOpen = (
    setups: PlayerSetup[],
    scriptId: ScriptId,
    mode: GameMode,
    inPlayRoleIds?: string[],
  ) => {
    const gameName = `Game ${new Date().toLocaleDateString()}`
    const game = createGame(gameName, scriptId, setups, mode, inPlayRoleIds)

    saveGame(game)
    setCurrentGameId(game.id)
    setNewGameScreen(null)

    navigate(`/game/${game.id}`)
  }

  // Guided Mode: finish from the per-player assignment screen.
  const handleStartGame = (
    roleAssignments: { name: string; roleId: string }[],
    scriptId: ScriptId,
    mode: GameMode,
  ) => {
    createAndOpen(
      roleAssignments.map((a) => ({ name: a.name, roleId: a.roleId })),
      scriptId,
      mode,
    )
  }

  // Simple Mode — Shuffle & pass out: randomly deal the bag to the players.
  const handleShuffleDeal = (
    players: string[],
    scriptId: ScriptId,
    bag: string[],
  ) => {
    const assignments = resolveRoleAssignments({
      players,
      selectedRoles: bag,
      manualAssignments: Object.fromEntries(players.map((n) => [n, null])),
    })
    createAndOpen(
      assignments.map((a) => ({ name: a.name, roleId: a.roleId })),
      scriptId,
      'simple',
      bag,
    )
  }

  // Simple Mode — Assign manually: every seat starts blank (assign on the board).
  const handleManualDeal = (
    players: string[],
    scriptId: ScriptId,
    bag: string[],
  ) => {
    createAndOpen(
      players.map((name) => ({ name, roleId: UNASSIGNED_ROLE_ID })),
      scriptId,
      'simple',
      bag,
    )
  }

  const handleBackToMenu = () => {
    setNewGameScreen(null)
  }

  // ========================================================================
  // Route: /game/:id
  // ========================================================================

  if (routeType === 'game' && segments[1]) {
    const gameId = segments[1]
    const game = getGame(gameId)
    if (!game) {
      // The useEffect above will redirect; render nothing until then
      return null
    }
    return (
      <GameScreen
        key={gameId}
        initialGame={game}
        onMainMenu={() => {
          clearCurrentGame()
          navigate('/')
        }}
      />
    )
  }

  // ========================================================================
  // Route: /roles and /roles/:roleId
  // ========================================================================

  if (routeType === 'roles') {
    const candidateRoleId = segments[1] ?? null
    // Validate roleId — fall back to list view if invalid
    const selectedRoleId =
      candidateRoleId && getRole(candidateRoleId as RoleId)
        ? (candidateRoleId as RoleId)
        : null

    // If the URL has an invalid role ID, clean it up
    if (candidateRoleId && !selectedRoleId) {
      replace('/roles')
    }

    return (
      <div className='relative'>
        <RolesLibrary
          selectedRoleId={selectedRoleId}
          onBack={() => navigate('/')}
          onSelectRole={(id) => navigate(`/roles/${id}`)}
          onDeselectRole={() => navigate('/roles')}
        />
      </div>
    )
  }

  // ========================================================================
  // Route: /how-to-play
  // ========================================================================

  if (routeType === 'how-to-play') {
    return (
      <div className='relative'>
        <HowToPlayScreen onBack={() => navigate('/')} />
      </div>
    )
  }

  // ========================================================================
  // Route: / (home — main menu + new-game wizard)
  // ========================================================================

  // Redirect unknown routes to home
  if (routeType !== 'home') {
    replace('/')
    return null
  }

  const renderHome = () => {
    // New-game wizard (internal to "/" route)
    if (newGameScreen) {
      switch (newGameScreen.type) {
        case 'new_game_mode':
          return (
            <ModeSelect onSelect={handleModeNext} onBack={handleBackToMenu} />
          )

        case 'new_game_players':
          return (
            <PlayerEntry
              onNext={(players) =>
                handlePlayersNext(newGameScreen.mode, players)
              }
              onBack={
                newGameScreen.mode === 'simple'
                  ? handleBackToMenu
                  : () => setNewGameScreen({ type: 'new_game_mode' })
              }
              // Guided mode is parked for now: Simple is the only reachable path.
              // The guided screens/branch stay in the tree (revivable) — just no UI
              // entry into them. Re-expose by restoring onSwitchToGuided here.
              onSwitchToGuided={undefined}
            />
          )

        case 'new_game_script':
          return (
            <ScriptSelection
              players={newGameScreen.players}
              onSelect={(scriptId) =>
                handleScriptNext(
                  newGameScreen.mode,
                  newGameScreen.players,
                  scriptId,
                )
              }
              onBack={() =>
                setNewGameScreen({
                  type: 'new_game_players',
                  mode: newGameScreen.mode,
                })
              }
            />
          )

        case 'new_game_roles':
          return (
            <RoleSelection
              players={newGameScreen.players}
              scriptId={newGameScreen.scriptId}
              onNext={(selectedRoles) =>
                handleRolesNext(
                  newGameScreen.mode,
                  newGameScreen.players,
                  newGameScreen.scriptId,
                  selectedRoles,
                )
              }
              onBack={() =>
                setNewGameScreen({
                  type: 'new_game_script',
                  mode: newGameScreen.mode,
                  players: newGameScreen.players,
                })
              }
            />
          )

        case 'new_game_deal':
          return (
            <DealScreen
              players={newGameScreen.players}
              bag={newGameScreen.selectedRoles}
              onShuffle={() =>
                handleShuffleDeal(
                  newGameScreen.players,
                  newGameScreen.scriptId,
                  newGameScreen.selectedRoles,
                )
              }
              onManual={() =>
                handleManualDeal(
                  newGameScreen.players,
                  newGameScreen.scriptId,
                  newGameScreen.selectedRoles,
                )
              }
              onBack={() =>
                setNewGameScreen({
                  type: 'new_game_roles',
                  mode: newGameScreen.mode,
                  players: newGameScreen.players,
                  scriptId: newGameScreen.scriptId,
                })
              }
            />
          )

        case 'new_game_assign':
          return (
            <RoleAssignment
              players={newGameScreen.players}
              selectedRoles={newGameScreen.selectedRoles}
              onStart={(assignments) =>
                handleStartGame(
                  assignments,
                  newGameScreen.scriptId,
                  newGameScreen.mode,
                )
              }
              onBack={() =>
                setNewGameScreen({
                  type: 'new_game_roles',
                  mode: newGameScreen.mode,
                  players: newGameScreen.players,
                  scriptId: newGameScreen.scriptId,
                })
              }
            />
          )
      }
    }

    // Main menu
    return (
      <MainMenu
        onNewGame={handleNewGame}
        onContinue={(gameId) => navigate(`/game/${gameId}`)}
        onLoadGame={(gameId) => navigate(`/game/${gameId}`)}
        onRolesLibrary={() => navigate('/roles')}
        onHowToPlay={() => navigate('/how-to-play')}
      />
    )
  }

  return renderHome()
}

export default App
