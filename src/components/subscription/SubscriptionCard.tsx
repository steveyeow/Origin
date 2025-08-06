'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Zap } from 'lucide-react'
import { useThemeContext } from '@/context/ThemeContext'
import { SubscriptionPlan } from '@/store/useSubscriptionStore'

interface SubscriptionCardProps {
  plan: SubscriptionPlan
  isCurrentPlan?: boolean
  onSelectPlan: (planId: string, interval?: 'monthly' | 'yearly') => void
  className?: string
  currentInterval?: 'monthly' | 'yearly'
}

export default function SubscriptionCard({ 
  plan, 
  isCurrentPlan = false, 
  onSelectPlan,
  className = '',
  currentInterval = 'monthly'
}: SubscriptionCardProps) {
  const { theme } = useThemeContext()

  const getPlanIcon = () => {
    switch (plan.id) {
      case 'free':
        return <Zap size={24} />
      case 'basic':
        return <Crown size={24} />
      case 'pro':
        return <Crown size={24} />
      default:
        return <Zap size={24} />
    }
  }

  const getPlanColor = () => {
    switch (plan.id) {
      case 'free':
        return theme === 'white' ? 'text-blue-600' : 'text-blue-400'
      case 'basic':
        return theme === 'white' ? 'text-purple-600' : 'text-purple-400'
      case 'pro':
        return theme === 'white' ? 'text-yellow-600' : 'text-yellow-400'
      default:
        return theme === 'white' ? 'text-gray-600' : 'text-gray-400'
    }
  }

  const getBorderColor = () => {
    if (plan.popular) {
      return 'border-purple-400/50'
    }
    return theme === 'white' ? 'border-gray-200/50' : 'border-white/20'
  }

  return (
    <motion.div
      className={`relative p-6 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
        theme === 'white'
          ? 'bg-white/80 hover:bg-white/90'
          : 'bg-white/10 hover:bg-white/15'
      } ${getBorderColor()} ${className}`}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            theme === 'white'
              ? 'bg-green-100 text-green-700'
              : 'bg-green-500/20 text-green-400'
          }`}>
            Current Plan
          </div>
        </div>
      )}

      <div className="text-center">
        {/* Plan icon */}
        <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
          theme === 'white'
            ? 'bg-gray-100'
            : 'bg-white/10'
        }`}>
          <div className={getPlanColor()}>
            {getPlanIcon()}
          </div>
        </div>

        {/* Plan name */}
        <h3 className={`text-xl font-bold mb-2 ${
          theme === 'white' ? 'text-gray-800' : 'text-white'
        }`}>
          {plan.name}
        </h3>

        {/* Price */}
        <div className="mb-6">
          <span className={`text-3xl font-bold ${
            theme === 'white' ? 'text-gray-800' : 'text-white'
          }`}>
            ${currentInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
          </span>
          {(currentInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) > 0 && (
            <span className={`text-sm ${
              theme === 'white' ? 'text-gray-600' : 'text-white/70'
            }`}>
              /{currentInterval}
            </span>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-center justify-center">
              <Check size={16} className={`mr-2 ${
                theme === 'white' ? 'text-green-600' : 'text-green-400'
              }`} />
              <span className={`text-sm ${
                theme === 'white' ? 'text-gray-600' : 'text-white/80'
              }`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* Action button */}
        <motion.button
          className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
            isCurrentPlan
              ? theme === 'white'
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-white/10 text-white/50 cursor-not-allowed'
              : plan.popular
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                : theme === 'white'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
          }`}
          whileHover={!isCurrentPlan ? { scale: 1.05 } : {}}
          whileTap={!isCurrentPlan ? { scale: 0.95 } : {}}
          onClick={() => !isCurrentPlan && onSelectPlan(plan.id, currentInterval)}
          disabled={isCurrentPlan}
        >
          {isCurrentPlan ? 'Current Plan' : (currentInterval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice) === 0 ? 'Get Started' : 'Upgrade Now'}
        </motion.button>
      </div>
    </motion.div>
  )
}
