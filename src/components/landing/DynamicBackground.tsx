'use client'

import { motion } from 'framer-motion'
import SpaceBackground from './SpaceBackground'
import { BinaryStream } from './BinaryStream'
import type { BackgroundTheme } from '../ui/BackgroundSwitcher'

interface DynamicBackgroundProps {
  theme: BackgroundTheme
}

export default function DynamicBackground({ theme }: DynamicBackgroundProps) {
  const renderBackground = () => {
    switch (theme) {
      case 'space':
        return <SpaceBackground />
      
      case 'black':
        return (
          <div className="fixed inset-0 -z-10 bg-black">
            <BinaryStream />
          </div>
        )
      
      case 'bright':
        return (
          <div className="fixed inset-0 -z-10">
            {/* Bright colorful gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
            
            {/* Animated color orbs */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(34,197,94,0.8) 0%, rgba(59,130,246,0.6) 50%, rgba(147,51,234,0.8) 100%)'
              }}
              animate={{
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-40"
              style={{
                background: 'radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(239,68,68,0.6) 50%, rgba(168,85,247,0.8) 100%)'
              }}
              animate={{
                scale: [1.2, 0.8, 1.2],
                x: [0, -40, 0],
                y: [0, 20, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <BinaryStream />
          </div>
        )
      
      case 'white':
        return (
          <div className="fixed inset-0 -z-10 bg-[#FAFBFF] overflow-hidden">
            <div className="absolute inset-0 z-[1] overflow-visible">
              <div className="absolute inset-0 z-[1] overflow-visible">
                <div className="absolute inset-0 z-[1] overflow-visible">
                  {/* Large radial gradient background - creates the main white glow effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                    w-[4000px] h-[4000px] bg-gradient-radial from-white via-white to-[#FDFDFF]
                    rounded-full opacity-100 mix-blend-normal
                    blur-[60px]" />
                
                  {/* Medium radial gradient - adds depth to the center */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                    w-[2400px] h-[2400px] bg-gradient-radial from-white via-white to-[#FFFFFF]
                    rounded-full opacity-95 mix-blend-normal
                    blur-[35px]" />
                
                  {/* Top gradient - creates soft light from above */}
                  <div className="absolute -top-[100px] left-1/2 -translate-x-1/2
                    w-[2400px] h-[1600px] bg-gradient-to-b from-white via-white/90 to-transparent
                    rounded-full opacity-90 mix-blend-normal
                    blur-[35px]" />
                
                  {/* Bottom gradient - creates soft light from below */}
                  <div className="absolute -bottom-[100px] left-1/2 -translate-x-1/2
                    w-[2400px] h-[1600px] bg-gradient-to-t from-[#FDFDFF]/90 via-white/90 to-transparent
                    rounded-full opacity-90 mix-blend-normal
                    blur-[35px]" />

                  {/* Additional highlight areas */}
                  <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-[1200px] h-[1200px] 
                      bg-gradient-radial from-white/30 to-transparent
                      rounded-full opacity-60 mix-blend-overlay blur-[40px]" />
                  
                    <div className="absolute bottom-0 right-1/4 w-[1000px] h-[1000px] 
                      bg-gradient-radial from-white/30 to-transparent
                      rounded-full opacity-50 mix-blend-overlay blur-[40px]" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Binary stream with dark text for white background - kept in background */}
            <div className="absolute inset-0 overflow-hidden z-[-1]">
              {[...Array(3)].map((_, index) => (
                <div
                  key={`stream-${index}`}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${index * 30}%`,
                    width: '400px',
                    overflow: 'hidden',
                    opacity: 0.04, // Reduced opacity to be more subtle
                  }}
                >
                  <motion.div
                    className="absolute top-0 w-full"
                    initial={{ y: 0 }}
                    animate={{ y: '-100%' }}
                    transition={{
                      duration: 120,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="font-mono whitespace-pre relative"
                        style={{
                          fontSize: '12px',
                          lineHeight: '3',
                          color: 'rgba(0, 0, 0, 0.4)',
                        }}
                      >
                        [ SYSTEM_ACTIVE ] [ NEURAL_SYNC ] [ QUANTUM_READY ]
                      </div>
                    ))}
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        )
      
      default:
        return <SpaceBackground />
    }
  }

  return (
    <motion.div
      key={theme}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {renderBackground()}
      
      {/* Universal Spectrum Glow (One's symbol) - visible in all backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center">
        <motion.div 
          className="relative w-64 h-64 md:w-80 md:h-80"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Simplified spectrum glow - only outer glow and inner two layers */}
          <div className={`absolute inset-0 rounded-full shadow-[0_0_100px_40px] ${theme === 'white' ? 'shadow-blue-400/30' : 'shadow-blue-500/30'}`}></div>
          
          <div className={`absolute inset-0 rounded-full ${theme === 'white' ? 'bg-gradient-to-r from-blue-400/40 via-purple-400/40 to-pink-400/40' : 'bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40'}`}></div>
          
          <div className={`absolute inset-4 rounded-full ${theme === 'white' ? 'bg-gradient-to-br from-purple-400/30 via-cyan-400/20 to-transparent' : 'bg-gradient-to-br from-purple-500/30 via-cyan-500/20 to-transparent'}`}></div>
        </motion.div>
      </div>
    </motion.div>
  )
}
