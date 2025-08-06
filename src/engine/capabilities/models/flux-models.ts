import { fal } from '@fal-ai/client'; // Flux API client
import { BaseCapability } from '../base-capability';
import { ImageGenerationModel, ImageGenerationOptions, ImageGenerationResult } from './image-generation-types';

// Define Flux API types based on Flux documentation
type FluxImageSize = 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
type FluxSafetyTolerance = '1' | '2' | '3' | '4' | '5' | '6';

// Define interface for queue status updates from Flux API
interface QueueStatus {
  status: string;
  position?: number;
  logs?: Array<{ message: string }>;
}

// Define interface for Flux API response structure
interface FalApiResponse {
  data: {
    images: Array<{
      url: string;
      content_type: string;
    }>;
  };
}

/**
 * Base class for Flux models
 * This allows for shared functionality across different Flux model versions
 */
abstract class BaseFalAIModel extends BaseCapability implements ImageGenerationModel {
  type = 'model' as const;
  modelType = 'image_generation' as const;
  provider = 'flux';
  capabilities = [
    'image_generation',
    'concept_art',
    'illustration',
    'photo_realistic',
    'artistic_styles'
  ];
  abstract version: string;
  abstract pricing: { costPerImage: number; currency: 'USD'; resolution: string };

  constructor() {
    super();
    // Configure fal client if API key is available
    const falKey = process.env.FAL_API_KEY;
    if (falKey) {
      fal.config({
        credentials: falKey
      });
    }
  }

  /**
   * Generate an image using the Flux model
   * @param prompt Text prompt to generate image from
   * @param options Additional options for image generation
   * @returns Generated image result
   */
  abstract generateImage(prompt: string, options?: ImageGenerationOptions): Promise<ImageGenerationResult>;

  /**
   * Check if the API key is configured
   * @throws Error if API key is not configured
   */
  protected checkApiKey(): void {
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      throw new Error('FAL_API_KEY not configured');
    }
  }

  /**
   * Get the API endpoint for the specific model version
   * @returns API endpoint string
   */
  protected abstract getApiEndpoint(): string;

  /**
   * Convert generic image generation options to Flux-specific options
   * @param options Generic image generation options
   * @returns Flux-specific options
   */
  protected convertToFluxOptions(options: ImageGenerationOptions = {}): Record<string, any> {
    // Map generic size to Flux size
    let fluxSize: FluxImageSize = 'square';
    
    if (options.size) {
      if (options.size === '1792x1024') {
        fluxSize = 'landscape_16_9';
      } else if (options.size === '1024x1792') {
        fluxSize = 'portrait_16_9';
      } else if (options.size === '1024x1024') {
        fluxSize = 'square';
      }
    }
    
    // Create Flux options object
    return {
      prompt: '',  // Will be set when calling API
      image_size: fluxSize,
      num_images: options.n || 1,
      enable_safety_checker: true,
      output_format: 'jpeg',
      safety_tolerance: '3',
      seed: options.seed || Math.floor(Math.random() * 1000000)
    };
  }

  /**
   * Calculate cost based on image options
   * @param options Image generation options
   * @returns Cost in USD
   */
  protected calculateCost(options: ImageGenerationOptions = {}): number {
    let cost = this.pricing.costPerImage;
    
    // Adjust cost based on size
    if (options.size === '1792x1024' || options.size === '1024x1792') {
      cost *= 1.5; // Higher resolution costs more
    }
    
    // Adjust cost based on number of images
    if (options.n && options.n > 1) {
      cost *= options.n;
    }
    
    return cost;
  }

  /**
   * Get a human-readable resolution string from the size option
   * @param size Size option from ImageGenerationOptions
   * @returns Human-readable resolution string
   */
  protected getResolutionString(size?: string): string {
    if (!size) return '1024x1024';
    
    switch (size) {
      case '1792x1024':
        return '1792x1024';
      case '1024x1792':
        return '1024x1792';
      default:
        return '1024x1024';
    }
  }
}

/**
 * FluxPro11Model - Implementation of the Flux 1.1 Pro text-to-image model
 */
export class FluxPro11Model extends BaseFalAIModel {
  id = 'fal-ai-flux-pro-v1.1';
  name = 'Flux 1.1 Pro';
  description = 'Next generation text-to-image model with 10x accelerated speeds';
  version = '1.1.0';
  status = 'active' as const;
  
  pricing = {
    costPerImage: 0.10, // $0.10 per image for standard resolution
    currency: 'USD' as const,
    resolution: '1024x1024'
  };
  
  metadata = {
    costPerUse: 0.10,
    averageLatency: 5000, // 5 seconds - Flux is fast
    qualityScore: 0.92,
    supportedFormats: ['image/png', 'image/jpeg'],
    supportedSizes: [
      'square_hd', 'square', 'portrait_4_3', 'portrait_16_9', 
      'landscape_4_3', 'landscape_16_9'
    ],
    limitations: ['Subject to Flux usage policies'],
    examples: [
      {
        input: 'A serene mountain landscape at sunset with a small cabin',
        output: '[Generated image of mountain landscape]',
        description: 'Landscape generation example'
      }
    ]
  };

