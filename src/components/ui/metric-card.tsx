"use client"

import React from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card, CardContent } from "./card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive?: boolean
  }
  className?: string
  variant?: "default" | "engineering" | "glass" | "gradient"
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  className,
  variant = "default"
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -2 }}
      className="relative overflow-hidden"
    >
      <Card className={cn(
        "relative hover-lift transition-all duration-300",
        variant === "engineering" && "border-engineering-blue/20 bg-gradient-to-br from-white to-engineering-blue/5",
        variant === "glass" && "glass border-white/20",
        variant === "gradient" && "gradient-engineering text-white border-0",
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium",
                variant === "gradient" ? "text-white/80" : "text-muted-foreground"
              )}>
                {title}
              </p>
              <div className="flex items-center gap-2">
                <motion.p
                  className={cn(
                    "text-2xl font-bold",
                    variant === "gradient" ? "text-white" : "text-foreground"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {value}
                </motion.p>
                {trend && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      "flex items-center text-xs font-medium",
                      trend.isPositive
                        ? variant === "gradient" ? "text-green-200" : "text-green-600"
                        : trend.isPositive === false
                        ? variant === "gradient" ? "text-red-200" : "text-red-600"
                        : variant === "gradient" ? "text-white/60" : "text-gray-600"
                    )}
                  >
                    {trend.isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : trend.isPositive === false ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : (
                      <Minus className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(trend.value)}%
                  </motion.div>
                )}
              </div>
            </div>
            {icon && (
              <motion.div
                className={cn(
                  "p-3 rounded-lg",
                  variant === "engineering" && "bg-engineering-blue/10 text-engineering-blue",
                  variant === "gradient" && "bg-white/20 text-white",
                  variant === "glass" && "bg-white/20",
                  variant === "default" && "bg-primary/10 text-primary"
                )}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              >
                {icon}
              </motion.div>
            )}
          </div>
        </CardContent>

        {/* Subtle animated background pattern */}
        {variant === "engineering" && (
          <div className="absolute inset-0 opacity-5">
            <div className="animated-mesh absolute -right-4 -top-4 w-24 h-24 bg-engineering-blue rounded-full" />
          </div>
        )}

        {variant === "gradient" && (
          <div className="absolute inset-0 opacity-20">
            <div className="animated-mesh absolute -right-6 -bottom-6 w-32 h-32 bg-white rounded-full blur-xl" />
          </div>
        )}
      </Card>
    </motion.div>
  )
}