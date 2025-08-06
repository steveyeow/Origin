import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface UploadResult {
  key: string
  url: string
  publicUrl: string
  size: number
  contentType: string
}

export interface StorageConfig {
  bucketName: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl?: string
}

class S3Service {
  private s3Client: S3Client | null = null
  private bucketName: string
  private region: string
  private accessKeyId: string
  private secretAccessKey: string
  private isConfigured: boolean = false
  private publicBaseUrl: string
  private static instance: S3Service

  constructor(config?: StorageConfig) {
    const bucketName = config?.bucketName || process.env.AWS_S3_BUCKET_NAME
    const region = config?.region || process.env.AWS_REGION
    const accessKeyId = config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY

    // Store configuration but don't throw error during initialization
    this.isConfigured = !!(bucketName && region && accessKeyId && secretAccessKey)

    this.bucketName = bucketName || ''
    this.region = region || ''
    this.accessKeyId = accessKeyId || ''
    this.secretAccessKey = secretAccessKey || ''
    this.publicBaseUrl = config?.publicBaseUrl || `https://${bucketName}.s3.${region}.amazonaws.com`
    
    // Only initialize S3Client if configuration is complete
    if (this.isConfigured) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      })
    }
  }

  public static getInstance(config?: StorageConfig): S3Service {
    if (!S3Service.instance) {
      S3Service.instance = new S3Service(config)
    }
    return S3Service.instance
  }

  /**
   * Ensure S3Client is initialized and configuration is valid
   */
  private ensureS3Client(): void {
    if (!this.isConfigured) {
      throw new Error('S3Service is not properly configured. Please check your AWS environment variables.')
    }
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      })
    }
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    file: Buffer | Uint8Array | string,
    key: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
        // Make files publicly readable
        ACL: 'public-read',
      })

      this.ensureS3Client()
      await this.s3Client!.send(command)

      const publicUrl = `${this.publicBaseUrl}/${key}`
      const signedUrl = await this.getSignedUrl(key, 3600) // 1 hour expiry

      return {
        key,
        url: signedUrl,
        publicUrl,
        size: file.length,
        contentType,
      }
    } catch (error) {
      console.error('Error uploading file to S3:', error)
      throw new Error('Failed to upload file to S3')
    }
  }

  /**
   * Upload generated content (images, videos, audio)
   */
  async uploadGeneratedContent(
    content: Buffer | Uint8Array,
    userId: string,
    contentType: 'image' | 'video' | 'audio' | 'text',
    fileExtension: string,
    metadata?: {
      modelId?: string
      prompt?: string
      generatedAt?: Date
      cost?: number
    }
  ): Promise<UploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const key = `generated-content/${userId}/${contentType}/${timestamp}.${fileExtension}`
    
    const mimeType = this.getMimeType(contentType, fileExtension)
    
    const uploadMetadata = {
      userId,
      contentType,
      generatedAt: (metadata?.generatedAt || new Date()).toISOString(),
      ...(metadata?.modelId && { modelId: metadata.modelId }),
      ...(metadata?.prompt && { prompt: metadata.prompt }),
      ...(metadata?.cost && { cost: metadata.cost.toString() }),
    }

    return this.uploadFile(content, key, mimeType, uploadMetadata)
  }

  /**
   * Get signed URL for private access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      this.ensureS3Client()
      return await getSignedUrl(this.s3Client!, command, { expiresIn })
    } catch (error) {
      console.error('Error generating signed URL:', error)
      throw new Error('Failed to generate signed URL')
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      this.ensureS3Client()
      await this.s3Client!.send(command)
    } catch (error) {
      console.error('Error deleting file from S3:', error)
      throw new Error('Failed to delete file from S3')
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`
  }

  /**
   * Generate unique key for user content
   */
  generateContentKey(
    userId: string,
    contentType: 'image' | 'video' | 'audio' | 'text' | 'document',
    filename?: string
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomId = Math.random().toString(36).substring(2, 15)
    
    if (filename) {
      const extension = filename.split('.').pop()
      return `user-content/${userId}/${contentType}/${timestamp}-${randomId}.${extension}`
    }
    
    return `user-content/${userId}/${contentType}/${timestamp}-${randomId}`
  }

  /**
   * Get MIME type based on content type and extension
   */
  private getMimeType(contentType: string, extension: string): string {
    const mimeTypes: Record<string, Record<string, string>> = {
      image: {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
      },
      video: {
        mp4: 'video/mp4',
        webm: 'video/webm',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
      },
      audio: {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        ogg: 'audio/ogg',
        m4a: 'audio/mp4',
      },
      text: {
        txt: 'text/plain',
        md: 'text/markdown',
        json: 'application/json',
      },
    }

    return mimeTypes[contentType]?.[extension] || 'application/octet-stream'
  }

  /**
   * Upload multiple files in batch
   */
  async uploadBatch(
    files: Array<{
      content: Buffer | Uint8Array
      key: string
      contentType: string
      metadata?: Record<string, string>
    }>
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file.content, file.key, file.contentType, file.metadata)
    )

    return Promise.all(uploadPromises)
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix: string, maxKeys: number = 100): Promise<string[]> {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      })

      this.ensureS3Client()
      const response = await this.s3Client!.send(command)
      return response.Contents?.map(obj => obj.Key!) || []
    } catch (error) {
      console.error('Error listing files:', error)
      throw new Error('Failed to list files')
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<Record<string, string> | undefined> {
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3')
      
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      this.ensureS3Client()
      const response = await this.s3Client!.send(command)
      return response.Metadata
    } catch (error) {
      console.error('Error getting file metadata:', error)
      return undefined
    }
  }
}

// Export singleton instance
export const s3Service = S3Service.getInstance()
export default S3Service
