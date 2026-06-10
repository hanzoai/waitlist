import './styles.css'

export { Waitlist } from './Waitlist'
export type { WaitlistMode, WaitlistTheme, WaitlistProps } from './Waitlist'

export { WaitlistClient, join, status } from './client'
export type {
  JoinInput,
  StatusInput,
  WaitlistEntry,
  ApiError,
  Result,
  ClientOptions,
} from './client'
