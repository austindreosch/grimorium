import { IconName } from '../../components/atoms/icon'

// Core alignment teams drive the game engine + bag distribution. Traveller and
// Fabled are display-only categories: they never enter the bag, but characters
// of these types are placeable on the manual board (imported scripts include
// them), so they carry a team for art, labels, and grouping.
export type TeamId =
  | 'townsfolk'
  | 'outsider'
  | 'minion'
  | 'demon'
  | 'traveller'
  | 'fabled'

export type TeamDefinition = {
  id: TeamId
  icon: IconName
  isEvil: boolean
  colors: {
    // For tarot card backgrounds
    cardBg: string
    cardBorder: string
    cardText: string
    // Card decorative accents
    cardGlow: string // CSS color for animated border glow
    cardShimmer: string // CSS color for holographic foil shimmer
    cardSealRing: string // Tailwind classes for the rotating arcane seal
    cardIconBg: string // Tailwind classes for icon circle background
    cardIconGlow: string // CSS text-shadow for the icon glow
    cardDividerIcon: IconName // Icon used in the MysticDivider
    cardWinBg: string // Tailwind classes for win-condition box
    cardWinAccent: string // Tailwind classes for win-condition accent text/icon
    cardTeamBadge: string // Tailwind classes for the team name text
    // For general UI
    gradient: string
    buttonGradient: string
    text: string
    accent: string
    badge: string
    badgeText: string
  }
}
