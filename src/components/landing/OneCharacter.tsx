'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'

interface OneCharacterProps {
  onClick?: () => void
  hidden?: boolean // Add hidden prop
}

export default function OneCharacter({ onClick, hidden = false }: OneCharacterProps) {
  const { isOnboardingActive } = useAppStore()

  // If hidden is true, don't render the character
  if (hidden) {
    return null
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Main One Character - Elegant pulsing circle inspired by "Her" */}
      <motion.div
        className="relative cursor-pointer group z-10"
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
        role="button"
        aria-label="Click to interact with One"
      >
        {/* Click hint animation - subtle pulsing border */}
        <motion.div
          className="absolute -inset-4 rounded-full border border-white/40"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2, // Start after initial animations
          }}
        />

        {/* Outer glow effect - subtle and elegant */}
        <motion.div
          className="absolute -inset-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 80%)',
            filter: 'blur(25px)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Main circle - elegant and simple */}
        <motion.div
          className="relative w-32 h-32 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 rounded-full"
          animate={{
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Inner glow effect - subtle highlight */}
          <motion.div
            className="absolute inset-1 bg-gradient-to-tr from-white/20 to-transparent rounded-full"
            animate={{
              opacity: [0.5, 0.7, 0.5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Central glow - inspired by "Her" movie */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              className="w-16 h-16 bg-white/10 rounded-full blur-sm"
              animate={{
                scale: [0.8, 1.1, 0.8],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>

          {/* Subtle light points - minimalist design */}
          <svg className="absolute inset-0 w-full h-full">
            <motion.circle
              cx="50%"
              cy="35%"
              r="1"
              fill="rgba(255,255,255,0.8)"
              animate={{
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0,
              }}
            />
            <motion.circle
              cx="65%"
              cy="50%"
              r="1"
              fill="rgba(255,255,255,0.8)"
              animate={{
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.7,
              }}
            />
            <motion.circle
              cx="35%"
              cy="65%"
              r="1"
              fill="rgba(255,255,255,0.8)"
              animate={{
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 1.4,
              }}
            />
          </svg>
        </motion.div>

        {/* Floating particles around One */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: [0, Math.cos(i * Math.PI / 4) * 60, 0],
              y: [0, Math.sin(i * Math.PI / 4) * 60, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>

      {/* Interactive hint - appears only when not in onboarding */}
      {/* Removed upward arrow icon as requested */}
    </div>
  )
}
