"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DebugJobsPage() {
  const { user, userProfile, userRole, userOrganization, loading } = useAuth()
  const [jobsData, setJobsData] = useState<any>(null)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)

  const fetchJobsData = async () => {
    setIsLoadingJobs(true)
    setJobsError(null)
    
    try {
      console.log('Debug: 案件データ取得開始')
      
      // セッション取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Debug: セッション取得結果:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        error: sessionError?.message 
      })
      
      if (sessionError || !session) {
        setJobsError('セッションが見つかりません: ' + (sessionError?.message || 'セッションなし'))
        return
      }

      // 案件データ取得
      const response = await fetch('/api/jobs', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Debug: APIレスポンス:', { 
        status: response.status, 
        statusText: response.statusText 
      })

      const result = await response.json()
      console.log('Debug: API結果:', result)

      if (response.ok) {
        setJobsData(result)
      } else {
        setJobsError(result.message || 'APIエラー')
      }
    } catch (error: any) {
      console.error('Debug: エラー:', error)
      setJobsError('ネットワークエラー: ' + error.message)
    } finally {
      setIsLoadingJobs(false)
    }
  }

  useEffect(() => {
    if (!loading && userProfile && userRole) {
      fetchJobsData()
    }
  }, [loading, userProfile, userRole])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">案件一覧デバッグ</h1>

        {/* 認証情報 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>認証状態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
              <div><strong>User:</strong> {user ? 'あり' : 'なし'}</div>
              <div><strong>User ID:</strong> {user?.id || 'なし'}</div>
              <div><strong>User Email:</strong> {user?.email || 'なし'}</div>
              <div><strong>User Profile:</strong> {userProfile ? 'あり' : 'なし'}</div>
              <div><strong>User Role:</strong> {userRole || 'なし'}</div>
              <div><strong>User Organization:</strong> {userOrganization ? userOrganization.name : 'なし'}</div>
            </div>
          </CardContent>
        </Card>

        {/* 案件データ */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>案件データ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={fetchJobsData} disabled={isLoadingJobs}>
                {isLoadingJobs ? '読み込み中...' : '案件データを取得'}
              </Button>
              
              {jobsError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-800">エラー</h3>
                  <p className="text-red-700">{jobsError}</p>
                </div>
              )}
              
              {jobsData && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800">成功</h3>
                  <p className="text-green-700">案件数: {jobsData.jobs?.length || 0}</p>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-96">
                    {JSON.stringify(jobsData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ナビゲーション */}
        <Card>
          <CardHeader>
            <CardTitle>ナビゲーション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a href="/jobs" className="block text-blue-600 hover:underline">
                案件一覧ページ
              </a>
              <a href="/auth/login" className="block text-blue-600 hover:underline">
                ログインページ
              </a>
              <a href="/debug-auth" className="block text-blue-600 hover:underline">
                認証デバッグページ
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
