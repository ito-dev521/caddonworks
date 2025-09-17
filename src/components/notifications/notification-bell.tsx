"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, Check, AlertCircle, FileText, Hand, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: any
  read_at: string | null
  created_at: string
}

export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 通知を取得
  const fetchNotifications = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setNotifications(result.notifications || [])
        setUnreadCount(result.unreadCount || 0)
      }
    } catch (error) {
      console.error('通知取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 通知を既読にする
  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationId,
          action: 'mark_read'
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read_at: new Date().toISOString() }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('通知既読エラー:', error)
    }
  }

  // 通知アイコンを取得
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bid_received':
        return <Hand className="w-4 h-4 text-blue-600" />
      case 'contract_created':
        return <FileText className="w-4 h-4 text-green-600" />
      case 'contract_signed':
        return <Check className="w-4 h-4 text-green-600" />
      case 'evaluation_received':
        return <Star className="w-4 h-4 text-yellow-600" />
      case 'invoice_created':
      case 'invoice':
        return <FileText className="w-4 h-4 text-purple-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  // 通知の時間をフォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'たった今'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`
    return `${Math.floor(diff / 86400000)}日前`
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // 30秒ごとに通知を更新
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  if (!user) return null

  // 通知ドロップダウンを右側に固定表示
  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  // 通知クリック時の処理
  const handleNotificationClick = (notification: Notification) => {
    // 未読の場合は既読にする
    if (!notification.read_at) {
      markAsRead(notification.id)
    }

    // 通知タイプに応じてページ遷移
    if (notification.type === 'bid_received') {
      // 入札通知の場合は契約作成ページへ
      if (notification.data?.project_id && notification.data?.bid_id) {
        router.push(`/contracts/create?projectId=${notification.data.project_id}&bidId=${notification.data.bid_id}`)
      } else {
        router.push('/projects')
      }
    } else if (notification.type === 'contract_created') {
      // 契約作成通知の場合は契約一覧ページへ
      router.push('/contracts')
    } else if (notification.type === 'contract_signed') {
      // 契約署名通知の場合は契約一覧ページへ
      router.push('/contracts')
    } else if (notification.type === 'evaluation_received') {
      // 評価受信通知の場合は評価ページへ
      router.push('/evaluations')
    } else if (notification.type === 'invoice' || notification.type === 'invoice_created') {
      // 請求書通知の場合は契約一覧ページへ
      router.push('/contracts')
    }

    // 通知モーダルを閉じる
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="relative"
        data-notification-bell
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* オーバーレイ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* 通知モーダル */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2 w-[28rem] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50"
              style={{
                maxHeight: 'calc(100vh - 4rem)'
              }}
            >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">通知</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div 
              className="overflow-y-auto"
              style={{
                maxHeight: 'calc(100vh - 12rem)'
              }}
            >
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  読み込み中...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  通知はありません
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.read_at ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-medium text-gray-900 flex-1 min-w-0">
                            <span className="truncate block">
                              {notification.title}
                            </span>
                          </h4>
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 break-words">
                          {notification.message.length > 100 
                            ? `${notification.message.substring(0, 100)}...` 
                            : notification.message
                          }
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm"
                  onClick={() => {
                    // 全ての通知を既読にする処理
                    notifications.forEach(notif => {
                      if (!notif.read_at) {
                        markAsRead(notif.id)
                      }
                    })
                  }}
                >
                  全て既読にする
                </Button>
              </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
