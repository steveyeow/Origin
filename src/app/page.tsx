'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useEngine } from '@/hooks/useEngine'
import DynamicBackground from '@/components/landing/DynamicBackground'
import OneCharacter from '@/components/landing/OneCharacter'
import ConversationFlow from '@/components/conversation/ConversationFlow'
import BackgroundSwitcher, { BackgroundTheme } from '@/components/ui/BackgroundSwitcher'
import { useThemeContext } from '@/context/ThemeContext'
import TypewriterText from '@/components/ui/TypewriterText'

export default function Home() {
  const { isOnboardingActive, setOnboardingActive, setCurrentStep, messages } = useAppStore()
  const { initializeUser, startOnboarding, isLoading } = useEngine()
  const { theme, setTheme } = useThemeContext()
  const userId = 'user-123' // This would come from auth in a real app
  const [userIdState] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [showInitialGreeting, setShowInitialGreeting] = useState(true)
  const [showPreviewMode, setShowPreviewMode] = useState(false)
  const [showGreetingBox, setShowGreetingBox] = useState(false)
  const [greetingComplete, setGreetingComplete] = useState(false)
  
  // Initialize user when component mounts
  useEffect(() => {
    const initUser = async () => {
      try {
        await initializeUser(userIdState)
        // Show initial greeting in center of page
        setShowInitialGreeting(true)
        
        // Show greeting box after a delay (3 seconds)
        setTimeout(() => {
          setShowGreetingBox(true)
        }, 3000) // 3 second delay before showing the greeting box

        // Set greeting complete after all typewriter animations finish
        // Last typewriter delay (6000) + text length * speed (30) + buffer (1000)
        const lastTextLength = "Can you give me a name you like?".length;
        const totalAnimationTime = 6000 + (lastTextLength * 30) + 1000;
        
        setTimeout(() => {
          setGreetingComplete(true)
        }, totalAnimationTime)
      } catch (error) {
        console.error('Failed to initialize user:', error)
      }
    }
    
    initUser()
  }, [userIdState, initializeUser])
  
  // Handle One click to start conversation
  const handleOneClick = async () => {
    if (!isOnboardingActive) {
      setShowInitialGreeting(false)
      try {
        setOnboardingActive(true)
        setCurrentStep('naming-one')
        await startOnboarding(userId)
      } catch (error) {
        console.error('Failed to start onboarding:', error)
      }
    }
  }
  
  // Auto-enable preview mode only when actual preview content is generated
  useEffect(() => {
    // This would be triggered when actual content is generated (audio/video/images)
    // For now, we'll keep this disabled until explicitly triggered
    const checkForPreviewContent = () => {
      // In a real implementation, we would check for actual content types
      // that require preview mode (e.g., images, videos, etc.)
      // For now, we'll disable the automatic trigger
      
      // Example of how it would work with actual content:
      // if (messages.some(msg => msg.hasPreviewContent)) {
      //   setShowPreviewMode(true);
      // }
    };
    
    checkForPreviewContent();
  }, [isOnboardingActive, messages]);

  // Define dynamic text colors based on background theme
  const getTitleColor = () => {
    switch(theme) {
      case 'white': return 'text-blue-600';
      case 'black': return 'text-blue-300';
      case 'bright': return 'text-white';
      default: return 'text-blue-400';
    }
  };
  
  const getSubtitleColor = () => {
    switch(theme) {
      case 'white': return 'text-gray-600';
      case 'black': return 'text-gray-300';
      case 'bright': return 'text-white/90';
      default: return 'text-gray-300';
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <DynamicBackground theme={theme} />
      <BackgroundSwitcher 
        currentTheme={theme} 
        onThemeChange={setTheme} 
      />
      
      {/* Initial centered greeting */}
      {showInitialGreeting && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <motion.div 
            className="max-w-lg text-center px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="relative mb-8"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <OneCharacter onClick={handleOneClick} />
            </motion.div>
            
            {showGreetingBox && (
              <motion.div
                className={`backdrop-blur-md border p-6 rounded-2xl shadow-lg ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  boxShadow: ['0 4px 20px rgba(139, 92, 246, 0.3)', '0 4px 30px rgba(59, 130, 246, 0.4)', '0 4px 20px rgba(139, 92, 246, 0.3)'],
                }}
                transition={{
                  opacity: { duration: 0.5 },
                  y: { duration: 0.5 },
                  boxShadow: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
              >
              <div className={`text-left text-lg md:text-xl leading-relaxed space-y-4 ${theme === 'white' ? 'text-black' : 'text-white'}`}>
                <div>
                  <TypewriterText 
                    text="Hi traveler, welcome to Origin"
                    speed={30}
                    startDelay={3000}
                    style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                  />
                </div>
                <div>
                  <TypewriterText 
                    text="Your generative universe"
                    speed={30}
                    startDelay={4000}
                    style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                  />
                </div>
                <div>
                  <TypewriterText 
                    text="Thinks, feels, creates with you."
                    speed={30}
                    startDelay={5000}
                    style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                  />
                </div>
                <div>
                  <TypewriterText 
                    text="I'm One, your navigator."
                    speed={30}
                    startDelay={6000}
                    style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                  />
                </div>
                <div>
                  <TypewriterText 
                    text="Can you give me a name you like?"
                    speed={30}
                    startDelay={7000}
                    style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                  />
                </div>
              </div>
            </motion.div>
            )}
            
            {greetingComplete && (
              <motion.button
                className={`mt-12 backdrop-blur-md border px-10 py-4 rounded-2xl shadow-lg font-medium transition-all duration-300 ${
                  theme === 'white' 
                    ? 'bg-blue-100/50 border-blue-200/50 text-blue-900 hover:bg-blue-100/70' 
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                }`}
                whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOneClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <span>Start Exploration</span>
              </motion.button>
            )}
          </motion.div>
        </div>
      )}
      
      {/* Conversation UI */}
      {isOnboardingActive && (
        <div className={`transition-all duration-500 ${showPreviewMode ? 'w-1/3 border-r border-white/10' : 'w-full'}`}>
          <div className="relative h-screen flex justify-center">
            <ConversationFlow className="h-screen max-w-4xl w-full" />
          </div>
        </div>
      )}
      
      {/* Preview area */}
      {isOnboardingActive && showPreviewMode && (
        <div className="w-2/3 h-screen absolute top-0 right-0 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-medium mb-4 text-white">Content Preview Area</h2>
            <p className="text-white/70">Generated content will appear here</p>
          </div>
        </div>
      )}
      
      {/* Landing page with centered One character */}
      {!isOnboardingActive && !showInitialGreeting && (
        <div className="h-screen flex items-center justify-center px-6">
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Voice interaction indicator - subtle pulsing ring */}
            <motion.div 
              className="absolute -inset-4 rounded-full border-2 border-blue-400/30 z-0"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* One character */}
            <OneCharacter onClick={handleOneClick} />
          </motion.div>
        </div>
      )}
    </main>
  )
}
