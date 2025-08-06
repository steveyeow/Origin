/**
 * CONVERSATION FLOW - MAIN UI COMPONENT
 * 
 * PURPOSE: Primary user interface for conversation interactions
 * RESPONSIBILITY: UI state management, voice/chat modes, message display, user input handling
 * 
 * KEY FUNCTIONS:
 * - Message Management: Displays conversation history and handles new messages
 * - Voice Mode: Speech recognition, voice synthesis, and voice UI controls
 * - Chat Mode: Text input, message bubbles, and typing indicators
 * - Engine Integration: Communicates with OriginEngine for AI responses
 * - State Synchronization: Manages complex state between parent components
 * 
 * INTERACTION MODES:
 * - Chat Mode: Traditional text-based conversation interface
 * - Voice Mode: Hands-free voice conversation with visual feedback
 * 
 * USAGE: Used by main page and conversation page as the primary conversation interface
 * DEPENDENCIES: OriginEngine, Auth, Subscription, Voice services, UI components
 */

'use client'

// Speech Recognition types and SVG path type fixes
declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
    __GREETING_IN_PROGRESS?: boolean
    [key: string]: any // Allow dynamic properties for voice processing flags
  }
}

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Paperclip, Send, User, Brain, Sparkles } from 'lucide-react'
import { InteractiveScenarioLayer } from '../../engine/layers/interactive-scenario'
import { useAppStore } from '@/store/useAppStore'
import { useSubscriptionStore } from '@/store/useSubscriptionStore'
import { useAuth } from '@/components/auth/AuthProvider'
import { useThemeContext } from '@/context/ThemeContext'
import TypewriterText from '@/components/ui/TypewriterText'
import ImageDisplay from '@/components/ui/ImageDisplay'
import UpgradeModal from '@/components/subscription/UpgradeModal'
import { originEngine, unifiedInvocation } from '@/engine'
import { ElevenLabsService, DEFAULT_ONE_VOICE_CONFIG, VOICE_PRESETS } from '@/services/voice/elevenlabs-service'
import type { UserContext, Scenario, Capability } from '@/types/engine'
import type { MessageContent } from '@/store/useAppStore'

// Custom SVG path component to fix TypeScript errors
// Using a non-null assertion to handle potential undefined values
const SVGPath = ({ d, ...props }: { d: string | undefined } & React.SVGProps<SVGPathElement>) => {
  return <path d={d || ''} {...props} />
}

// Debug helper to log both to console and terminal
const debugLog = (message: string, data?: any) => {
  console.log(message, data || '')
  // Also send to terminal via fetch (non-blocking)
  if (typeof window !== 'undefined') {
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, data })
    }).catch(() => {}) // Ignore errors
  }
}

interface ConversationFlowProps {
  className?: string
  isMuted?: boolean
  voiceService?: ElevenLabsService
  initialVoiceMode?: boolean
  // Flag to skip the initial greeting message (default: false)
  skipInitialGreeting?: boolean
  // Callback to notify parent of Voice Mode changes
  onVoiceModeChange?: (isVoiceMode: boolean) => void
}

// Define response type for better type checking
interface EnhancedEngineResponse {
  content: string;
  followUp: string | null;
  scenario?: Scenario | undefined;
  capabilities?: Capability[] | undefined;
  capabilityResponse: {
    type: string;
    result: any;
    cost: number;
  } | null;
  requestId: string;
  thinkingProcess: string;
  // Add nextStep property to match engine response
  nextStep?: 'landing' | 'naming-one' | 'naming-user' | 'scenario' | 'completed';
}

// ARCHITECTURE FIX: Remove direct OpenAI service instantiation
// All LLM interactions should go through the Engine

// REMOVED: Duplicate createUserContext function
// STATE MANAGEMENT FIX: Use ISL's createUserContext instead to maintain single source of truth
// Access via: originEngine.getScenarioLayer().createUserContext(userId)
// This prevents state conflicts between UI and engine layers

