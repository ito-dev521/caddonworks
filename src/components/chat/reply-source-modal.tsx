"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Clock, MessageCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

interface ReplySourceModalProps {
  isOpen: boolean
  onClose: () => void
  replyMessage?: {
    id: string
    content: string
    sender: {
      display_name: string
      avatar_url?: string
    }
    created_at: string
    message_type: string
    file_url?: string
    file_name?: string
  }
  className?: string
}

export function ReplySourceModal({ 
  isOpen, 
  onClose, 
  replyMessage, 
  className 
}: ReplySourceModalProps) {
  if (!replyMessage) return null

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* モーダル */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
              "bg-white rounded-lg shadow-xl border border-gray-200",
              "w-full max-w-2xl max-h-[80vh] overflow-hidden z-50",
              className
            )}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  返信元メッセージ
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* コンテンツ */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* 送信者情報 */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-medium text-blue-700 border-2 border-white shadow-md">
                  {replyMessage.sender?.avatar_url ? (
                    <img
                      src={replyMessage.sender.avatar_url}
                      alt={replyMessage.sender.display_name || 'Unknown'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    (replyMessage.sender?.display_name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {replyMessage.sender?.display_name || 'Unknown User'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatMessageTime(replyMessage.created_at)}
                  </div>
                </div>
              </div>

              {/* メッセージ内容 */}
              <div className="space-y-3">
                {/* テキストメッセージ */}
                {replyMessage.message_type === 'text' && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {replyMessage.content || 'メッセージ内容が取得できませんでした'}
                    </div>
                  </div>
                )}

                {/* ファイルメッセージ */}
                {(replyMessage.message_type === 'file' || 
                  replyMessage.message_type === 'image' || 
                  replyMessage.message_type === 'video') && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    {replyMessage.content && replyMessage.content !== replyMessage.file_name && (
                      <div className="mb-3 text-sm leading-relaxed whitespace-pre-wrap">
                        {replyMessage.content}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        {replyMessage.message_type === 'image' ? (
                          <img
                            src={replyMessage.file_url}
                            alt={replyMessage.file_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : replyMessage.message_type === 'video' ? (
                          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-1" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-sm" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {replyMessage.file_name}
                        </div>
                        {replyMessage.file_url && (
                          <a
                            href={replyMessage.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            ファイルを開く
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-4"
              >
                閉じる
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
