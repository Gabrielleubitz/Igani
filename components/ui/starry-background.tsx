'use client'

import { useEffect, useRef } from 'react'

export function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = document.documentElement.scrollHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Star class
    class Star {
      x: number
      y: number
      size: number
      opacity: number
      twinkleSpeed: number
      twinkleDirection: number

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth
        this.y = Math.random() * canvasHeight
        this.size = Math.random() * 2
        this.opacity = Math.random()
        this.twinkleSpeed = Math.random() * 0.02 + 0.005
        this.twinkleDirection = Math.random() > 0.5 ? 1 : -1
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
        ctx.fill()

        // Add glow effect for larger stars
        if (this.size > 1) {
          ctx.beginPath()
          ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(147, 197, 253, ${this.opacity * 0.3})` // Light blue glow
          ctx.fill()
        }
      }

      update() {
        // Twinkle effect
        this.opacity += this.twinkleSpeed * this.twinkleDirection
        if (this.opacity <= 0 || this.opacity >= 1) {
          this.twinkleDirection *= -1
        }
        this.draw()
      }
    }

    // Shooting star class
    class ShootingStar {
      x: number
      y: number
      length: number
      speed: number
      opacity: number
      angle: number
      active: boolean
      canvasWidth: number
      canvasHeight: number

      constructor(canvasWidth: number, canvasHeight: number) {
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
        this.x = 0
        this.y = 0
        this.length = 0
        this.speed = 0
        this.opacity = 0
        this.angle = 0
        this.active = false
        this.reset()
      }

      reset() {
        // Random position anywhere on screen
        this.x = Math.random() * this.canvasWidth
        this.y = Math.random() * this.canvasHeight
        this.length = Math.random() * 120 + 80 // Increased length
        this.speed = Math.random() * 8 + 6 // Slightly slower for visibility
        this.opacity = 1
        // Random angle between 30-60 degrees (more variety)
        this.angle = (Math.random() * Math.PI / 6) + (Math.PI / 6)
        this.active = true
      }

      draw() {
        if (!ctx || !this.active) return

        const endX = this.x + Math.cos(this.angle) * this.length
        const endY = this.y + Math.sin(this.angle) * this.length

        // Create gradient for trail
        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY)
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`)
        gradient.addColorStop(0.3, `rgba(147, 197, 253, ${this.opacity})`)
        gradient.addColorStop(0.6, `rgba(59, 130, 246, ${this.opacity * 0.6})`)
        gradient.addColorStop(1, `rgba(59, 130, 246, 0)`)

        ctx.beginPath()
        ctx.moveTo(this.x, this.y)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 3 // Increased from 2 to 3
        ctx.stroke()

        // Draw bright head with glow
        ctx.shadowBlur = 10
        ctx.shadowColor = 'rgba(147, 197, 253, 0.8)'
        ctx.beginPath()
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`
        ctx.fill()
        ctx.shadowBlur = 0
      }

      update() {
        if (!this.active) return

        this.x += Math.cos(this.angle) * this.speed
        this.y += Math.sin(this.angle) * this.speed
        this.opacity -= 0.015

        // Reset if off screen or faded
        if (this.opacity <= 0 || this.x > this.canvasWidth || this.y > this.canvasHeight) {
          this.active = false
        }

        this.draw()
      }
    }

    // Create stars
    const stars: Star[] = []
    const starCount = 500 // Increased from 200 to 500
    for (let i = 0; i < starCount; i++) {
      stars.push(new Star(canvas.width, canvas.height))
    }

    // Create shooting stars pool
    const shootingStars: ShootingStar[] = []
    const maxShootingStars = 5 // Increased from 3 to 5
    for (let i = 0; i < maxShootingStars; i++) {
      shootingStars.push(new ShootingStar(canvas.width, canvas.height))
    }

    // Animation loop with timer for shooting stars
    let animationId: number
    let lastShootingStarTime = Date.now()
    const shootingStarInterval = 2000 // Spawn a shooting star every 2 seconds
    let shootingStarIndex = 0

    const animate = () => {
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw stars
      stars.forEach(star => star.update())

      // Timer-based shooting star activation
      const currentTime = Date.now()
      if (currentTime - lastShootingStarTime > shootingStarInterval) {
        // Activate next shooting star in sequence
        shootingStars[shootingStarIndex].reset()
        shootingStarIndex = (shootingStarIndex + 1) % shootingStars.length
        lastShootingStarTime = currentTime
      }

      // Update and draw shooting stars
      shootingStars.forEach(star => star.update())

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  )
}
