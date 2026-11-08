import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback } from 'react'

import { useNavigationHistory } from '@/contexts/NavigationHistoryContext'
import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'

export function NavigationHistoryButtons() {
  const { canGoBack, canGoForward, goBack, goForward } = useNavigationHistory()

  const handleBack = useCallback(() => {
    void goBack()
  }, [goBack])

  const handleForward = useCallback(() => {
    void goForward()
  }, [goForward])

  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Retour"
        disabled={!canGoBack}
        onClick={handleBack}
      >
        <ArrowLeft />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Avancer"
        disabled={!canGoForward}
        onClick={handleForward}
      >
        <ArrowRight />
      </Button>
    </ButtonGroup>
  )
}