export default function ConversationFlow({ 
  className = '',
  isMuted = false,
  voiceService,
  initialVoiceMode = false,
  skipInitialGreeting = false,
  onVoiceModeChange
}: ConversationFlowProps) {
  // CRITICAL DEBUG: Check props at component start
  console.log('🚀 ConversationFlow component started with props:', {
    className,
    isMuted,
    voiceService: !!voiceService,
    voiceServiceType: voiceService?.constructor?.name,
    initialVoiceMode,
    onVoiceModeChange: !!onVoiceModeChange
  })
  
  // Get theme context for adaptive colors
  const { theme, getTextColor } = useThemeContext();
  const {
    currentStep,
    setCurrentStep,
    user,
    setUser,
    messages,
    addMessage,
    setOnboardingActive
  } = useAppStore()
  
  // Auth and subscription state
  const { user: authUser, canUseVoice, getVoiceCredits } = useAuth()
  const { 
    canUseVoice: subscriptionCanUseVoice, 
    incrementVoiceUsage, 
    setShowUpgradeModal,
    getRemainingVoiceCredits 
  } = useSubscriptionStore()

  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [localStreamingMessage, setLocalStreamingMessage] = useState('')
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [thinkingProcess, setThinkingProcess] = useState<string>('')
  const [showThinkingProcess, setShowThinkingProcess] = useState(false)
  const [messageThinkingStates, setMessageThinkingStates] = useState<{[messageId: string]: boolean}>({})
  
  // SIMPLIFIED: Only internal Voice Mode states
  const [isListening, setIsListening] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(initialVoiceMode)
  const [isAISpeaking, setIsAISpeaking] = useState(false) // Track AI speech state
  const [streamingMessage, setStreamingMessage] = useState('')
  const [internalIsMuted, setInternalIsMuted] = useState(false)
  const [manuallyMuted, setManuallyMuted] = useState(false) // Track manual mute state
  
  // CRITICAL: State restoration flags - must be declared early
  const [isRestoringState, setIsRestoringState] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  
  // Effective mute state: manually muted OR AI is speaking
  const effectiveIsMuted = manuallyMuted || isAISpeaking
  
  // Voice Mode ref is already updated in the useEffect above
  
  // Debug Voice Mode state changes
  useEffect(() => {
    console.log('🎭 Voice Mode state changed:', {
      isVoiceMode,
      isListening,
      isAISpeaking,
      streamingMessage: streamingMessage ? streamingMessage.substring(0, 30) + '...' : 'none'
    })
  }, [isVoiceMode, isListening, isAISpeaking, streamingMessage])
  
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [recognition, setRecognition] = useState<any>(null)
  const [showListeningIndicator, setShowListeningIndicator] = useState(false)
  
  // CRITICAL: Use ref to store latest Voice Mode state for callbacks
  const voiceModeRef = useRef(isVoiceMode)
  const mutedRef = useRef(effectiveIsMuted)
  const recognitionInstanceRef = useRef<any>(null)
  const isAISpeakingRef = useRef(isAISpeaking)
  
  // Update ref when Voice Mode state changes and notify parent
  useEffect(() => {
    voiceModeRef.current = isVoiceMode
    // Notify parent component of Voice Mode changes
    onVoiceModeChange?.(isVoiceMode)
  }, [isVoiceMode, onVoiceModeChange])
  
  // Update mutedRef when mute state changes
  useEffect(() => {
    mutedRef.current = effectiveIsMuted
    console.log('🔇 Mute state ref updated:', effectiveIsMuted)
  }, [effectiveIsMuted])
  
  // Update isAISpeakingRef when AI speaking state changes
  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking
    console.log('🤖 AI speaking state ref updated:', isAISpeaking)
  }, [isAISpeaking])
  
  // Track if user ID is ready for greeting generation
  const [userIdReady, setUserIdReady] = useState(false)

  // Sync authenticated user with app store user
  useEffect(() => {
    console.log('🔄 Checking user state:', { authUser, currentUser: user })
    
    // Generate a fallback user ID if none exists
    if (!user.id) {
      const fallbackId = 'user-' + Math.random().toString(36).substring(2, 15)
      console.log('🔄 Creating fallback user ID:', fallbackId)
      
      // First try to use auth user if available
      if (authUser && authUser.sub) {
        console.log('🔄 Using authenticated user ID:', authUser.sub)
        setUser({
          id: authUser.sub,
          name: authUser.name || ''
        })
      } else {
        // Otherwise use fallback ID
        console.log('🔄 Using fallback user ID:', fallbackId)
        setUser({
          id: fallbackId,
          name: user.name || ''
        })
      }
      // Wait for the next render cycle before setting userIdReady
      setTimeout(() => {
        console.log('🔄 Setting userIdReady to true after user ID assignment')
        setUserIdReady(true)
      }, 0)
    } else {
      // User ID already exists, mark as ready
      console.log('✅ User ID already exists:', user.id)
      setUserIdReady(true)
    }
  }, [authUser, setUser]) // Removed user dependency to prevent infinite loop
  
  // Prevent duplicate voice synthesis
  const lastSynthesizedContentRef = useRef('')
  const isSynthesizingRef = useRef(false)
  
  // Voice synthesis service is now passed as prop
  
  // Helper function to render message content
  const renderMessageContent = (content: string | MessageContent, isFirstMessage: boolean = false) => {
    // Handle string content (legacy)
    if (typeof content === 'string') {
      if (isFirstMessage) {
        return (
          <p style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}>
            {content}
          </p>
        )
      } else {
        return (
          <TypewriterText 
            text={content} 
            speed={30}
            className="block"
            style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
          />
        )
      }
    }
    
    // Handle rich content
    const richContent = content as MessageContent
    
    return (
      <div className="space-y-3">
        {/* Text content */}
        {richContent.text && (
          <div>
            {isFirstMessage ? (
              <p style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}>
                {richContent.text}
              </p>
            ) : (
              <TypewriterText 
                text={richContent.text} 
                speed={30}
                className="block"
                style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
              />
            )}
          </div>
        )}
        
        {/* Image content */}
        {richContent.image && (
          <div className="mt-3">
            <ImageDisplay 
              image={{
                url: richContent.image.url,
                prompt: richContent.image.prompt,
                model: richContent.image.model,
                cost: richContent.image.cost,
                metadata: richContent.image.metadata
              }}
              mode={isVoiceMode ? 'voice' : 'chat'}
            />
          </div>
        )}
        
        {/* Video content */}
        {richContent.video && (
          <div className="mt-3">
            <div className={`rounded-xl overflow-hidden ${
              theme === 'white' 
                ? 'bg-gray-50 border border-gray-200' 
                : 'bg-white/5 border border-white/10'
            } backdrop-blur-sm shadow-lg`}>
              <video 
                src={richContent.video.url} 
                controls 
                className="w-full h-auto max-h-64 object-cover"
              />
              <div className={`p-3 text-xs ${
                theme === 'white' ? 'bg-gray-50/80 text-gray-600' : 'bg-white/5 text-white/70'
              } backdrop-blur-sm`}>
                <p className="font-medium mb-1">"{richContent.video.prompt}"</p>
                <div className="flex items-center justify-between">
                  <span>{richContent.video.model}</span>
                  <span>${richContent.video.cost.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // Audio context for sci-fi sound effects
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        setAudioContext(ctx)
        console.log('🔊 Audio context initialized:', ctx.state)
        
        // Try to activate audio context on first user interaction
        const handleFirstInteraction = async () => {
          console.log('🔊 User interaction detected, attempting to resume audio context...')
          if (ctx.state === 'suspended') {
            try {
              await ctx.resume()
              console.log('✅ Audio context resumed after user interaction')
              
              // Test sound effect after resume
              setTimeout(() => {
                console.log('🔊 Testing sound effect after audio context resume...')
                playSciFiSound('listening-start')
              }, 100)
            } catch (error) {
              console.error('❌ Failed to resume audio context:', error)
            }
          } else {
            console.log('✅ Audio context already running')
          }
          // Remove listeners after first interaction
          document.removeEventListener('click', handleFirstInteraction)
          document.removeEventListener('touchstart', handleFirstInteraction)
        }
        
        document.addEventListener('click', handleFirstInteraction)
        document.addEventListener('touchstart', handleFirstInteraction)
        
        console.log('✅ Audio context event listeners added')
      } catch (error) {
        console.error('❌ Audio context not available:', error)
      }
    }
  }, [])
  
  // Sci-fi sound effects
  const playSciFiSound = async (type: 'listening-start' | 'listening-end' | 'ai-start') => {
    try {
      console.log('🔊 Attempting to play sci-fi sound:', type)
      
      // Ensure audio context is resumed (required for user interaction)
      if (audioContext && audioContext.state === 'suspended') {
        console.log('🔊 Resuming suspended audio context...')
        await audioContext.resume()
      }
      
      if (!audioContext || audioContext.state !== 'running') {
        console.log('❌ Audio context not available or not running:', {
          hasContext: !!audioContext,
          state: audioContext?.state
        })
        return
      }
      
      console.log('✅ Audio context ready, creating sound effect...')
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (type === 'listening-start') {
        // Rising sci-fi tone for listening start - increased volume
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime) // Increased from 0.1
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        console.log('🔊 Playing listening-start sound (volume: 0.3)')
      } else if (type === 'ai-start') {
        // Deep sci-fi tone for AI speaking - increased volume
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.4)
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime) // Increased from 0.08
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)
        console.log('🔊 Playing ai-start sound (volume: 0.25)')
      }
      
      console.log('✅ Sci-fi sound effect created and started successfully')
    } catch (error) {
      console.error('❌ Sound effect failed:', error)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // VoiceService is now passed as prop from parent component

  const [hasInitialized, setHasInitialized] = useState(false)
  const [lastStep, setLastStep] = useState('')
  const [hasAskedForName, setHasAskedForName] = useState(false)
  const [hasProposedScenario, setHasProposedScenario] = useState(false)

  // Use both ref and state to track initialization to prevent duplicate messages
  const isInitializedRef = useRef(false)
  const greetingRequestSentRef = useRef(false)
  const greetingResponseReceivedRef = useRef(false)
  
  // CRITICAL FIX: Use a global variable to prevent multiple instances from initializing
  useEffect(() => {
    if (window.__GREETING_INITIALIZED) {
      console.log('⚠️ Another instance already initialized greeting - preventing duplicate')
      isInitializedRef.current = true
      greetingRequestSentRef.current = true
      greetingResponseReceivedRef.current = true
    }
  }, [])
  // Reset initialization when starting a new conversation
  useEffect(() => {
    if (messages.length === 0) {
      console.log('🔄 No messages detected - resetting initialization state for new conversation')
      isInitializedRef.current = false
      greetingRequestSentRef.current = false
      greetingResponseReceivedRef.current = false
    }
  }, [messages.length])

  // CRITICAL: Initial greeting generation - only for truly new conversations
  // This manages the first AI greeting when starting a new conversation
  useEffect(() => {
    // CRITICAL: Prevent greeting trigger during state restoration or mode switches
    if (isRestoringState) {
      console.log('🚫 Skipping greeting trigger - state restoration in progress')
      return
    }
    
    // CRITICAL: Check if this is a mode switch by looking for saved conversation state
    const savedStateString = sessionStorage.getItem('conversationState')
    if (savedStateString) {
      console.log('🚫 Skipping greeting trigger - mode switch detected (saved state exists)')
      return
    }
    
    // CRITICAL FIX: Skip initialization entirely if skipInitialGreeting is true OR if global flag is set
    // This prevents duplicate greetings when coming from page.tsx or when another instance has already initialized
    if (skipInitialGreeting || window.__GREETING_INITIALIZED) {
      console.log('⏭️ Skipping initial greeting - already handled elsewhere', {
        skipInitialGreeting,
        globalFlagSet: !!window.__GREETING_INITIALIZED
      })
      isInitializedRef.current = true // Mark as initialized to prevent future attempts
      greetingRequestSentRef.current = true
      greetingResponseReceivedRef.current = true
      return
    }
    
    console.log('🔍 Checking greeting conditions:', {
      messagesLength: messages.length,
      skipInitialGreeting,
      userIdReady,
      hasRestoredState
    })
    
    // Define needsGreeting variable to track if greeting should be triggered
    // CRITICAL: Check for ANY voice processing in progress to prevent race conditions
    const hasActiveVoiceProcessing = Object.keys(window).some(key => key.startsWith('voice_processing_') && window[key] === true);
    
    // Enhanced check to prevent greeting during state restoration or voice processing
    const needsGreeting = messages.length === 0 && 
                         !skipInitialGreeting && 
                         userIdReady && 
                         !hasRestoredState && 
                         !isRestoringState && 
                         !hasActiveVoiceProcessing;
    
    // Only trigger greeting if we're not restoring state and have no messages
    if (needsGreeting) {
      console.log('🎯 Checking if initial greeting should be triggered:', {
        messagesLength: messages.length,
        skipInitialGreeting,
        userIdReady,
        hasRestoredState,
        isRestoringState,
        needsGreeting,
        greetingInProgress: window.__GREETING_IN_PROGRESS
      })
      
      // Prevent duplicate greetings
      if (window.__GREETING_IN_PROGRESS) {
        console.log('⚠️ Greeting already in progress, skipping')
        return
      }
      
      // Check if we need to initialize
      const shouldInitialize = (
        messages.length === 0 &&
        !isInitializedRef.current &&
        !greetingRequestSentRef.current &&
        !greetingResponseReceivedRef.current &&
        userIdReady && // Only proceed if user ID is ready
        user.id // Double check user ID exists
      )

      console.log('🔄 Checking for initialization conditions:', {
        messagesLength: messages.length,
        skipInitialGreeting,
        isInitialized: isInitializedRef.current,
        greetingRequestSent: greetingRequestSentRef.current,
        greetingResponseReceived: greetingResponseReceivedRef.current,
        userIdReady,
        userId: user.id
      })

      if (shouldInitialize) {
        console.log('✅ Triggering initial greeting - first time initialization', {
          userId: user.id,
          userIdReady
        })
        isInitializedRef.current = true
        greetingRequestSentRef.current = true
        
        // CRITICAL FIX: Set global flag to prevent other instances from initializing
        window.__GREETING_INITIALIZED = true
        
        // Define the greeting generation function
        const triggerGreeting = async () => {
        try {
          console.log('🔄 Starting greeting generation process')
          setAiThinking(true)
          window.__GREETING_IN_PROGRESS = true
          
          // Get the scenario layer to access user context and step management
          const scenarioLayer = originEngine.getScenarioLayer()
          // Ensure we have a valid user ID
          if (!user || !user.id) {
            console.error('❌ User ID is undefined, cannot proceed with greeting')
            setAiThinking(false)
            window.__GREETING_IN_PROGRESS = false
            return
          }
          
          // Use consistent user ID approach with null check
          const userId = user.id || 'mock-user-123'
          const userContext = scenarioLayer.getUserContext(userId)
          
          console.log('🔍 Current user context:', userContext)
          
          // Generate the initial greeting through the engine
          const engineResponse = await originEngine.processUserInput('__INIT__', user.id)
          
          console.log('⏭️ First greeting generated but not displayed, waiting for typing effect greeting')
          console.log('🔍 Engine response:', engineResponse)
          
          // Update the UI step state based on the engine's nextStep
          if (engineResponse.nextStep) {
            console.log('🔄 Updating UI step state to match engine:', engineResponse.nextStep)
            setCurrentStep(engineResponse.nextStep)
          }
          
          // Store the greeting message for potential use if no second greeting arrives
          const greetingMessage = engineResponse.message || "Welcome to Origin! I'm One, your AI guide. What would you like to call me?"
          
          // IMPORTANT: Add the greeting message with typing effect
          console.log('✨ Adding initial greeting message with typing effect')
          greetingResponseReceivedRef.current = true
          
          // CRITICAL FIX: Don't use streaming message for greeting to avoid duplicate display
          // Instead of using setStreamingMessage, we'll just add the message directly
          // This prevents the duplicate message that appears and then disappears
          
          // Add the message with full content directly
          addMessage({
            type: 'one',
            content: greetingMessage, // Full content immediately
            requestId: engineResponse.requestId || `greeting_${Date.now()}`
          })
          
          // CRITICAL FIX: Since we removed streaming message, we don't need to clear it
          // Instead, just handle voice synthesis directly if needed
          if (isVoiceMode) {
            console.log('🎤 Initial greeting in voice mode - triggering voice synthesis')
            try {
              // CRITICAL: Force voice synthesis regardless of current state
              // This ensures the initial greeting is always voiced in voice mode
              const forceVoiceSynthesis = async () => {
                console.log('🗣️ CRITICAL: Force-voicing initial greeting in voice mode')
                
                // CRITICAL FIX: Ensure voice service is initialized before attempting voice synthesis
                if (!voiceService) {
                  console.log('⚠️ Voice service not initialized for initial greeting, creating new instance')
                  // Create voice service with default configuration
                  const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
                  const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || VOICE_PRESETS.PROFESSIONAL
                  
                  if (apiKey) {
                    try {
                      const newVoiceService = new ElevenLabsService({
                        apiKey,
                        voiceId,
                        ...DEFAULT_ONE_VOICE_CONFIG
                      })
                      setVoiceService(newVoiceService)
                      console.log('✅ Voice service initialized successfully for initial greeting')
                      
                      // Wait a moment to ensure voice service is fully set up
                      await new Promise(resolve => setTimeout(resolve, 200))
                      
                      // Now use the voice service via streamMessage
                      await streamMessage(greetingMessage)
                    } catch (error) {
                      console.error('❌ Failed to initialize voice service for initial greeting:', error)
                    }
                  } else {
                    console.error('❌ No API key available for voice service')
                  }
                } else {
                  // Voice service already exists, use it directly
                  console.log('✅ Using existing voice service for initial greeting')
                  await streamMessage(greetingMessage)
                }
                
                console.log('✅ Initial greeting voice synthesis completed')
                
                // Start voice recognition after synthesis completes
                if (!manuallyMuted && !isListening) {
                  console.log('🎤 Auto-starting voice recognition after initial greeting')
                  setTimeout(() => startVoiceRecognition(), 300)
                }
              }
              
              // Execute with a slight delay to ensure voice mode is fully initialized
              setTimeout(forceVoiceSynthesis, 200)
            } catch (error) {
              console.error('❌ Initial greeting voice synthesis failed:', error)
            }
          }
          
          // Clear the global flag
          window.__GREETING_IN_PROGRESS = false
          setAiThinking(false)
        } catch (error) {
          console.error('Error generating greeting:', error)
          window.__GREETING_IN_PROGRESS = false
          setAiThinking(false)
        }
      }
      
        triggerGreeting()
      }
    }
  }, [messages.length, skipInitialGreeting, userIdReady, hasRestoredState, isRestoringState]) // Added state restoration flags
  
  // REMOVED: Duplicate step-based initialization to prevent multiple greetings
  // The message-based initialization above is sufficient
  // TODO: Remove this comment after testing

  // Use a ref to track if we've asked for the user's name
  const hasAskedForNameRef = useRef(false)

  // REMOVED: Broken greeting code block - greeting is handled in useEffect above

  // Use a ref to track if we've proposed a scenario
  const hasProposedScenarioRef = useRef(false)

  // AI-powered scenario generation
  const generateAIScenario = async () => {
    try {
      setAiThinking(true)
      // ARCHITECTURE FIX: Use Engine as the single entry point, not direct layer access
      // First get available capabilities through the Engine
      const engineResponse = await originEngine.processUserInput('Generate a creative scenario for me', user.id || 'anonymous')
      
      // Use the scenario from the engine response or create a default one if undefined
      const scenario = engineResponse.scenario || {
        title: 'Creative Exploration',
        description: 'Let\'s explore your creative ideas',
        prompt: 'What would you like to create today?',
        tags: ['creative', 'exploration']
      }
      
      setCurrentScenario({
        id: `scenario_${Date.now()}`,
        type: 'creative_prompt',
        title: scenario.title,
        description: scenario.description,
        prompt: scenario.prompt,
        difficulty: 'intermediate',
        estimatedTime: 25,
        tags: scenario.tags || ['creative']
      })
      
      setAiThinking(false)
      
      // Add AI-generated message with streaming effect
      await streamMessage(`Nice to meet you, ${user.name}! ${scenario.prompt}`)
      
    } catch (error) {
      console.error('AI scenario generation failed:', error)
      setAiThinking(false)
      
      // Fallback to simple message
      await streamMessage(`Nice to meet you, ${user.name}! What would you like to create today?`)
    }
  }

  // Initialize speech recognition
  useEffect(() => {
    console.log('🔍 Initializing speech recognition...')
    if (typeof window !== 'undefined') {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
        console.log('✅ Speech recognition API available')
        
        const recognitionInstance = new SpeechRecognition()
        
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        recognitionInstance.lang = 'en-US'
        recognitionInstance.maxAlternatives = 1
        
        console.log('🔧 Speech recognition configured:', {
          continuous: recognitionInstance.continuous,
          interimResults: recognitionInstance.interimResults,
          lang: recognitionInstance.lang
        })
      
      recognitionInstance.onstart = () => {
        console.log('🎤 Voice recognition started successfully')
        setIsListening(true)
        setShowListeningIndicator(true)
        setVoiceTranscript('')
        console.log('✅ Listening state updated:', { isListening: true, showIndicator: true })
        
        // Play sci-fi sound when listening starts
        playSciFiSound('listening-start')
      }
      
      let silenceTimer: NodeJS.Timeout | null = null
      let lastTranscript = ''
      
      recognitionInstance.onresult = (event: any) => {
        let transcript = ''
        let isFinal = false
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
          if (event.results[i].isFinal) {
            isFinal = true
          }
        }
        
        console.log('🎤 Voice result:', { 
          transcript, 
          isFinal, 
          isVoiceMode,
          transcriptLength: transcript.length
        })
        setVoiceTranscript(transcript)
        lastTranscript = transcript
        
        // Clear any existing silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer)
        }
        
        // Use ref to get current Voice Mode state (fixes React closure issue)
        const currentVoiceMode = voiceModeRef.current
        console.log('🔍 Voice Mode state check:', { 
          currentVoiceMode,
          'voiceModeRef.current': voiceModeRef.current
        })
        
        // For final results, process immediately
        if (isFinal) {
          console.log('🎯 Final result detected, processing...', { 
            currentVoiceMode, 
            transcript,
            transcriptLength: transcript.length,
            isAISpeaking,
            willProcess: transcript.trim().length > 0 && !isAISpeaking
          })
          
          // CRITICAL: Don't process voice input if AI is speaking (prevents feedback loop)
          if (isAISpeaking) {
            console.log('🚫 AI is speaking - ignoring voice input to prevent feedback loop')
            setVoiceTranscript('')
            return
          }
          
          if (transcript.trim()) {
            console.log('🎤 Processing voice input as message:', transcript.trim())
            handleVoiceInput(transcript.trim())
            setVoiceTranscript('')
            // Stop recognition after processing final result
            recognitionInstance.stop()
          } else {
            console.log('⚠️ Final result but transcript is empty')
          }
          return
        }
        
        // For interim results in Voice Mode, set up auto-processing timer
        if (currentVoiceMode && transcript.trim()) {
          console.log('🎯 Setting up auto-processing timer for Voice Mode')
          
          // Clear any existing timer
          if (silenceTimer) {
            clearTimeout(silenceTimer)
          }
          
          // Simplified timeout logic
          const words = transcript.trim().split(' ')
          const hasEndingPunctuation = /[.!?]$/.test(transcript.trim())
          
          let timeout = 1500 // Default 1.5 seconds
          if (hasEndingPunctuation) timeout = 800 // Faster for complete sentences
          else if (words.length <= 2) timeout = 2000 // Longer for very short phrases
          
          console.log(`⏱️ Auto-processing timer: ${timeout}ms for "${transcript.substring(0, 40)}..." (${words.length} words)`)
          
          silenceTimer = setTimeout(() => {
            // Re-check Voice Mode state when timer fires
            const currentMode = voiceModeRef.current
            console.log('⏰ Auto-processing timer fired!', {
              transcript: lastTranscript,
              length: lastTranscript.length,
              currentVoiceMode: currentMode,
              isAISpeaking
            })
            
            // CRITICAL: Don't process if AI is speaking (prevents feedback loop)
            if (isAISpeaking) {
              console.log('🚫 AI is speaking - canceling auto-processing to prevent feedback loop')
              setVoiceTranscript('')
              return
            }
            
            if (currentMode && lastTranscript.trim() && lastTranscript.length > 1) {
              console.log('🚀 Auto-sending voice message:', lastTranscript.trim())
              handleVoiceInput(lastTranscript.trim())
              setVoiceTranscript('')
              recognitionInstance.stop()
            } else {
              console.log('❌ Not processing - either not in Voice Mode or transcript too short')
            }
          }, timeout)
        }
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('🚫 Speech recognition error:', event.error, event)
        setIsListening(false)
        setShowListeningIndicator(false)
        
        if (event.error === 'not-allowed') {
          console.warn('🚫 Microphone access denied - check browser permissions')
          alert('Microphone access denied. Please allow microphone access and try again.')
        } else if (event.error === 'no-speech') {
          console.log('🔇 No speech detected')
          // Only auto-restart if not during AI speech and in Voice Mode
          if (voiceModeRef.current && !mutedRef.current && !isAISpeakingRef.current) {
            setTimeout(() => {
              console.log('🔄 Attempting to restart voice recognition after no-speech')
              if (voiceModeRef.current && !mutedRef.current && !isAISpeakingRef.current) {
                try {
                  startVoiceRecognition()
                } catch (restartError) {
                  console.error('❌ Failed to restart recognition after no-speech:', restartError)
                }
              }
            }, 1000)
          }
        } else {
          console.error('🚫 Other speech recognition error:', event.error)
          // For other errors, try to restart if in Voice Mode and not during AI speech
          if (isVoiceMode && !isMuted && !isAISpeakingRef.current && event.error !== 'aborted') {
            setTimeout(() => {
              console.log('🔄 Attempting to restart voice recognition after error')
              if (!isAISpeakingRef.current) {
                startVoiceRecognition()
              }
            }, 2000)
          }
        }
      }
      
      recognitionInstance.onend = () => {
        console.log('🔚 Voice recognition ended')
        setIsListening(false)
        setShowListeningIndicator(false)
        
        // CRITICAL: Check if AI is speaking or manually muted before restarting
        console.log('🔍 Auto-restart check:', {
          voiceModeRef: voiceModeRef.current,
          manuallyMuted,
          isAISpeaking,
          isAISpeakingRef: isAISpeakingRef.current,
          shouldRestart: voiceModeRef.current && !manuallyMuted && !isAISpeakingRef.current
        })
        
        if (voiceModeRef.current && !manuallyMuted && !isAISpeakingRef.current) {
          console.log('🔄 Auto-restarting voice recognition in Voice Mode')
          setTimeout(() => {
            console.log('🔍 Delayed restart check:', {
              voiceModeRef: voiceModeRef.current,
              manuallyMuted,
              isAISpeaking,
              isAISpeakingRef: isAISpeakingRef.current,
              shouldRestart: voiceModeRef.current && !manuallyMuted && !isAISpeakingRef.current
            })
            
            if (voiceModeRef.current && !manuallyMuted && !isAISpeakingRef.current) {
              console.log('🔄 Auto-restarting voice recognition via startVoiceRecognition()')
              // Use the centralized start function to avoid conflicts
              setTimeout(() => {
                if (voiceModeRef.current && !manuallyMuted && !isAISpeakingRef.current) {
                  startVoiceRecognition()
                }
              }, 100)
            } else {
              console.log('⚠️ Skipping restart - conditions not met:', {
                voiceMode: voiceModeRef.current,
                manuallyMuted,
                aiSpeaking: isAISpeaking
              })
            }
          }, 500)
        } else {
          console.log('✅ Listening state cleared:', { 
            isListening: false, 
            showIndicator: false,
            reason: !voiceModeRef.current ? 'not in voice mode' : manuallyMuted ? 'manually muted' : 'AI is speaking'
          })
        }
      }
      
      console.log('✅ Speech recognition instance created and configured')
      setRecognition(recognitionInstance)
      recognitionInstanceRef.current = recognitionInstance
    } else {
      console.error('❌ Speech recognition API not available in this browser')
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
    }
  } else {
    console.error('❌ Window object not available')
  }
}, [])

  // Handle mute state changes
  useEffect(() => {
    if (effectiveIsMuted && recognition && isListening) {
      console.log('🔇 Muting active voice recognition')
      recognition.stop()
    }
  }, [effectiveIsMuted, recognition, isListening])

  // CRITICAL: Sync conversation state with ISL layer on mode switches ONLY
  useEffect(() => {
    const syncConversationState = async () => {
      if (!user.id) {
        console.log('🔍 Skipping conversation state sync - no user ID')
        return
      }
      
      try {
        console.log('🔄 Attempting to sync conversation state with ISL...', {
          userId: user.id,
          currentUIStep: currentStep,
          trigger: 'mode switch'
        })
        
        const scenarioLayer = originEngine.getScenarioLayer()
        // Use consistent user ID approach with null check
        const userId = user.id || 'mock-user-123'
        const storedContext = scenarioLayer.getUserContext(userId)
        
        console.log('🔍 Retrieved stored context from ISL:', {
          storedContext,
          currentUIStep: currentStep,
          needsSync: storedContext?.currentStep && storedContext.currentStep !== currentStep
        })
        
        if (storedContext && storedContext.currentStep && storedContext.currentStep !== currentStep) {
          console.log('🔄 CRITICAL: Syncing conversation state with ISL:', {
            uiCurrentStep: currentStep,
            islCurrentStep: storedContext.currentStep,
            userId: user.id,
            trigger: 'mode switch - state mismatch detected'
          })
          
          // Update UI state to match ISL state
          setCurrentStep(storedContext.currentStep as 'landing' | 'naming-one' | 'naming-user' | 'scenario')
        } else {
          console.log('✅ Conversation state already in sync or no stored context')
        }
      } catch (error) {
        console.error('❌ Failed to sync conversation state:', error)
      }
    }
    
    // IMPORTANT: Only sync on mode switches and user ID changes, NOT on currentStep changes
    // This prevents infinite loops while ensuring state sync on mode switches
    syncConversationState()
  }, [initialVoiceMode, user.id]) // Removed currentStep to prevent infinite loops
  
  // CRITICAL: Restore conversation state BEFORE any greeting triggers
  // This must run before the greeting useEffect to prevent context reset
  useEffect(() => {
    const restoreState = async () => {
      // Set flag to prevent greeting trigger during restoration
      setIsRestoringState(true);
      const savedStateString = sessionStorage.getItem('conversationState');
      
      // Log the saved state string for debugging
      console.log('🔍 Checking for saved conversation state:', {
        hasSavedState: !!savedStateString,
        hasRestoredState,
        isVoiceMode,
        userId: user.id
      });
      
      if (savedStateString && !hasRestoredState) {
        try {
          const savedState = JSON.parse(savedStateString);
          console.log('🔄 Restoring conversation state after mode switch:', savedState);
          
          // Restore state regardless of messages length to prevent greeting triggers
          if (savedState.step) {
            // CRITICAL: First synchronize engine state with saved state BEFORE UI updates
            // This ensures ISL has the correct context before any voice input processing
            if (user.id) {
              try {
                console.log('🔄 CRITICAL: Performing immediate engine state synchronization FIRST:', {
                  userId: user.id,
                  step: savedState.step,
                  timestamp: new Date().toISOString()
                });
                
                // Get the scenario layer to access full context
                const scenarioLayer = originEngine.getScenarioLayer();
                
                // First get the complete current context to preserve all values
                // Use consistent user ID approach with null check
                const userId = user.id || 'mock-user-123';
                const currentContext = scenarioLayer.getUserContext(userId);
                
                console.log('🔍 Current ISL context before sync:', {
                  currentContext,
                  willUpdateTo: savedState.step
                });
                
                // Update the step in the engine context
                await scenarioLayer.updateUserContext(userId, {
                  ...currentContext,
                  currentStep: savedState.step,
                  step: savedState.step // Add for backward compatibility
                });
                
                // Verify the update was successful
                // Reuse the existing userId variable
                const verifiedContext = scenarioLayer.getUserContext(userId);
                console.log('✅ Engine context synchronized with saved state - verification:', {
                  verifiedStep: verifiedContext?.currentStep,
                  expectedStep: savedState.step,
                  success: verifiedContext?.currentStep === savedState.step
                });
                
                // Wait a moment to ensure ISL context update completes
                await new Promise(resolve => setTimeout(resolve, 50));
              } catch (error) {
                console.error('❌ Error synchronizing engine context:', error);
              }
            }
            
            // Now update UI state after engine state is synchronized
            // Restore the conversation step
            setCurrentStep(savedState.step);
            console.log('✅ Restored conversation step to UI:', savedState.step);
            
            // Restore messages with thinking process if available
            if (savedState.messages && Array.isArray(savedState.messages)) {
              console.log('✅ Restoring complete messages array with thinking process', {
                messageCount: savedState.messages.length,
                hasThinkingProcess: savedState.messages.some(m => m.thinkingProcess)
              });
              
              // Clear existing messages first to avoid duplicates
              // Then add each saved message with its thinking process
              if (savedState.messages.length > 0) {
                // First clear existing messages
                while (messages.length > 0) {
                  messages.pop();
                }
                
                // Then add each message with its original properties
                savedState.messages.forEach(msg => {
                  addMessage(msg);
                });
                
                console.log('✅ Successfully restored messages with thinking process');
              }
            }
            
            // Set flag to prevent duplicate restoration
            setHasRestoredState(true);
            
            // CRITICAL: Double-check ISL context after UI updates
            if (user.id) {
              try {
                // Get the scenario layer to verify context
                const scenarioLayer = originEngine.getScenarioLayer();
                // Use consistent user ID approach with null check
                const userId = user.id || 'mock-user-123';
                const finalContext = scenarioLayer.getUserContext(userId);
                
                console.log('🔍 FINAL VERIFICATION - ISL context after restoration:', {
                  finalStep: finalContext?.currentStep,
                  uiStep: savedState.step,
                  match: finalContext?.currentStep === savedState.step
                });
                
                // If there's still a mismatch, force one more update
                if (finalContext?.currentStep !== savedState.step) {
                  console.warn('⚠️ Context mismatch detected after restoration - forcing final update');
                  await scenarioLayer.updateUserContext(userId, {
                    ...finalContext,
                    currentStep: savedState.step,
                    step: savedState.step
                  });
                }
              } catch (error) {
                console.error('❌ Error in final context verification:', error);
              }
            }
            
            // Clear the saved state to prevent future incorrect restorations
            sessionStorage.removeItem('conversationState');
          }
          
          setIsRestoringState(false);
        } catch (error) {
          console.error('❌ Error restoring conversation state:', error);
          setIsRestoringState(false);
        }
      } else {
        setIsRestoringState(false);
      }
    };
    
    // Run state restoration immediately on component mount and mode changes
    restoreState();
  }, [isVoiceMode, user.id]); // Only trigger on mode changes or user changes, not on hasRestoredState

  // End of useEffect
  
  // CRITICAL: Sync internal voice mode with parent's initialVoiceMode
  useEffect(() => {
    console.log('🎙️ Initial Voice Mode sync effect triggered:', {
      initialVoiceMode,
      currentIsVoiceMode: isVoiceMode,
      recognition: !!recognition,
      isListening,
      manuallyMuted,
      timestamp: new Date().toISOString()
    })
    
    // ALWAYS sync internal state with parent's initialVoiceMode
    if (initialVoiceMode !== isVoiceMode) {
      console.log('🔄 CRITICAL: Syncing voice mode state:', { from: isVoiceMode, to: initialVoiceMode })
      setIsVoiceMode(initialVoiceMode)
      
      // CRITICAL FIX: If switching TO voice mode from chat mode, ensure proper initialization
      if (initialVoiceMode && !isVoiceMode) {
        console.log('🚀 CRITICAL: Switching from chat to voice mode - full initialization needed')
        
        // Reset voice mode states to ensure clean initialization
        setManuallyMuted(false)
        setIsListening(false)
        setShowListeningIndicator(false)
        
        // Force voice mode state update immediately
        setIsVoiceMode(true)
        
        // CRITICAL: Ensure the last message is properly voiced when switching to voice mode
        // This fixes the issue where switching from chat to voice mode doesn't voice messages
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          if (lastMessage.type === 'one') {
            console.log('🗣️ CRITICAL: Voicing last AI message after mode switch:', lastMessage.content)
            
            // CRITICAL FIX: Ensure voice service is initialized before attempting to use it
            // This fixes the issue where voice synthesis doesn't work when switching from chat to voice mode
            const initializeVoiceService = async () => {
              // Check if voice service is already initialized
              if (!voiceService) {
                console.log('⚠️ Voice service not initialized, creating new instance')
                // Create voice service with default configuration
                const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
                const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || VOICE_PRESETS.PROFESSIONAL
                
                if (apiKey) {
                  try {
                    const newVoiceService = new ElevenLabsService({
                      apiKey,
                      voiceId,
                      ...DEFAULT_ONE_VOICE_CONFIG
                    })
                    setVoiceService(newVoiceService)
                    console.log('✅ Voice service initialized successfully')
                    
                    // Wait a moment to ensure voice service is fully set up
                    await new Promise(resolve => setTimeout(resolve, 200))
                    
                    // Now stream the message with the new voice service
                    streamMessage(lastMessage.content)
                  } catch (error) {
                    console.error('❌ Failed to initialize voice service:', error)
                  }
                } else {
                  console.error('❌ No API key available for voice service')
                }
              } else {
                // Voice service already exists, use it directly
                console.log('✅ Using existing voice service')
                setTimeout(() => {
                  streamMessage(lastMessage.content)
                }, 300)
              }
            }
            
            // Start the initialization process
            initializeVoiceService()
          }
        }
        
        // Schedule voice recognition start with proper delay
        setTimeout(() => {
          console.log('🔍 Chat→Voice mode initialization check:', {
            initialVoiceMode,
            currentIsVoiceMode: true, // Should be true now
            recognition: !!recognition,
            isListening,
            manuallyMuted,
            isAISpeaking: isAISpeakingRef.current
          })
          
          if (recognition && !manuallyMuted && !isAISpeakingRef.current && !isListening) {
            console.log('🎙️ STARTING voice recognition after chat→voice switch')
            startVoiceRecognition()
          } else {
            console.log('⚠️ Cannot start voice recognition after chat→voice switch:', {
              initialVoiceMode,
              hasRecognition: !!recognition,
              manuallyMuted,
              isAISpeaking: isAISpeakingRef.current,
              isListening
            })
          }
        }, 500) // Longer delay to ensure state sync completes
      }
      
      // If switching to voice mode from any state, prepare to start recognition
      else if (initialVoiceMode && recognition && !manuallyMuted && !isAISpeakingRef.current) {
        console.log('🚀 Voice mode activated - scheduling voice recognition start')
        setTimeout(() => {
          if (initialVoiceMode && recognition && !manuallyMuted && !isAISpeakingRef.current && !isListening) {
            console.log('🎙️ STARTING voice recognition after sync')
            startVoiceRecognition()
          }
        }, 300)
      }
    }
  }, [initialVoiceMode]) // Only depend on initialVoiceMode to avoid loops
  
  // SIMPLIFIED: Auto-manage voice recognition in Voice Mode
  useEffect(() => {
    console.log('🔍 Voice Mode effect triggered:', { 
      timestamp: new Date().toISOString(),
      isVoiceMode, 
      recognition: !!recognition, 
      isListening, 
      isMuted 
    })
    
    if (isVoiceMode && recognition && !manuallyMuted && !isAISpeakingRef.current) {
      // In Voice Mode, start voice recognition only if not manually muted and AI not speaking
      if (!isListening) {
        console.log('🎙️ Voice Mode active - starting voice recognition')
        setTimeout(() => {
          if (isVoiceMode && !manuallyMuted && !isAISpeakingRef.current && !isListening) {
            startVoiceRecognition()
          }
        }, 100)
      }
    } else if (!isVoiceMode && recognition && isListening) {
      // Exit Voice Mode - stop recognition
      console.log('🛑 Exiting Voice Mode - stopping voice recognition')
      recognition.stop()
      setShowListeningIndicator(false)
      setIsListening(false)
    }
  }, [isVoiceMode, recognition, manuallyMuted]) // Removed isAISpeaking to prevent restart during AI speech
  
  // CRITICAL: Auto-mute microphone during AI speech to prevent feedback loops
  useEffect(() => {
    debugLog('🎙️ AI Speech state changed:', { 
      isAISpeaking, 
      isVoiceMode, 
      isListening, 
      manuallyMuted,
      effectiveIsMuted,
      recognition: !!recognition 
    })
    
    if (!isVoiceMode || !recognition) return
    
    if (isAISpeaking) {
      // AI started speaking - immediately stop voice recognition (auto-mute)
      debugLog('🔇 AI started speaking - AUTO-MUTING and stopping voice recognition')
      try {
        if (isListening) {
          recognition.stop()
          setIsListening(false)
          setShowListeningIndicator(false)
        }
      } catch (error) {
        debugLog('❌ Error stopping recognition:', error)
      }
    } else if (!manuallyMuted) {
      // AI finished speaking - restart voice recognition if not manually muted
      debugLog('🔊 AI finished speaking - AUTO-UNMUTING and restarting voice recognition')
      setTimeout(() => {
        // Double-check states before restarting
        if (!isAISpeaking && !manuallyMuted && isVoiceMode) {
          debugLog('🔄 Auto-restarting voice recognition after AI finished speaking')
          // Use the centralized start function to avoid conflicts
          startVoiceRecognition()
        } else {
          debugLog('⚠️ Skipping auto-restart:', {
            isAISpeaking,
            manuallyMuted,
            isVoiceMode,
            hasRecognition: !!recognition
          })
        }
      }, 500) // Small delay to ensure AI speech has fully stopped
    } else {
      debugLog('🔇 AI finished speaking but user is manually muted - not restarting')
    }
  }, [isAISpeaking, isVoiceMode, recognition, manuallyMuted, isListening])
  
  // Helper function to start voice recognition with proper error handling
  const startVoiceRecognition = () => {
    if (!recognition) {
      console.error('❌ No recognition instance available')
      return
    }
    
    if (manuallyMuted) {
      console.log('🔇 Recognition manually muted, not starting')
      return
    }
    
    if (isAISpeakingRef.current) {
      console.log('🤖 AI is speaking, not starting recognition')
      return
    }
    
    // Check if recognition is already running
    if (isListening) {
      console.log('⚠️ Recognition already listening, skipping start')
      setShowListeningIndicator(true)
      return
    }
    
    console.log('🚀 Starting voice recognition...')
    
    // Check microphone permissions first
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log('✅ Microphone permission granted')
        
        // Double-check if still not listening before starting
        if (!isListening && !isAISpeakingRef.current) {
          try {
            recognition.start()
            console.log('🎤 Voice recognition start command sent')
            // Don't set listening state here - let onstart event handle it
          } catch (error) {
            console.error('❌ Failed to start voice recognition:', error)
            if (error instanceof Error && error.message && error.message.includes('already started')) {
              console.log('⚠️ Recognition already started, updating state')
              setIsListening(true)
              setShowListeningIndicator(true)
            }
          }
        } else {
          console.log('⚠️ Recognition started while checking permissions or AI is speaking')
          if (!isAISpeakingRef.current) {
            setShowListeningIndicator(true)
          }
        }
      })
      .catch((error) => {
        console.error('🚫 Microphone permission denied:', error)
        alert('Microphone access is required for Voice Mode. Please allow microphone access and try again.')
      })
  }

  // Handle voice input - Use same logic as handleSubmit
  // Handle voice input with proper TypeScript typing
  const handleVoiceInput = async (transcript: string) => {
    // Ignore empty transcripts
    if (!transcript.trim()) return
    
    console.log(`🎙️ Voice input received: "${transcript}"`)
    
    // Generate unique request ID for voice input
    const requestId = `voice_${Date.now()}`
    console.log(`🎤 Voice request ${requestId} started for input: "${transcript}"`)
    
    // Set a flag to indicate voice input processing is in progress
    // This helps prevent race conditions with other async operations
    const voiceProcessingKey = `voice_processing_${requestId}`
    // Use a safer approach to set window properties
    if (typeof window !== 'undefined') {
      (window as Record<string, boolean>)[voiceProcessingKey] = true
    }
    
    // CRITICAL: Get ISL context BEFORE processing any input
    // This ensures we process with the correct step regardless of UI state
    let actualCurrentStep = currentStep
    let synced = false
    
    // CRITICAL FIX: Always use the same user ID that was used for state restoration
    // This ensures we find the correct context that was saved during mode switches
    // IMPORTANT: This MUST match the user ID used in state restoration (line ~1070)
    const userId = user.id || 'mock-user-123' // Use mock-user-123 as fallback instead of 'anonymous'
    console.log(`🔑 Voice Input - Using user ID for context retrieval: ${userId}`)
    
    try {
      // Use the proper method to get ISL context - getScenarioLayer().getUserContext()
      const scenarioLayer = originEngine.getScenarioLayer()
      const islContext = scenarioLayer.getUserContext(userId)
      console.log('🔍 Voice Input - Retrieved ISL context:', islContext, { userId })
      
      if (islContext && islContext.currentStep) {
        // If ISL has a different step than UI, use ISL's step as source of truth
        if (islContext.currentStep !== currentStep) {
          console.log('⚠️ Voice Input - Step mismatch detected:', { 
            uiStep: currentStep, 
            islStep: islContext.currentStep,
            userId
          })
          actualCurrentStep = islContext.currentStep
          // Update UI state to match ISL state immediately
          setCurrentStep(islContext.currentStep as 'landing' | 'naming-one' | 'naming-user' | 'scenario')
          synced = true
        } else {
          console.log('✅ Voice Input - Steps already in sync:', actualCurrentStep)
        }
      } else {
        console.log('⚠️ Voice Input - No ISL context found, using UI step:', actualCurrentStep, { userId })
      }
    } catch (error) {
      console.error('❌ Voice Input - Error retrieving ISL context:', error)
      console.log('⚠️ Voice Input - Falling back to UI step:', actualCurrentStep)
    }
    
    // Ensure state update completes if we had to sync
    // This prevents race conditions where UI state hasn't updated before processing continues
    if (synced) {
      console.log(`⏱️ Voice input ${requestId} waiting for state sync to complete...`)
      // Increased timeout to ensure React state updates complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Double-check that the sync was successful
      const verificationContext = await originEngine.getScenarioLayer().getUserContext(userId)
      console.log('🔍 Voice Input - Verification after sync:', {
        uiStep: currentStep,
        actualStep: actualCurrentStep,
        islStep: verificationContext?.currentStep,
        syncSuccessful: verificationContext?.currentStep === actualCurrentStep
      })
      
      // If sync failed, try one more time with longer timeout
      if (verificationContext?.currentStep !== actualCurrentStep) {
        console.log('⚠️ Voice Input - Sync verification failed, retrying...')
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log('🔄 Voice Input - Final context state:', {
      actualCurrentStep,
      synced,
      originalStep: currentStep,
      userId
    })
    
    // Use the trimmed input consistently
    const userInput = transcript.trim()
    
    // Clear previous thinking process
    setThinkingProcess('')
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Add user message to conversation history
    addMessage({
      type: 'user',
      content: userInput,
      requestId // Track the request ID with the user message
    })
    
    // Let the engine handle conversation logic with synchronized context
    try {
      // Create context with the synchronized step and CONSISTENT USER ID
      const context = {
        currentStep: actualCurrentStep,
        step: actualCurrentStep, // Keep for backward compatibility
        requestId,
        isVoiceMode: true, // Mark that this request came from voice mode
        userId: userId, // CRITICAL: Use the same userId that was used to retrieve context
        timestamp: Date.now() // Add timestamp to help with debugging
      };
      
      console.log(`🔄 Voice input ${requestId} creating context:`, { 
        step: context.currentStep,
        synced: synced,
        userId: context.userId, // Log userId to verify consistency
        timestamp: context.timestamp
      })
      
      const response = await generateEngineResponse(userInput, context)
      
      // Initialize message content variable
      let messageContent: string | MessageContent = response.content
      
      // Handle capability responses (images, videos)
      if ('capabilityResponse' in response && response.capabilityResponse) {
        const capResponse = response.capabilityResponse
        
        if (capResponse.type === 'image' && capResponse.result) {
          // Create rich content with image
          messageContent = {
            text: response.content,
            image: {
              url: capResponse.result.url,
              prompt: capResponse.result.prompt,
              model: capResponse.result.model || 'DALL-E 3',
              cost: capResponse.cost || 0,
              metadata: capResponse.result.metadata || {}
            }
          }
          console.log('🎨 Added image to message content:', messageContent.image)
        } else if (capResponse.type === 'video' && capResponse.result) {
          // Create rich content with video
          messageContent = {
            text: response.content,
            video: {
              url: capResponse.result.url,
              prompt: capResponse.result.prompt,
              model: capResponse.result.model || 'Video Generator',
              cost: capResponse.cost || 0,
              metadata: capResponse.result.metadata || {}
            }
          }
          console.log('🎬 Added video to message content:', messageContent.video)
        }
      }
      
      // Update current scenario if provided in the response
      if ('scenario' in response && response.scenario) {
        setCurrentScenario(response.scenario)
      }
      
      // Update the thinking process to ensure it shows the correct step
      let finalThinkingProcess = response.thinkingProcess || thinkingProcess
      
      // If the engine response updated the step, make sure it's reflected in the thinking process
      if (response.nextStep && !finalThinkingProcess.includes(`Updated conversation step: ${response.nextStep}`)) {
        const displayStep = response.nextStep === 'completed' ? 'scenario' : response.nextStep
        finalThinkingProcess += `\n📍 Final conversation step: ${displayStep}`
      }
      
      // Add AI response with rich content support
      // Use the requestId from the response if available (which came from the engine)
      const responseRequestId = response.requestId || requestId
      
      // Clean up the processing flag before adding the message
      // This prevents race conditions with other async operations
      // Use a safer approach to clear window properties
      if (typeof window !== 'undefined') {
        (window as Record<string, boolean>)[voiceProcessingKey] = false
      }
      console.log(`🧹 Cleaned up voice processing flag: ${voiceProcessingKey}`)
      
      addMessage({
        type: 'one',
        content: messageContent,
        thinkingProcess: finalThinkingProcess,
        requestId: responseRequestId // Use the engine's requestId for better synchronization
      })
      console.log(`✅ [${responseRequestId}] AI message added to conversation with rich content support`)
      
      // Handle Voice Mode features (subtitles and speech synthesis)
      // Check voice mode state more robustly
      const currentVoiceMode = isVoiceMode || voiceModeRef.current
      if (currentVoiceMode) {
        console.log('✅ Voice Mode confirmed - calling streamMessage')
        try {
          await streamMessage(response.content)
          console.log('✅ streamMessage completed successfully')
        } catch (streamError) {
          console.error('❌ streamMessage failed:', streamError)
        }
      } else {
        console.log('⚠️ Voice Mode not active, skipping streamMessage')
      }
      
      console.log(`✅ Voice input ${requestId} processing completed successfully`)
      
    } catch (error) {
      console.error('❌ AI response generation failed:', error)
      // Fallback to simple response
      const fallbackResponse = `I heard you say "${userInput}". That's fascinating! Let me help you with that. What would you like to explore or create together?`
      
      addMessage({
        type: 'one',
        content: fallbackResponse
      })
      
      // Check voice mode state more robustly for fallback response too
      if (isVoiceMode || voiceModeRef.current) {
        console.log('✅ Voice Mode confirmed for fallback - calling streamMessage')
        try {
          await streamMessage(fallbackResponse)
        } catch (streamError) {
          console.error('❌ streamMessage failed for fallback:', streamError)
        }
      }
    }
  }

  // Voice input functions
  const startVoiceInput = () => {
    if (!manuallyMuted && !isAISpeakingRef.current) {
      console.log('🎤️ Starting voice input via startVoiceRecognition()')
      startVoiceRecognition()
    } else if (manuallyMuted) {
      console.log('🔇 Voice input manually muted, not starting recognition')
    } else if (isAISpeakingRef.current) {
      console.log('🤖 AI is speaking, not starting voice input')
    }
  }

  const stopVoiceInput = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  // Stream message with synchronized voice and subtitles
  const streamMessage = async (content: string) => {
    debugLog('🗨️ streamMessage called:', { 
      content: content.substring(0, 50) + '...', 
      isVoiceMode,
      voiceService: !!voiceService
    })
    
    // STEP 1: Immediately set AI speaking state and FORCE STOP voice recognition
    debugLog('🔊 STEP 1: Setting AI speaking state and STOPPING voice recognition')
    setIsAISpeaking(true)
    isAISpeakingRef.current = true  // CRITICAL: Immediately update ref for synchronous access
    
    // CRITICAL: Force stop voice recognition when AI starts speaking
    // We need to stop BOTH the state recognition AND the actual recognition instance
    if (recognition) {
      debugLog('🛑 FORCING recognition state to STOP - AI is about to speak')
      try {
        recognition.stop()
        debugLog('✅ Recognition state STOPPED successfully')
      } catch (error) {
        debugLog('❌ Failed to stop recognition state:', error)
      }
    }
    
    // CRITICAL: Also stop the actual recognition instance
    if (recognitionInstanceRef.current) {
      debugLog('🛑 FORCING recognitionInstance to STOP - AI is about to speak')
      try {
        recognitionInstanceRef.current.stop()
        debugLog('✅ RecognitionInstance STOPPED successfully')
      } catch (error) {
        debugLog('❌ Failed to stop recognitionInstance:', error)
      }
    }
    
    // Also force stop listening state regardless
    if (isListening) {
      debugLog('🛑 FORCING listening state to FALSE - AI is about to speak')
      setIsListening(false)
      setShowListeningIndicator(false)
      debugLog('✅ Listening state set to FALSE')
    }
    
    // STEP 2: Start voice synthesis and subtitles in parallel
    debugLog('🔊 STEP 2: Starting voice synthesis and subtitles in parallel')
    
    let voiceSynthesisPromise: Promise<void> | null = null
    
    // Callback to show subtitles when audio actually starts playing
    const onAudioStart = () => {
      debugLog('📝 Audio started - showing subtitles now')
      setStreamingMessage(content)
      playSciFiSound('ai-start')
    }
    
    // Check voice credits before synthesis
    const hasVoiceCredits = canUseVoice() && subscriptionCanUseVoice()
    
    if (voiceService && hasVoiceCredits) {
      debugLog('🎤️ Using provided voiceService for synthesis')
      voiceSynthesisPromise = voiceService.speakText(content, undefined, { onStart: onAudioStart })
      
      // Track voice usage after successful synthesis
      voiceSynthesisPromise.then(() => {
        incrementVoiceUsage()
        debugLog('📊 Voice usage incremented')
      }).catch((error) => {
        debugLog('❌ Voice synthesis failed:', error)
      })
    } else if (voiceService && !hasVoiceCredits) {
      debugLog('🚫 Voice credits exhausted - showing upgrade modal')
      setShowUpgradeModal(true)
      // Still show text content
      setStreamingMessage(content)
      playSciFiSound('ai-start')
    } else {
      // Emergency voice service creation
      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
      const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || VOICE_PRESETS.PROFESSIONAL
      
      if (apiKey) {
        debugLog('🆘 Creating emergency voice service')
        const emergencyVoiceService = new ElevenLabsService({
          apiKey,
          voiceId,
          ...DEFAULT_ONE_VOICE_CONFIG
        })
        voiceSynthesisPromise = emergencyVoiceService.speakText(content, undefined, { onStart: onAudioStart })
      } else {
        debugLog('❌ No voice service available - skipping synthesis')
        // If no voice service, show subtitles immediately
        onAudioStart()
      }
    }
    
    // STEP 3: Hide listening indicator immediately (but subtitles will show when audio starts)
    debugLog('🔇 STEP 3: Hiding listening indicator - AI about to speak')
    setShowListeningIndicator(false)
    
    // STEP 4: Wait for voice synthesis to complete
    let voiceSynthesisSucceeded = false
    if (voiceSynthesisPromise) {
      debugLog('⏳ STEP 4: Waiting for voice synthesis to complete...')
      try {
        await voiceSynthesisPromise
        debugLog('✅ STEP 4: Voice synthesis completed successfully')
        voiceSynthesisSucceeded = true
      } catch (error) {
        debugLog('❌ STEP 4: Voice synthesis failed:', error)
        // If voice synthesis failed, show the content as subtitles immediately
        debugLog('📝 Showing subtitles due to voice synthesis failure')
        setStreamingMessage(content)
        playSciFiSound('ai-start')
        // Simulate shorter AI speaking time for failed synthesis
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } else {
      debugLog('⚠️ STEP 4: No voice synthesis was started - showing subtitles and simulating delay')
      // If no voice synthesis, show subtitles and simulate AI speaking
      setStreamingMessage(content)
      playSciFiSound('ai-start')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    // STEP 5: Reset AI speaking state ONLY after voice completes
    debugLog('🔇 STEP 5: AI FINISHED speaking - resetting state')
    
    // CRITICAL: Double-check that voice service is not playing (only if synthesis succeeded)
    // This ensures audio is completely finished before allowing voice recognition restart
    if (voiceSynthesisSucceeded && voiceService && voiceService.isCurrentlyPlaying()) {
      debugLog('⚠️ Voice service still playing, waiting additional time...')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Add extra delay to ensure audio is completely finished (shorter delay if synthesis failed)
    const delayTime = voiceSynthesisSucceeded ? 500 : 200
    await new Promise(resolve => setTimeout(resolve, delayTime))
    
    setIsAISpeaking(false)
    isAISpeakingRef.current = false  // CRITICAL: Immediately update ref for synchronous access
    debugLog('✅ AI speaking state reset completed with extra delay')
    
    // STEP 6: Clear streaming message after delay
    setTimeout(() => {
      debugLog('🧹 STEP 6: Clearing streaming message after delay')
      setStreamingMessage('')
    }, 2000)
    
    debugLog('✅ streamMessage completed successfully')
  }

  // Engine-driven response generation using unified AI system
  const generateEngineResponse = async (userInput: string, context: any): Promise<EnhancedEngineResponse> => {
    try {
      // Check if this is the first user message after the initial greeting
      // If it's a simple greeting like "hi", "hello", etc., we should avoid generating a duplicate greeting
      const isFirstUserMessage = messages.filter(msg => msg.type === 'user').length === 1;
      const isSimpleGreeting = /^(hi|hello|hey|greetings|howdy|hola|hi there|hello there)$/i.test(userInput.trim());
      
      // Get the stored initial greeting if it exists
      const initialGreetingContent = sessionStorage.getItem('initialGreetingContent');
      const initialGreetingRequestId = sessionStorage.getItem('initialGreetingRequestId');
      
      console.log('🔍 Checking for greeting duplication:', { 
        isFirstUserMessage, 
        isSimpleGreeting, 
        hasStoredGreeting: !!initialGreetingContent,
        userInput
      });
      
      // Set AI thinking state
      setAiThinking(true)
      
      // Clear any previous thinking process before starting new conversation
      setThinkingProcess('')
      // Ensure state update is complete
      await new Promise(resolve => setTimeout(resolve, 10)) // Ensure state is cleared
      
      // Engine will use its own internal user context management
      // No need to create userContext here as it would override ISL's stored context
      
      // Generate a request ID for this interaction or use the one from context
      const contextRequestId = context.requestId || `req_${Date.now()}`
      console.log(`🧠 [${contextRequestId}] Starting thinking process for: "${userInput}"`)
      
      // If this is the first user message and it's a simple greeting, we should avoid duplicating the welcome message
      if (isFirstUserMessage && isSimpleGreeting && initialGreetingContent) {
        console.log('⚠️ Detected first simple greeting from user after initial AI greeting - avoiding duplicate welcome');
        
        // Start with a different thinking process for this case
        let actualThinkingSteps = `👤 Analyzing user input: "${userInput}"\n`;
        // Log step values for debugging in greeting case
      console.log('🔍 Context step values (greeting case):', { 
        currentStep: context.currentStep, 
        step: context.step,
        uiCurrentStep: currentStep
      })
      // FIX: Use UI state's currentStep when engine context steps are undefined
      actualThinkingSteps += `📍 Current conversation step: ${context.currentStep || context.step || currentStep || 'unknown'}\n`;
        actualThinkingSteps += `👤 User context: ${user.name || 'Anonymous'}\n\n`;
        actualThinkingSteps += '🚀 Detected simple greeting after welcome message\n';
        actualThinkingSteps += '💬 Preparing personalized response instead of duplicate welcome\n';
        setThinkingProcess(actualThinkingSteps);
        
        // Return a personalized response instead of a duplicate welcome
        return {
          content: `Hi there! I'm glad you're here. What would you like to explore or create today?`,
          followUp: null,
          scenario: {
            id: `greeting_${Date.now()}`,
            type: 'creative_prompt',
            title: 'Conversation',
            description: 'General conversation',
            prompt: 'What would you like to talk about?',
            difficulty: 'beginner',
            estimatedTime: 10,
            tags: ['conversation']
          },
          capabilities: [],
          capabilityResponse: null,
          requestId: contextRequestId,
          thinkingProcess: actualThinkingSteps
        };
      }
      
      let actualThinkingSteps = ''
      actualThinkingSteps += `👤 Analyzing user input: "${userInput}"\n`
      // Use currentStep instead of step for consistency with ISL
      // IMPORTANT: Log the actual step values for debugging
      console.log('🔍 Context step values:', { 
        currentStep: context.currentStep, 
        step: context.step,
        uiCurrentStep: currentStep
      })
      // FIX: Use UI state's currentStep when engine context steps are undefined
      actualThinkingSteps += `📍 Current conversation step: ${context.currentStep || context.step || currentStep || 'unknown'}\n`
      actualThinkingSteps += `👤 User context: ${user.name || 'Anonymous'}\n\n`
      actualThinkingSteps += '🚀 Unified Engine: Processing through all AI layers...\n'
      setThinkingProcess(actualThinkingSteps)
      
      console.log('🚀 About to call originEngine.processUserInput...')
      
      // CRITICAL FIX: Use the context's userId if provided, otherwise fall back to user.id or 'mock-user-123'
      // This ensures consistent user ID usage between handleVoiceInput and generateEngineResponse
      const effectiveUserId = context.userId || user.id || 'mock-user-123' // Never use 'anonymous' as fallback
      console.log(`🔑 Using effective user ID for engine call: ${effectiveUserId}`, {
        contextUserId: context.userId,
        userIdFromState: user.id,
        finalUserId: effectiveUserId
      })
      
      // Use the unified engine for complete processing with consistent user ID
      const engineResponse = await originEngine.processUserInput(userInput, effectiveUserId)
      console.log('✅ Engine response:', engineResponse)
      
      // Use the requestId from the engine response if available, otherwise use the context one
      const requestId = engineResponse.requestId || contextRequestId
      console.log(`🆔 Using request ID for engine response: ${requestId}`)
      
      // Update currentStep state if nextStep is provided in the engine response
      if (engineResponse.nextStep) {
        setCurrentStep(engineResponse.nextStep as 'landing' | 'naming-one' | 'naming-user' | 'scenario')
        console.log(`🔄 Updated conversation step to: ${engineResponse.nextStep}`)
        
        // Update context to reflect the new step
        context.currentStep = engineResponse.nextStep
        context.step = engineResponse.nextStep // For backward compatibility
      }
      
      actualThinkingSteps += `✅ Engine processing complete\n`
      
      // Update the conversation step based on engine response
      if (engineResponse.nextStep) {
        // Use the safe step value for display in thinking process
        const displayStep = engineResponse.nextStep === 'completed' ? 'scenario' : engineResponse.nextStep
        actualThinkingSteps += `📍 Updated conversation step: ${displayStep}\n`
      }
      
      actualThinkingSteps += `🏹 Scenario: ${engineResponse.scenario?.title || 'General conversation'}\n`
      actualThinkingSteps += `💡 Available capabilities: ${engineResponse.availableCapabilities?.length || 0}\n\n`
      setThinkingProcess(actualThinkingSteps)
      
      // Step 2: Get capability suggestions if available
      if (engineResponse.availableCapabilities && engineResponse.availableCapabilities.length > 0) {
        actualThinkingSteps += '🔍 Capability Discovery: Found available AI capabilities\n'
        engineResponse.availableCapabilities.forEach(cap => {
          actualThinkingSteps += `  • ${cap.name} (${cap.type})\n`
        })
        actualThinkingSteps += '\n'
        setThinkingProcess(actualThinkingSteps)
      }
      
      // Step 3: Check for specific capability requests using engine intelligence
      let capabilityResponse: {
        type: string;
        result: any;
        cost: number;
      } | null = null;
      
      // Use the engine's content type inference for smarter detection
      const contentTypeKeywords = {
        image: ['image', 'picture', 'photo', 'visual', 'artwork', 'illustration', 'draw', 'paint', 'create', 'generate', 'make'],
        video: ['video', 'animation', 'motion', 'movie', 'clip', 'animate', 'moving']
      }
      
      const inputLower = userInput.toLowerCase()
      const hasImageKeywords = contentTypeKeywords.image.some(keyword => inputLower.includes(keyword))
      const hasVideoKeywords = contentTypeKeywords.video.some(keyword => inputLower.includes(keyword))
      
      if (hasImageKeywords) {
        actualThinkingSteps += '🎨 Image Generation: User requested visual content\n'
        setThinkingProcess(actualThinkingSteps)
        
        try {
          const imageResult = await unifiedInvocation.generateImage(userInput, {
            userId: user.id || 'anonymous',
            qualityLevel: 'balanced',
            maxCost: 0.15
          })
          
          if (imageResult.success) {
            actualThinkingSteps += `✅ Image generated successfully (cost: $${imageResult.cost.toFixed(3)})\n`
            capabilityResponse = {
              type: 'image',
              result: imageResult.result,
              cost: imageResult.cost
            }
          }
        } catch (error) {
          actualThinkingSteps += `❌ Image generation failed: ${error}\n`
        }
        setThinkingProcess(actualThinkingSteps)
      }
      
      if (hasVideoKeywords) {
        actualThinkingSteps += '🎥 Video Generation: User requested video content\n'
        setThinkingProcess(actualThinkingSteps)
        
        try {
          const videoResult = await unifiedInvocation.generateVideo(userInput, {
            userId: user.id || 'anonymous',
            qualityLevel: 'balanced',
            maxCost: 0.50
          })
          
          if (videoResult.success) {
            actualThinkingSteps += `✅ Video generated successfully (cost: $${videoResult.cost.toFixed(3)})\n`
            capabilityResponse = {
              type: 'video',
              result: videoResult.result,
              cost: videoResult.cost
            }
          }
        } catch (error) {
          actualThinkingSteps += `❌ Video generation failed: ${error}\n`
        }
        setThinkingProcess(actualThinkingSteps)
      }
      
      actualThinkingSteps += '💬 Response Finalization: Preparing enhanced response\n'
      setThinkingProcess(actualThinkingSteps)
      
      setAiThinking(false)
      
      // Return enhanced response with capability results
      const response: EnhancedEngineResponse = {
        content: engineResponse.message || "I'd love to help you with that!",
        followUp: engineResponse.scenario?.prompt || null,
        scenario: engineResponse.scenario,
        capabilities: engineResponse.availableCapabilities,
        capabilityResponse,
        requestId, // Include the requestId for UI synchronization
        thinkingProcess: actualThinkingSteps // Include the thinking process for this specific request
      }
      
      console.log('✅ generateEngineResponse completed successfully:', response)
      return response
      
    } catch (error) {
      console.error('Unified engine response generation failed:', error)
      setAiThinking(false)
      
      // Return a properly typed error response
      return {
        content: "I'm sorry, I encountered an issue processing your request. Could you try again?",
        followUp: null,
        capabilityResponse: null,
        requestId: `error_${Date.now()}`,
        thinkingProcess: `❌ Error: ${error}`,
        scenario: undefined,
        capabilities: undefined
      }
    }
  }



  // REMOVED: Duplicate name extraction function - now using centralized version from utils
  // Use: extractNameFromInput(input, isForAI, context, llmService)

// ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const userInput = inputValue.trim()
    if (!userInput) return

    setInputValue('') // Clear input immediately for better UX
    
    // Generate unique request ID to prevent thinking process conflicts
    const requestId = `req_${Date.now()}`
    console.log(`🎥 [${requestId}] Starting new conversation request for input: "${userInput}"`)
    
    // CRITICAL: Sync conversation state with ISL before processing
    // This ensures chat mode has the most up-to-date step information after mode switches
    let actualCurrentStep = currentStep
    
    // CRITICAL FIX: Use the same user ID approach as handleVoiceInput
    // This ensures consistent user ID usage across all input handlers
    const userId = user.id || 'mock-user-123' // Use mock-user-123 as fallback instead of 'anonymous'
    console.log(`🔑 Chat Input - Using user ID for context retrieval: ${userId}`)
    
    try {
      const scenarioLayer = originEngine.getScenarioLayer()
      const storedContext = scenarioLayer.getUserContext(userId)
      if (storedContext && storedContext.currentStep && storedContext.currentStep !== currentStep) {
        console.log('🔄 CRITICAL: Chat input detected step mismatch, syncing:', {
          uiCurrentStep: currentStep,
          islCurrentStep: storedContext.currentStep,
          userId
        })
        // Make sure currentStep is defined before assignment
        actualCurrentStep = storedContext.currentStep
        // Update UI state to match ISL state immediately
        setCurrentStep(storedContext.currentStep as 'landing' | 'naming-one' | 'naming-user' | 'scenario')
      }
    } catch (syncError) {
      console.error('❌ Failed to sync state before chat input:', syncError)
    }
    
    // Clear previous thinking process completely
    setThinkingProcess('')
    // Ensure state update is complete
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Add user message
    addMessage({
      type: 'user',
      content: userInput,
      requestId // Add requestId to user message
    })
    
    // Let the engine handle all conversation logic - no manual step management
    try {
      // Use AI engine to generate response with thinking process
      // Create context with synced step information and consistent userId
      const context = {
        currentStep: actualCurrentStep,
        step: actualCurrentStep, // For backward compatibility
        requestId,
        userId: userId, // CRITICAL: Include the same userId used for context retrieval
        timestamp: Date.now() // Add timestamp to help with debugging
      }
      
      console.log('🔄 handleSubmit creating context with synced step:', {
        originalCurrentStep: currentStep,
        actualCurrentStep,
        contextStep: context.currentStep,
        userId: context.userId,
        requestId,
        timestamp: context.timestamp
      })
      
      const response = await generateEngineResponse(userInput, context)
      
      // Initialize message content variable
      let messageContent: string | MessageContent = response.content
      
      // Handle capability responses (images, videos)
      if ('capabilityResponse' in response && response.capabilityResponse) {
        const capResponse = response.capabilityResponse
        
        if (capResponse.type === 'image' && capResponse.result) {
          // Create rich content with image
          messageContent = {
            text: response.content,
            image: {
              url: capResponse.result.url,
              prompt: capResponse.result.prompt,
              model: capResponse.result.model || 'DALL-E 3',
              cost: capResponse.cost || 0,
              metadata: capResponse.result.metadata || {}
            }
          }
          console.log('🎨 Added image to message content:', messageContent.image)
        } else if (capResponse.type === 'video' && capResponse.result) {
          // Create rich content with video
          messageContent = {
            text: response.content,
            video: {
              url: capResponse.result.url,
              prompt: capResponse.result.prompt,
              model: capResponse.result.model || 'Video Generator',
              cost: capResponse.cost || 0,
              metadata: capResponse.result.metadata || {}
            }
          }
          console.log('🎬 Added video to message content:', messageContent.video)
        }
      }
      
      // Update current scenario if provided in the response
      if ('scenario' in response && response.scenario) {
        setCurrentScenario(response.scenario)
      }
      
      // Add AI response with rich content support
      // Use the requestId from the response if available (which came from the engine)
      const responseRequestId = response.requestId || requestId
      
      // Update the thinking process to ensure it shows the correct step
      let finalThinkingProcess = response.thinkingProcess || thinkingProcess
      
      // If the engine response updated the step, make sure it's reflected in the thinking process
      if (response.nextStep && !finalThinkingProcess.includes(`Updated conversation step: ${response.nextStep}`)) {
        const displayStep = response.nextStep === 'completed' ? 'scenario' : response.nextStep
        finalThinkingProcess += `\n📍 Final conversation step: ${displayStep}`
      }
      
      addMessage({
        type: 'one',
        content: messageContent,
        thinkingProcess: finalThinkingProcess,
        requestId: responseRequestId // Use the engine's requestId for better synchronization
      })
      console.log(`✅ [${responseRequestId}] AI message added to conversation with rich content support`)
      
      // Handle Voice Mode features (subtitles and speech synthesis)
      if (isVoiceMode) {
        console.log('✅ Voice Mode confirmed - calling streamMessage')
        try {
          await streamMessage(response.content)
          console.log('✅ streamMessage completed successfully')
        } catch (streamError) {
          console.error('❌ streamMessage failed:', streamError)
        }
      }
      
    } catch (error) {
      console.error('❌ AI response generation failed:', error)
      // Fallback to simple response
      const fallbackResponse = `I heard you say "${userInput}". That's fascinating! Let me help you with that. What would you like to explore or create together?`
      
      addMessage({
        type: 'one',
        content: fallbackResponse
      })
      
      // Check voice mode state more robustly for fallback response too
      const currentVoiceMode = isVoiceMode || voiceModeRef.current
      if (currentVoiceMode) {
        console.log('✅ Voice Mode confirmed for fallback - calling streamMessage')
        await streamMessage(fallbackResponse)
      }
    }
  }

  const simulateTyping = (duration = 2000) => {
    setIsTyping(true)
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsTyping(false)
        resolve()
      }, duration)
    })
  }

  return (
    <div className={`flex flex-col h-full max-w-4xl mx-auto ${className}`}>
      {/* Messages Container - Hidden in Voice Mode */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide transition-all duration-300 ${
        isVoiceMode ? 'hidden' : 'block'
      }`}>
        {/* Custom scrollbar-hide style */}
        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;  /* Chrome, Safari and Opera */
          }
        `}</style>
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start gap-3 ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {message.type === 'one' ? (
                <div className="flex flex-col max-w-[80%]">
                  {/* One's name and avatar outside bubble */}
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-700' : 'text-white'}`}>
                      {user.oneName || 'One'}
                    </span>
                  </div>
                  
                  {/* Collapsible thinking process */}
                  {message.thinkingProcess && (
                    <div className="mb-2 ml-8">
                      <button
                        onClick={() => {
                          setMessageThinkingStates(prev => ({
                            ...prev,
                            [message.id]: !(prev[message.id] ?? false)
                          }))
                        }}
                        className={`text-xs ${theme === 'white' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'} flex items-center gap-1 transition-colors`}
                      >
                        <Brain className="w-3 h-3" />
                        <span>{(messageThinkingStates[message.id] ?? false) ? 'Hide' : 'Show'} thinking process</span>
                        <motion.div
                          animate={{ rotate: (messageThinkingStates[message.id] ?? false) ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          ▼
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {(messageThinkingStates[message.id] ?? false) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`mt-2 p-3 rounded-lg text-xs ${theme === 'white' ? 'bg-gray-50 text-gray-600 border border-gray-200' : 'bg-gray-800/50 text-gray-300 border border-gray-700'} font-mono whitespace-pre-line`}
                          >
                            {message.thinkingProcess}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div className={`conversation-bubble ml-8 ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                    <div className="text-sm md:text-base leading-relaxed font-medium" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                      {renderMessageContent(message.content, messages.indexOf(message) === 0)}
                    </div>
                    <div className={`text-xs ${theme === 'white' ? 'text-gray-600' : 'text-white/50'} mt-3`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col max-w-[80%]">
                  {/* User avatar only - no name display */}
                  <div className="flex items-center gap-2 mb-2 mr-1 justify-end">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-sm">
                      <User size={12} className="text-white" />
                    </div>
                  </div>
                  
                  {/* Message bubble */}
                  <div className={`conversation-bubble ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                    <div className="text-sm md:text-base leading-relaxed font-medium" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                      {renderMessageContent(message.content, false)}
                    </div>
                    <div className={`text-xs ${theme === 'white' ? 'text-gray-600' : 'text-white/50'} mt-3`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* AI Thinking indicator */}
        <AnimatePresence>
          {aiThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start mb-4"
            >
              <div className={`conversation-bubble ${theme === 'white' ? 'bg-blue-50/80 border-blue-200' : 'bg-blue-900/20 border-blue-500/30'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-blue-500 animate-pulse" />
                  <span className={`text-sm font-medium ${theme === 'white' ? 'text-blue-700' : 'text-blue-300'}`}>
                    {user.oneName || 'One'} is thinking with AI
                  </span>
                  {/* ARCHITECTURE FIX: Check service status through Engine instead of direct layer access */}
                  <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                  <div className="flex space-x-1 ml-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming message display */}
        <AnimatePresence>
          {streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex justify-start"
            >
              <div className="flex flex-col max-w-[80%]">
                {/* One's name and avatar outside bubble */}
                <div className="flex items-center gap-2 mb-2 ml-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-700' : 'text-white'}`}>
                    {user.oneName || 'One'}
                  </span>
                </div>
                
                {/* Message bubble */}
                <div className={`conversation-bubble ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                  <div className="text-sm md:text-base leading-relaxed font-medium" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                    {streamingMessage}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Regular typing indicator */}
        {isTyping && !streamingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-start"
          >
            <div className={`conversation-bubble ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center mr-2 shadow-lg shadow-purple-500/20">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                  </div>
                </div>
                <span className={`text-sm font-medium mr-3 ${theme === 'white' ? 'text-black' : 'text-white'}`}>
                  {user.oneName || 'One'} is thinking
                </span>
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Mode Status Indicator - Below Orb */}
      <AnimatePresence>
        {isVoiceMode && (isListening || showListeningIndicator) && !isAISpeaking && !effectiveIsMuted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-1/2 flex justify-center z-20 pointer-events-none"
            style={{ marginTop: '120px' }} // Position below the orb
          >
            <div className={`px-4 py-2 rounded-full ${theme === 'white' ? 'bg-green-50/90 border-green-200' : 'bg-green-900/30 border-green-500/40'} border backdrop-blur-md shadow-lg`}>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2 h-2 bg-green-500 rounded-full"
                />
                <span className={`text-xs font-medium ${theme === 'white' ? 'text-green-700' : 'text-green-300'}`}>
                  Listening
                </span>
                <div className="flex space-x-1 ml-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-3 bg-green-500 rounded-full"
                      animate={{
                        scaleY: [0.3, 1, 0.3],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      
      {/* Voice Mode Text Display - Center of Screen */}
      <AnimatePresence>
        {isVoiceMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
            onAnimationComplete={() => {
              console.log('📺 Voice Mode UI displayed:', {
                isVoiceMode,
                voiceTranscript: voiceTranscript ? voiceTranscript.substring(0, 30) + '...' : 'none',
                streamingMessage: streamingMessage ? streamingMessage.substring(0, 30) + '...' : 'none',
                isAISpeaking
              })
            }}
          >

            {/* Current Voice Input Text */}
            {voiceTranscript && !isAISpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center mb-4"
              >
                <div className={`px-6 py-4 rounded-2xl ${theme === 'white' ? 'bg-white/95 border-gray-200' : 'bg-black/70 border-white/20'} border backdrop-blur-md shadow-xl max-w-lg mx-auto`}>
                  <p className={`text-base ${theme === 'white' ? 'text-gray-800' : 'text-white'} leading-relaxed`}>
                    "{voiceTranscript}"
                  </p>
                </div>
              </motion.div>
            )}
            

            {streamingMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
                onAnimationComplete={() => {
                  console.log('💬 Streaming message displayed:', {
                    message: streamingMessage.substring(0, 50) + '...',
                    length: streamingMessage.length,
                    isVoiceMode: isVoiceMode
                  })
                }}
              >
                <div className={`px-6 py-4 rounded-2xl ${theme === 'white' ? 'bg-white/95 border-purple-200' : 'bg-black/70 border-purple-500/30'} border backdrop-blur-md shadow-xl max-w-lg mx-auto`}>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="w-2 h-2 bg-purple-500 rounded-full"
                    />
                    <span className={`text-xs font-medium ${theme === 'white' ? 'text-purple-700' : 'text-purple-300'}`}>
                      {user.oneName || 'One'}
                    </span>
                  </div>
                  <p className={`text-base ${theme === 'white' ? 'text-gray-800' : 'text-white'} leading-relaxed`}>
                    {streamingMessage}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Form - Hidden in Voice Mode */}
      <div className={`p-4 md:p-6 pb-6 md:pb-8 border-t ${theme === 'white' ? 'border-gray-200' : 'border-white/10'} mt-auto transition-all duration-300 ${
        isVoiceMode ? 'hidden' : 'block'
      }`}>
        <div className="w-full max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex w-full">
            <div className="relative flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  // Auto-resize textarea
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as any)
                  }
                }}
                placeholder={
                  isListening 
                    ? "Listening..."
                    : currentStep === 'naming-one' 
                    ? "Give me a name..." 
                    : currentStep === 'naming-user'
                    ? "What's your name?"
                    : "Share your thoughts..."
                }
                className={`w-full min-h-[52px] max-h-[120px] resize-none ${theme === 'white' ? 'bg-gray-100/80 border-gray-200 placeholder-gray-500' : 'bg-white/10 border-white/20 placeholder-white/50'} backdrop-blur-sm border rounded-xl pl-12 pr-20 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base font-light shadow-lg ${isListening ? 'ring-2 ring-red-500' : ''} scrollbar-hide`}
                style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                autoFocus
                disabled={isListening}
                rows={1}
              />
              
              {/* File upload button */}
              <motion.button
                type="button"
                className={`absolute left-3 bottom-3 p-2 rounded-lg transition-colors ${
                  theme === 'white' 
                    ? 'text-gray-600 hover:bg-gray-200' 
                    : 'text-white/70 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Upload file"
              >
                <Paperclip size={16} />
              </motion.button>
              

              {/* Voice Mode button */}
              <motion.button
                type="button"
                onClick={async () => {
                  console.log('🎙️ CRITICAL: Switching to Voice Mode - preserving conversation state:', {
                    currentStep,
                    messagesCount: messages.length,
                    userId: user.id
                  })
                  
                  try {
                    // Get the current engine context to ensure we have the correct state
                    const scenarioLayer = originEngine.getScenarioLayer()
                    // Use consistent user ID approach with null check
                    const userId = user.id || 'mock-user-123'
                    const engineContext = scenarioLayer.getUserContext(userId)
                    
                    // Store complete conversation state before switching modes
                    const currentConversationState = {
      step: currentStep || engineContext?.currentStep || engineContext?.step,
      messagesCount: messages.length,
      engineStep: engineContext?.currentStep || engineContext?.step,
      timestamp: new Date().toISOString(),
      // Save complete messages array with thinking process
      messages: messages
    }
                    
                    console.log('💾 Saving detailed conversation state before mode switch:', currentConversationState)
                    sessionStorage.setItem('conversationState', JSON.stringify(currentConversationState))
                    
                    // Switch to voice mode
                    console.log('🎙️ Switching to voice mode with preserved context:', {
                      step: currentStep,
                      messagesCount: messages.length,
                      hasThinkingProcess: messages.some(m => m.thinkingProcess)
                    })
                    setIsVoiceMode(true)
                  } catch (error) {
                    console.error('❌ Error saving conversation state:', error)
                    // Still switch modes even if saving state fails
                    setIsVoiceMode(true)
                  }
                }}
                className={`absolute right-3 bottom-3 p-2 rounded-lg transition-colors ${
                  theme === 'white' 
                    ? 'text-gray-600 hover:bg-gray-200' 
                    : 'text-white/70 hover:bg-white/20'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Enter Voice Mode"
              >
                {/* Audio wave icon */}
                {/* Audio wave icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2 10v4" />
                  <path d="M6 6v12" />
                  <path d="M10 3v18" />
                  <path d="M14 8v8" />
                  <path d="M18 5v14" />
                  <path d="M22 10v4" />
                </svg>
              </motion.button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Voice Mode Controls - Bottom center */}
      <AnimatePresence>
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
                  effectiveIsMuted
                    ? (theme === 'white' 
                      ? 'bg-red-100/80 text-red-800 border border-red-200/50 hover:bg-red-200/90'
                      : 'bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30')
                    : (theme === 'white'
                      ? 'bg-white/80 text-gray-800 border border-gray-200/50 hover:bg-white/90'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20')
                }`}
                whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Only allow manual mute/unmute when AI is not speaking
                  if (isAISpeaking) {
                    console.log('⚠️ Cannot manually control mute while AI is speaking')
                    return
                  }
                  
                  const newManualMutedState = !manuallyMuted
                  console.log('🔇 Manual mute button clicked, new state:', newManualMutedState)
                  
                  setManuallyMuted(newManualMutedState)
                  
                  // Stop/start voice recognition based on manual mute state
                  if (newManualMutedState) {
                    // Manually muted - forcefully stop recognition
                    console.log('🔇 Manually muting - stopping all voice recognition')
                    if (recognition) {
                      try {
                        recognition.stop()
                        console.log('✅ Voice recognition stopped successfully')
                      } catch (error) {
                        console.error('❌ Failed to stop recognition:', error)
                      }
                    }
                    setIsListening(false)
                    setShowListeningIndicator(false)
                    console.log('✅ Manual mute state applied successfully')
                  } else {
                    // Manually unmuted - restart recognition if in Voice Mode and AI not speaking
                    console.log('🔊 Manually unmuting - restarting voice recognition')
                    if (isVoiceMode && !isAISpeaking) {
                      // Use the centralized start function to avoid conflicts
                      setTimeout(() => {
                        if (!manuallyMuted && !isAISpeakingRef.current) {
                          startVoiceRecognition()
                        }
                      }, 100)
                    }
                  }
                }}
                title={
                  isAISpeaking 
                    ? "AI is speaking - microphone auto-muted"
                    : effectiveIsMuted 
                      ? "Unmute microphone" 
                      : "Mute microphone"
                }
                style={{
                  cursor: isAISpeaking ? 'not-allowed' : 'pointer',
                  opacity: isAISpeaking ? 0.7 : 1
                }}
              >
                {effectiveIsMuted ? (
                  <MicOff size={24} />
                ) : (
                  <Mic size={24} />
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
                onClick={async () => {
                  console.log('💬 CRITICAL: Switching to Chat Mode - preserving conversation state:', {
                    currentStep,
                    messagesCount: messages.length,
                    userId: user.id
                  })
                  
                  try {
                    // Get the current engine context to ensure we have the correct state
                    const scenarioLayer = originEngine.getScenarioLayer()
                    // Use consistent user ID approach with null check
                    const userId = user.id || 'mock-user-123'
                    const engineContext = scenarioLayer.getUserContext(userId)
                    
                    // Store complete conversation state before switching modes
                    const currentConversationState = {
      step: currentStep || engineContext?.currentStep || engineContext?.step,
      messagesCount: messages.length,
      engineStep: engineContext?.currentStep || engineContext?.step,
      timestamp: new Date().toISOString(),
      // Save complete messages array with thinking process
      messages: messages
    }
                    
                    console.log('💾 Saving detailed conversation state before mode switch:', currentConversationState)
                    sessionStorage.setItem('conversationState', JSON.stringify(currentConversationState))
                    
                    // Stop voice recognition before switching modes
                    if (recognition && isListening) {
                      try {
                        recognition.stop()
                        console.log('✅ Voice recognition stopped before mode switch')
                      } catch (stopError) {
                        console.error('❌ Failed to stop voice recognition:', stopError)
                      }
                    }
                    
                    // Switch to chat mode
                    setIsVoiceMode(false)
                  } catch (error) {
                    console.error('❌ Error saving conversation state:', error)
                    // Still switch modes even if saving state fails
                    setIsVoiceMode(false)
                  }
                }}
                title="Exit Voice Mode"
              >
                {/* Close icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Upgrade Modal */}
      <UpgradeModal />
    </div>
  )
}
