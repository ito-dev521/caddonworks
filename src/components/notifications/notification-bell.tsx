"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, X, Check, AlertCircle, FileText, Hand, Star, GripVertical } from "lucide-react"
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
  const { user, userRole } = useAuth()

  // Early return if user is not authenticated - must be before any hooks
  if (!user) return null

  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ドラッグ機能のための状態
  const [position, setPosition] = useState({ x: -1, y: -1 }) // -1は未初期化を示す
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  // 通知を取得
  const fetchNotifications = useCallback(async () => {
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
  }, [user])

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

  // ドラッグハンドラー
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('[data-draggable="false"]')) {
      return // ドラッグ不可の要素の場合は何もしない
    }
    
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    
    // モーダルの現在位置を取得
    const rect = modalRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }



  // マウスイベントのリスナーを設定
  useEffect(() => {
    const handleMouseMoveEvent = (e: MouseEvent) => {
      if (!isDragging) return

      e.preventDefault()

      // マウス位置からドラッグ開始時のオフセットを引く
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // 画面境界内に制限
      const modalWidth = modalRef.current?.offsetWidth || 448
      const modalHeight = modalRef.current?.offsetHeight || 400
      const maxX = Math.max(0, window.innerWidth - modalWidth)
      const maxY = Math.max(0, window.innerHeight - modalHeight)

      // 境界内に制限
      const clampedX = Math.max(0, Math.min(newX, maxX))
      const clampedY = Math.max(0, Math.min(newY, maxY))

      setPosition({
        x: clampedX,
        y: clampedY
      })
    }

    const handleMouseUpEvent = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMoveEvent)
      document.addEventListener('mouseup', handleMouseUpEvent)
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveEvent)
      document.removeEventListener('mouseup', handleMouseUpEvent)
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragStart.x, dragStart.y])

  // 通知アイコンを取得
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bid_received':
        return <Hand className="w-4 h-4 text-blue-600" />
      case 'contract_created':
        return <FileText className="w-4 h-4 text-green-600" />
      case 'contract_signed':
      case 'contract_signed_by_org':
        return <Check className="w-4 h-4 text-green-600" />
      case 'contract_declined':
        return <X className="w-4 h-4 text-red-600" />
      case 'evaluation_received':
        return <Star className="w-4 h-4 text-yellow-600" />
      case 'invoice_created':
      case 'invoice':
      case 'completion_report_created':
        return <FileText className="w-4 h-4 text-purple-600" />
      case 'project_ready_for_evaluation':
        return <Star className="w-4 h-4 text-green-600" />
      case 'project_approval_requested':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'project_approved':
        return <Check className="w-4 h-4 text-green-600" />
      case 'project_rejected':
        return <X className="w-4 h-4 text-red-600" />
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
  }, [user, fetchNotifications])

  // 通知ドロップダウンを右側に固定表示
  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  // モーダルが開かれた時に中央位置を設定
  useEffect(() => {
    if (isOpen && position.x < 0) {
      const modalWidth = 448 // 28rem = 448px
      const modalHeight = 400 // 推定高さ
      const centerX = (window.innerWidth - modalWidth) / 2
      const centerY = (window.innerHeight - modalHeight) / 2

      setPosition({ x: centerX, y: centerY })
    }
  }, [isOpen, position.x])

  // 通知クリック時の処理
  const handleNotificationClick = (notification: Notification) => {
    // 未読の場合は既読にする
    if (!notification.read_at) {
      markAsRead(notification.id)
    }

    // 通知タイプとユーザーロールに応じてページ遷移
    if (notification.type === 'bid_received') {
      // 入札通知の場合は契約作成ページへ
      if (notification.data?.project_id && notification.data?.bid_id) {
        router.push(`/contracts/create?projectId=${notification.data.project_id}&bidId=${notification.data.bid_id}`)
      } else {
        router.push('/projects')
      }
    } else if (notification.type === 'contract_created') {
      // 契約作成通知
      if (userRole === 'OrgAdmin') {
        // 発注者: 署名待ちタブ（受注者の署名待ち）
        router.push('/contracts?tab=pending')
      } else {
        // 受注者: 署名待ちタブ（自分の署名待ち）
        router.push('/contracts?tab=pending')
      }
    } else if (notification.type === 'contract_signed') {
      // 契約署名通知（受注者が署名した場合）
      if (userRole === 'OrgAdmin') {
        // 発注者: 署名待ちタブ（発注者の署名待ち）
        router.push('/contracts?tab=pending')
      } else {
        // 受注者: 署名済みタブ
        router.push('/contracts?tab=signature')
      }
    } else if (notification.type === 'contract_signed_by_org') {
      // 契約署名通知（発注者が署名した場合）
      if (userRole === 'OrgAdmin') {
        // 発注者: 署名済みタブ
        router.push('/contracts?tab=signature')
      } else {
        // 受注者: 署名済みタブ
        router.push('/contracts?tab=signature')
      }
    } else if (notification.type === 'contract_declined') {
      // 契約辞退通知
      if (userRole === 'OrgAdmin') {
        // 発注者: 署名待ちタブ
        router.push('/contracts?tab=pending')
      } else {
        // 受注者: 署名待ちタブ
        router.push('/contracts?tab=pending')
      }
    } else if (notification.type === 'evaluation_received') {
      // 評価受信通知の場合は評価ページへ
      router.push('/evaluations')
    } else if (notification.type === 'invoice' || notification.type === 'invoice_created') {
      // 請求書通知
      if (userRole === 'Contractor') {
        router.push('/invoices')
      } else {
        router.push('/contracts?tab=invoice')
      }
    } else if (notification.type === 'completion_report_created') {
      // 業務完了届作成通知
      if (userRole === 'Contractor') {
        router.push('/invoices')
      } else {
        router.push('/contracts?tab=invoice')
      }
    } else if (notification.type === 'project_ready_for_evaluation') {
      // 案件完了後: 受注者評価と業務完了届が可能
      router.push('/contracts?tab=invoice')
    } else if (notification.type === 'project_approval_requested') {
      // 案件承認依頼通知の場合は案件ページの承認待ちタブへ
      router.push('/projects?tab=pending_approval')
    } else if (notification.type === 'project_approved') {
      // 案件承認完了通知の場合は案件ページの進行中タブへ
      router.push('/projects?tab=active')
    } else if (notification.type === 'project_rejected') {
      // 案件承認却下通知の場合は案件ページの完了済みタブへ
      router.push('/projects?tab=completed')
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
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed w-[28rem] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50"
              style={{
                maxHeight: 'calc(100vh - 4rem)',
                left: position.x >= 0 ? position.x : '50%',
                top: position.y >= 0 ? position.y : '50%',
                transform: position.x >= 0 ? 'none' : 'translate(-50%, -50%)'
              }}
            >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">通知</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6"
                  data-draggable="false"
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
              data-draggable="false"
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
                    data-draggable="false"
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
