import { create } from 'zustand'

export interface User {
  id?: string
  name?: string
  oneName?: string
}

export interface AppState {
  // UI State
  isOnboardingActive: boolean
  currentStep: 'landing' | 'naming-one' | 'naming-user' | 'scenario'
  
  // User State
  user: User
  
  // Conversation State
  messages: Array<{
    id: string
    type: 'user' | 'one'
    content: string
    timestamp: Date
  }>
  
  // Actions
  setOnboardingActive: (active: boolean) => void
  setCurrentStep: (step: AppState['currentStep']) => void
  setUser: (user: Partial<User>) => void
  addMessage: (message: Omit<AppState['messages'][0], 'id' | 'timestamp'>) => void
  resetConversation: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isOnboardingActive: false,
  currentStep: 'landing',
  user: {},
  messages: [],
  
  // Actions
  setOnboardingActive: (active) => set({ isOnboardingActive: active }),
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  setUser: (userData) => set((state) => ({ 
    user: { ...state.user, ...userData } 
  })),
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date()
      }
    ]
  })),
  
  resetConversation: () => set({ messages: [] })
}))
