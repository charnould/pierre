import { Component, type ErrorInfo, type ReactNode } from 'react'

import { CartoonTerminalErrorLine } from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  resetErrorBoundary = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="bg-background flex h-full min-h-0 w-full flex-1 items-center justify-center">
        <Empty className="min-h-60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CartoonTerminalErrorLine />
            </EmptyMedia>
            <EmptyTitle>Une erreur est survenue</EmptyTitle>
            <EmptyDescription>
              L’affichage s’est interrompu. Réessayez, ou relancez l’application si le problème
              persiste.
            </EmptyDescription>
          </EmptyHeader>
          <Button type="button" variant="outline" onClick={this.resetErrorBoundary}>
            Réessayer
          </Button>
        </Empty>
      </div>
    )
  }
}
