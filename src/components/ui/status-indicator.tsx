"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn, getStatusColor, getStatusIcon, getStatusLabel } from "@/lib/utils"

interface StatusIndicatorProps {
  status: string
  size?: "sm" | "md" | "lg"
  animated?: boolean
  className?: string
}

export function StatusIndicator({
  status,
  size = "md",
  animated = true,
  className
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  }

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5"
  }

  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.8 } : false}
      animate={animated ? { opacity: 1, scale: 1 } : false}
      transition={{ duration: 0.3 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium",
        getStatusColor(status),
        sizeClasses[size],
        className
      )}
    >
      <motion.div
        className={cn(
          "rounded-full",
          dotSizes[size],
          status === "in_progress" ? "status-active" :
          status === "draft" ? "status-pending" :
          "status-dot bg-current"
        )}
        animate={status === "in_progress" ? {
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        } : {}}
        transition={{
          duration: 2,
          repeat: status === "in_progress" ? Infinity : 0
        }}
      />
      <span className="flex items-center gap-1">
        {getStatusIcon(status)}
        {getStatusLabel(status)}
      </span>
    </motion.div>
  )
}