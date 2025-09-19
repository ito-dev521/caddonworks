"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  User,
  X,
  Plus,
  Check,
  AlertCircle,
  Trash2
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface Participant {
  id: string
  email: string
  display_name?: string
  role: string
  joined_at: string
  is_basic?: boolean
}

interface InviteResult {
  email: string
  success: boolean
  message?: string
  error?: string
}

interface ChatParticipantsPanelProps {
  roomId: string
  projectId: string
  isVisible: boolean
  onClose: () => void
  className?: string
}

export function ChatParticipantsPanel({
  roomId,
  projectId,
  isVisible,
  onClose,
  className = ""
}: ChatParticipantsPanelProps) {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmails, setInviteEmails] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteResults, setInviteResults] = useState<InviteResult[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [canInvite, setCanInvite] = useState(false)
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    if (isVisible && roomId) {
      fetchParticipants()
      checkInvitePermission()
      fetchOrganizationUsers()
    }
  }, [isVisible, roomId])

  const fetchParticipants = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        return
      }

      const response = await fetch(`/api/chat/participants?room_id=${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        setParticipants(result.participants)
      } else {
        console.error('参加者取得エラー:', {
          status: response.status,
          message: result.message,
          debug: result.debug,
          roomId: roomId,
          projectId: projectId
        })
        setParticipants([])
      }
    } catch (error) {
      console.error('参加者取得エラー:', error)
      setParticipants([])
    } finally {
      setLoading(false)
    }
  }

  const checkInvitePermission = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // プロジェクト情報を取得してユーザーが発注者側かチェック
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        const project = result.project

        // ユーザープロフィールを取得
        const { data: userProfile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user?.id)
          .single()

        // 組織メンバーシップをチェック
        const { data: membership } = await supabase
          .from('memberships')
          .select('org_id, role')
          .eq('user_id', userProfile?.id)
          .single()

        // 発注者側の組織メンバーなら招待可能
        setCanInvite(membership?.org_id === project.org_id)
      }
    } catch (error) {
      console.error('権限確認エラー:', error)
      setCanInvite(false)
    }
  }

  const fetchOrganizationUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/settings/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // 既に参加しているユーザー（基本参加者+招待済み）を除外
        const availableUsers = (data.users || []).filter((user: any) => 
          !participants.some(p => p.email === user.email)
        )
        setOrganizationUsers(availableUsers)
      }
    } catch (error) {
      console.error('組織ユーザー取得エラー:', error)
    }
  }

  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) return

    setInviting(true)
    setInviteResults([])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        return
      }

      // 選択されたユーザーのメールアドレスを取得
      const emails = selectedUsers

      const response = await fetch('/api/chat/participants/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          room_id: roomId,
          user_emails: emails
        })
      })

      const result = await response.json()

      if (response.ok) {
        setInviteResults(result.results)
        setSelectedUsers([])
        fetchParticipants() // 参加者リストを更新
        fetchOrganizationUsers() // 利用可能ユーザーリストを更新
      } else {
        console.error('招待エラー:', result.message)
        setInviteResults([{
          email: "全体",
          success: false,
          error: result.message
        }])
      }
    } catch (error) {
      console.error('招待エラー:', error)
      setInviteResults([{
        email: "全体",
        success: false,
        error: "招待処理中にエラーが発生しました"
      }])
    } finally {
      setInviting(false)
    }
  }

  const getRoleIcon = (role: string) => {
    if (role === 'Contractor') {
      return <User className="w-4 h-4 text-blue-600" />
    }

    if (role === 'OrgAdmin') {
      return <Crown className="w-4 h-4 text-yellow-600" />
    } else if (role === 'Staff') {
      return <Shield className="w-4 h-4 text-green-600" />
    }

    return <User className="w-4 h-4 text-gray-600" />
  }

  const getRoleLabel = (role: string) => {
    if (role === 'Contractor') {
      return '受注者'
    }

    if (role === 'OrgAdmin') {
      return '組織管理者'
    } else if (role === 'Staff') {
      return 'スタッフ'
    }

    return 'メンバー'
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      className={cn(
        "fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-engineering-blue" />
            <h3 className="font-semibold text-gray-900">参加者</h3>
            <Badge variant="secondary">{participants.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Invite Section */}
            {canInvite && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">招待</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    招待
                  </Button>
                </div>

                <AnimatePresence>
                  {showInviteForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          招待するユーザーを選択
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                          {organizationUsers.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              招待可能なユーザーがいません
                            </p>
                          ) : (
                            organizationUsers.map((user) => (
                              <label
                                key={user.id}
                                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.email)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUsers([...selectedUsers, user.email])
                                    } else {
                                      setSelectedUsers(selectedUsers.filter(email => email !== user.email))
                                    }
                                  }}
                                  className="rounded border-gray-300 text-engineering-blue focus:ring-engineering-blue"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {user.display_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                        {selectedUsers.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            {selectedUsers.length}名のユーザーを選択中
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleInviteUsers}
                          disabled={selectedUsers.length === 0 || inviting}
                          size="sm"
                          className="flex-1"
                        >
                          {inviting ? "招待中..." : "招待する"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowInviteForm(false)
                            setSelectedUsers([])
                            setInviteResults([])
                          }}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Invite Results */}
                {inviteResults.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-gray-600">招待結果</h5>
                    {inviteResults.map((result, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-2 rounded-lg text-xs",
                          result.success
                            ? "bg-green-50 text-green-800"
                            : "bg-red-50 text-red-800"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          <span className="font-medium">{result.email}</span>
                        </div>
                        <p className="mt-1">
                          {result.message || result.error}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Participants List */}
            <div className="space-y-3">
              {/* 基本参加者 */}
              {participants.filter(p => p.is_basic).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">プロジェクト関係者</h4>
                  <div className="space-y-2">
                    {participants.filter(p => p.is_basic).map((participant) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-engineering-blue flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {participant.display_name?.charAt(0) || participant.email.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {participant.display_name || '名前未設定'}
                            </p>
                            {getRoleIcon(participant.role)}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {participant.email}
                          </p>
                          <Badge
                            variant={participant.role === 'Contractor' ? 'contractor' : 'secondary'}
                            className="mt-1 text-xs"
                          >
                            {getRoleLabel(participant.role)}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 招待参加者 */}
              {participants.filter(p => !p.is_basic).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">招待参加者</h4>
                  <div className="space-y-2">
                    {participants.filter(p => !p.is_basic).map((participant) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {participant.display_name?.charAt(0) || participant.email.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {participant.display_name || '名前未設定'}
                            </p>
                            {getRoleIcon(participant.role)}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {participant.email}
                          </p>
                          <Badge
                            variant={participant.role === 'Contractor' ? 'contractor' : 'secondary'}
                            className="mt-1 text-xs"
                          >
                            {getRoleLabel(participant.role)}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* 参加者がいない場合 */}
              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">参加者がいません</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}