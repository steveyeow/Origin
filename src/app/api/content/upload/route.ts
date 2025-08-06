import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { s3Service } from '@/services/storage/s3-service'
import { billingService } from '@/services/billing/billing-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const contentType = formData.get('contentType') as string
    const modelId = formData.get('modelId') as string
    const prompt = formData.get('prompt') as string
    const cost = parseFloat(formData.get('cost') as string || '0')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Get file extension
    const fileExtension = file.name.split('.').pop() || 'bin'
    
    // Upload to S3
    const uploadResult = await s3Service.uploadGeneratedContent(
      buffer,
      session.user.sub!,
      contentType as 'image' | 'video' | 'audio' | 'text',
      fileExtension,
      {
        modelId,
        prompt,
        generatedAt: new Date(),
        cost
      }
    )

    return NextResponse.json({
      success: true,
      data: uploadResult
    })
  } catch (error) {
    console.error('Error uploading content:', error)
    return NextResponse.json(
      { error: 'Failed to upload content' },
      { status: 500 }
    )
  }
}

// Handle generated content upload from AI models
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { 
      content, 
      contentType, 
      fileExtension, 
      modelId, 
      prompt, 
      cost 
    } = await request.json()

    if (!content || !contentType || !fileExtension) {
      return NextResponse.json({ 
        error: 'Missing required fields: content, contentType, fileExtension' 
      }, { status: 400 })
    }

    // Convert base64 content to buffer if needed
    let buffer: Buffer
    if (typeof content === 'string') {
      // Assume base64 encoded
      buffer = Buffer.from(content, 'base64')
    } else {
      buffer = Buffer.from(content)
    }

    // Upload to S3
    const uploadResult = await s3Service.uploadGeneratedContent(
      buffer,
      session.user.sub!,
      contentType,
      fileExtension,
      {
        modelId,
        prompt,
        generatedAt: new Date(),
        cost
      }
    )

    return NextResponse.json({
      success: true,
      data: uploadResult
    })
  } catch (error) {
    console.error('Error uploading generated content:', error)
    return NextResponse.json(
      { error: 'Failed to upload generated content' },
      { status: 500 }
    )
  }
}
