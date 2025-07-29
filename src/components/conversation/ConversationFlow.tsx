'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { Send, User } from 'lucide-react'
import { useThemeContext } from '@/context/ThemeContext'
import TypewriterText from '@/components/ui/TypewriterText'

interface ConversationFlowProps {
  className?: string
}

const ONBOARDING_SCENARIOS = [
  "How are you feeling today? What's on your mind?",
  "I sense creativity in the air... what's sparking your imagination right now?",
  "What kind of story would you like to bring to life today?",
  "I'm feeling inspired... want to create something amazing together?",
  "Your mind seems full of possibilities... what shall we explore?",
  "I'm in rest mode... but you can wake me up anytime to create something wonderful.",
  "The universe is full of stories waiting to be told... what's yours?",
  "I can feel the creative energy... what would you like to manifest today?"
]

export default function ConversationFlow({ className = '' }: ConversationFlowProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const [hasInitialized, setHasInitialized] = useState(false)
  const [lastStep, setLastStep] = useState('')
  const [hasAskedForName, setHasAskedForName] = useState(false)
  const [hasProposedScenario, setHasProposedScenario] = useState(false)

  // Use a ref to track initialization state to prevent duplicate messages
  const isInitializedRef = useRef(false)

  useEffect(() => {
    // Always ensure the first greeting is shown when entering the conversation page
    if (currentStep === 'naming-one' && !isInitializedRef.current) {
      isInitializedRef.current = true
      setHasInitialized(true)
      
      // Add message immediately without typing indicator for the first greeting
      addMessage({
        type: 'one',
        content: "Hi traveler, welcome to Origin, your generative universe—thinks, feels, creates with you. I'm One, your navigator. You can give me any name you like."
      })
    }
  }, [currentStep, addMessage])

  // Use a ref to track if we've asked for the user's name
  const hasAskedForNameRef = useRef(false)

  useEffect(() => {
    if (currentStep === 'naming-user' && user.oneName && !hasAskedForName && !hasAskedForNameRef.current) {
      hasAskedForNameRef.current = true
      setHasAskedForName(true)
      setLastStep('naming-user')
      
      // Show typing indicator before message appears
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addMessage({
          type: 'one',
          content: `Thank you for calling me ${user.oneName}! Now, what should I call you? I'd love to know your name so we can have a more personal connection.`
        })
      }, 1500)
    }
  }, [currentStep, user.oneName, hasAskedForName, addMessage])

  // Use a ref to track if we've proposed a scenario
  const hasProposedScenarioRef = useRef(false)

  useEffect(() => {
    if (currentStep === 'scenario' && user.name && user.oneName && !hasProposedScenario && !hasProposedScenarioRef.current) {
      hasProposedScenarioRef.current = true
      setHasProposedScenario(true)
      
      // Propose a random scenario
      const randomScenario = ONBOARDING_SCENARIOS[Math.floor(Math.random() * ONBOARDING_SCENARIOS.length)]
      
      // Show typing indicator before message appears
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        addMessage({
          type: 'one',
          content: `Nice to meet you, ${user.name}! ${randomScenario}`
        })
      }, 1500)
    }
  }, [currentStep, user.name, user.oneName, hasProposedScenario, addMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userInput = inputValue.trim()
    setInputValue('') // Clear input immediately for better UX

    // Add user message
    addMessage({
      type: 'user',
      content: userInput
    })

    // Process based on current step
    if (currentStep === 'naming-one') {
      setUser({ oneName: userInput })
      setCurrentStep('naming-user')
      // Let the useEffect handle the response
    } else if (currentStep === 'naming-user') {
      setUser({ name: userInput })
      setCurrentStep('scenario')
      // Let the useEffect handle the response
    } else if (currentStep === 'scenario') {
      // This would trigger the next phase of interaction
      await simulateTyping(1800)
      
      addMessage({
        type: 'one',
        content: `That's interesting, ${user.name}! I'd love to explore that further with you.`
      })
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
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
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
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start ${message.type === 'one' ? 'justify-start' : 'justify-end'}`}
            >
              {/* Avatar - only show for One messages */}
              {message.type === 'one' && (
                <div className="flex flex-col">
                  <div className="flex items-center mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 flex items-center justify-center mr-2 shadow-lg shadow-purple-500/20">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* User avatar - only show for user messages, positioned on the right */}
              {message.type === 'user' && (
                <div className="flex flex-col items-center order-last ml-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <User size={16} className="text-white" />
                  </div>
                </div>
              )}
              
              {/* Message bubble */}
              <div 
                className={`conversation-bubble max-w-[75%] md:max-w-[65%] ${theme === 'white' ? 'bg-gray-100/80 border-gray-200' : 'bg-white/10 border-white/20'} backdrop-blur-sm border p-4 rounded-2xl shadow-lg`}
              >
                {message.type === 'one' && (
                  <div className="flex items-center mb-2">
                    <span className={`text-sm font-medium ${theme === 'white' ? 'text-gray-800' : 'text-purple-300'}`}>
                      {user.oneName || 'One'}
                    </span>
                  </div>
                )}
                <div className="text-sm md:text-base leading-relaxed font-medium conversation-text" style={{ color: theme === 'white' ? '#000000' : '#ffffff', fontWeight: theme === 'white' ? '500' : '400' }}>
                  {message.type === 'one' ? (
                    messages.indexOf(message) === 0 ? (
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
                    )
                  ) : (
                    <p style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}>
                      {message.content}
                    </p>
                  )}
                </div>
                <div className={`text-xs ${theme === 'white' ? 'text-gray-600' : 'text-white/50'} mt-3`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
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

      {/* Input Form */}
      <div className={`p-4 md:p-6 pb-20 md:pb-24 border-t ${theme === 'white' ? 'border-gray-200' : 'border-white/10'} mt-auto`} style={{marginBottom: '20px'}}>
        <div className="w-full max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex mb-6 w-full">
            <div className="relative w-full">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  currentStep === 'naming-one' 
                    ? "Give me a name..." 
                    : currentStep === 'naming-user'
                    ? "What's your name?"
                    : "Share your thoughts..."
                }
                className={`w-full ${theme === 'white' ? 'bg-gray-100/80 border-gray-200 placeholder-gray-500' : 'bg-white/10 border-white/20 placeholder-white/50'} backdrop-blur-sm border rounded-xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base font-light shadow-lg`}
                style={{ color: theme === 'white' ? '#000000' : '#ffffff' }}
                autoFocus
              />
              <motion.button
                type="submit"
                disabled={!inputValue.trim()}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'white' ? 'text-gray-600' : 'text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Send size={20} className={theme === 'white' ? 'text-gray-600' : 'text-white/70'} />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
