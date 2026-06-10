import './styles.css'

export { Waitlist } from './Waitlist'
export type { WaitlistMode, WaitlistTheme, WaitlistProps } from './Waitlist'

export { WaitlistLeaderboard } from './Leaderboard'
export type { WaitlistLeaderboardProps } from './Leaderboard'

export { WaitlistClient, join, status } from './client'
export type {
  JoinInput,
  StatusInput,
  ListInput,
  WaitlistEntry,
  LeaderboardEntry,
  LeaderboardPage,
  ApiError,
  Result,
  ClientOptions,
} from './client'
