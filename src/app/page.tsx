'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useEngine } from '@/hooks/useEngine'
import DynamicBackground from '@/components/landing/DynamicBackground'
import OneCharacter from '@/components/landing/OneCharacter'
import ConversationFlow from '@/components/conversation/ConversationFlow'
import BackgroundSwitcher, { BackgroundTheme } from '@/components/ui/BackgroundSwitcher'
import { useThemeContext } from '@/context/ThemeContext'
import TypewriterText from '@/components/ui/TypewriterText'
import { ElevenLabsService, VOICE_PRESETS, DEFAULT_ONE_VOICE_CONFIG } from '@/services/voice/elevenlabs-service'
import ModeSelector from '@/components/ui/ModeSelector'
import { useAuth } from '@/components/auth/AuthProvider'

export default function Home() {
  console.log('🏠 HOME: Component rendering started')
  
  const { isOnboardingActive, setOnboardingActive, setCurrentStep, messages } = useAppStore()
  const { initializeUser, startOnboarding, isLoading } = useEngine()
  const { theme, setTheme } = useThemeContext()
  const { user, isAuthenticated, login } = useAuth()
  
  console.log('🏠 HOME: Initial state after hooks:', {
    isOnboardingActive,
    isLoading
  })
  const userId = 'user-123' // This would come from auth in a real app
  const [userIdState] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [showInitialGreeting, setShowInitialGreeting] = useState(true)
  const [showPreviewMode, setShowPreviewMode] = useState(false)
  const [showGreetingBox, setShowGreetingBox] = useState(false)
  const [greetingComplete, setGreetingComplete] = useState(false)
  const greetingCompleteRef = useRef(false)
  
  // Voice Mode states - Start in normal mode, not Voice Mode
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [voiceService, setVoiceService] = useState<ElevenLabsService | null>(null)
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false)
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const conversationFlowRef = useRef<any>(null)
  
  // Initialize user when component mounts
  useEffect(() => {
    const initUser = async () => {
      try {
        await initializeUser(userIdState)
        
        // Skip greeting if onboarding is already active (coming from mode selector)
        if (isOnboardingActive) {
          console.log('🚀 Onboarding already active, skipping greeting')
          setShowInitialGreeting(false)
          setGreetingComplete(true)
          greetingCompleteRef.current = true
          return
        }
        
        // Show initial greeting in center of page
        setShowInitialGreeting(true)
        
        // Show greeting box after a delay (3 seconds)
        setTimeout(() => {
          setShowGreetingBox(true)
        }, 3000) // 3 second delay before showing the greeting box

        // Set greeting complete after all typewriter animations finish
        // Last typewriter delay (7000) + text length * speed (30) + buffer (500)
        const lastTextLength = "Would you like to give me a new name?".length;
        const totalAnimationTime = 7000 + (lastTextLength * 30) + 500;
        
        setTimeout(() => {
          setGreetingComplete(true)
          greetingCompleteRef.current = true
          // Keep showInitialGreeting true so Start Exploration button can show
          console.log('✅ Greeting complete set to true, ready for Start Exploration')
        }, totalAnimationTime)
      } catch (error) {
        console.error('Failed to initialize user:', error)
      }
    }
    
    initUser()
  }, [userIdState, initializeUser, isOnboardingActive])
  
  // Initialize voice service for welcome message and Voice Mode
  useEffect(() => {
    const initVoiceService = async () => {
      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || VOICE_PRESETS.PROFESSIONAL
      
      console.log('🔊 Initializing voice service:', {
        hasApiKey: !!apiKey,
        voiceId,
        currentVoiceService: !!voiceService
      })
      
      if (apiKey && !voiceService) {
        try {
          const service = new ElevenLabsService({
            apiKey,
            voiceId,
            ...DEFAULT_ONE_VOICE_CONFIG
          })
          setVoiceService(service)
          console.log('✅ Voice service initialized successfully')
          
          // Play welcome message after a delay
          if (showGreetingBox && !hasPlayedWelcome) {
            setTimeout(async () => {
              try {
                const welcomeText = "Hi traveler, welcome to Origin, your generative universe that thinks, feels, creates with you. I'm One, your navigator. Would you like to give me a new name?"
                await service.speakText(welcomeText)
                setHasPlayedWelcome(true)
                console.log('✅ Welcome message played successfully')
              } catch (error) {
                console.error('❌ Failed to play welcome message:', error)
              }
            }, 3500) // Start after first line appears
          }
        } catch (error) {
          console.error('❌ Failed to initialize voice service:', error)
        }
      } else if (!apiKey) {
        console.warn('⚠️ ElevenLabs API key not found in environment variables')
      } else if (voiceService) {
        console.log('ℹ️ Voice service already initialized')
      }
    }
    
    // Initialize voice service for welcome message
    initVoiceService()
  }, [showGreetingBox, hasPlayedWelcome, voiceService])
  
  // Voice mode is now set directly via handleModeSelection - no sessionStorage needed
  
  // Check for stored mode after login
  useEffect(() => {
    if (isAuthenticated && !isOnboardingActive) {
      const storedMode = sessionStorage.getItem('selectedMode')
      console.log('🔍 Checking for stored mode after login:', {
        isAuthenticated,
        storedMode,
        isOnboardingActive
      })
      
      if (storedMode && (storedMode === 'chat' || storedMode === 'voice')) {
        console.log('🎯 Found stored mode after login:', storedMode)
        startConversationWithMode(storedMode as 'chat' | 'voice')
      }
    }
  }, [isAuthenticated, isOnboardingActive])
  
  // Handle One click to start conversation
  const handleOneClick = () => {
    console.log('👁️ One clicked - showing mode selector')
    setShowModeSelector(true)
    setShowInitialGreeting(false)
  }
  
  const handleModeSelection = (mode: 'chat' | 'voice') => {
    console.log('🎯 Mode selected:', mode)
    
    // Store selected mode for after login
    sessionStorage.setItem('selectedMode', mode)
    console.log('💾 Stored selected mode in sessionStorage:', mode)
    
    // Check if user is already authenticated
    if (isAuthenticated) {
      console.log('✅ User already authenticated - starting conversation')
      startConversationWithMode(mode)
    } else {
      console.log('🚀 User not authenticated - starting Auth0 login')
      // Trigger Auth0 login - user will return after authentication
      login()
    }
  }
  
  // Start conversation with selected mode
  const startConversationWithMode = (mode: 'chat' | 'voice') => {
    console.log('🚀 Starting conversation with mode:', mode)
    
    // Set voice mode state
    if (mode === 'voice') {
      setIsVoiceMode(true)
      console.log('🎤 Voice mode activated')
    } else {
      setIsVoiceMode(false)
      console.log('💬 Chat mode activated')
    }
    
    // Start onboarding flow
    setOnboardingActive(true)
    setCurrentStep('naming-one')
    setShowModeSelector(false)
    
    // Clear stored mode
    sessionStorage.removeItem('selectedMode')
    console.log('🗑️ Cleared selectedMode from sessionStorage')
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
      <DynamicBackground 
        theme={theme} 
        isVoiceMode={isVoiceMode}
        isListening={isListening}
        isAISpeaking={isAISpeaking}
        isMuted={isMuted}
        streamingMessage={streamingMessage}
        onOrbClick={() => {
          // SIMPLIFIED: Remove Voice Mode toggle from Orb
          // Orb now only serves as visual indicator
          console.log('🎤 Orb clicked - visual feedback only')
        }}
        // Voice Mode controls are now handled by ConversationFlow
        onExitVoiceMode={() => {}}
        onToggleMute={() => {}}
      />
      <BackgroundSwitcher 
        currentTheme={theme} 
        onThemeChange={setTheme} 
      />
      
      {/* Initial centered greeting - only show when onboarding is not active */}
      {showInitialGreeting && !isOnboardingActive && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <motion.div 
            className="max-w-lg text-center px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="relative mb-8 z-30"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <OneCharacter onClick={handleOneClick} hidden={true} />
            </motion.div>
            
            {showGreetingBox && (
              <motion.div
                className="text-center cursor-pointer outline-none"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                }}
                transition={{
                  opacity: { duration: 0.5 },
                  y: { duration: 0.5 },
                }}
                onClick={handleOneClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOneClick()
                  }
                }}
                title="Click to start Exploration"
                style={{ outline: 'none' }}
              >
                <div className={`text-lg md:text-xl leading-relaxed space-y-4 ${theme === 'white' ? 'text-black' : 'text-white'}`}>
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
                      text="your generative universe"
                      speed={30}
                      startDelay={4000}
                      style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                    />
                  </div>
                  <div>
                    <TypewriterText 
                      text="thinks, feels, creates with you."
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
                      text="Would you like to give me a new name?"
                      speed={30}
                      startDelay={7000}
                      style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                    />
                  </div>
                </div>
                
                {/* Pulsing indicator - Pale Blue Dot */}
                <motion.div
                  className="mt-12 flex justify-center" // 增加与打招呼文案的距离
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 9000, duration: 1 }}
                  key={`pale-blue-dot-${theme}`} // 添加key防止主题切换时重新动画
                >
                  <motion.div
                    className={`w-1 h-1 rounded-full ${theme === 'white' ? 'bg-blue-500/40' : 'bg-blue-300/60'}`} // 更小的尺寸和更透明的效果
                    animate={{
                      scale: [1, 1.2, 1], // 更微妙的脉冲
                      opacity: [0.3, 0.7, 0.3], // 更淡的透明度范围
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
                
                {/* Subtle hint */}
                <motion.div
                  className="text-sm opacity-60"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 9000, duration: 1 }}
                  key={`start-exploration-${theme}`} // Add key to prevent animation reset on theme change
                >
                  <span className={`${theme === 'white' ? 'text-gray-600' : 'text-white/80'}`}>
                    Start Exploration
                  </span>
                </motion.div>
              </motion.div>
            )}
            

          </motion.div>
        </div>
      )}
      
      {/* Conversation UI */}
      {isOnboardingActive && (
        <div className={`transition-all duration-500 ${showPreviewMode ? 'w-1/3 border-r border-white/10' : 'w-full'}`}>
          <div className="relative h-screen flex justify-center">
            {/* DEBUG: Voice service passing */}
            {(() => {
              console.log('🔊 Passing props to ConversationFlow:', {
                voiceService: !!voiceService,
                voiceServiceType: voiceService?.constructor?.name,
                initialVoiceMode: isVoiceMode,
                isMuted,
                timestamp: new Date().toISOString()
              })
              return null
            })()}
            <ConversationFlow 
              className="h-screen max-w-4xl w-full"
              isMuted={isMuted}
              voiceService={voiceService ?? undefined}
              initialVoiceMode={isVoiceMode}
              skipInitialGreeting={showInitialGreeting} // Skip if page-level greeting is shown
              onVoiceModeChange={(newIsVoiceMode) => {
                // Update parent state for DynamicBackground visual effects
                setIsVoiceMode(newIsVoiceMode)
                if (!newIsVoiceMode) {
                  // Clean up when exiting Voice Mode
                  setIsListening(false)
                  setIsAISpeaking(false)
                  setStreamingMessage('')
                }
              }}
            />
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
      
      {/* Mode Selector */}
      {showModeSelector && (
        <ModeSelector onModeSelect={handleModeSelection} />
      )}
      
      {/* Landing page with centered One character */}
      {!isOnboardingActive && !showInitialGreeting && !showModeSelector && (
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
            <OneCharacter onClick={handleOneClick} hidden={false} />
          </motion.div>
        </div>
      )}
    </main>
  )
}
