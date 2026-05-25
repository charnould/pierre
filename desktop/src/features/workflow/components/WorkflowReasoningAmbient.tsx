import { motion, useReducedMotion } from 'motion/react'

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

function ReasoningOrb({ color, static: isStatic }: { color: OrbColor; static?: boolean }) {
  const motionProps = ORB_MOTION[color]

  if (isStatic) {
    return (
      <div
        className={`workflow-reasoning-ambient__orb workflow-reasoning-ambient__orb--${color}`}
      />
    )
  }

  return (
    <motion.div
      className={`workflow-reasoning-ambient__orb workflow-reasoning-ambient__orb--${color}`}
      animate={motionProps.animate}
      transition={motionProps.transition}
    />
  )
}

export function WorkflowReasoningAmbient({ isLive }: WorkflowReasoningAmbientProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      aria-hidden
      className="workflow-reasoning-ambient"
      initial={false}
      animate={{ opacity: isLive ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="workflow-reasoning-ambient__stage">
        <ReasoningOrb color="red" static={reduceMotion ?? false} />
        <ReasoningOrb color="blue" static={reduceMotion ?? false} />
        <ReasoningOrb color="yellow" static={reduceMotion ?? false} />
        <ReasoningOrb color="green" static={reduceMotion ?? false} />
      </div>
    </motion.div>
  )
}
