'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BinaryStream } from './BinaryStream'

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Animation loop for background gradients only
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Create gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      )
      gradient.addColorStop(0, 'rgba(15, 23, 42, 1)') // slate-900
      gradient.addColorStop(0.4, 'rgba(30, 41, 59, 1)') // slate-800
      gradient.addColorStop(0.8, 'rgba(15, 23, 42, 1)') // slate-900
      gradient.addColorStop(1, 'rgba(2, 6, 23, 1)') // darker
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add some colorful nebula effects
      const nebulaGradient = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.4, 0,
        canvas.width * 0.3, canvas.height * 0.4, canvas.width * 0.6
      )
      nebulaGradient.addColorStop(0, 'rgba(139, 92, 246, 0.1)') // purple
      nebulaGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)') // blue
      nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = nebulaGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Another nebula
      const nebula2 = ctx.createRadialGradient(
        canvas.width * 0.7, canvas.height * 0.6, 0,
        canvas.width * 0.7, canvas.height * 0.6, canvas.width * 0.4
      )
      nebula2.addColorStop(0, 'rgba(236, 72, 153, 0.08)') // pink
      nebula2.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)') // purple
      nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = nebula2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

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
      
      {/* Enhanced animated stars with different sizes and colors */}
      <div className="absolute inset-0">
        {/* Small stars */}
        {Array.from({ length: 80 }).map((_, i) => (
          <motion.div
            key={`small-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 1.5 + 0.5}px`,
              height: `${Math.random() * 1.5 + 0.5}px`,
              backgroundColor: i % 5 === 0 ? '#a5f3fc' : i % 7 === 0 ? '#e0e7ff' : '#ffffff',
              boxShadow: i % 4 === 0 ? '0 0 4px rgba(255, 255, 255, 0.8)' : 'none',
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut"
            }}
          />
        ))}
        
        {/* Medium stars with glow */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`medium-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1.5}px`,
              height: `${Math.random() * 2 + 1.5}px`,
              backgroundColor: i % 3 === 0 ? '#93c5fd' : i % 2 === 0 ? '#fcd34d' : '#ffffff',
              boxShadow: `0 0 ${Math.random() * 4 + 3}px rgba(255, 255, 255, 0.8)`,
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
        
        {/* Occasional bright flares */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`flare-${i}`}
            className="absolute rounded-full blur-[1px]"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 2}px`,
              height: `${Math.random() * 3 + 2}px`,
              backgroundColor: '#ffffff',
              boxShadow: `0 0 8px rgba(255, 255, 255, 0.9), 0 0 12px rgba(255, 255, 255, 0.5)`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 2.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 8,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}
