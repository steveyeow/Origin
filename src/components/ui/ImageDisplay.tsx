'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Maximize2, X, Sparkles, Clock, DollarSign } from 'lucide-react'
import { useThemeContext } from '@/context/ThemeContext'

interface ImageData {
  url: string
  prompt: string
  model: string
  cost: number
  metadata?: {
    resolution?: string
    quality?: string
    generationTime?: number
    seed?: number
  }
}

interface ImageDisplayProps {
  image: ImageData
  mode?: 'chat' | 'voice' | 'fullscreen'
  className?: string
  onDownload?: () => void
  onFullscreen?: () => void
}

export default function ImageDisplay({ 
  image, 
  mode = 'chat', 
  className = '',
  onDownload,
  onFullscreen 
}: ImageDisplayProps) {
  const { theme } = useThemeContext()
  const [isLoading, setIsLoading] = useState(true)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageLoad = () => {
    setIsLoading(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setImageError(true)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generated-image-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      onDownload?.()
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const handleFullscreen = () => {
    setShowFullscreen(true)
    onFullscreen?.()
  }

  const getContainerStyles = () => {
    switch (mode) {
      case 'voice':
        return 'w-full max-w-2xl mx-auto'
      case 'fullscreen':
        return 'w-full h-full'
      case 'chat':
      default:
        return 'w-full max-w-md'
    }
  }

  const getImageStyles = () => {
    switch (mode) {
      case 'voice':
        return 'w-full h-auto max-h-[60vh] object-contain'
      case 'fullscreen':
        return 'w-full h-full object-contain'
      case 'chat':
      default:
        return 'w-full h-auto max-h-64 object-cover'
    }
  }

  return (
    <>
      <div className={`${getContainerStyles()} ${className}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`relative rounded-xl overflow-hidden ${
            theme === 'white' 
              ? 'bg-gray-50 border border-gray-200' 
              : 'bg-white/5 border border-white/10'
          } backdrop-blur-sm shadow-lg`}
        >
          {/* Image Container */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                  <span className={`text-sm ${theme === 'white' ? 'text-gray-600' : 'text-white/70'}`}>
                    Generating...
                  </span>
                </div>
              </div>
            )}
            
            {imageError ? (
              <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-orange-500/20">
                <div className="text-center">
                  <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className={`text-sm ${theme === 'white' ? 'text-gray-600' : 'text-white/70'}`}>
                    Failed to load image
                  </p>
                </div>
              </div>
            ) : (
              <img
                src={image.url}
                alt={image.prompt}
                className={`${getImageStyles()} transition-opacity duration-300 ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}

            {/* Action Buttons Overlay */}
            {!isLoading && !imageError && mode !== 'fullscreen' && (
              <div className="absolute top-2 right-2 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFullscreen}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <Maximize2 size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDownload}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <Download size={14} />
                </motion.button>
              </div>
            )}
          </div>

          {/* Image Metadata */}
          {!isLoading && !imageError && (
            <div className={`p-3 ${theme === 'white' ? 'bg-gray-50/80' : 'bg-white/5'} backdrop-blur-sm`}>
              <p className={`text-xs font-medium mb-2 ${theme === 'white' ? 'text-gray-800' : 'text-white'}`}>
                "{image.prompt}"
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 ${theme === 'white' ? 'text-gray-600' : 'text-white/70'}`}>
                    <Sparkles size={10} />
                    {image.model}
                  </span>
                  
                  {image.metadata?.generationTime && (
                    <span className={`flex items-center gap-1 ${theme === 'white' ? 'text-gray-600' : 'text-white/70'}`}>
                      <Clock size={10} />
                      {(image.metadata.generationTime / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                
                <span className={`flex items-center gap-1 ${theme === 'white' ? 'text-gray-600' : 'text-white/70'}`}>
                  <DollarSign size={10} />
                  ${image.cost.toFixed(3)}
                </span>
              </div>
              
              {image.metadata?.resolution && (
                <div className={`mt-1 text-xs ${theme === 'white' ? 'text-gray-500' : 'text-white/50'}`}>
                  {image.metadata.resolution} • {image.metadata.quality}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <ImageDisplay 
                image={image} 
                mode="fullscreen" 
                className="w-full h-full"
              />
              
              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowFullscreen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </motion.button>
              
              {/* Download Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDownload}
                className="absolute top-4 right-16 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <Download size={20} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
