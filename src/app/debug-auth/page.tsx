"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export default function DebugAuthPage() {
  const { userProfile, userRole, userOrganization, loading } = useAuth()
  const [session, setSession] = useState<any>(null)
  const [authDetails, setAuthDetails] = useState<any>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        setAuthDetails({
          user: session.user,
          access_token: session.access_token ? 'あり' : 'なし',
          refresh_token: session.refresh_token ? 'あり' : 'なし',
          expires_at: session.expires_at,
          token_type: session.token_type
        })
      }
    }
    
    getSession()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            認証状態デバッグ
          </h1>

          {/* 認証コンテキストの状態 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">認証コンテキスト</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="space-y-2 text-sm">
                <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
                <div><strong>User Profile:</strong> {userProfile ? 'あり' : 'なし'}</div>
                <div><strong>User Role:</strong> {userRole || 'なし'}</div>
                <div><strong>User Organization:</strong> {userOrganization ? userOrganization.name : 'なし'}</div>
                {userProfile && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <div><strong>ID:</strong> {userProfile.id}</div>
                    <div><strong>Email:</strong> {userProfile.email}</div>
                    <div><strong>Display Name:</strong> {userProfile.display_name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Supabaseセッション */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Supabaseセッション</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="space-y-2 text-sm">
                <div><strong>Session:</strong> {session ? 'あり' : 'なし'}</div>
                {authDetails && (
                  <div className="mt-2 p-2 bg-green-50 rounded">
                    <div><strong>Access Token:</strong> {authDetails.access_token}</div>
                    <div><strong>Refresh Token:</strong> {authDetails.refresh_token}</div>
                    <div><strong>Expires At:</strong> {authDetails.expires_at}</div>
                    <div><strong>Token Type:</strong> {authDetails.token_type}</div>
                    {authDetails.user && (
                      <div className="mt-2">
                        <div><strong>User ID:</strong> {authDetails.user.id}</div>
                        <div><strong>User Email:</strong> {authDetails.user.email}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 権限チェック */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">権限チェック</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="space-y-2 text-sm">
                <div><strong>Contractor権限:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    userRole === 'Contractor' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {userRole === 'Contractor' ? 'あり' : 'なし'}
                  </span>
                </div>
                <div><strong>案件一覧ページアクセス可能:</strong>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    userRole === 'Contractor' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {userRole === 'Contractor' ? '可能' : '不可'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* アクション */}
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-2">テストアクション</h3>
              <div className="space-x-2">
                <button
                  onClick={() => window.location.href = '/jobs'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  案件一覧ページへ
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  ページをリロード
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
