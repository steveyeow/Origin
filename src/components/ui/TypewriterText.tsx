'use client'

import { useState, useEffect } from 'react'
import { useThemeContext } from '@/context/ThemeContext'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
  startDelay?: number
  style?: React.CSSProperties
}

export default function TypewriterText({ 
  text, 
  speed = 50, 
  onComplete, 
  className = '',
  startDelay = 0,
  style
}: TypewriterTextProps) {
  const { theme } = useThemeContext();
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Handle initial delay before starting to type
    if (currentIndex === 0) {
      const delayTimer = setTimeout(() => {
        setCurrentIndex(1)
        setDisplayedText(text[0] || '')
      }, startDelay)
      
      return () => clearTimeout(delayTimer)
    } 
    // Normal typing after initial character
    else if (currentIndex > 0 && currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else if (currentIndex >= text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, speed, onComplete, startDelay])

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text])

  // Force black text in white mode with !important inline style
  const textStyle = theme === 'white' 
    ? { 
        ...style, 
        color: '#000000', 
        opacity: 1,
        fontWeight: 500
      } 
    : { 
        ...style, 
        color: '#ffffff', 
        opacity: 1 
      };
    
  return (
    <span 
      className={`${className}`}
      style={textStyle}
    >
      {displayedText}
    </span>
  )
}
