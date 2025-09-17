"use client"

import React from 'react'
import { User, Building2 } from 'lucide-react'
import { Badge } from '../ui/badge'
import { cn } from '@/lib/utils'

interface Mention {
  user_id: string
  display_name: string
  avatar_url?: string
  role?: string
}

interface ToMentionsProps {
  mentions?: Mention[]
  className?: string
}

export function ToMentions({ mentions, className }: ToMentionsProps) {
  if (!mentions || mentions.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2 mb-2", className)}>
      <span className="text-xs font-medium text-gray-600">TO</span>
      {mentions.map((mention, index) => (
        <Badge
          key={mention.user_id}
          variant="outline"
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border-blue-200 text-xs"
        >
          {/* アバター */}
          <div className="flex-shrink-0">
            {mention.avatar_url ? (
              <img
                src={mention.avatar_url}
                alt={mention.display_name}
                className="h-3 w-3 rounded-full object-cover"
              />
            ) : (
              <div className="h-3 w-3 rounded-full bg-blue-200 flex items-center justify-center">
                {mention.role === 'OrgAdmin' ? (
                  <Building2 className="h-2 w-2 text-blue-600" />
                ) : (
                  <User className="h-2 w-2 text-blue-600" />
                )}
              </div>
            )}
          </div>

          {/* 名前 */}
          <span className="truncate max-w-20">
            {mention.display_name}さん
          </span>
        </Badge>
      ))}
    </div>
  )
}