  /**
   * Generate an image using the Flux Pro 1.1 model
   * @param prompt Text prompt to generate image from
   * @param options Additional options for image generation
   * @returns Generated image result
   */
  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<ImageGenerationResult> {
    this.checkApiKey();
    const startTime = Date.now();
    
    try {
      // Calculate cost based on options
      const cost = this.calculateCost(options);
      
      // Convert generic options to Flux-specific options
      const fluxOptions = this.convertToFluxOptions(options);
      fluxOptions.prompt = prompt;

      // Call the Flux API
      console.log(`Calling Flux Pro 1.1 API with prompt: ${prompt}`);
      
      // Combine options and callbacks into a single object as fal.subscribe expects only 2 arguments
      const requestOptions = {
        ...fluxOptions,
        onQueueUpdate: (update: QueueStatus) => {
          if (update.status === 'IN_PROGRESS') {
            console.log(`Flux generation in progress, queue position: ${update.position || 'unknown'}`);
          }
        }
      };
      
      const response = await fal.subscribe<FalApiResponse>(
        this.getApiEndpoint(),
        requestOptions
      );
      
      const endTime = Date.now();
      const generationTime = (endTime - startTime) / 1000;

      // Map the response to our result format
      return {
        images: (response.data?.images || []).map((img: { url: string; content_type?: string }) => ({
          url: img.url,
          contentType: img.content_type || 'image/jpeg'
        })),
        cost,
        metadata: {
          model: this.name,
          resolution: this.getResolutionString(options.size),
          quality: 'high',
          generationTime,
          seed: fluxOptions.seed
        }
      };
    } catch (error: any) {
      console.error('Error generating image with Flux Pro 1.1:', error);
      throw new Error(`Failed to generate image with Flux Pro 1.1: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the API endpoint for Flux Pro 1.1
   * @returns API endpoint string
   */
  protected getApiEndpoint(): string {
    return 'fal-ai/flux-pro/v1.1';
  }
}

/**
 * FluxPro10Model - Implementation of the Flux 1.0 Pro text-to-image model
 */
export class FluxPro10Model extends BaseFalAIModel {
  id = 'fal-ai-flux-pro-v1.0';
  name = 'Flux 1.0 Pro';
  description = 'First generation Flux text-to-image model';
  version = '1.0.0';
  status = 'inactive' as const; // Marked as inactive since v1.1 is preferred
  
  pricing = {
    costPerImage: 0.08, // $0.08 per image for standard resolution
    currency: 'USD' as const,
    resolution: '1024x1024'
  };
  
  metadata = {
    costPerUse: 0.08,
    averageLatency: 6000, // 6 seconds
    qualityScore: 0.85,
    supportedFormats: ['image/png', 'image/jpeg'],
    supportedSizes: [
      'square', 'portrait_4_3', 'landscape_4_3'
    ],
    limitations: ['Subject to Flux usage policies', 'Limited style range compared to v1.1'],
    examples: [
      {
        input: 'A serene mountain landscape at sunset with a small cabin',
        output: '[Generated image of mountain landscape]',
        description: 'Landscape generation example'
      }
    ]
  };

  /**
   * Generate an image using the Flux Pro 1.0 model
   * @param prompt Text prompt to generate image from
   * @param options Additional options for image generation
   * @returns Generated image result
   */
  async generateImage(prompt: string, options: ImageGenerationOptions = {}): Promise<ImageGenerationResult> {
    this.checkApiKey();
    const startTime = Date.now();
    
    try {
      // Calculate cost based on options
      const cost = this.calculateCost(options);
      
      // Convert generic options to Flux-specific options
      const fluxOptions = this.convertToFluxOptions(options);
      fluxOptions.prompt = prompt;

      // Call the Flux API
      console.log(`Calling Flux Pro 1.0 API with prompt: ${prompt}`);
      
      // Combine options and callbacks into a single object as fal.subscribe expects only 2 arguments
      const requestOptions = {
        ...fluxOptions,
        onQueueUpdate: (update: QueueStatus) => {
          if (update.status === 'IN_PROGRESS') {
            console.log(`Flux generation in progress, queue position: ${update.position || 'unknown'}`);
          }
        }
      };
      
      const response = await fal.subscribe<FalApiResponse>(
        this.getApiEndpoint(),
        requestOptions
      );
      
      const endTime = Date.now();
      const generationTime = (endTime - startTime) / 1000;

      // Map the response to our result format
      return {
        images: (response.data?.images || []).map((img: { url: string; content_type?: string }) => ({
          url: img.url,
          contentType: img.content_type || 'image/jpeg'
        })),
        cost,
        metadata: {
          model: this.name,
          resolution: this.getResolutionString(options.size),
          quality: 'high',
          generationTime,
          seed: fluxOptions.seed
        }
      };
    } catch (error: any) {
      console.error('Error generating image with Flux Pro 1.0:', error);
      throw new Error(`Failed to generate image with Flux Pro 1.0: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get the API endpoint for Flux Pro 1.0
   * @returns API endpoint string
   */
  protected getApiEndpoint(): string {
    return 'fal-ai/flux-pro/v1.0';
  }
}
