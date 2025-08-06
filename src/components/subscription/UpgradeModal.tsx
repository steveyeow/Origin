'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Zap, Check, Sparkles, Mic } from 'lucide-react'
import { useSubscriptionStore } from '@/store/useSubscriptionStore'
import { useAuth } from '@/components/auth/AuthProvider'
import { billingService } from '@/services/billing/billing-service'

export default function UpgradeModal() {
  const { 
    isUpgradeModalOpen, 
    closeUpgradeModal, 
    subscriptionPlans, 
    currentPlan,
    createCheckoutSession,
    isLoading 
  } = useSubscriptionStore()
  
  const { user, voiceCredits } = useAuth()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  const handleUpgrade = async (planId: string, interval: 'monthly' | 'yearly' = 'monthly') => {
    if (!user) return
    
    try {
      const plan = subscriptionPlans.find(p => p.id === planId)
      if (!plan) return
      
      const priceId = interval === 'yearly' ? plan.stripeYearlyPriceId : plan.stripePriceId
      if (!priceId) return
      
      await createCheckoutSession(priceId, user.sub)
    } catch (error) {
      console.error('Error creating checkout session:', error)
    }
  }

  if (!isUpgradeModalOpen) return null

  const pricing = billingService.getPricing()

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Upgrade Your Plan
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You've used all your credits. Upgrade to continue creating amazing content.
                  </p>
                </div>
              </div>
              <button
                onClick={closeUpgradeModal}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Current Usage */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Current Credits</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {voiceCredits || 0} remaining
                </span>
              </div>
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, ((voiceCredits || 0) / 6000) * 100)}%` }}
                />
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="mt-4 flex items-center justify-center">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex">
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    billingInterval === 'monthly'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
                    billingInterval === 'yearly'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    17% off
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {subscriptionPlans.filter(plan => plan.id !== 'free').map((plan) => {
                const isYearly = billingInterval === 'yearly'
                const price = isYearly ? pricing[plan.id as keyof typeof pricing]?.yearly : pricing[plan.id as keyof typeof pricing]?.monthly
                const monthlyPrice = isYearly ? (price / 12) : price
                
                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                      plan.popular
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Most Popular
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {plan.name}
                          </h3>
                          {plan.id === 'pro' && (
                            <Crown className="w-5 h-5 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${monthlyPrice?.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          /month {isYearly && '(billed yearly)'}
                        </div>
                        {isYearly && (
                          <div className="text-xs text-green-600 font-medium">
                            Save ${((pricing[plan.id as keyof typeof pricing]?.monthly * 12) - price)?.toFixed(0)}/year
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpgrade(plan.id, billingInterval)}
                      disabled={isLoading || currentPlan === plan.id}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                          : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                      } ${currentPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isLoading ? 'Processing...' : currentPlan === plan.id ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    </motion.button>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ✨ All plans include access to cutting-edge AI models and premium features
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                You can cancel or change your subscription at any time. Credits reset monthly.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
