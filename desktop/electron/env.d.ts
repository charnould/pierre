import type { Session } from 'electron'

declare module 'electron' {
  interface RequestInit {
    session?: Session
  }
}
