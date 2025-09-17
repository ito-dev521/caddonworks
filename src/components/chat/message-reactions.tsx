"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smile, ThumbsUp, Heart, Laugh, Sad, Angry } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

interface Reaction {
  id: string
  user_id: string
  display_name: string
  avatar_url?: string
  created_at: string
}

interface MessageReactionsProps {
  messageId: string
  className?: string
}

const REACTION_TYPES = [
  // 基本の感情
  { type: '👍', icon: ThumbsUp, label: 'いいね', category: 'basic' },
  { type: '❤️', icon: Heart, label: 'ハート', category: 'basic' },
  { type: '😂', icon: Laugh, label: '笑い', category: 'basic' },
  { type: '😢', icon: Sad, label: '悲しい', category: 'basic' },
  { type: '😡', icon: Angry, label: '怒り', category: 'basic' },
  { type: '😊', icon: Smile, label: '笑顔', category: 'basic' },
  
  // 追加の感情
  { type: '😮', icon: Smile, label: '驚き', category: 'emotion' },
  { type: '😍', icon: Heart, label: '憧れ', category: 'emotion' },
  { type: '🤔', icon: Smile, label: '考え中', category: 'emotion' },
  { type: '😴', icon: Smile, label: '眠い', category: 'emotion' },
  { type: '😎', icon: Smile, label: 'クール', category: 'emotion' },
  { type: '🥺', icon: Smile, label: 'お願い', category: 'emotion' },
  { type: '🤯', icon: Smile, label: 'びっくり', category: 'emotion' },
  { type: '😭', icon: Sad, label: '大泣き', category: 'emotion' },
  { type: '🤩', icon: Smile, label: '興奮', category: 'emotion' },
  { type: '😤', icon: Angry, label: 'むかつく', category: 'emotion' },
  
  // アクション・反応
  { type: '👏', icon: ThumbsUp, label: '拍手', category: 'action' },
  { type: '🙌', icon: ThumbsUp, label: 'やったー', category: 'action' },
  { type: '💪', icon: ThumbsUp, label: '頑張る', category: 'action' },
  { type: '🔥', icon: Heart, label: '熱い', category: 'action' },
  { type: '✨', icon: Smile, label: 'キラキラ', category: 'action' },
  { type: '🎉', icon: Smile, label: 'お祝い', category: 'action' },
  { type: '💯', icon: ThumbsUp, label: '完璧', category: 'action' },
  { type: '🚀', icon: Smile, label: 'ロケット', category: 'action' },
  
  // 食べ物・飲み物
  { type: '☕', icon: Smile, label: 'コーヒー', category: 'food' },
  { type: '🍕', icon: Smile, label: 'ピザ', category: 'food' },
  { type: '🍰', icon: Smile, label: 'ケーキ', category: 'food' },
  { type: '🍺', icon: Smile, label: 'ビール', category: 'food' },
  { type: '🍎', icon: Smile, label: 'りんご', category: 'food' },
  
  // その他
  { type: '💡', icon: Smile, label: 'アイデア', category: 'other' },
  { type: '⭐', icon: Smile, label: '星', category: 'other' },
  { type: '🌸', icon: Smile, label: '桜', category: 'other' },
  { type: '🎯', icon: Smile, label: '的', category: 'other' },
  { type: '💎', icon: Smile, label: 'ダイヤ', category: 'other' }
]

export function MessageReactions({ messageId, className }: MessageReactionsProps) {
  const { user } = useAuth()
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  // リアクション一覧を取得
  const fetchReactions = async () => {
    try {
      const response = await fetch(`/api/chat/reactions?message_id=${messageId}`)
      if (response.ok) {
        const data = await response.json()
        setReactions(data.reactions || {})
      }
    } catch (error) {
      console.error('リアクション取得エラー:', error)
    }
  }

  useEffect(() => {
    fetchReactions()
  }, [messageId])

  // リアクションを追加/削除
  const toggleReaction = async (reactionType: string) => {
    if (!user) return

    setLoading(true)
    try {
      const userReaction = reactions[reactionType]?.find(r => r.user_id === user.id)
      const action = userReaction ? 'remove' : 'add'

      const response = await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: messageId,
          reaction_type: reactionType,
          action
        })
      })

      if (response.ok) {
        await fetchReactions() // リアクション一覧を再取得
      }
    } catch (error) {
      console.error('リアクション操作エラー:', error)
    } finally {
      setLoading(false)
      setShowPicker(false)
    }
  }

  // リアクションの総数を計算
  const totalReactions = Object.values(reactions).reduce((sum, reactionList) => sum + reactionList.length, 0)

  if (totalReactions === 0 && !showPicker) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(true)}
          className="h-6 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <Smile className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {/* 既存のリアクション表示 */}
      {Object.entries(reactions).map(([type, reactionList]) => {
        const userReacted = reactionList.some(r => r.user_id === user?.id)
        const reactionInfo = REACTION_TYPES.find(r => r.type === type)

        return (
          <motion.div
            key={type}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleReaction(type)}
              disabled={loading}
              className={cn(
                "h-7 px-2 text-xs font-medium transition-all duration-200 rounded-full",
                userReacted 
                  ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-sm" 
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-transparent"
              )}
              title={reactionInfo?.label || type}
            >
              <span className="mr-1 text-sm">{type}</span>
              <span className="text-xs">{reactionList.length}</span>
            </Button>
          </motion.div>
        )
      })}

      {/* リアクションピッカー */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-10 w-80 max-h-96 overflow-y-auto"
          >
            {/* カテゴリ別にリアクションを表示 */}
            {['basic', 'emotion', 'action', 'food', 'other'].map(category => {
              const categoryReactions = REACTION_TYPES.filter(r => r.category === category)
              if (categoryReactions.length === 0) return null
              
              return (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="text-xs font-medium text-gray-500 mb-2 px-1">
                    {category === 'basic' && '基本'}
                    {category === 'emotion' && '感情'}
                    {category === 'action' && 'アクション'}
                    {category === 'food' && '食べ物・飲み物'}
                    {category === 'other' && 'その他'}
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {categoryReactions.map(({ type, label }) => (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReaction(type)}
                        disabled={loading}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-md"
                        title={label}
                      >
                        <span className="text-lg">{type}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
            
            {/* ツールチップ */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 text-center">
                リアクションを選択する
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* リアクション追加ボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPicker(!showPicker)}
        className="h-6 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      >
        <Smile className="h-3 w-3" />
      </Button>
    </div>
  )
}
