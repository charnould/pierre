import { BarChart3, BookOpen, MessagesSquare, SlidersHorizontal, Users } from 'lucide-react'
import { useState } from 'react'

import { Docket } from '@/shared/components/icons/koboyo-empty'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/lib/utils'
import type { UserPrincipal } from '@/shared/types/users'

import { KnowledgePanel } from './components/KnowledgePanel'
import { SetupPanel } from './components/SetupPanel'
import { UsersPanel } from './components/UsersPanel'

type AdministrationTab = 'users' | 'knowledge' | 'conversations' | 'statistics' | 'modules'

interface Props {
  hidden: boolean
  url: string
  user: UserPrincipal
  onCurrentUserPasswordChange: () => Promise<void>
  onUserChange: (user: UserPrincipal) => void
}

function FutureFeature({ description }: { description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Docket />
        </EmptyMedia>
        <EmptyTitle>Fonctionnalité en cours d'invention</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function AdministrationView({
  hidden,
  url,
  user,
  onCurrentUserPasswordChange,
  onUserChange
}: Props) {
  const [activeTab, setActiveTab] = useState<AdministrationTab>('users')

  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AdministrationTab)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex shrink-0 px-4 py-2">
          <TabsList aria-label="Administration">
            <TabsTrigger value="users">
              <Users />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <BookOpen />
              Encyclopédie
            </TabsTrigger>
            <TabsTrigger value="conversations">
              <MessagesSquare />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <BarChart3 />
              Statistiques
            </TabsTrigger>
            <TabsTrigger value="modules">
              <SlidersHorizontal />
              Paramétrage
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="flex min-h-0 flex-col overflow-hidden">
          <UsersPanel
            url={url}
            user={user}
            onCurrentUserPasswordChange={onCurrentUserPasswordChange}
            onUserChange={onUserChange}
          />
        </TabsContent>
        <TabsContent value="knowledge" className="flex min-h-0">
          <KnowledgePanel url={url} />
        </TabsContent>
        <TabsContent value="conversations" className="flex min-h-0">
          <FutureFeature description="La consultation des conversations sera disponible ici." />
        </TabsContent>
        <TabsContent value="statistics" className="flex min-h-0">
          <FutureFeature description="Les statistiques seront disponibles ici." />
        </TabsContent>
        <TabsContent value="modules" className="flex min-h-0">
          <SetupPanel url={url} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
