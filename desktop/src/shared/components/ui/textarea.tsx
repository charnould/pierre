import { cn } from 'cn'
import * as React from 'react'

import { DictationLive } from '@/features/dictation/DictationLive'
import { DictationMark } from '@/features/dictation/DictationMark'
import { useVoiceDictationOptional } from '@/features/dictation/VoiceDictationContext'
import { Button } from '@/shared/components/ui/button'

function Textarea({
  className,
  mono = false,
  dictation = true,
  ref,
  ...props
}: React.ComponentProps<'textarea'> & {
  /** Geist Mono for templates, JSON, HTML, and other literal values. */
  mono?: boolean
  /** Hide the microphone. JSON and literal fields pass `false` via `mono` or `spellCheck`. */
  dictation?: boolean
}) {
  const voice = useVoiceDictationOptional()
  const localRef = React.useRef<HTMLTextAreaElement>(null)
  const classes = cn(
    'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
    mono && 'font-mono',
    className
  )
  const slot = (props as { 'data-slot'?: string })['data-slot']
  const literal = mono || props.spellCheck === false || slot === 'input-group-control'
  const showMic = dictation && voice?.enabled && !literal && !props.disabled && !props.readOnly
  const [active, setActive] = React.useState(false)
  React.useEffect(() => {
    setActive(Boolean(voice && voice.phase !== 'idle' && voice.target === localRef.current))
  }, [voice])
  if (!showMic || !voice) {
    return <textarea ref={ref} data-slot="textarea" className={classes} {...props} />
  }
  const listening = active && voice.phase === 'recording'
  return (
    <div className={cn('group/dictation relative', className?.includes('h-full') && 'h-full')}>
      <textarea
        ref={(node) => {
          localRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        data-slot="textarea"
        className={cn(classes, listening ? 'pr-20' : 'pr-9')}
        {...props}
      />
      <span
        className={cn(
          'absolute right-1.5 bottom-1.5 opacity-0 group-focus-within/dictation:opacity-100 group-hover/dictation:opacity-100',
          active && 'opacity-100'
        )}
      >
        {listening ? (
          <DictationLive level={voice.level} onStop={() => voice.toggle(localRef.current)} />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={active ? 'Transcription' : 'Dicter'}
            disabled={voice.phase === 'transcribing'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => voice.toggle(localRef.current)}
          >
            <DictationMark phase={active ? voice.phase : 'idle'} />
          </Button>
        )}
      </span>
    </div>
  )
}

export { Textarea }
