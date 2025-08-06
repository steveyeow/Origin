import Stripe from 'stripe'
import { billingService } from '@/services/billing/billing-service'

export interface SubscriptionPlan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  credits: number
  stripePriceId?: string
  stripeYearlyPriceId?: string
  popular?: boolean
}

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: string
}

export class StripeService {
  private stripe: Stripe
  private static instance: StripeService

  constructor() {
    // Check if STRIPE_SECRET_KEY is available, use a dummy key in development if not
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_development';
    
    // Only initialize Stripe if we're in a browser environment
    if (typeof window !== 'undefined') {
      try {
        this.stripe = new Stripe(stripeKey, {
          apiVersion: '2025-07-30.basil',
        });
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
        // Create a mock object for development
        this.stripe = {} as Stripe;
      }
    } else {
      // Server-side initialization
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2025-07-30.basil',
      });
    }
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService()
    }
    return StripeService.instance
  }

  /**
   * Get available subscription plans
   */
  getSubscriptionPlans(): SubscriptionPlan[] {
    return [
      {
        id: 'free',
        name: 'Free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        credits: 6000,
        features: [
          '6,000 credits per month',
          'Access to basic voice and text models',
          'Limited generation speed',
          'Community support'
        ]
      },
      {
        id: 'basic',
        name: 'Basic',
        monthlyPrice: 9.90,
        yearlyPrice: 99, // ~17% discount
        credits: 500000,
        features: [
          '500,000 credits per month',
          'Access to most voice, image, and text models',
          'Access to basic agents and tools',
          'Standard generation speed',
          'Email support',
          'Ads free'
        ],
        stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
        stripeYearlyPriceId: process.env.STRIPE_BASIC_YEARLY_PRICE_ID
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyPrice: 19.90,
        yearlyPrice: 199, // ~17% discount
        credits: 1000000,
        features: [
          '1,000,000 credits per month',
          'Access to all curated voice, image, video, and text models',
          'Access to all Agents, tools, effects',
          'Maximum generations each month',
          'Permanent content storage',
          'Watermark removal',
          'Fastest generation and agent speed',
          'Early access to new features',
          'Priority support',
          'Ads free'
        ],
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
        stripeYearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
        popular: true
      }
    ]
  }

  /**
   * Create subscription checkout session
   */
  async createSubscriptionCheckout(
    priceId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
          userId,
        },
      })

      return {
        sessionId: session.id,
        url: session.url!,
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      throw new Error('Failed to create checkout session')
    }
  }

  /**
   * Create payment intent for credits (general purpose)
   */
  async createCreditPayment(
    userId: string,
    amount: number,
    credits: number,
    type: string = 'credits'
  ): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          credits: credits.toString(),
          type,
        },
      })

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw new Error('Failed to create payment intent')
    }
  }

  /**
   * Create payment intent for voice credits (legacy method)
   */
  async createVoiceCreditPayment(
    amount: number,
    credits: number,
    userId: string
  ): Promise<PaymentIntent> {
    return this.createCreditPayment(userId, amount, credits, 'voice_credits')
  }

  /**
   * Get customer's active subscription
   */
  async getCustomerSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      })

      return subscriptions.data[0] || null
    } catch (error) {
      console.error('Error fetching subscription:', error)
      return null
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId)
      return true
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return false
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      })

      return session.url
    } catch (error) {
      console.error('Error creating portal session:', error)
      throw new Error('Failed to create portal session')
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(body: string, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
          break
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.data.object as Stripe.Subscription)
          break
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    } catch (error) {
      console.error('Webhook error:', error)
      throw error
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.client_reference_id || session.metadata?.userId
    if (!userId) return

    // Update user subscription in Auth0
    // This will be handled by the webhook API route
    console.log('Checkout completed for user:', userId)
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata.userId
    const credits = parseInt(paymentIntent.metadata.credits || '0')
    
    if (!userId || !credits) return

    // Update user voice credits in Auth0
    // This will be handled by the webhook API route
    console.log('Payment succeeded for user:', userId, 'Credits:', credits)
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string
    
    // Update user subscription status in Auth0
    // This will be handled by the webhook API route
    console.log('Subscription changed for customer:', customerId)
  }
}

export const stripeService = StripeService.getInstance()
