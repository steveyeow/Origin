import { create } from 'zustand';
import { stripeService, SubscriptionPlan as StripeSubscriptionPlan } from '@/services/payment/stripe-service';

export interface SubscriptionPlan extends StripeSubscriptionPlan {
  currency?: string;
  isPopular?: boolean;
}

export interface UserSubscription {
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  voiceCreditsRemaining: number;
  totalVoiceCredits: number;
}

export interface SubscriptionState {
  // Subscription data
  plans: SubscriptionPlan[];
  subscriptionPlans: SubscriptionPlan[];
  userSubscription: UserSubscription | null;
  currentPlan: string;
  
  // UI state
  showUpgradeModal: boolean;
  isUpgradeModalOpen: boolean;
  showCreditsModal: boolean;
  isLoading: boolean;
  
  // Voice usage tracking
  voiceRepliesUsed: number;
  freeVoiceLimit: number;
  
  // Actions
  setPlans: (plans: SubscriptionPlan[]) => void;
  setUserSubscription: (subscription: UserSubscription | null) => void;
  setShowUpgradeModal: (show: boolean) => void;
  closeUpgradeModal: () => void;
  setShowCreditsModal: (show: boolean) => void;
  incrementVoiceUsage: () => void;
  resetVoiceUsage: () => void;
  canUseVoice: () => boolean;
  getRemainingVoiceCredits: () => number;
  // Stripe integration
  createCheckoutSession: (priceId: string, userId?: string) => Promise<void>;
  createVoicePayment: (credits: number) => Promise<string>;
  loadPlansFromStripe: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => {
  const plans = stripeService.getSubscriptionPlans().map(plan => ({
    ...plan,
    currency: 'USD',
    isPopular: plan.popular
  }));
  
  return {
    // Initial state - load from Stripe service
    plans,
    subscriptionPlans: plans,
    userSubscription: null,
    currentPlan: 'free',
    showUpgradeModal: false,
    isUpgradeModalOpen: false,
    showCreditsModal: false,
    isLoading: false,
    voiceRepliesUsed: 0,
    freeVoiceLimit: 5,
  
    // Actions
    setPlans: (plans) => set({ plans }),
    
    setUserSubscription: (subscription) => set({ userSubscription: subscription }),
    
    setShowUpgradeModal: (show) => set({ showUpgradeModal: show, isUpgradeModalOpen: show }),
    
    closeUpgradeModal: () => set({ showUpgradeModal: false, isUpgradeModalOpen: false }),
    
    setShowCreditsModal: (show) => set({ showCreditsModal: show }),
    
    incrementVoiceUsage: () => set((state) => ({
      voiceRepliesUsed: state.voiceRepliesUsed + 1
    })),
    
    resetVoiceUsage: () => set({ voiceRepliesUsed: 0 }),
    
    canUseVoice: () => {
      const state = get();
      const { userSubscription, voiceRepliesUsed, freeVoiceLimit } = state;
      
      // If user has active subscription
      if (userSubscription && userSubscription.status === 'active') {
        // Unlimited voice credits
        if (userSubscription.totalVoiceCredits === -1) {
          return true;
        }
        // Check remaining credits
        return userSubscription.voiceCreditsRemaining > 0;
      }
      
      // Free user - check against free limit
      return voiceRepliesUsed < freeVoiceLimit;
    },
    
    getRemainingVoiceCredits: () => {
      const state = get();
      const { userSubscription, voiceRepliesUsed, freeVoiceLimit } = state;
      
      if (userSubscription && userSubscription.status === 'active') {
        if (userSubscription.totalVoiceCredits === -1) {
          return -1; // Unlimited
        }
        return userSubscription.voiceCreditsRemaining;
      }
      
      return Math.max(0, freeVoiceLimit - voiceRepliesUsed);
    },

    // Stripe integration methods
    createCheckoutSession: async (priceId: string) => {
      set({ isLoading: true });
      try {
        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId })
        });
        
        if (!response.ok) throw new Error('Failed to create checkout');
        
        const { url } = await response.json();
        window.location.href = url;
      } catch (error) {
        console.error('Checkout error:', error);
      } finally {
        set({ isLoading: false });
      }
    },

    createVoicePayment: async (credits: number): Promise<string> => {
      set({ isLoading: true });
      try {
        const response = await fetch('/api/stripe/create-voice-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credits })
        });
        
        if (!response.ok) throw new Error('Failed to create payment');
        
        const { clientSecret } = await response.json();
        return clientSecret;
      } catch (error) {
        console.error('Voice payment error:', error);
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    loadPlansFromStripe: () => {
      const stripePlans = stripeService.getSubscriptionPlans();
      const plans = stripePlans.map(plan => ({
        ...plan,
        currency: 'USD',
        isPopular: plan.popular
      }));
      set({ plans, subscriptionPlans: plans });
    }
  };
});
