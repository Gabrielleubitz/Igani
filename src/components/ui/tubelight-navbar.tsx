"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DivideIcon as LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon | React.FC
  gradient: string
  iconColor: string
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  activeItem?: string
  onItemClick?: (name: string) => void
}

export function NavBar({ items, className, activeItem, onItemClick }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(activeItem || items[0].name)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (activeItem) {
      setActiveTab(activeItem)
    }
  }, [activeItem])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleItemClick = (item: NavItem) => {
    setActiveTab(item.name)
    if (onItemClick) {
      onItemClick(item.name)
    }
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex items-center gap-1 bg-slate-900/30 backdrop-blur-xl border border-white/20 py-1 px-1 rounded-2xl shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <button
              key={item.name}
              onClick={() => handleItemClick(item)}
              className={cn(
                "relative cursor-pointer text-sm font-medium px-4 py-2 rounded-xl transition-all duration-300",
                "text-slate-300 hover:text-white",
                isActive && "text-white",
              )}
            >
              <span className="hidden md:inline flex items-center gap-2">
                <span className={cn("transition-colors duration-300", isActive ? item.iconColor : "text-slate-400")}>
                  <Icon className="h-4 w-4" />
                </span>
                {item.name}
              </span>
              <span className="md:hidden">
                <Icon className={cn("h-5 w-5 transition-colors duration-300", isActive ? item.iconColor : "text-slate-400")} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="tubelight"
                  className="absolute inset-0 w-full bg-white/5 rounded-xl -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  {/* Tubelight effect */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-cyan-400 rounded-t-full">
                    <div className="absolute w-12 h-6 bg-cyan-400/30 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-cyan-400/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-cyan-400/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}