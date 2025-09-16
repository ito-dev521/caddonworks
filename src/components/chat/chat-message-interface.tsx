"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send,
  Paperclip,
  Image,
  File,
  Download,
  Reply,
  MoreHorizontal,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  Edit3
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'system'
  file_url?: string
  file_name?: string
  file_size?: number
  reply_to?: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_deleted: boolean
  sender?: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
  }
  reply_message?: {
    id: string
    content: string
    sender_name: string
  }
}

interface ChatMessageInterfaceProps {
  roomId: string
  className?: string
}

export function ChatMessageInterface({
  roomId,
  className = ""
}: ChatMessageInterfaceProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<string | null>(null)
  const [fileComment, setFileComment] = useState("")
  const [showFileCommentModal, setShowFileCommentModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (roomId) {
      fetchMessages()
      markMessagesAsRead()
      setupRealtimeSubscription()
    }
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    if (!roomId) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/chat/messages?room_id=${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        // メッセージデータを正しい形式に変換
        const formattedMessages = result.messages?.map((msg: any) => ({
          id: msg.id,
          room_id: roomId,
          content: msg.content,
          sender_id: msg.sender_id,
          sender: {
            id: msg.sender_id,
            display_name: msg.sender_name || 'Unknown',
            email: msg.sender_email,
            avatar_url: msg.sender_avatar_url
          },
          sender_type: msg.sender_type,
          created_at: msg.created_at,
          is_deleted: false,
          message_type: msg.message_type || 'text',
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_size: msg.file_size
        })) || []
        setMessages(formattedMessages)
      } else {
        console.error('メッセージ取得エラー:', result.message)
        setMessages([])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`chat-messages-${roomId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        () => fetchMessages()
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        () => fetchMessages()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markMessagesAsRead = async () => {
    if (!roomId || !user) return

    try {
      await supabase.rpc('mark_messages_as_read', {
        p_room_id: roomId
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        return
      }

      const messageData = {
        room_id: roomId,
        content: newMessage.trim(),
        message_type: 'text'
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(messageData)
      })

      const result = await response.json()

      if (response.ok) {
        setNewMessage("")
        setReplyingTo(null)
        fetchMessages() // Refresh messages
      } else {
        console.error('メッセージ送信エラー:', result.message)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setFileComment("")
    setShowFileCommentModal(true)
  }

  const handleFileUpload = async (file: File, comment: string = "") => {
    if (!user || !file) return

    try {
      setSending(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        return
      }

      // FormDataを作成
      const formData = new FormData()
      formData.append('file', file)
      formData.append('roomId', roomId)
      formData.append('comment', comment)

      console.log('ファイルアップロード開始:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        roomId,
        comment
      })

      // APIエンドポイント経由でファイルをアップロード
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        console.log('ファイルアップロード成功:', result)
        // メッセージ一覧を再取得
        fetchMessages()
        // モーダルを閉じる
        setShowFileCommentModal(false)
        setSelectedFile(null)
        setFileComment("")
      } else {
        console.error('ファイルアップロードエラー:', result.message)
        alert('ファイルのアップロードに失敗しました: ' + result.message)
      }

    } catch (error) {
      console.error('Error uploading file:', error)
      alert('ファイルのアップロードに失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    } finally {
      setSending(false)
    }
  }

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: newContent,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user?.id)

      if (error) throw error
      setEditingMessage(null)
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('sender_id', user?.id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => {
            const isOwnMessage = message.sender_id === user?.id
            const showAvatar = !isOwnMessage

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "flex gap-3 group",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
              >
                {/* Avatar */}
                {showAvatar && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 overflow-hidden">
                    {message.sender?.avatar_url ? (
                      <img
                        src={message.sender.avatar_url}
                        alt={message.sender?.display_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-engineering-blue flex items-center justify-center">
                        {message.sender?.display_name?.charAt(0) || message.sender?.email?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className={cn("flex flex-col max-w-xs sm:max-w-md", isOwnMessage && "items-end")}>
                  {/* Sender Name & Time */}
                  <div className={cn(
                    "flex items-center gap-2 mb-1 text-xs text-gray-500",
                    isOwnMessage ? "flex-row-reverse" : "flex-row"
                  )}>
                    <span className="font-medium">
                      {isOwnMessage ? 'あなた' : (message.sender?.display_name || message.sender?.email || '不明')}
                    </span>
                    <span>{formatMessageTime(message.created_at)}</span>
                    {message.edited_at && (
                      <span className="text-xs text-gray-400">(編集済み)</span>
                    )}
                  </div>

                  {/* Reply Reference */}
                  {message.reply_message && (
                    <div className="mb-2 p-2 bg-gray-100 border-l-2 border-engineering-blue rounded text-xs">
                      <div className="font-medium text-engineering-blue">
                        {message.reply_message.sender_name}
                      </div>
                      <div className="text-gray-600 truncate">
                        {message.reply_message.content}
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={cn(
                    "relative px-4 py-2 rounded-2xl max-w-full break-words",
                    isOwnMessage
                      ? "bg-engineering-blue text-white"
                      : "bg-gray-100 text-gray-900"
                  )}>
                    {editingMessage === message.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          defaultValue={message.content}
                          className="flex-1 bg-transparent border-none outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              editMessage(message.id, e.currentTarget.value)
                            } else if (e.key === 'Escape') {
                              setEditingMessage(null)
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingMessage(null)}
                          className="text-current hover:bg-white/20"
                        >
                          キャンセル
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Text Message */}
                        {message.message_type === 'text' && (
                          <p>{message.content}</p>
                        )}

                        {/* File/Image Message */}
                        {(message.message_type === 'file' || message.message_type === 'image') && (
                          <div className="space-y-2">
                            {/* コメントがある場合は表示 */}
                            {message.content !== message.file_name && (
                              <p className="text-sm">{message.content}</p>
                            )}
                            
                            {message.message_type === 'image' ? (
                              <div>
                                <img
                                  src={message.file_url}
                                  alt={message.file_name}
                                  className="max-w-xs rounded-lg"
                                />
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs opacity-75">{message.file_name}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-current hover:bg-white/20 h-6 px-2"
                                    onClick={() => window.open(message.file_url, '_blank')}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                                <File className="w-4 h-4" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{message.file_name}</p>
                                  {message.file_size && (
                                    <p className="text-xs opacity-75">
                                      {formatFileSize(message.file_size)}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-current hover:bg-white/20"
                                  onClick={() => window.open(message.file_url, '_blank')}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Message Actions */}
                    {isOwnMessage && editingMessage !== message.id && (
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 bg-white text-gray-600 hover:text-engineering-blue"
                            onClick={() => setEditingMessage(message.id)}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 bg-white text-gray-600 hover:text-red-600"
                            onClick={() => deleteMessage(message.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply Button */}
                  {!isOwnMessage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-engineering-blue"
                      onClick={() => setReplyingTo(message)}
                    >
                      <Reply className="w-3 h-3 mr-1" />
                      返信
                    </Button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-engineering-blue font-medium">
                {replyingTo.sender?.display_name || replyingTo.sender?.email}への返信
              </div>
              <div className="text-sm text-gray-600 truncate">
                {replyingTo.content}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
              rows={1}
              onKeyDown={(e) => {
                // Enterキーでの送信を無効化（Shift+Enterで改行のみ可能）
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  // 送信はしない
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileSelect(file)
                }
              }}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4"
            >
              {sending ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* File Comment Modal */}
      {showFileCommentModal && selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ファイルをアップロード
            </h3>
            
            <div className="mb-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-engineering-blue rounded-lg flex items-center justify-center">
                  <File className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                コメント（任意）
              </label>
              <textarea
                value={fileComment}
                onChange={(e) => setFileComment(e.target.value)}
                placeholder="ファイルについてのコメントを入力してください..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFileCommentModal(false)
                  setSelectedFile(null)
                  setFileComment("")
                }}
                disabled={sending}
              >
                キャンセル
              </Button>
              <Button
                variant="engineering"
                onClick={() => handleFileUpload(selectedFile, fileComment)}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    アップロード中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    アップロード
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}