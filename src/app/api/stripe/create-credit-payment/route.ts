import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/services/payment/stripe-service'
import { billingService } from '@/services/billing/billing-service'

const stripeService = new StripeService()

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement proper Auth0 session validation
    // For now, use placeholder user ID

    const { amount, credits, type = 'credits' } = await request.json()

    if (!amount || !credits) {
      return NextResponse.json({ error: 'Amount and credits are required' }, { status: 400 })
    }

    // Create payment intent for credit top-up
    const userId = 'placeholder-user-id' // TODO: Get from Auth0 session
    const paymentIntent = await stripeService.createCreditPayment(
      userId,
      amount,
      credits,
      type
    )

    return NextResponse.json({
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id
    })
  } catch (error) {
    console.error('Error creating credit payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
