'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type BackgroundTheme = 'space' | 'black' | 'bright' | 'white' | 'rainbow'

interface BackgroundSwitcherProps {
  currentTheme: BackgroundTheme
  onThemeChange: (theme: BackgroundTheme) => void
}

const themes = [
  { id: 'white' as const, name: 'White', color: '#ffffff' },
  { id: 'black' as const, name: 'Black', color: '#000000' },
  { id: 'space' as const, name: 'Space', color: '#1e293b' },
  { id: 'bright' as const, name: 'Retro', color: '#c0c0c0' },
  { id: 'rainbow' as const, name: 'Rainbow', color: 'linear-gradient(45deg, #4F7CFF, #87C2FF, #BFFFBF, #FFFF7F, #FFBF5F, #FF9F7F)' }
]

export default function BackgroundSwitcher({ currentTheme, onThemeChange }: BackgroundSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed top-4 right-4 z-50">
      <motion.button
        className={`w-8 h-8 rounded-full ${currentTheme === 'white' ? 'bg-gray-200/80 border-gray-300' : 'bg-white/10 border-white/20'} backdrop-blur-md border flex items-center justify-center shadow-lg`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="w-4 h-4 rounded-full overflow-hidden relative">
          <div 
            className="absolute inset-0 rounded-full" 
            style={{ 
              background: `conic-gradient(
                ${themes[0].color} 0%, 
                ${themes[0].color} 25%, 
                ${themes[1].color} 25%, 
                ${themes[1].color} 50%, 
                ${themes[2].color} 50%, 
                ${themes[2].color} 75%, 
                ${themes[3].color} 75%, 
                ${themes[3].color} 100%
              )`,
              transform: 'rotate(45deg)'
            }}
          />
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute top-10 right-0 ${currentTheme === 'white' ? 'bg-gray-100/90 border-gray-300' : 'bg-white/10 border-white/20'} backdrop-blur-md border rounded-xl p-1.5 min-w-[100px] shadow-xl`}
          >
            {themes.map((theme) => (
              <motion.button
                key={theme.id}
                onClick={() => {
                  onThemeChange(theme.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs font-light transition-all ${
                  currentTheme === theme.id
                    ? currentTheme === 'white' 
                      ? 'bg-gray-200/80 text-black' 
                      : 'bg-white/20 text-white'
                    : currentTheme === 'white' 
                      ? 'text-gray-700 hover:bg-gray-200/50 hover:text-black' 
                      : 'text-white hover:bg-white/10 hover:text-white'
                }`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-3 h-3 rounded-full shadow-inner"
                  style={{
                    background: theme.id === 'rainbow' 
                      ? 'linear-gradient(45deg, #4F7CFF, #87C2FF, #BFFFBF, #FFFF7F, #FFBF5F, #FF9F7F)'
                      : theme.color
                  }}
                />
                <span>{theme.name}</span>
              </motion.button>
            ))}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
