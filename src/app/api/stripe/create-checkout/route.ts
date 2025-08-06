import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { stripeService } from '@/services/payment/stripe-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { priceId } = await request.json()
    
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 })
    }

    const successUrl = `${process.env.AUTH0_BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.AUTH0_BASE_URL}/subscription`

    const checkout = await stripeService.createSubscriptionCheckout(
      priceId,
      session.user.sub,
      successUrl,
      cancelUrl
    )

    return NextResponse.json(checkout)
  } catch (error) {
    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
