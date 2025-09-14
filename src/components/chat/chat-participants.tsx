"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  X,
  Plus,
  Crown,
  Shield,
  User,
  Mail,
  MoreVertical,
  UserMinus,
  UserCheck,
  Search
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface ChatParticipant {
  id: string
  room_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  last_read_at: string
  is_active: boolean
  user: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
    user_role?: string
  }
}

interface ChatParticipantsProps {
  roomId: string
  onClose: () => void
  className?: string
}

export function ChatParticipants({
  roomId,
  onClose,
  className = ""
}: ChatParticipantsProps) {
  const { user, userRole } = useAuth()
  const [participants, setParticipants] = useState<ChatParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member'>('member')

  useEffect(() => {
    if (roomId) {
      fetchParticipants()
    }
  }, [roomId])

  const fetchParticipants = async () => {
    if (!roomId) return

    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          auth.users:user_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('room_id', roomId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })

      if (error) throw error

      const formattedParticipants = (data || []).map(p => ({
        ...p,
        user: {
          id: p.users?.id,
          email: p.users?.email,
          display_name: p.users?.user_metadata?.display_name,
          avatar_url: p.users?.user_metadata?.avatar_url,
          user_role: p.users?.user_metadata?.user_role
        }
      }))

      setParticipants(formattedParticipants)

      // Get current user's role in this room
      const currentUser = formattedParticipants.find(p => p.user_id === user?.id)
      if (currentUser) {
        setCurrentUserRole(currentUser.role)
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (email: string) => {
    if (!email.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      // Search for users by email (this would typically be a custom API endpoint)
      // For now, we'll simulate searching organization users
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          auth.users!inner (
            id,
            email,
            user_metadata
          )
        `)
        .ilike('auth.users.email', `%${email}%`)
        .limit(10)

      if (error) throw error

      // Filter out users who are already participants
      const existingUserIds = participants.map(p => p.user_id)
      const filteredResults = (data || []).filter(
        u => !existingUserIds.includes(u.users.id)
      )

      setSearchResults(filteredResults)
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const addParticipant = async (userId: string, role: 'admin' | 'member' = 'member') => {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert([{
          room_id: roomId,
          user_id: userId,
          role: role
        }])

      if (error) throw error

      await fetchParticipants()
      setShowAddModal(false)
      setSearchEmail("")
      setSearchResults([])
    } catch (error) {
      console.error('Error adding participant:', error)
    }
  }

  const updateParticipantRole = async (participantId: string, newRole: 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ role: newRole })
        .eq('id', participantId)

      if (error) throw error
      await fetchParticipants()
    } catch (error) {
      console.error('Error updating participant role:', error)
    }
  }

  const removeParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_active: false })
        .eq('id', participantId)

      if (error) throw error
      await fetchParticipants()
    } catch (error) {
      console.error('Error removing participant:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      owner: 'default',
      admin: 'secondary',
      member: 'outline'
    }
    const labels = {
      owner: 'オーナー',
      admin: '管理者',
      member: 'メンバー'
    }
    return (
      <Badge variant={variants[role as keyof typeof variants] as any} className="text-xs">
        {labels[role as keyof typeof labels]}
      </Badge>
    )
  }

  const canManageParticipants = currentUserRole === 'owner' || currentUserRole === 'admin'

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-4", className)}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-engineering-blue" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-engineering-blue" />
          <h3 className="font-semibold text-gray-900">参加者</h3>
          <Badge variant="secondary" className="text-xs">
            {participants.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Add Participant Button */}
      {canManageParticipants && (
        <div className="p-4 border-b border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            参加者を追加
          </Button>
        </div>
      )}

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {participants.map((participant) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 group"
          >
            {/* Avatar */}
            <div className="w-10 h-10 bg-engineering-blue rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
              {participant.user.display_name?.charAt(0) || participant.user.email?.charAt(0) || 'U'}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-gray-900 truncate">
                  {participant.user.display_name || '名前未設定'}
                </p>
                {getRoleIcon(participant.role)}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {participant.user.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {getRoleBadge(participant.role)}
                {participant.user.user_role && (
                  <Badge variant="outline" className="text-xs">
                    {participant.user.user_role}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            {canManageParticipants && participant.user_id !== user?.id && participant.role !== 'owner' && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  {participant.role === 'member' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateParticipantRole(participant.id, 'admin')}
                      className="h-8 w-8 p-0"
                      title="管理者にする"
                    >
                      <UserCheck className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateParticipantRole(participant.id, 'member')}
                      className="h-8 w-8 p-0"
                      title="メンバーにする"
                    >
                      <User className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeParticipant(participant.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    title="削除"
                  >
                    <UserMinus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">参加者を追加</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  placeholder="メールアドレスで検索..."
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                />
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-engineering-blue" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div
                      key={result.users.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-engineering-blue rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {result.display_name?.charAt(0) || result.users.email?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {result.display_name || '名前未設定'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {result.users.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addParticipant(result.users.id, 'member')}
                        >
                          メンバー
                        </Button>
                        {(currentUserRole === 'owner') && (
                          <Button
                            size="sm"
                            onClick={() => addParticipant(result.users.id, 'admin')}
                          >
                            管理者
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : searchEmail.trim() ? (
                  <div className="text-center py-4 text-gray-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">該当するユーザーが見つかりません</p>
                    <p className="text-xs">組織に登録されているユーザーのみ追加できます</p>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}