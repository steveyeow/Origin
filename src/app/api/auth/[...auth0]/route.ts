import { NextRequest, NextResponse } from 'next/server'

// Temporary mock auth handlers until Auth0 is properly configured
export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authAction = pathname.split('/').pop()

  switch (authAction) {
    case 'login':
      // Mock login - simulate Auth0 login flow
      console.log('🚀 Mock Auth0 login triggered')
      // In a real implementation, this would redirect to Auth0
      // For now, simulate successful login by redirecting back with auth flag
      const loginUrl = new URL('/', request.url)
      loginUrl.searchParams.set('auth', 'success')
      return NextResponse.redirect(loginUrl)
    
    case 'logout':
      // Redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    
    case 'callback':
      // Handle callback - simulate successful auth and redirect to home
      console.log('✅ Mock Auth0 callback - user authenticated')
      return NextResponse.redirect(new URL('/', request.url))
    
    case 'profile':
      // Return mock user profile
      return NextResponse.json({
        sub: 'mock-user-123',
        name: 'Mock User',
        email: 'mock@example.com',
        subscription_tier: 'free',
        voice_credits: 5,
        total_usage: 0
      })
    
    default:
      return NextResponse.json({ error: 'Auth endpoint not found' }, { status: 404 })
  }
}

export const POST = GET
