import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { desktopAgentMentionHandle } from '../../../shared/agent-identity'

export type AgentIdentity = {
  name: string
  handle: string
}

export const DEFAULT_AGENT_NAME = 'Pierre'

const DEFAULT_AGENT_IDENTITY: AgentIdentity = {
  name: DEFAULT_AGENT_NAME,
  handle: desktopAgentMentionHandle(DEFAULT_AGENT_NAME)
}

const AgentIdentityContext = createContext<AgentIdentity>(DEFAULT_AGENT_IDENTITY)

export function AgentIdentityProvider({ name, children }: { name: string; children: ReactNode }) {
  const identity = useMemo(
    () => ({
      name: name.trim() || DEFAULT_AGENT_IDENTITY.name,
      handle: desktopAgentMentionHandle(name)
    }),
    [name]
  )

  return <AgentIdentityContext.Provider value={identity}>{children}</AgentIdentityContext.Provider>
}

export function useAgentIdentity(): AgentIdentity {
  return useContext(AgentIdentityContext)
}
