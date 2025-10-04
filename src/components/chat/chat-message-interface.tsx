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
  Edit3,
  Video,
  Play
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { EmojiPicker } from "./emoji-picker"
import { MentionPicker } from "./mention-picker"
import { MessageReactions } from "./message-reactions"
import { ReplyMessage } from "./reply-message"
import { ToMentions } from "./to-mentions"

interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'file' | 'image' | 'video' | 'system'
  file_url?: string
  file_name?: string
  file_size?: number
  reply_to?: string
  mentions?: Array<{
    user_id: string
    display_name: string
    avatar_url?: string
  }>
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
  const [replyTo, setReplyTo] = useState<{
    id: string
    content: string
    sender: {
      display_name: string
      avatar_url?: string
    }
  } | null>(null)
  const [fileComment, setFileComment] = useState("")
  const [showFileCommentModal, setShowFileCommentModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // roomIdからprojectIdを取得（APIを使用してRLS回避）
  useEffect(() => {
    const fetchProjectId = async () => {
      if (!roomId) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          return
        }

        const response = await fetch(`/api/chat/rooms/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setProjectId(data.project_id)
        }
      } catch (error) {
        // エラーは無視
      }
    }

    fetchProjectId()
  }, [roomId])

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
          room_id: msg.room_id || roomId,
          content: msg.content || msg.message, // messageカラムもサポート
          sender_id: msg.sender_id,
          sender: {
            id: msg.sender_id,
            display_name: msg.sender_name || 'Unknown',
            email: msg.sender_email,
            avatar_url: msg.sender_avatar_url
          },
          created_at: msg.created_at,
          is_deleted: msg.is_deleted || false,
          message_type: msg.message_type || 'text',
          file_url: msg.file_url,
          file_name: msg.file_name,
          file_size: msg.file_size,
          reply_to: msg.reply_to,
          reply_message: msg.reply_message,
          edited_at: msg.edited_at
        })) || []
        setMessages(formattedMessages)
      } else {
        setMessages([])
      }
    } catch (error) {
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

    // TODO: 既読管理機能を実装する場合は、Supabaseにmark_messages_as_read RPC関数を作成する
    // 現時点では機能を無効化してエラーを防ぐ
    return

    /*
    try {
      await supabase.rpc('mark_messages_as_read', {
        p_room_id: roomId
      })
    } catch (error) {
      // RPC関数がまだ実装されていない場合のエラーをサイレントに処理
      console.warn('mark_messages_as_read RPC not implemented yet:', error)
    }
    */
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
        message_type: 'text',
        reply_to: replyingTo?.id || null
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
        setReplyTo(null)
        fetchMessages() // Refresh messages
      }
    } catch (error) {
      // エラーは無視
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
        return
      }

      // FormDataを作成
      const formData = new FormData()
      formData.append('file', file)
      formData.append('roomId', roomId)
      formData.append('comment', comment)
      if (replyingTo?.id) {
        formData.append('reply_to', replyingTo.id)
      }

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
        // メッセージ一覧を再取得
        fetchMessages()
        // モーダルを閉じる
        setShowFileCommentModal(false)
        setSelectedFile(null)
        setFileComment("")
        setReplyingTo(null) // 返信状態をリセット
      } else {
        alert('ファイルのアップロードに失敗しました: ' + result.message)
      }

    } catch (error) {
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
      // エラーは無視
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
      // エラーは無視
    }
  }

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message)
    setReplyTo({
      id: message.id,
      content: message.content,
      sender: {
        display_name: message.sender?.display_name || 'Unknown',
        avatar_url: message.sender?.avatar_url
      }
    })
    textareaRef.current?.focus()
  }

  const handleCancelReply = () => {
    setReplyTo(null)
    setReplyingTo(null)
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

  // メンション表示用の関数
  const renderMessageWithMentions = (content: string) => {
    // 改行文字を<br>タグに変換
    const contentWithBreaks = content.replace(/\n/g, '<br>')
    
    // @ユーザー名のパターンを検出してハイライト表示
    const mentionRegex = /@([^\s]+)/g
    const parts = contentWithBreaks.split(mentionRegex)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // メンション部分
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
          >
            <span className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
              @
            </span>
            {part}
          </span>
        )
      } else {
        // 通常のテキスト部分（HTMLを安全にレンダリング）
        return (
          <span 
            key={index} 
            dangerouslySetInnerHTML={{ __html: part }}
          />
        )
      }
    })
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                  "flex gap-3 group mb-4",
                  isOwnMessage ? "justify-end" : "justify-start",
                  message.reply_message && "ml-4 border-l-2 border-gray-200 pl-4"
                )}
              >
                {/* Avatar */}
                {showAvatar && (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 overflow-hidden border-2 border-white shadow-md">
                    {message.sender?.avatar_url ? (
                      <img
                        src={message.sender.avatar_url}
                        alt={message.sender?.display_name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        {message.sender?.display_name?.charAt(0) || message.sender?.email?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className={cn("flex flex-col max-w-sm sm:max-w-lg md:max-w-xl", isOwnMessage && "items-end")}>
                  {/* Sender Name & Time */}
                  <div className={cn(
                    "flex items-center gap-2 mb-2 text-xs",
                    isOwnMessage ? "flex-row-reverse text-gray-600" : "flex-row text-gray-500"
                  )}>
                    <span className="font-semibold text-gray-800">
                      {isOwnMessage ? 'あなた' : (message.sender?.display_name || message.sender?.email || '不明')}
                    </span>
                    <span className="text-gray-500">{formatMessageTime(message.created_at)}</span>
                    {message.edited_at && (
                      <span className="text-xs text-gray-400">(編集済み)</span>
                    )}
                  </div>

                  {/* Reply Reference */}
                  {message.reply_to && (
                    <ReplyMessage 
                      replyTo={message.reply_message ? {
                        id: message.reply_message.id,
                        content: message.reply_message.content,
                        sender: {
                          display_name: message.reply_message.sender_name || 'Unknown',
                          avatar_url: undefined
                        }
                      } : {
                        id: message.reply_to,
                        content: '返信先メッセージ（詳細を取得中...）',
                        sender: {
                          display_name: 'Unknown',
                          avatar_url: undefined
                        }
                      }}
                      className="mb-2"
                    />
                  )}

                  {/* TO Mentions */}
                  <ToMentions mentions={message.mentions} />

                  {/* Message Bubble */}
                  <div className={cn(
                    "relative px-4 py-3 rounded-2xl max-w-full break-words shadow-sm border",
                    isOwnMessage
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-300 shadow-md"
                      : "bg-white text-gray-900 border-gray-200 shadow-md"
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
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {renderMessageWithMentions(message.content)}
                          </div>
                        )}

                        {/* File/Image/Video Message */}
                        {(message.message_type === 'file' || message.message_type === 'image' || message.message_type === 'video') && (
                          <div className="space-y-2">
                            {/* コメントがある場合は表示 */}
                            {message.content !== message.file_name && (
                              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {renderMessageWithMentions(message.content)}
                              </div>
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
                            ) : message.message_type === 'video' ? (
                              <div>
                                <video
                                  src={message.file_url}
                                  controls
                                  className="max-w-xs rounded-lg"
                                  preload="metadata"
                                >
                                  お使いのブラウザは動画の再生をサポートしていません。
                                </video>
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
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        {/* Reply Button - 全てのメッセージに表示 */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 bg-white text-gray-600 hover:text-green-600"
                          onClick={() => handleReply(message)}
                        >
                          <Reply className="w-3 h-3" />
                        </Button>
                        
                        {/* Edit and Delete - 自分のメッセージのみ */}
                        {isOwnMessage && editingMessage !== message.id && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message Reactions */}
                  <div className="mt-2 flex justify-start">
                    <MessageReactions messageId={message.id} />
                  </div>

                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      <ReplyMessage 
        replyTo={replyTo || undefined} 
        onCancel={handleCancelReply}
        className="px-4 py-2 bg-gray-50 border-t"
      />

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        {/* Reply Indicator */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-r-lg shadow-sm relative">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-green-500 text-white text-xs px-2 py-1 font-medium">RE</Badge>
              <Reply className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 font-semibold">返信先</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white border border-green-200 flex items-center justify-center text-xs font-medium text-green-700">
                {replyingTo.sender?.display_name?.charAt(0) || replyingTo.sender?.email?.charAt(0) || 'U'}
              </div>
              <span className="text-sm text-gray-800 font-medium">
                {replyingTo.sender?.display_name || replyingTo.sender?.email || '不明'}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-600 bg-white/50 p-2 rounded border-l-2 border-green-300">
              {replyingTo.content}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 h-6 w-6 p-0 text-gray-500 hover:text-red-600"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
        )}
        
        {/* Toolbar above message input */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            {/* 絵文字ピッカー */}
            <EmojiPicker
              onEmojiSelect={(emoji) => {
                setNewMessage(prev => prev + emoji)
                // フォーカスをtextareaに戻す前に少し遅延
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.focus()
                    // カーソルを末尾に移動
                    const length = textareaRef.current.value.length
                    textareaRef.current.setSelectionRange(length, length)
                  }
                }, 100)
              }}
            />
            
            {/* メンションピッカー */}
            <MentionPicker
              onMentionSelect={(user) => {
                setNewMessage(prev => prev + `@${user.display_name} `)
                // フォーカスをtextareaに戻す前に少し遅延
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.focus()
                    // カーソルを末尾に移動
                    const length = textareaRef.current.value.length
                    textareaRef.current.setSelectionRange(length, length)
                  }
                }, 100)
              }}
              projectId={projectId || undefined}
            />
            
            {/* ファイル添付ボタン */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
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
              title="ファイルを添付"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>
          
          {/* 送信ボタン */}
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              if (newMessage.trim() && !sending) {
                sendMessage(e)
              }
            }}
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

        {/* Message input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力... (Shift + Enterキーで改行)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-engineering-blue focus:border-transparent min-h-[60px]"
            rows={3}
            onKeyDown={(e) => {
              // Enterキーでの送信を無効化（Shift+Enterで改行のみ可能）
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                // 送信はしない
              }
            }}
          />
        </div>
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