"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smile, ThumbsUp, Heart, Laugh, Frown, Angry } from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

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
  { type: '🙏', icon: Smile, label: 'ありがとう', category: 'basic' },
  { type: '😂', icon: Laugh, label: '笑い', category: 'basic' },
  { type: '😢', icon: Frown, label: '悲しい', category: 'basic' },
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
  { type: '😭', icon: Frown, label: '大泣き', category: 'emotion' },
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
  { type: '🙇‍♂️', icon: Smile, label: 'お辞儀', category: 'action' },
  { type: '🙇‍♀️', icon: Smile, label: 'お辞儀', category: 'action' },
  
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
  const { user, loading: authLoading } = useAuth()
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [showPicker, setShowPicker] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  // showPickerの状態変化をデバッグ
  useEffect(() => {
  }, [showPicker])
  const [loading, setLoading] = useState(false)

  // リアクション一覧を取得
  const fetchReactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const response = await fetch(`/api/chat/reactions?message_id=${messageId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setReactions(data.reactions || {})
      } else {
        const errorData = await response.json()
        console.error('リアクション取得エラー:', errorData)
      }
    } catch (error) {
      console.error('リアクション取得エラー:', error)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchReactions()
    }
  }, [messageId, user, authLoading])

  // 外側クリックで詳細とピッカーを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showDetails && !target.closest('.reaction-details-container')) {
        setShowDetails(false)
      }
      if (showPicker && !target.closest('.reaction-picker-container')) {
        setShowPicker(false)
      }
    }

    if (showDetails || showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDetails, showPicker])

  // リアクションを追加/削除
  const toggleReaction = async (reactionType: string) => {
    
    if (!user) {
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        return
      }

      const userReaction = reactions[reactionType]?.find(r => r.user_id === user.id)
      const action = userReaction ? 'remove' : 'add'
      

      const response = await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message_id: messageId,
          reaction_type: reactionType,
          action
        })
      })

      if (response.ok) {
        const result = await response.json()
        await fetchReactions() // リアクション一覧を再取得
      } else {
        const errorData = await response.json()
        console.error('リアクション操作エラー:', errorData)
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
          onClick={() => {
            setShowPicker(true)
          }}
          className="h-6 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <Smile className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-1 flex-wrap relative", className)}>
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
      
      {/* 統合されたリアクション詳細ポップアップ */}
      {totalReactions > 0 && (
        <div className="relative reaction-details-container">
          <div 
            className="h-7 px-2 flex items-center text-xs text-gray-500 cursor-pointer hover:text-gray-700"
            onClick={() => setShowDetails(!showDetails)}
          >
            詳細
          </div>
          
          {/* 全リアクションの統合ポップアップ */}
          {showDetails && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64 max-w-80">
            {/* ヘッダー */}
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">リアクション詳細</h3>
              <p className="text-xs text-gray-500 mt-1">合計 {totalReactions} 件のリアクション</p>
            </div>
            
            {/* リアクション別ユーザーリスト */}
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(reactions).map(([type, reactionList]) => (
                <div key={type} className="border-b border-gray-50 last:border-b-0">
                  {/* リアクションタイプヘッダー */}
                  <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                    <span className="text-lg">{type}</span>
                    <span className="text-sm font-medium text-gray-700">{reactionList.length}人</span>
                  </div>
                  
                  {/* ユーザーリスト */}
                  <div className="py-1">
                    {reactionList.map((reaction) => (
                      <div key={reaction.id} className="px-4 py-2 hover:bg-gray-50 flex items-center gap-3">
                        {/* アバター */}
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{
                            background: `linear-gradient(135deg, 
                              hsl(${(reaction.user_id.charCodeAt(0) * 137.5) % 360}, 70%, 60%), 
                              hsl(${(reaction.user_id.charCodeAt(1) * 137.5) % 360}, 70%, 50%)
                            )`
                          }}
                        >
                          {reaction.display_name?.charAt(0) || '?'}
                        </div>
                        
                        {/* ユーザー名 */}
                        <div className="flex-1">
                          <span className="text-sm text-gray-900">{reaction.display_name}</span>
                          {reaction.user_id === user?.id && (
                            <span className="text-xs text-blue-600 ml-2">(あなた)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
              {/* 矢印 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200"></div>
            </div>
          )}
        </div>
      )}

      {/* リアクションピッカー */}
      {showPicker && (
        <div 
          className="reaction-picker-container"
          style={{ 
            position: 'fixed', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            padding: '20px',
            zIndex: 10000,
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold">リアクションを選択</h3>
          </div>
          
          {/* カテゴリ別にリアクションを表示 */}
          {['basic', 'emotion', 'action'].map(category => {
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
                    <button
                      key={type}
                      onClick={() => {
                        toggleReaction(type)
                      }}
                      disabled={loading}
                      className="h-8 w-8 p-0 hover:bg-gray-100 rounded-md border border-transparent hover:border-gray-200 transition-colors"
                      title={label}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '18px'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          
          {/* 閉じるボタン */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <button
              onClick={() => setShowPicker(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* リアクション追加ボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setShowPicker(!showPicker)
        }}
        className="h-6 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 reaction-picker-container"
      >
        <Smile className="h-3 w-3" />
      </Button>
    </div>
  )
}
