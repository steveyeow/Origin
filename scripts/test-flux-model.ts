/**
 * Test script for the Flux image generation model
 * 
 * This script tests the Flux model integration by:
 * 1. Initializing the unified invocation layer
 * 2. Generating an image using the Flux model
 * 3. Displaying the result including image URL and cost
 * 
 * Usage:
 * - Make sure FAL_API_KEY is set in your .env.local file
 * - Run with: npx ts-node scripts/test-flux-model.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { unifiedInvocation } from '../src/engine/layers/invocation/unified-invocation';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testFluxModel() {
  console.log('🚀 Testing Flux image generation model...');
  
  try {
    // Initialize the unified invocation layer
    await unifiedInvocation.initialize();
    
    // Get all available capabilities
    const capabilities = await unifiedInvocation.getAvailableCapabilities();
    console.log(`Found ${capabilities.length} capabilities`);
    
    // Find the Flux model
    const fluxModel = capabilities.find(cap => cap.id === 'fal-ai-flux-pro-v1.1');
    if (!fluxModel) {
      console.error('❌ Flux Pro 1.1 model not found in available capabilities');
      return;
    }
    
    console.log('✅ Flux model found:', fluxModel.name);
    
    // Generate an image
    const prompt = 'A beautiful mountain landscape with a lake and forest, digital art style';
    console.log(`Generating image with prompt: "${prompt}"`);
    
    const result = await unifiedInvocation.invoke('fal-ai-flux-pro-v1.1', prompt, {
      qualityLevel: 'high'
    });
    
    if (result.success) {
      console.log('✅ Image generation successful!');
      console.log('📊 Cost:', result.cost);
      console.log('⏱️ Execution time:', result.metadata.executionTime, 'ms');
      
      // Display image URLs
      if (result.result && result.result.images) {
        console.log('🖼️ Generated images:');
        result.result.images.forEach((image: any, index: number) => {
          console.log(`  Image ${index + 1}: ${image.url}`);
        });
      }
    } else {
      console.error('❌ Image generation failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testFluxModel().catch(console.error);
