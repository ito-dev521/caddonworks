"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  FileText,
  Eye,
  Edit,
  Archive,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"
import { StatusIndicator } from "../ui/status-indicator"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ProjectCardProps {
  project: {
    id: string
    title: string
    description: string
    client: string
    status: string
    progress: number
    startDate: string
    dueDate: string
    budget: number
    location: string
    team: string[]
    category: string
    priority: string
    tags: string[]
    lastActivity: string
  }
  index?: number
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const isOverdue = new Date(project.dueDate) < new Date() && project.status !== 'completed'
  const daysUntilDue = Math.ceil((new Date(project.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'medium':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="group"
    >
      <Card className={`h-full hover-lift transition-all duration-300 ${
        isOverdue ? 'border-red-200 bg-red-50/50' : ''
      } ${project.priority === 'critical' ? 'ring-2 ring-red-200' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1 group-hover:text-engineering-blue transition-colors">
                {project.title}
              </CardTitle>
              <CardDescription className="text-sm">
                {project.description}
              </CardDescription>
            </div>
            {isOverdue && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-2"
              >
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <StatusIndicator status={project.status} size="sm" />
            <Badge className={getPriorityColor(project.priority)}>
              {project.priority === 'critical' && '🔥 '}
              {project.priority === 'high' && '⚡ '}
              {project.priority === 'medium' && '📋 '}
              {project.priority === 'low' && '📝 '}
              {project.priority.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">進捗</span>
              <span className="text-sm text-gray-600">{project.progress}%</span>
            </div>
            <Progress
              value={project.progress}
              variant="engineering"
              className={project.progress === 100 ? 'animate-pulse' : ''}
            />
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="truncate">{project.client}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{project.location}</span>
            </div>

            <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(project.dueDate)}
                {daysUntilDue > 0 && !isOverdue && (
                  <span className="ml-1 text-xs text-blue-600">
                    ({daysUntilDue}日後)
                  </span>
                )}
                {isOverdue && (
                  <span className="ml-1 text-xs text-red-600 font-semibold">
                    ({Math.abs(daysUntilDue)}日超過)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold text-engineering-blue">
                {formatCurrency(project.budget)}
              </span>
            </div>
          </div>

          {/* Team Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">チーム</span>
              <span className="text-xs text-gray-500">{project.team.length}名</span>
            </div>
            <div className="flex items-center gap-1">
              {project.team.slice(0, 3).map((member, idx) => (
                <motion.div
                  key={member}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="w-8 h-8 bg-engineering-blue text-white rounded-full flex items-center justify-center text-xs font-medium"
                  title={member}
                >
                  {member.charAt(0)}
                </motion.div>
              ))}
              {project.team.length > 3 && (
                <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs">
                  +{project.team.length - 3}
                </div>
              )}
              {project.team.length === 0 && (
                <span className="text-xs text-gray-400">未アサイン</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date(project.lastActivity).toLocaleDateString('ja-JP')}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="group/btn">
                <Eye className="w-4 h-4 group-hover/btn:text-engineering-blue" />
              </Button>
              <Button variant="outline" size="sm" className="group/btn">
                <Edit className="w-4 h-4 group-hover/btn:text-engineering-blue" />
              </Button>
            </div>
          </div>

          {/* Completion Badge */}
          {project.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-2"
            >
              <CheckCircle className="w-4 h-4" />
            </motion.div>
          )}
        </CardContent>

        {/* Hover overlay effect */}
        <div className="absolute inset-0 bg-engineering-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
      </Card>
    </motion.div>
  )
}