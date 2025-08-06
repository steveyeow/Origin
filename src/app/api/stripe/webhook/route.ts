import { NextRequest, NextResponse } from 'next/server'
import { stripeService } from '@/services/payment/stripe-service'
import { auth0Service } from '@/services/auth/auth0-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    await stripeService.handleWebhook(body, signature)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

// Helper function to update user subscription in Auth0
export async function updateUserSubscription(
  userId: string,
  subscriptionTier: 'free' | 'basic' | 'pro',
  voiceCredits: number
) {
  try {
    const metadata = {
      'https://originx.app/subscription_tier': subscriptionTier,
      'https://originx.app/voice_credits': voiceCredits,
      'https://originx.app/updated_at': new Date().toISOString(),
    }

    await auth0Service.updateUserMetadata(userId, metadata)
    console.log(`Updated subscription for user ${userId}: ${subscriptionTier}`)
  } catch (error) {
    console.error('Failed to update user subscription:', error)
  }
}
