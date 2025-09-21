"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
  Loader2,
  Box
} from 'lucide-react'

interface BoxAccountStatus {
  isLinked: boolean
  boxEmail?: string
  boxUserId?: string
  accountType?: 'new' | 'existing'
  lastUpdated?: string
}

export function BoxAccountIntegration() {
  const { session } = useAuth()
  const [boxStatus, setBoxStatus] = useState<BoxAccountStatus>({ isLinked: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  // BOXアカウント状態を取得
  const fetchBoxStatus = async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch('/api/user/box-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBoxStatus(data)
      }
    } catch (error) {
      console.error('BOXステータス取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // BOX OAuth認証を開始
  const connectBoxAccount = async (accountType: 'new' | 'existing') => {
    if (!session?.access_token) return

    setIsConnecting(true)

    try {
      const response = await fetch('/api/box/oauth/authorize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountType })
      })

      if (response.ok) {
        const data = await response.json()
        // BOX認証ページにリダイレクト
        window.location.href = data.authUrl
      } else {
        const error = await response.json()
        alert(`認証URL生成に失敗しました: ${error.message}`)
      }
    } catch (error) {
      console.error('BOX認証エラー:', error)
      alert('BOX認証の開始に失敗しました')
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    fetchBoxStatus()

    // URLパラメータから結果を確認
    const params = new URLSearchParams(window.location.search)
    if (params.get('box_success')) {
      alert('BOXアカウントの連携が完了しました！')
      fetchBoxStatus() // ステータスを再取得
      // URLからパラメータを削除
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('box_error')) {
      const error = params.get('box_error')
      alert(`BOX連携でエラーが発生しました: ${decodeURIComponent(error || 'Unknown error')}`)
      // URLからパラメータを削除
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [session])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">BOX連携状態を確認中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 連携状態表示 */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <Box className="w-8 h-8 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">BOXアカウント連携</h3>
            <p className="text-sm text-gray-600">
              {boxStatus.isLinked
                ? `${boxStatus.boxEmail} として連携済み`
                : 'BOXアカウントが連携されていません'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {boxStatus.isLinked ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              連携済み
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
              <XCircle className="w-3 h-3 mr-1" />
              未連携
            </Badge>
          )}
        </div>
      </div>

      {/* 連携していない場合の連携ボタン */}
      {!boxStatus.isLinked && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">BOXアカウント連携について</h4>
                <p className="text-sm text-blue-700 mt-1">
                  BOXアカウントを連携すると、プロジェクトのファイル共有機能が利用できるようになります。
                  既存のBOXアカウントをお持ちの場合は「既存アカウントで連携」を、
                  新規でBOXアカウントを作成する場合は「新規アカウントで連携」を選択してください。
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => connectBoxAccount('existing')}
              disabled={isConnecting}
              variant="outline"
              className="flex-1"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              既存アカウントで連携
            </Button>

            <Button
              onClick={() => connectBoxAccount('new')}
              disabled={isConnecting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              新規アカウントで連携
            </Button>
          </div>
        </div>
      )}

      {/* 連携済みの場合の詳細情報 */}
      {boxStatus.isLinked && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">連携完了</h4>
                <p className="text-sm text-green-700 mt-1">
                  BOXアカウントの連携が完了しています。プロジェクト承認時に自動的にBOXフォルダへのアクセス権限が付与されます。
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">BOXメールアドレス:</span> {boxStatus.boxEmail}</p>
            <p><span className="font-medium">アカウントタイプ:</span> {
              boxStatus.accountType === 'new' ? '新規作成' : '既存連携'
            }</p>
            {boxStatus.lastUpdated && (
              <p><span className="font-medium">最終更新:</span> {new Date(boxStatus.lastUpdated).toLocaleString('ja-JP')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}