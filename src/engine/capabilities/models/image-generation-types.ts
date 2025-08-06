import type { Capability } from '../../../types/engine'

/**
 * Interface for image generation models
 * All image generation models should implement this interface
 */
export interface ImageGenerationModel extends Capability {
  type: 'model'
  modelType: 'image_generation'
  pricing: {
    costPerImage: number
    currency: 'USD'
    resolution: string
  }
  generateImage: (prompt: string, options?: ImageGenerationOptions) => Promise<ImageGenerationResult>
}

/**
 * Standard options for image generation
 * Each model can extend this with model-specific options
 */
export interface ImageGenerationOptions {
  size?: '1024x1024' | '1792x1024' | '1024x1792' | string
  quality?: 'standard' | 'hd' | string
  style?: 'vivid' | 'natural' | string
  n?: number
}

/**
 * Standard result format for image generation
 * Ensures consistent return values across different models
 */
export interface ImageGenerationResult {
  images: Array<{
    url: string
    content_type?: string
    revisedPrompt?: string
  }>
  cost: number
  metadata: {
    model: string
    resolution: string
    quality: string
    generationTime: number
    seed?: number
  }
}
