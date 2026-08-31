import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/shared/lib/utils'

type WorkflowReasoningAmbientProps = {
  isLive: boolean
}

const ORB_MOTION = {
  red: {
    animate: {
      x: ['-12%', '14%', '-16%', '8%', '-12%'],
      y: ['2%', '-16%', '10%', '-8%', '2%'],
      scale: [1, 1.18, 0.9, 1.12, 1],
      opacity: [0.42, 0.58, 0.48, 0.62, 0.42]
    },
    transition: { duration: 2.8, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY }
  },
  blue: {
    animate: {
      x: ['10%', '-18%', '6%', '-12%', '10%'],
      y: ['8%', '-10%', '14%', '-6%', '8%'],
      scale: [0.94, 1.14, 1.02, 0.88, 0.94],
      opacity: [0.38, 0.55, 0.62, 0.44, 0.38]
    },
    transition: { duration: 3.1, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY, delay: 0.3 }
  },
  yellow: {
    animate: {
      x: ['-16%', '18%', '-8%', '12%', '-16%'],
      y: ['10%', '-4%', '-14%', '8%', '10%'],
      scale: [1.06, 0.9, 1.2, 0.96, 1.06],
      opacity: [0.48, 0.64, 0.5, 0.58, 0.48]
    },
    transition: { duration: 3.4, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY, delay: 0.65 }
  },
  green: {
    animate: {
      x: ['14%', '-10%', '16%', '-14%', '14%'],
      y: ['-8%', '12%', '-4%', '10%', '-8%'],
      scale: [0.92, 1.16, 0.86, 1.08, 0.92],
      opacity: [0.4, 0.56, 0.52, 0.6, 0.4]
    },
    transition: { duration: 2.6, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY, delay: 0.95 }
  }
} as const

type OrbColor = keyof typeof ORB_MOTION

const ORB_BASE =
  'absolute top-1/2 aspect-square rounded-full bg-muted-foreground/40 blur-[68px] [translate:-50%_-50%]'

const ORB_PLACEMENT: Record<OrbColor, string> = {
  red: 'left-[28%] w-[min(52vw,22rem)]',
  blue: 'left-[58%] w-[min(52vw,22rem)]',
  yellow: 'left-[40%] w-[min(46vw,19rem)]',
  green: 'left-[68%] w-[min(44vw,18rem)]'
}

function ReasoningOrb({ color, reduceMotion }: { color: OrbColor; reduceMotion: boolean }) {
  const motionProps = ORB_MOTION[color]
  const className = cn(ORB_BASE, ORB_PLACEMENT[color])

  if (reduceMotion) {
    return <div className={className} />
  }

  return (
    <motion.div
      className={className}
      animate={{
        x: [...motionProps.animate.x],
        y: [...motionProps.animate.y],
        scale: [...motionProps.animate.scale],
        opacity: [...motionProps.animate.opacity]
      }}
      transition={motionProps.transition}
    />
  )
}

export function WorkflowReasoningAmbient({ isLive }: WorkflowReasoningAmbientProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      initial={false}
      animate={{ opacity: isLive ? 1 : 0 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_85%_75%_at_50%_50%,#000_0%,#000_42%,transparent_100%)]">
        <ReasoningOrb color="red" reduceMotion={Boolean(reduceMotion)} />
        <ReasoningOrb color="blue" reduceMotion={Boolean(reduceMotion)} />
        <ReasoningOrb color="yellow" reduceMotion={Boolean(reduceMotion)} />
        <ReasoningOrb color="green" reduceMotion={Boolean(reduceMotion)} />
      </div>
    </motion.div>
  )
}
