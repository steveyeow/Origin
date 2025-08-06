'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Mic } from 'lucide-react'
import { useThemeContext } from '@/context/ThemeContext'

interface ModeSelectorProps {
  onSelectMode: (mode: 'chat' | 'voice') => void
  className?: string
}

export default function ModeSelector({ onSelectMode, className = '' }: ModeSelectorProps) {
  const { theme } = useThemeContext()

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center space-y-8 ${className} ${
      theme === 'white' 
        ? 'bg-gradient-to-br from-gray-50 to-white' 
        : 'bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900'
    }`}>
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-xl">
        {/* Chat Mode */}
        <motion.button
          className={`flex-1 p-6 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
            theme === 'white'
              ? 'bg-white/60 border-gray-200/30 hover:bg-white/80 hover:border-blue-300/50'
              : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-blue-400/50'
          }`}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectMode('chat')}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              theme === 'white'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              <MessageCircle size={24} />
            </div>
            <h3 className={`text-lg font-semibold ${
              theme === 'white' ? 'text-gray-800' : 'text-white'
            }`}>
              Chat Mode
            </h3>
          </div>
        </motion.button>

        {/* Voice Mode */}
        <motion.button
          className={`flex-1 p-6 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
            theme === 'white'
              ? 'bg-white/60 border-gray-200/30 hover:bg-white/80 hover:border-purple-300/50'
              : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-purple-400/50'
          }`}
          whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectMode('voice')}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              theme === 'white'
                ? 'bg-purple-100 text-purple-600'
                : 'bg-purple-500/20 text-purple-400'
            }`}>
              <Mic size={24} />
            </div>
            <h3 className={`text-lg font-semibold ${
              theme === 'white' ? 'text-gray-800' : 'text-white'
            }`}>
              Voice Mode
            </h3>
          </div>
        </motion.button>
      </div>
    </div>
  )
}
