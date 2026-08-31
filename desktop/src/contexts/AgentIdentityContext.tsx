import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { desktopAgentMentionHandle } from '../../../shared/agent-identity'

export type AgentIdentity = {
  name: string
  handle: string
}

const DEFAULT_AGENT_IDENTITY: AgentIdentity = {
  name: 'Agent IA',
  handle: 'agent'
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
