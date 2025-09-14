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
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          auth.users:sender_id (
            id,
            email,
            user_metadata
          ),
          reply_message:reply_to (
            id,
            content,
            auth.users:sender_id (
              user_metadata
            )
          )
        `)
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedMessages = (messagesData || []).map(msg => ({
        ...msg,
        sender: {
          id: msg.users?.id,
          email: msg.users?.email,
          display_name: msg.users?.user_metadata?.display_name,
          avatar_url: msg.users?.user_metadata?.avatar_url
        },
        reply_message: msg.reply_message ? {
          id: msg.reply_message.id,
          content: msg.reply_message.content,
          sender_name: msg.reply_message.users?.user_metadata?.display_name || msg.reply_message.users?.email || '不明'
        } : undefined
      }))

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
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
      const messageData = {
        room_id: roomId,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text',
        reply_to: replyingTo?.id || null
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData])

      if (error) throw error

      setNewMessage("")
      setReplyingTo(null)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!user || !file) return

    try {
      setSending(true)

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `chat-attachments/${roomId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath)

      // Save message with file info
      const messageData = {
        room_id: roomId,
        sender_id: user.id,
        content: file.name,
        message_type: file.type.startsWith('image/') ? 'image' : 'file',
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      }

      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert([messageData])

      if (messageError) throw messageError

    } catch (error) {
      console.error('Error uploading file:', error)
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
        month: '1',
        day: '1',
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
                  <div className="w-8 h-8 rounded-full bg-engineering-blue flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {message.sender?.display_name?.charAt(0) || message.sender?.email?.charAt(0) || 'U'}
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
                          <div className="flex items-center gap-2">
                            {message.message_type === 'image' ? (
                              <div>
                                <img
                                  src={message.file_url}
                                  alt={message.file_name}
                                  className="max-w-xs rounded-lg"
                                />
                                <p className="text-sm mt-1">{message.file_name}</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <File className="w-4 h-4" />
                                <div>
                                  <p>{message.file_name}</p>
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(e)
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
                  handleFileUpload(file)
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
    </div>
  )
}