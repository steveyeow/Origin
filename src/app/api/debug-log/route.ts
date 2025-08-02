import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, data } = await request.json()
    
    // Print to terminal/console
    const timestamp = new Date().toISOString().slice(11, 23) // HH:MM:SS.mmm
    const logLine = `[${timestamp}] ${message}`
    
    if (data && typeof data === 'object') {
      console.log(logLine, JSON.stringify(data, null, 2))
    } else if (data) {
      console.log(logLine, data)
    } else {
      console.log(logLine)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Debug log API error:', error)
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 })
  }
}
