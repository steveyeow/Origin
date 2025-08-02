'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import BinaryStream from './BinaryStream'

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const [randomValues, setRandomValues] = useState({
    smallStars: Array.from({ length: 80 }).map(() => Math.random()),
    mediumStars: Array.from({ length: 20 }).map(() => Math.random()),
    flares: Array.from({ length: 5 }).map(() => Math.random()),
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw static background once
    const drawStaticBackground = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Deep space gradient background inspired by real galaxy
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      )
      gradient.addColorStop(0, 'rgba(25, 20, 35, 1)') // Warm center like galaxy core
      gradient.addColorStop(0.2, 'rgba(20, 15, 40, 1)') // Deep purple-blue
      gradient.addColorStop(0.4, 'rgba(15, 12, 35, 1)') // Darker blue-purple
      gradient.addColorStop(0.7, 'rgba(8, 10, 25, 1)') // Deep space blue
      gradient.addColorStop(1, 'rgba(3, 5, 15, 1)') // Almost black
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Enhanced static nebula effects
      
      // Deep space nebula (static)
      const nebulaGradient = ctx.createRadialGradient(
        canvas.width * 0.25, 
        canvas.height * 0.3, 0,
        canvas.width * 0.25, 
        canvas.height * 0.3, 
        canvas.width * 0.8
      )
      nebulaGradient.addColorStop(0, 'rgba(120, 80, 200, 0.12)') // Deep purple
      nebulaGradient.addColorStop(0.3, 'rgba(80, 90, 180, 0.08)') // Purple-blue
      nebulaGradient.addColorStop(0.6, 'rgba(50, 70, 140, 0.04)') // Dark blue
      nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = nebulaGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Warm galaxy center nebula (static)
      const nebula2 = ctx.createRadialGradient(
        canvas.width * 0.75, 
        canvas.height * 0.65, 0,
        canvas.width * 0.75, 
        canvas.height * 0.65, 
        canvas.width * 0.6
      )
      nebula2.addColorStop(0, 'rgba(200, 120, 80, 0.1)') // Warm orange
      nebula2.addColorStop(0.4, 'rgba(150, 100, 120, 0.06)') // Warm purple
      nebula2.addColorStop(0.7, 'rgba(100, 80, 140, 0.03)') // Cool purple
      nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = nebula2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Distant star formation nebula (static)
      const nebula3 = ctx.createRadialGradient(
        canvas.width * 0.15, 
        canvas.height * 0.8, 0,
        canvas.width * 0.15, 
        canvas.height * 0.8, 
        canvas.width * 0.5
      )
      nebula3.addColorStop(0, 'rgba(120, 140, 180, 0.08)') // Cool blue-white
      nebula3.addColorStop(0.5, 'rgba(80, 100, 150, 0.04)') // Deeper blue
      nebula3.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = nebula3
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      drawStaticBackground() // Redraw after resize
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    // Draw the static background initially
    drawStaticBackground()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />
      
      {/* Advanced Binary Stream Effect */}
      <BinaryStream />
      
      {/* Simplified Spectrum Glow Effect in Center - Only Halo, No Rotating Elements */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* Main outer halo glow */}
        <motion.div
          className="w-[48rem] h-[48rem] rounded-full opacity-15 blur-xl"
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.5) 0%, rgba(59,130,246,0.4) 20%, rgba(16,185,129,0.4) 40%, rgba(245,158,11,0.4) 60%, rgba(239,68,68,0.5) 80%, transparent 100%)'
          }}
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Outer glow ring */}
        <motion.div
          className="absolute w-96 h-96 rounded-full opacity-30 blur-md"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(59,130,246,0.5) 50%, rgba(14,165,233,0.4) 100%)'
          }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Inner core */}
        <motion.div
          className="absolute w-16 h-16 rounded-full opacity-80"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(236,72,153,0.9) 60%, transparent 100%)'
          }}
          animate={{
            scale: [0.9, 1.2, 0.9],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Additional overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/20" />
      
      {/* Distant planets */}
      <div className="absolute inset-0">
        {/* Large distant planet */}
        <motion.div
          className="absolute w-32 h-32 rounded-full opacity-20 blur-sm"
          style={{
            left: '85%',
            top: '15%',
            background: 'radial-gradient(circle at 30% 30%, rgba(147, 51, 234, 0.6), rgba(99, 102, 241, 0.4), rgba(59, 130, 246, 0.2))'
          }}
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Medium planet */}
        <motion.div
          className="absolute w-20 h-20 rounded-full opacity-15 blur-sm"
          style={{
            left: '10%',
            top: '70%',
            background: 'radial-gradient(circle at 40% 20%, rgba(236, 72, 153, 0.5), rgba(168, 85, 247, 0.3), rgba(34, 211, 238, 0.2))'
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.12, 0.2, 0.12]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Shooting stars/meteors */}
      <div className="absolute inset-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`meteor-${i}`}
            className="absolute h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
            style={{
              width: `${60 + Math.random() * 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transformOrigin: 'left center',
              rotate: `${-30 + Math.random() * 60}deg`,
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)'
            }}
            animate={{
              x: ['-100px', '100vw'],
              opacity: [0, 1, 1, 0]
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 15,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
      
      {/* Enhanced animated stars with different sizes and colors */}
      <div className="absolute inset-0">
        {/* Small stars with enhanced colors */}
        {Array.from({ length: 120 }).map((_, i) => {
          const starColors = [
            '#ffffff', // white
            '#a5f3fc', // cyan
            '#e0e7ff', // indigo
            '#fde68a', // amber
            '#fbb6ce', // pink
            '#c7d2fe', // indigo-light
            '#a7f3d0', // emerald
          ]
          const color = starColors[i % starColors.length]
          const size = Math.random() * 1.5 + 0.5
          
          return (
            <motion.div
              key={`small-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                boxShadow: i % 3 === 0 ? `0 0 ${size * 2}px ${color}80` : 'none',
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.7, 1.2, 0.7],
              }}
              transition={{
                duration: 1.5 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "easeInOut"
              }}
            />
          )
        })}
        
        {/* Medium stars with enhanced glow */}
        {Array.from({ length: 30 }).map((_, i) => {
          const mediumColors = [
            '#93c5fd', // blue
            '#fcd34d', // yellow
            '#ffffff', // white
            '#f472b6', // pink
            '#34d399', // emerald
            '#a78bfa', // violet
            '#fb7185', // rose
          ]
          const color = mediumColors[i % mediumColors.length]
          const size = Math.random() * 2.5 + 2
          
          return (
            <motion.div
              key={`medium-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                boxShadow: `0 0 ${size * 3}px ${color}60, 0 0 ${size * 6}px ${color}30`,
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: 2.5 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut"
              }}
            />
          )
        })}
        
        {/* Enhanced bright flares and supernovas */}
        {Array.from({ length: 8 }).map((_, i) => {
          const flareColors = [
            '#ffffff', // white
            '#60a5fa', // blue
            '#fbbf24', // amber
            '#f472b6', // pink
            '#34d399', // emerald
            '#a78bfa', // violet
          ]
          const color = flareColors[i % flareColors.length]
          const size = Math.random() * 4 + 3
          
          return (
            <motion.div
              key={`flare-${i}`}
              className="absolute rounded-full blur-[0.5px]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                boxShadow: `0 0 ${size * 4}px ${color}80, 0 0 ${size * 8}px ${color}40, 0 0 ${size * 12}px ${color}20`,
              }}
              animate={{
                opacity: [0.1, 1, 0.1],
                scale: [0.8, 3, 0.8],
              }}
              transition={{
                duration: 3 + Math.random() * 6,
                repeat: Infinity,
                delay: Math.random() * 12,
                ease: "easeInOut"
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
