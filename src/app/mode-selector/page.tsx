'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import ModeSelector from '@/components/auth/ModeSelector'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

export default function ModeSelectorPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { setOnboardingActive, setCurrentStep } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/api/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  const handleModeSelection = (mode: 'chat' | 'voice') => {
    console.log('🎯 Mode Selector: User selected mode:', mode)
    
    // Activate onboarding state in the main page
    setOnboardingActive(true)
    console.log('✅ Mode Selector: Onboarding activated')
    
    // Set to naming-one to ensure initial greeting message is shown
    setCurrentStep('naming-one')
    console.log('✅ Mode Selector: Current step set to naming-one')
    
    // Store the selected mode in sessionStorage for the main page to read
    sessionStorage.setItem('selectedMode', mode)
    console.log('💾 Mode Selector: Stored selectedMode in sessionStorage:', mode)
    
    // Verify storage was set correctly
    const storedMode = sessionStorage.getItem('selectedMode')
    console.log('🔍 Mode Selector: Verification - stored mode is:', storedMode)
    
    // Add a small delay to ensure sessionStorage is set before navigation
    setTimeout(() => {
      console.log('🚀 Mode Selector: Navigating to main page...')
      router.push('/')
    }, 100) // 100ms delay to ensure sessionStorage is properly set
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <ModeSelector onSelectMode={handleModeSelection} />
}
