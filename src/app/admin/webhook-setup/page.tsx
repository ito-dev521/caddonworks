'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function WebhookSetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const supabase = createClientComponentClient()

  const createWebhook = async () => {
    setLoading(true)
    setResult(null)

    try {
      // まずセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('Session:', session)
      console.log('Session Error:', sessionError)

      if (sessionError || !session) {
        // セッションが取得できない場合、Cookieから直接トークンを取得
        console.log('セッションが取得できません。Cookieから取得を試みます...')

        const cookies = document.cookie.split(';')
        let token = null

        for (let cookie of cookies) {
          const trimmed = cookie.trim()
          if (trimmed.startsWith('sb-') && trimmed.includes('auth')) {
            const parts = trimmed.split('=')
            const value = parts.slice(1).join('=')

            try {
              const decoded = decodeURIComponent(value)
              const json = JSON.parse(decoded)

              if (json.access_token) {
                token = json.access_token
                console.log('✅ Cookieからトークンを取得しました')
                break
              }
            } catch (e) {
              continue
            }
          }
        }

        if (!token) {
          setResult({ error: 'ログインしてください。管理者メールアドレス（ito.dev@ii-stylelab.com）でログインしてから再度お試しください。' })
          setLoading(false)
          return
        }

        // Cookieから取得したトークンを使用
        const webhookUrl = window.location.origin + '/api/webhooks/box-sign'

        const response = await fetch('/api/webhooks/box-sign/setup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webhookUrl,
            triggers: [
              'SIGN_REQUEST.COMPLETED',
              'SIGN_REQUEST.DECLINED',
              'SIGN_REQUEST.EXPIRED'
            ]
          })
        })

        const data = await response.json()
        setResult(data)

        if (response.ok) {
          alert('✅ Webhookの作成に成功しました！\n\n次のステップ：\n1. Box Developer Consoleを開く\n2. Webhooks タブをクリック\n3. 作成されたWebhookをクリック\n4. Primary KeyとSecondary Keyをコピー\n5. .env.localに設定\n6. サーバーを再起動')
          loadWebhooks()
        }

        setLoading(false)
        return
      }

      const webhookUrl = window.location.origin + '/api/webhooks/box-sign'

      const response = await fetch('/api/webhooks/box-sign/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl,
          triggers: [
            'SIGN_REQUEST.COMPLETED',
            'SIGN_REQUEST.DECLINED',
            'SIGN_REQUEST.EXPIRED'
          ]
        })
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        alert('✅ Webhookの作成に成功しました！\n\n次のステップ：\n1. Box Developer Consoleを開く\n2. Webhooks タブをクリック\n3. 作成されたWebhookをクリック\n4. Primary KeyとSecondary Keyをコピー\n5. .env.localに設定\n6. サーバーを再起動')
        loadWebhooks()
      }
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const loadWebhooks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return
      }

      const response = await fetch('/api/webhooks/box-sign/setup', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      if (response.ok) {
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      console.error('Webhook一覧取得エラー:', error)
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('このWebhookを削除しますか？')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('ログインしてください')
        return
      }

      const response = await fetch(`/api/webhooks/box-sign/setup?id=${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Webhookを削除しました')
        loadWebhooks()
      } else {
        alert('❌ エラー: ' + data.message)
      }
    } catch (error: any) {
      alert('エラーが発生しました: ' + error.message)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Box Sign Webhook 設定</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">新しいWebhookを作成</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Webhook URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/webhooks/box-sign
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Triggers:</strong> SIGN_REQUEST.COMPLETED, SIGN_REQUEST.DECLINED, SIGN_REQUEST.EXPIRED
          </p>
        </div>

        <button
          onClick={createWebhook}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? '作成中...' : 'Webhookを作成'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded ${result.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">現在のWebhook一覧</h2>
          <button
            onClick={loadWebhooks}
            className="bg-gray-600 text-white px-4 py-1 rounded hover:bg-gray-700 text-sm"
          >
            更新
          </button>
        </div>

        {webhooks.length === 0 ? (
          <p className="text-gray-500">Webhookがありません</p>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border p-4 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{webhook.address}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ID: {webhook.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Triggers: {webhook.triggers?.join(', ')}
                    </p>
                    <p className="text-sm text-gray-600">
                      作成日: {new Date(webhook.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-yellow-50 p-4 rounded border border-yellow-200">
        <h3 className="font-semibold mb-2">⚠️ 重要な次のステップ</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Box Developer Console (https://app.box.com/developers/console) を開く</li>
          <li>左メニューの「Webhooks」をクリック</li>
          <li>作成されたWebhookをクリック</li>
          <li>「Primary Key」と「Secondary Key」をコピー</li>
          <li>.env.local に以下を追加：
            <pre className="bg-white p-2 mt-1 rounded text-xs">
BOX_WEBHOOK_PRIMARY_KEY=コピーしたプライマリキー
BOX_WEBHOOK_SECONDARY_KEY=コピーしたセカンダリキー
            </pre>
          </li>
          <li>サーバーを再起動</li>
        </ol>
      </div>
    </div>
  )
}
