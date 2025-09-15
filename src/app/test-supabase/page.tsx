"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [envVars, setEnvVars] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    serviceRoleKey: ''
  })
  const [serverEnvCheck, setServerEnvCheck] = useState<any>(null)

  useEffect(() => {
    checkConnection()
    checkEnvVars()
    checkServerEnv()
  }, [])

  const checkServerEnv = async () => {
    try {
      const response = await fetch('/api/check-env')
      const data = await response.json()
      setServerEnvCheck(data)
    } catch (error) {
      console.error('サーバー環境変数チェックエラー:', error)
    }
  }

  const checkEnvVars = () => {
    // クライアントサイドでは、NEXT_PUBLIC_プレフィックスのみアクセス可能
    // SERVICE_ROLE_KEYはサーバーサイドでのみ利用可能
    setEnvVars({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      serviceRoleKey: 'サーバーサイドでのみ確認可能'
    })
  }

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking')
      
      // 基本的な接続テスト
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        if (error.message.includes('Failed to fetch')) {
          setErrorMessage('Supabaseへの接続に失敗しました。環境変数を確認してください。')
        } else if (error.message.includes('relation "users" does not exist')) {
          setErrorMessage('usersテーブルが存在しません。データベースのセットアップが必要です。')
        } else {
          setErrorMessage(`データベースエラー: ${error.message}`)
        }
        setConnectionStatus('error')
      } else {
        setConnectionStatus('connected')
        setErrorMessage('')
      }
    } catch (err) {
      setConnectionStatus('error')
      setErrorMessage(`接続エラー: ${err instanceof Error ? err.message : '不明なエラー'}`)
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'text-yellow-600 bg-yellow-100'
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'error':
        return 'text-red-600 bg-red-100'
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking':
        return '接続確認中...'
      case 'connected':
        return '接続成功'
      case 'error':
        return '接続エラー'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Supabase接続テスト
          </h1>

          {/* 接続ステータス */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </div>
              <button
                onClick={checkConnection}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                再接続テスト
              </button>
            </div>
            
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-800 text-sm">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* 環境変数の確認 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">環境変数の設定状況</h2>
            
            {/* クライアントサイド環境変数 */}
            <div className="mb-4">
              <h3 className="text-md font-medium text-gray-800 mb-2">クライアントサイド（ブラウザ）</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-32">SUPABASE_URL:</span>
                  <span className={`text-sm ${envVars.supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                    {envVars.supabaseUrl ? '設定済み' : '未設定'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-32">ANON_KEY:</span>
                  <span className={`text-sm ${envVars.supabaseAnonKey ? 'text-green-600' : 'text-red-600'}`}>
                    {envVars.supabaseAnonKey ? '設定済み' : '未設定'}
                  </span>
                </div>
              </div>
            </div>

            {/* サーバーサイド環境変数 */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-2">サーバーサイド（API）</h3>
              {serverEnvCheck ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-32">SUPABASE_URL:</span>
                    <span className={`text-sm ${serverEnvCheck.env?.supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                      {serverEnvCheck.env?.supabaseUrl ? '設定済み' : '未設定'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-32">ANON_KEY:</span>
                    <span className={`text-sm ${serverEnvCheck.env?.supabaseAnonKey ? 'text-green-600' : 'text-red-600'}`}>
                      {serverEnvCheck.env?.supabaseAnonKey ? '設定済み' : '未設定'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-32">SERVICE_ROLE:</span>
                    <span className={`text-sm ${serverEnvCheck.env?.serviceRoleKey ? 'text-green-600' : 'text-red-600'}`}>
                      {serverEnvCheck.env?.serviceRoleKey ? '設定済み' : '未設定'}
                    </span>
                    {serverEnvCheck.env?.serviceRoleKey && (
                      <span className="text-xs text-gray-500">
                        (長さ: {serverEnvCheck.env?.serviceRoleKeyLength}文字)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">サーバー環境変数を確認中...</div>
              )}
            </div>
          </div>

          {/* 設定手順 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">設定手順</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>プロジェクトルートに <code className="bg-blue-100 px-1 rounded">.env.local</code> ファイルを作成</li>
              <li>Supabase Dashboard から API キーを取得</li>
              <li>環境変数を設定して開発サーバーを再起動</li>
              <li>データベーステーブルを作成（SQLファイルを実行）</li>
            </ol>
          </div>

          {/* 詳細情報 */}
          {envVars.supabaseUrl && (
            <div className="mt-6 bg-gray-50 rounded-md p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">設定情報</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Supabase URL:</strong> {envVars.supabaseUrl}</p>
                <p><strong>Anon Key:</strong> {envVars.supabaseAnonKey ? `${envVars.supabaseAnonKey.substring(0, 20)}...` : '未設定'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
