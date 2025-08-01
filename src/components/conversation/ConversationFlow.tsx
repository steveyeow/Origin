'use client'

// Speech Recognition types
declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { Send, Mic, MicOff, Paperclip, User } from 'lucide-react'
import { useThemeContext } from '@/context/ThemeContext'
import TypewriterText from '@/components/ui/TypewriterText'
import { OriginXEngine } from '@/engine/core/engine'
import { OpenAIService } from '@/services/llm/openai-service'
import { ElevenLabsService, DEFAULT_ONE_VOICE_CONFIG, VOICE_PRESETS } from '@/services/voice/elevenlabs-service'
import type { UserContext, Scenario } from '@/types/engine'

interface ConversationFlowProps {
  className?: string
  isMuted?: boolean
  voiceService?: ElevenLabsService
  // Callback to notify parent of Voice Mode changes
  onVoiceModeChange?: (isVoiceMode: boolean) => void
}

// AI-powered conversation engine
const aiEngine = new OriginXEngine()
const llmService = new OpenAIService()

// Helper function to create user context
const createUserContext = (user: any): UserContext => {
  const now = new Date()
  const timeOfDay = now.getHours() < 12 ? 'morning' : 
                   now.getHours() < 17 ? 'afternoon' : 
                   now.getHours() < 21 ? 'evening' : 'night'
  
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
  
  return {
    userId: user.id || 'anonymous',
    sessionId: `session_${Date.now()}`,
    name: user.name || '',
    currentStep: 'completed',
    timeContext: {
      timeOfDay,
      dayOfWeek,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    emotionalState: {
      mood: 'curious',
      energy: 'medium',
      creativity: 'high'
    },
    preferences: {
      communicationStyle: 'casual',
      creativityLevel: 'balanced',
      contentTypes: ['text', 'image']
    },
    recentInteractions: []
  }
}

export default function ConversationFlow({ 
  className = '',
  isMuted = false,
  voiceService,
  onVoiceModeChange
}: ConversationFlowProps) {
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

  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)
  const [localStreamingMessage, setLocalStreamingMessage] = useState('')
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  const [thinkingProcess, setThinkingProcess] = useState<string>('')
  const [showThinkingProcess, setShowThinkingProcess] = useState(false)
  
  // SIMPLIFIED: Only internal Voice Mode states
  const [isListening, setIsListening] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [internalIsMuted, setInternalIsMuted] = useState(false)
  
  // Always use internal mute state for Voice Mode functionality
  const effectiveIsMuted = internalIsMuted
  
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
  
  // Prevent duplicate voice synthesis
  const lastSynthesizedContentRef = useRef('')
  const isSynthesizingRef = useRef(false)
  
  // Voice synthesis service is now passed as prop
  
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
        console.log('Audio context initialized:', ctx.state)
        
        // Try to activate audio context on first user interaction
        const handleFirstInteraction = async () => {
          if (ctx.state === 'suspended') {
            try {
              await ctx.resume()
              console.log('Audio context resumed after user interaction')
            } catch (error) {
              console.log('Failed to resume audio context:', error)
            }
          }
          // Remove listeners after first interaction
          document.removeEventListener('click', handleFirstInteraction)
          document.removeEventListener('touchstart', handleFirstInteraction)
        }
        
        document.addEventListener('click', handleFirstInteraction)
        document.addEventListener('touchstart', handleFirstInteraction)
      } catch (error) {
        console.log('Audio context not available:', error)
      }
    }
  }, [])
  
  // Sci-fi sound effects
  const playSciFiSound = async (type: 'listening-start' | 'listening-end' | 'ai-start') => {
    try {
      // Ensure audio context is resumed (required for user interaction)
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      if (!audioContext || audioContext.state !== 'running') {
        console.log('Audio context not available or not running')
        return
      }
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (type === 'listening-start') {
        // Rising sci-fi tone for listening start
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        console.log('🔊 Playing listening-start sound')
      } else if (type === 'ai-start') {
        // Deep sci-fi tone for AI speaking
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.4)
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)
        console.log('🔊 Playing ai-start sound')
      }
    } catch (error) {
      console.log('Sound effect failed:', error)
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

  // Use a ref to track initialization state to prevent duplicate messages
  const isInitializedRef = useRef(false)

  useEffect(() => {
    // Initialize conversation when entering naming-one step
    if (currentStep === 'naming-one' && !isInitializedRef.current) {
      isInitializedRef.current = true
      setHasInitialized(true)
      
      // Add initial greeting message when conversation starts
      addMessage({
        type: 'one',
        content: "Hi traveler, welcome to Origin, your generative universe that thinks, feels, creates with you. I'm One, your navigator. Would you like to give me a new name?"
      })
    }
  }, [currentStep, addMessage])

  // Use a ref to track if we've asked for the user's name
  const hasAskedForNameRef = useRef(false)

  // Removed automatic naming-user message generation
  // All responses are now handled through engine-driven handleConversationStep

  // Use a ref to track if we've proposed a scenario
  const hasProposedScenarioRef = useRef(false)

  // Removed automatic scenario generation to prevent duplicate messages
  // All responses are now handled through engine-driven handleConversationStep

  // AI-powered scenario generation
  const generateAIScenario = async () => {
    try {
      setAiThinking(true)
      const userContext = createUserContext(user)
      
      // Generate dynamic scenario using AI
      const scenario = await llmService.generateDynamicScenario(userContext, [])
      setCurrentScenario({
        id: `scenario_${Date.now()}`,
        type: 'creative_prompt',
        title: scenario.title,
        description: scenario.description,
        prompt: scenario.prompt,
        difficulty: 'intermediate',
        estimatedTime: 25,
        tags: scenario.tags
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
            willProcess: transcript.trim().length > 0
          })
          
          if (transcript.trim()) {
            console.log('🎤 Processing voice input as message:', transcript)
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
              currentVoiceMode: currentMode
            })
            
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
          console.log('🔇 No speech detected, will retry in Voice Mode')
          // Auto-restart if no speech detected in Voice Mode
          if (voiceModeRef.current && !mutedRef.current) {
            setTimeout(() => {
              console.log('🔄 Attempting to restart voice recognition after no-speech')
              if (voiceModeRef.current && !mutedRef.current) {
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
          // For other errors, try to restart if in Voice Mode
          if (isVoiceMode && !isMuted && event.error !== 'aborted') {
            setTimeout(() => {
              console.log('🔄 Attempting to restart voice recognition after error')
              startVoiceRecognition()
            }, 2000)
          }
        }
      }
      
      recognitionInstance.onend = () => {
        console.log('🔚 Voice recognition ended')
        setIsListening(false)
        setShowListeningIndicator(false)
        
        // SIMPLIFIED: In Voice Mode, automatically restart recognition
        console.log('🔍 Auto-restart check:', {
          voiceModeRef: voiceModeRef.current,
          mutedRef: mutedRef.current,
          shouldRestart: voiceModeRef.current && !mutedRef.current
        })
        
        if (voiceModeRef.current && !mutedRef.current) {
          console.log('🔄 Auto-restarting voice recognition in Voice Mode')
          setTimeout(() => {
            console.log('🔍 Delayed restart check:', {
              voiceModeRef: voiceModeRef.current,
              mutedRef: mutedRef.current,
              shouldRestart: voiceModeRef.current && !mutedRef.current
            })
            
            if (voiceModeRef.current && !mutedRef.current && recognitionInstance) {
              try {
                recognitionInstance.start()
                setIsListening(true)
                setShowListeningIndicator(true)
                console.log('✅ Voice recognition restarted successfully')
              } catch (error) {
                console.error('❌ Failed to restart recognition:', error)
              }
            } else {
              console.log('⚠️ Skipping restart - conditions not met')
            }
          }, 500)
        } else {
          console.log('✅ Listening state cleared:', { 
            isListening: false, 
            showIndicator: false,
            reason: !voiceModeRef.current ? 'not in voice mode' : 'muted'
          })
        }
      }
      
      console.log('✅ Speech recognition instance created and configured')
      setRecognition(recognitionInstance)
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

  // SIMPLIFIED: Auto-manage voice recognition in Voice Mode
  useEffect(() => {
    console.log('🔍 Voice Mode effect triggered:', { 
      timestamp: new Date().toISOString(),
      isVoiceMode, 
      recognition: !!recognition, 
      isListening, 
      isMuted 
    })
    
    if (isVoiceMode && recognition && !effectiveIsMuted) {
      // In Voice Mode, always keep voice recognition active
      if (!isListening) {
        console.log('🎤 Voice Mode active - starting voice recognition')
        setTimeout(() => {
          if (isVoiceMode && !effectiveIsMuted && !isListening) {
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
  }, [isVoiceMode, recognition, effectiveIsMuted]) // Removed isListening from dependencies to avoid loops
  
  // Helper function to start voice recognition with proper error handling
  const startVoiceRecognition = () => {
    if (!recognition) {
      console.error('❌ No recognition instance available')
      return
    }
    
    if (effectiveIsMuted) {
      console.log('🔇 Recognition muted, not starting')
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
        if (!isListening) {
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
          console.log('⚠️ Recognition started while checking permissions')
          setShowListeningIndicator(true)
        }
      })
      .catch((error) => {
        console.error('🚫 Microphone permission denied:', error)
        alert('Microphone access is required for Voice Mode. Please allow microphone access and try again.')
      })
  }

  // Handle voice input - Use same logic as handleSubmit
  const handleVoiceInput = async (transcript: string) => {
    console.log('🎤 handleVoiceInput called with:', { 
      transcript, 
      transcriptLength: transcript.length,
      currentStep, 
      'currentVoiceMode': isVoiceMode
    })
  
    if (!transcript.trim()) {
      console.log('❌ Empty transcript, returning')
      return
    }
  
    console.log('✅ Processing voice input as message:', transcript.trim())
    
    try {
      // Use the EXACT same logic as handleSubmit for consistency
      const userInput = transcript.trim()
      
      // Add user message to conversation history
      console.log('📝 Adding user message to conversation')
      addMessage({
        type: 'user',
        content: userInput
      })
      console.log('✅ User message added successfully')
      
      // Clear voice transcript immediately
      setVoiceTranscript('')
      
      // Process based on current step using engine-driven approach (SAME AS handleSubmit)
      if (currentStep === 'naming-one') {
        const extractedName = await extractName(userInput, true)
        setUser({ oneName: extractedName })
        
        // Generate contextual response for naming step
        await handleConversationStep(userInput, 'naming-one')
        setCurrentStep('naming-user')
        
      } else if (currentStep === 'naming-user') {
        const extractedName = await extractName(userInput, false)
        setUser({ name: extractedName })
        
        // Generate contextual response for user naming step and transition to scenario
        await handleConversationStep(userInput, 'naming-user-complete')
        setCurrentStep('scenario')
        
      } else if (currentStep === 'scenario') {
        // Use engine-driven response for general conversation
        await handleConversationStep(userInput, 'scenario')
      }
      
      console.log('✅ Voice input processing completed successfully')
    } catch (error) {
      console.error('❌ Error processing voice input:', error)
      // Add error message to conversation
      addMessage({
        type: 'one',
        content: "I'm sorry, I had trouble processing your voice input. Could you try again?"
      })
    }
  }

  // Voice input functions
  const startVoiceInput = () => {
    if (recognition && !isListening && !effectiveIsMuted) {
      console.log('🎤 Starting voice input')
      recognition.start()
    } else if (effectiveIsMuted) {
      console.log('🔇 Voice input muted, not starting recognition')
    }
  }

  const stopVoiceInput = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  // Stream message with typing effect and voice synthesis
  const streamMessage = async (content: string) => {
    console.log('🗨️ streamMessage called:', { 
      content: content.substring(0, 50) + '...', 
      isVoiceMode,
      voiceModeRef: voiceModeRef.current,
      voiceService: !!voiceService 
    })
    
    // Voice Mode check is already done before calling this function
    // Proceeding with Voice Mode features
    
    console.log('✅ In Voice Mode - processing subtitles and voice synthesis')
    
    // 1. ALWAYS set streaming message for subtitles in Voice Mode
    console.log('📝 Setting streamingMessage for subtitles:', content.substring(0, 50) + '...')
    setStreamingMessage(content)
    
    // 2. Set AI speaking state
    setIsAISpeaking(true)
    setShowListeningIndicator(false)
    
    // 3. Play sci-fi sound
    playSciFiSound('ai-start')
    
    // 4. Voice synthesis - ALWAYS attempt if voiceService is available
    if (voiceService) {
      console.log('🔊 Starting voice synthesis...')
      
      try {
        await voiceService.synthesizeSpeech(content)
        console.log('✅ Voice synthesis completed successfully')
        
      } catch (error) {
        console.error('❌ Voice synthesis failed:', error)
      }
      
    } else {
      console.warn('⚠️ No voice service available for synthesis')
    }
    
    // 5. Restore listening state after AI finishes speaking
    setIsAISpeaking(false)
    if (!effectiveIsMuted) {
      console.log('🔄 Restoring listening indicator')
      setShowListeningIndicator(true)
    }
    
    // 6. Clear streaming message after delay to show subtitles
    setTimeout(() => {
      console.log('🧽 Clearing streamingMessage after delay')
      setStreamingMessage('')
    }, 2000) // Longer delay to ensure subtitles are visible
    
    console.log('✅ streamMessage completed successfully')
  }

  // Engine-driven response generation using AI layers
  const generateEngineResponse = async (userInput: string, context: any) => {
    console.log('🤖 generateEngineResponse started:', { userInput, context, llmReady: llmService.isReady() })
    
    try {
      setAiThinking(true)
      setThinkingProcess('')
      
      const userContext = createUserContext(user)
      console.log('👤 User context created:', userContext)
      
      let actualThinkingSteps = ''
      
      // Step 1: Interactive Scenario Layer - Generate dynamic scenario
      actualThinkingSteps += `🎯 Analyzing user input: "${userInput}"\n`
      actualThinkingSteps += `📍 Current conversation step: ${context.step}\n`
      actualThinkingSteps += `👤 User context: ${userContext.name || 'Anonymous'} (${userContext.timeContext.timeOfDay})\n\n`
      setThinkingProcess(actualThinkingSteps)
      
      actualThinkingSteps += '🔄 Interactive Scenario Layer: Generating contextual scenario...\n'
      setThinkingProcess(actualThinkingSteps)
      
      console.log('🔄 About to call llmService.generateDynamicScenario...')
      
      const scenario = await llmService.generateDynamicScenario(userContext, [])
      console.log('✅ Scenario generated:', scenario)
      actualThinkingSteps += `✅ Scenario generated: ${scenario.title || 'General conversation'}\n\n`
      setThinkingProcess(actualThinkingSteps)
      
      // Step 2: Intention Reasoning Layer - Extract and enrich intent
      actualThinkingSteps += '🧠 Intention Reasoning Layer: Analyzing user intent...\n'
      setThinkingProcess(actualThinkingSteps)
      
      console.log('🧠 About to call llmService.processUserIntent...')
      const intent = await llmService.processUserIntent(userInput, userContext)
      console.log('✅ Intent processed:', intent)
      actualThinkingSteps += `✅ Intent detected: ${intent.primaryGoal || 'general_help'} (confidence: ${intent.confidence || 0.8})\n\n`
      setThinkingProcess(actualThinkingSteps)
      
      // Step 3: Generate contextual response based on engine processing
      actualThinkingSteps += '💬 Response Generation: Creating contextual response...\n'
      setThinkingProcess(actualThinkingSteps)
      
      console.log('💬 About to call llmService.generateContextualResponse...')
      // Use LLM service to generate response based on engine analysis
      const response = await llmService.generateContextualResponse({
        userInput,
        intent,
        scenario,
        userContext,
        conversationStep: context.step
      })
      console.log('✅ Response generated:', response)
      
      actualThinkingSteps += `✅ Response generated (${response.content.length} characters)\n`
      actualThinkingSteps += `🎯 Response type: ${context.step === 'naming-one' ? 'AI naming' : context.step === 'naming-user-complete' ? 'User greeting' : 'General conversation'}\n`
      setThinkingProcess(actualThinkingSteps)
      
      setAiThinking(false)
      console.log('✅ generateEngineResponse completed successfully:', response)
      return response
      
    } catch (error) {
      console.error('Engine response generation failed:', error)
      setAiThinking(false)
      
      // Clear thinking process on error
      setThinkingProcess('')
      
      // Fallback to basic response
      return {
        content: "I'd love to help you with that. Could you tell me more about what you're looking for?",
        followUp: null
      }
    }
  }

  // Generate engine-driven response for any conversation step
  const handleConversationStep = async (userInput: string, step: string) => {
    console.log('🎯 handleConversationStep called:', { 
      userInput, 
      step,
      isVoiceMode
    })
    
    // FORCE SIMPLE RESPONSE FOR TESTING - BYPASS LLM COMPLETELY
    const simpleResponses = {
      'naming-one': `Thank you! I'll be happy to be called that. Now, what should I call you? I'd love to know your name so we can have a more personal connection.`,
      'naming-user-complete': `Perfect! I like that name. And what about you - what would you like me to call you?`,
      'scenario': `That's interesting! I'd love to help you explore that further. What specifically would you like to create or discuss?`
    }
    
    const fallbackResponse = `I heard you say "${userInput}". That's fascinating! Let me help you with that. What would you like to explore or create together?`
    
    const responseContent = simpleResponses[step as keyof typeof simpleResponses] || fallbackResponse
    
    console.log('📤 Using simple response:', responseContent.substring(0, 50) + '...')
    
    try {
      // Add AI message to conversation history
      addMessage({
        type: 'one',
        content: responseContent
      })
      console.log('✅ AI message added to conversation')
      
      // Handle Voice Mode features (subtitles and speech synthesis)
      // Capture Voice Mode state at the beginning of the function
      const initialVoiceMode = voiceModeRef.current
      console.log('🎬 Voice Mode state captured at start:', {
        timestamp: new Date().toISOString(),
        initialVoiceMode,
        isVoiceMode,
        voiceService: !!voiceService
      })
      
      // Always call streamMessage if we started in Voice Mode
      if (initialVoiceMode) {
        console.log('✅ Voice Mode confirmed - calling streamMessage')
        console.log('📞 Calling streamMessage with content:', responseContent.substring(0, 30) + '...')
        
        try {
          await streamMessage(responseContent)
          console.log('✅ streamMessage completed successfully')
        } catch (streamError) {
          console.error('❌ streamMessage failed:', streamError)
          throw streamError
        }
      } else {
        console.log('⚠️ Not in Voice Mode - skipping streamMessage')
      }
      
    } catch (error) {
      console.error('❌ Even simple response failed:', error)
      // Last resort - try the most basic response
      const fallbackMsg = `Hello! I heard you say "${userInput}".`
      addMessage({
        type: 'one',
        content: fallbackMsg
      })
      await streamMessage(fallbackMsg)
    }
  }

  // Extract name from user input using AI or patterns
  const extractName = async (input: string, isForOne: boolean = false): Promise<string> => {
    try {
      // Try AI-powered name extraction first
      if (llmService.isReady()) {
        const prompt = isForOne 
          ? `Extract the name the user wants to give to their AI assistant from this input: "${input}". Return only the name, nothing else. If no clear name is provided, return "One".`
          : `Extract the user's name from this input: "${input}". Return only the name, nothing else. If no clear name is provided, return "User".`
        
        // Use simple name extraction with LLM
        try {
          const extractionContext = {
            userInput: input,
            intent: { primaryGoal: 'extract_name' },
            scenario: null,
            userContext: createUserContext(user),
            conversationStep: isForOne ? 'naming-one' : 'naming-user'
          }
          
          const response = await llmService.generateContextualResponse(extractionContext)
          const extractedName = response.content.trim()
          
          if (extractedName && extractedName.length > 0 && extractedName !== 'User' && extractedName !== 'One') {
            return extractedName
          }
        } catch (error) {
          console.log('AI name extraction failed, using pattern matching')
        }
      }
    } catch (error) {
      console.error('Error extracting name with AI:', error)
    }
    
    // Fallback to simple pattern matching only for very clear cases
    if (isForOne) {
      // Only match very explicit naming patterns
      const explicitPatterns = [
        /(?:call you|name you|you're|your name is)\s+([A-Z][a-zA-Z]+)/i,
        /(?:i'll call you|let's call you)\s+([A-Z][a-zA-Z]+)/i
      ]
      
      for (const pattern of explicitPatterns) {
        const match = input.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }
      
      // Single word that's clearly a name (capitalized, not a common word)
      const commonWords = ['hi', 'hello', 'hey', 'how', 'are', 'you', 'what', 'that', 'this', 'good', 'fine', 'ok', 'okay']
      if (/^[A-Z][a-zA-Z]+$/.test(input.trim()) && !commonWords.includes(input.trim().toLowerCase())) {
        return input.trim()
      }
    } else {
      // Handle patterns for user naming
      const userNamingPatterns = [
        /(?:call me|name is|i'm|im)\s+([A-Z][a-zA-Z]+)/i,
        /(?:my name is|i am)\s+([A-Z][a-zA-Z]+)/i
      ]
      
      for (const pattern of userNamingPatterns) {
        const match = input.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }
    }
    
    return isForOne ? 'One' : 'User'
  }

// ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const userInput = inputValue.trim()
    if (!userInput) return

    setInputValue('') // Clear input immediately for better UX

    // Add user message
    addMessage({
      type: 'user',
      content: userInput
    })

    // Process based on current step using engine-driven approach
    if (currentStep === 'naming-one') {
      const extractedName = await extractName(userInput, true)
      setUser({ oneName: extractedName })
      
      // Generate contextual response for naming step
      await handleConversationStep(userInput, 'naming-one')
      setCurrentStep('naming-user')
      
    } else if (currentStep === 'naming-user') {
      const extractedName = await extractName(userInput, false)
      setUser({ name: extractedName })
      
      // Generate contextual response for user naming step and transition to scenario
      await handleConversationStep(userInput, 'naming-user-complete')
      setCurrentStep('scenario')
      
    } else if (currentStep === 'scenario') {
      // Use engine-driven response for general conversation
      await handleConversationStep(userInput, 'scenario')
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
                    <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-700' : 'text-gray-300'}`}>
                      {user.oneName || 'One'}
                    </span>
                  </div>
                  
                  {/* Collapsible thinking process */}
                  {thinkingProcess && index === messages.length - 1 && (
                    <div className="mb-2 ml-8">
                      <button
                        onClick={() => setShowThinkingProcess(!showThinkingProcess)}
                        className={`text-xs ${theme === 'white' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'} flex items-center gap-1 transition-colors`}
                      >
                        <Brain className="w-3 h-3" />
                        <span>{showThinkingProcess ? 'Hide' : 'Show'} thinking process</span>
                        <motion.div
                          animate={{ rotate: showThinkingProcess ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          ▼
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {showThinkingProcess && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`mt-2 p-3 rounded-lg text-xs ${theme === 'white' ? 'bg-gray-50 text-gray-600 border border-gray-200' : 'bg-gray-800/50 text-gray-300 border border-gray-700'} font-mono whitespace-pre-line`}
                          >
                            {thinkingProcess}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div className={`conversation-bubble ml-8 ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                    <div className="text-sm md:text-base leading-relaxed font-medium" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                      {messages.indexOf(message) === 0 ? (
                        <p style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}>
                          {message.content}
                        </p>
                      ) : (
                        <TypewriterText 
                          text={message.content} 
                          speed={30}
                          className="block"
                          style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                        />
                      )}
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
                  {/* User's name and avatar outside bubble */}
                  <div className="flex items-center gap-2 mb-2 mr-1 justify-end">
                    <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-700' : 'text-gray-300'}`}>
                      {user.name || 'You'}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-sm">
                      <User size={12} className="text-white" />
                    </div>
                  </div>
                  
                  {/* Message bubble */}
                  <div className={`conversation-bubble ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                    <div className="text-sm md:text-base leading-relaxed font-medium" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                      <p>{message.content}</p>
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
                  {llmService.isReady() && (
                    <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                  )}
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
                  <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-700' : 'text-gray-300'}`}>
                    {user.oneName || 'One'}
                  </span>
                </div>
                
                {/* Message bubble */}
                <div className={`conversation-bubble ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}>
                  <div className="text-sm md:text-base leading-relaxed font-medium" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                    {streamingMessage}
                    <motion.span 
                      className="inline-block ml-1"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      |  
                    </motion.span>
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

      {/* Voice Mode Status Indicator - Above Orb */}
      <AnimatePresence>
        {isVoiceMode && (isListening || showListeningIndicator) && !isAISpeaking && !effectiveIsMuted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ marginTop: '-140px' }} // Position above the orb
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
                onClick={() => setIsVoiceMode(true)}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 10v4"/>
                  <path d="M6 6v12"/>
                  <path d="M10 3v18"/>
                  <path d="M14 8v8"/>
                  <path d="M18 5v14"/>
                  <path d="M22 10v4"/>
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
                  const newMutedState = !effectiveIsMuted
                  console.log('🔇 Mute button clicked, new state:', newMutedState)
                  
                  // Always use internal state for mute functionality
                  setInternalIsMuted(newMutedState)
                  
                  // Stop/start voice recognition based on mute state
                  if (newMutedState) {
                    // Muted - forcefully stop recognition
                    console.log('🔇 Muting - stopping all voice recognition')
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
                    console.log('✅ Mute state applied successfully')
                  } else {
                    // Unmuted - restart recognition if in Voice Mode
                    console.log('🔊 Unmuting - restarting voice recognition')
                    if (isVoiceMode && recognition) {
                      try {
                        recognition.start()
                        setIsListening(true)
                        setShowListeningIndicator(true)
                        console.log('✅ Voice recognition restarted successfully')
                      } catch (error) {
                        console.error('❌ Failed to restart recognition:', error)
                      }
                    }
                  }
                }}
                title={effectiveIsMuted ? "Unmute microphone" : "Mute microphone"}
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
                onClick={() => setIsVoiceMode(false)}
                title="Exit Voice Mode"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
