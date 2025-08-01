'use client'

import { motion } from 'framer-motion'
import SpaceBackground from './SpaceBackground'
import BinaryStream from './BinaryStream'
import type { BackgroundTheme } from '../ui/BackgroundSwitcher'

interface DynamicBackgroundProps {
  theme: BackgroundTheme
  isVoiceMode?: boolean
  isListening?: boolean
  isAISpeaking?: boolean
  isMuted?: boolean
  streamingMessage?: string
  onOrbClick?: () => void
  onExitVoiceMode?: () => void
  onToggleMute?: () => void
}

export default function DynamicBackground({ 
  theme, 
  isVoiceMode = false, 
  isListening = false, 
  isAISpeaking = false, 
  isMuted = false,
  streamingMessage = '',
  onOrbClick,
  onExitVoiceMode,
  onToggleMute 
}: DynamicBackgroundProps) {

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
      <div className={`fixed inset-0 flex items-center justify-center z-10 ${
        isVoiceMode ? 'pointer-events-auto' : 'pointer-events-none'
      }`}>
        <motion.div 
          className={`relative cursor-pointer ${
            isVoiceMode ? 'w-48 h-48 md:w-56 md:h-56' : 'w-64 h-64 md:w-80 md:h-80'
          }`}
          animate={{
            scale: isVoiceMode && isAISpeaking 
              ? [1, 1.15, 1.1, 1.2, 1] // Large animation when AI is speaking
              : isVoiceMode
              ? [1, 1.02, 1] // Subtle animation when in Voice Mode (listening or idle)
              : [1, 1.05, 1], // Default animation when not in Voice Mode
          }}
          transition={{
            duration: isVoiceMode && isAISpeaking 
              ? 0.8 // Faster animation for AI speaking
              : isVoiceMode
              ? 3.0 // Slow, gentle animation for Voice Mode
              : 4.0, // Slowest for default state
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={isVoiceMode ? { scale: 1.1 } : {}}
          whileTap={isVoiceMode ? { 
            scale: [1, 1.2, 0.95],
            transition: { duration: 0.3 }
          } : {}}
          onClick={onOrbClick}
          style={{ outline: 'none' }}
        >
          {/* Simplified spectrum glow - only outer glow and inner two layers */}
          <div className={`absolute inset-0 rounded-full shadow-[0_0_100px_40px] ${theme === 'white' ? 'shadow-blue-400/30' : 'shadow-blue-500/30'}`}></div>
          
          <div className={`absolute inset-0 rounded-full ${theme === 'white' ? 'bg-gradient-to-r from-blue-400/40 via-purple-400/40 to-pink-400/40' : 'bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40'}`}></div>
          
          <div className={`absolute inset-4 rounded-full ${theme === 'white' ? 'bg-gradient-to-br from-purple-400/30 via-cyan-400/20 to-transparent' : 'bg-gradient-to-br from-purple-500/30 via-cyan-500/20 to-transparent'}`}></div>
          
          {/* Voice Mode Listening Rings - Green pulsing rings */}
          {isVoiceMode && isListening && !isAISpeaking && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-400/60"
                animate={{ scale: [1, 1.3, 1.6], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-green-300/40"
                animate={{ scale: [1, 1.5, 2.0], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
            </>
          )}
          
          {/* AI Speaking Rings - Purple/blue dynamic rings */}
          {isVoiceMode && isAISpeaking && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-3 border-purple-400/70"
                animate={{ 
                  scale: [1, 1.4, 1.2, 1.6, 1], 
                  opacity: [0.9, 0.6, 0.8, 0.4, 0.9],
                  rotate: [0, 90, 180, 270, 360]
                }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-400/50"
                animate={{ 
                  scale: [1, 1.8, 1.3, 2.0, 1], 
                  opacity: [0.7, 0.3, 0.6, 0.2, 0.7],
                  rotate: [360, 270, 180, 90, 0]
                }}
                transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-pink-400/40"
                animate={{ 
                  scale: [1, 1.6, 1.9, 1.2, 1], 
                  opacity: [0.5, 0.8, 0.2, 0.6, 0.5]
                }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
            </>
          )}
        </motion.div>
        
        {/* Voice Mode - No text labels, clean UI */}
      </div>
      

      
      {/* Voice Mode Controls - Bottom center, completely independent positioning */}
      {isVoiceMode && (
        <motion.div
          className="fixed inset-x-0 bottom-20 flex items-center justify-center z-[10000]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-4">
            {/* Mute Button */}
            <motion.button
              className={`w-14 h-14 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg flex items-center justify-center ${
                isMuted
                  ? (theme === 'white' 
                    ? 'bg-red-100/80 text-red-800 border border-red-200/50 hover:bg-red-200/90'
                    : 'bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30')
                  : (theme === 'white'
                    ? 'bg-white/80 text-gray-800 border border-gray-200/50 hover:bg-white/90'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20')
              }`}
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleMute && onToggleMute()}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              )}
            </motion.button>
            
            {/* Exit Voice Mode Button */}
            <motion.button
              className={`w-14 h-14 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg flex items-center justify-center ${
                theme === 'white'
                  ? 'bg-white/80 text-gray-800 border border-gray-200/50 hover:bg-white/90'
                  : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
              }`}
              whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onExitVoiceMode && onExitVoiceMode()}
              title="Exit Voice Mode"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
