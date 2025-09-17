"use client"

import React, { useState } from 'react'
import { ArrowLeft, User, Eye } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'
import { ReplySourceModal } from './reply-source-modal'

interface ReplyMessageProps {
  replyTo?: {
    id: string
    content: string
    sender: {
      display_name: string
      avatar_url?: string
    }
  }
  onCancel?: () => void
  className?: string
}

export function ReplyMessage({ replyTo, onCancel, className }: ReplyMessageProps) {
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [sourceMessage, setSourceMessage] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  if (!replyTo) return null

  const handleViewSource = async () => {
    // 返信元メッセージの情報を直接使用（API呼び出し不要）
    setSourceMessage({
      id: replyTo.id,
      content: replyTo.content,
      sender: replyTo.sender,
      created_at: new Date().toISOString(), // 仮の日時
      message_type: 'text'
    })
    setShowSourceModal(true)
    
    // デバッグ用ログ
    console.log('返信元メッセージ表示:', {
      id: replyTo.id,
      content: replyTo.content,
      sender: replyTo.sender
    })
  }

  return (
    <>
      <div className={cn("flex items-center gap-2 p-3 bg-gray-50 border-l-4 border-blue-500 rounded-r-lg", className)}>
        {/* 返信アイコン */}
        <div className="flex items-center gap-1 text-blue-600">
          <ArrowLeft className="h-3 w-3" />
          <span className="text-xs font-medium">RE</span>
        </div>

        {/* 返信元情報 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-gray-500">返信元</span>
          
          {/* 送信者のアバター */}
          <div className="flex-shrink-0">
            {replyTo.sender.avatar_url ? (
              <img
                src={replyTo.sender.avatar_url}
                alt={replyTo.sender.display_name}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="h-2 w-2 text-gray-600" />
              </div>
            )}
          </div>

          {/* 送信者名 */}
          <span className="text-xs font-medium text-gray-700 truncate">
            {replyTo.sender.display_name}さん
          </span>

          {/* 返信元メッセージの内容（短縮） */}
          <span className="text-xs text-gray-600 truncate flex-1 font-medium">
            {replyTo.content.length > 60 
              ? `${replyTo.content.substring(0, 60)}...` 
              : replyTo.content
            }
          </span>
        </div>

        {/* 返信元を見るボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewSource}
          className="h-6 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-md"
          title="返信元を見る"
        >
          <Eye className="h-3 w-3 mr-1" />
          <span className="text-xs">見る</span>
        </Button>

        {/* キャンセルボタン */}
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 px-2 text-gray-500 hover:text-gray-700"
          >
            ×
          </Button>
        )}
      </div>

      {/* 返信元メッセージモーダル */}
      <ReplySourceModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        replyMessage={sourceMessage}
      />
    </>
  )
}
