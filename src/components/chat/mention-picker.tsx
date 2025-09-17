"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AtSign, Users } from "lucide-react"
import { Button } from "../ui/button"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface MentionUser {
  id: string
  display_name: string
  email: string
  avatar_url?: string
  role: string
}

interface MentionPickerProps {
  onMentionSelect: (user: MentionUser) => void
  className?: string
  projectId?: string
}

export const MentionPicker: React.FC<MentionPickerProps> = ({ 
  onMentionSelect, 
  className,
  projectId 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<MentionUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<MentionUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { user } = useAuth()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // チャットルームの参加者を取得
  useEffect(() => {
    const fetchChatParticipants = async () => {
      if (!projectId) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.error('認証トークンが取得できません')
          return
        }

        const response = await fetch(`/api/chat/participants?room_id=project_${projectId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          console.error('参加者取得エラー:', response.statusText)
          return
        }

        const result = await response.json()
        setUsers(result.participants || [])
        setFilteredUsers(result.participants || [])
      } catch (error) {
        console.error('チャット参加者取得エラー:', error)
      }
    }

    fetchChatParticipants()
  }, [projectId])

  // 検索フィルタリング
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user =>
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
    setSelectedIndex(0)
  }, [searchTerm, users])

  const handleUserSelect = (selectedUser: MentionUser, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    onMentionSelect(selectedUser)
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    // フォーム送信を防ぐ
    e.stopPropagation()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredUsers[selectedIndex]) {
          handleUserSelect(filteredUsers[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className={`relative ${className}`} onKeyDown={handleKeyDown}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-gray-100"
      >
        <AtSign className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* メンションピッカー */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
              onKeyDown={handleKeyDown}
            >
              {/* ヘッダー */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-engineering-blue" />
                  <span className="font-medium text-sm">メンバーを選択</span>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="メンバー名を検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* ユーザーリスト */}
              <div className="max-h-64 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    メンバーが見つかりません
                  </div>
                ) : (
                  filteredUsers.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={(e) => handleUserSelect(user, e)}
                      className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                        index === selectedIndex ? 'bg-engineering-blue/10' : ''
                      }`}
                      type="button"
                    >
                      <div className="w-8 h-8 rounded-full bg-engineering-blue/20 flex items-center justify-center text-sm font-medium">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          user.display_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {user.display_name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.role}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* フッター */}
              <div className="p-2 border-t border-gray-200 text-xs text-gray-500 text-center">
                ↑↓ で選択、Enter で確定、Esc でキャンセル
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
