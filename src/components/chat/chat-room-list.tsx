"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  MessageCircle,
  Users,
  Search,
  Plus,
  Clock,
  Pin,
  MoreHorizontal
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface ChatRoom {
  id: string
  name: string
  description?: string
  project_id: string
  project_name?: string
  created_at: string
  updated_at: string
  is_active: boolean
  participant_count?: number
  unread_count?: number
  last_message?: {
    content: string
    sender_name: string
    created_at: string
  }
}

interface ChatRoomListProps {
  selectedRoomId?: string
  onRoomSelect: (roomId: string) => void
  className?: string
}

export function ChatRoomList({
  selectedRoomId,
  onRoomSelect,
  className = ""
}: ChatRoomListProps) {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewRoomModal, setShowNewRoomModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchChatRooms()
      setupRealtimeSubscription()
    }
  }, [user])

  const fetchChatRooms = async () => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        setLoading(false)
        return
      }

      const response = await fetch('/api/chat/rooms', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        setRooms(result.rooms)
      } else {
        console.error('チャットルーム取得エラー:', result.message)
        setRooms([])
      }
    } catch (error) {
      console.error('チャットルーム取得エラー:', error)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('chat-rooms-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms' },
        () => fetchChatRooms()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => fetchChatRooms()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return Math.floor((now.getTime() - date.getTime()) / (1000 * 60)) + '分前'
    } else if (diffInHours < 24) {
      return diffInHours + '時間前'
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    }
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">チャット</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewRoomModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="チャットルームを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
          />
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MessageCircle className="w-12 h-12 mb-4" />
            <p>チャットルームがありません</p>
            {searchQuery && (
              <p className="text-sm">検索条件に一致するルームが見つかりません</p>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredRooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                  selectedRoomId === room.id && "bg-engineering-blue/10 border border-engineering-blue/20"
                )}
                onClick={() => onRoomSelect(room.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {room.name}
                      </h3>
                      {(room.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="text-xs px-2 py-0.5">
                          {(room.unread_count || 0) > 99 ? '99+' : room.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      プロジェクト: {room.project_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Users className="w-3 h-3" />
                    <span>{room.participant_count}</span>
                  </div>
                </div>

                {room.last_message && (
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 truncate">
                        {room.last_message.sender_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatLastMessageTime(room.last_message.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {room.last_message.content}
                    </p>
                  </div>
                )}

                {!room.last_message && (
                  <p className="text-xs text-gray-400">メッセージがありません</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}