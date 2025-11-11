'use client'

import { ButtonHTMLAttributes, ReactNode, AnchorHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface BaseButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'default' | 'large'
  children: ReactNode
  href?: string
  asLink?: boolean
  className?: string
}

type AnimatedButtonProps = BaseButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps>

export function AnimatedButton({
  variant = 'primary',
  size = 'default',
  children,
  href,
  asLink = false,
  className = '',
  disabled,
  onClick,
  type,
  ...restProps
}: AnimatedButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 ease-out cursor-pointer border-none overflow-hidden group"

  const sizeStyles = size === 'large'
    ? "px-10 py-4 text-lg"
    : "px-8 py-3.5 text-base"

  const variantStyles = variant === 'primary'
    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 hover:shadow-[0_8px_20px_rgba(6,182,212,0.4)]"
    : "bg-transparent text-white border-2 border-white hover:bg-white/15 hover:shadow-[0_4px_12px_rgba(255,255,255,0.2)]"

  const combinedStyles = `${baseStyles} ${sizeStyles} ${variantStyles} ${className}`

  const buttonContent = (
    <>
      {/* Animated ripple effect */}
      <span className="absolute top-1/2 left-1/2 w-0 h-0 rounded-full bg-white/30 -translate-x-1/2 -translate-y-1/2 transition-all duration-600 ease-out group-hover:w-[300px] group-hover:h-[300px]" />

      {/* Button text - stays above animation */}
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </>
  )

  if (asLink && href) {
    return (
      <motion.a
        href={href}
        className={combinedStyles}
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
      >
        {buttonContent}
      </motion.a>
    )
  }

  return (
    <motion.button
      className={combinedStyles}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {buttonContent}
    </motion.button>
  )
}
