"use client"

import React from "react"
import { useAuth } from "@/contexts/auth-context"

export default function DebugAuthPage() {
  const { user, userProfile, userRole, userOrganization, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">認証デバッグ情報</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">認証状態</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
            <div><strong>User:</strong> {user ? 'あり' : 'なし'}</div>
            <div><strong>User ID:</strong> {user?.id || 'なし'}</div>
            <div><strong>User Email:</strong> {user?.email || 'なし'}</div>
            <div><strong>User Profile:</strong> {userProfile ? 'あり' : 'なし'}</div>
            <div><strong>User Role:</strong> {userRole || 'なし'}</div>
            <div><strong>User Organization:</strong> {userOrganization ? userOrganization.name : 'なし'}</div>
          </div>
        </div>

        {userProfile && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">ユーザープロフィール詳細</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(userProfile, null, 2)}
            </pre>
          </div>
        )}

        {user && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Supabase User詳細</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify({
                id: user.id,
                email: user.email,
                created_at: user.created_at,
                updated_at: user.updated_at,
                aud: user.aud,
                role: user.role
              }, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">利用可能なアクション</h2>
          <div className="space-y-2">
            <a href="/auth/login" className="block text-blue-600 hover:underline">ログインページ</a>
            <a href="/projects" className="block text-blue-600 hover:underline">案件一覧</a>
            <a href="/contracts" className="block text-blue-600 hover:underline">契約一覧</a>
            <a href="/jobs" className="block text-blue-600 hover:underline">案件一覧（受注者）</a>
          </div>
        </div>
      </div>
    </div>
  )
}