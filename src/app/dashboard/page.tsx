"use client"

import React, { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Building,
  Users,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Briefcase,
  FileCheck,
  CreditCard,
  Heart,
  BarChart3,
  Bell,
  TrendingUp
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MetricCard } from "@/components/ui/metric-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { ProjectChart } from "@/components/charts/project-chart"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface DashboardStats {
  organization: {
    id: string
    name: string
    billing_email: string
    active: boolean
  }
  stats: {
    projects: {
      total: number
      pending_approval: number
      bidding: number
      in_progress: number
      completed: number
      rejected: number
    }
    contracts: {
      total: number
      signed: number
      pending: number
      totalAmount: number
    }
  }
  recentProjects: Array<{
    id: string
    title: string
    status: string
    budget: number
    deadline: string
    created_at: string
  }>
  pendingApprovals: Array<{
    id: string
    title: string
    budget: number
    deadline: string
    created_at: string
  }>
  notifications: Array<{
    id: string
    type: string
    title: string
    message: string
    created_at: string
    read: boolean
  }>
  recentActivities: Array<{
    type: string
    title: string
    description: string
    timestamp: string
    projectId?: string
    contractId?: string
  }>
}

export default function DashboardPage() {
  return (
    <AuthGuard allowedRoles={["OrgAdmin", "Staff", "Admin"]}>
      <DashboardPageContent />
    </AuthGuard>
  )
}

function DashboardPageContent() {
  const { userProfile, userRole, loading } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const lastFetchKeyRef = useRef<string | null>(null)

  // デバッグ診断を実行
  const runDiagnostics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('セッションが見つかりません')
        return
      }

      const response = await fetch('/api/debug/database', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      setDebugInfo(data)
      console.log('🔍 診断結果:', data)

      // コンソールに見やすく表示
      if (data.checks) {
        data.checks.forEach((check: any) => {
          console.log(`${check.status === 'success' ? '✅' : '❌'} ${check.check}:`, check)
        })
      }

      alert('診断が完了しました。ブラウザのコンソールを確認してください。')
    } catch (error) {
      console.error('診断エラー:', error)
      alert('診断に失敗しました: ' + error)
    }
  }

  // ダッシュボードデータを取得
  useEffect(() => {
    if (!userProfile || (userRole !== 'OrgAdmin' && userRole !== 'Staff')) {
      setDataLoading(false)
      return
    }

    // 同一ユーザー・ロールの組み合わせでは1回のみフェッチ（開発時のStrictMode重複実行対策）
    const fetchKey = `${userProfile.id}:${userRole}`
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey

    const fetchDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error('セッションが見つかりません')
          setErrorMessage('セッションが見つかりません。再度ログインしてください。')
          setDataLoading(false)
          return
        }

        console.log('🔄 ダッシュボードデータを取得中...')

        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'エラー情報を取得できませんでした' }))
          console.error('❌ API Error:', response.status, errorData)

          // 詳細なエラーメッセージを構築
          let detailedError = errorData.message || 'ダッシュボードデータの取得に失敗しました'
          if (errorData.details) {
            detailedError += `\n\n${errorData.details}`
          }
          if (errorData.error) {
            detailedError += `\n\nエラー詳細: ${errorData.error}`
          }

          setErrorMessage(detailedError)
          setDataLoading(false)
          return
        }

        const data = await response.json()
        console.log('✅ ダッシュボードデータ取得成功')
        setDashboardData(data)
        setErrorMessage('')

      } catch (error: any) {
        console.error('❌ データ取得エラー:', error)
        setErrorMessage(error.message || '予期しないエラーが発生しました')
      } finally {
        setDataLoading(false)
      }
    }

    fetchDashboardData()
  }, [userProfile, userRole])

  // メトリクス計算
  const metrics = dashboardData ? [
    {
      title: "全案件",
      value: dashboardData.stats.projects.total.toString(),
      icon: <Briefcase className="w-6 h-6" />,
      trend: { value: 0, isPositive: true }
    },
    {
      title: "進行中",
      value: dashboardData.stats.projects.in_progress.toString(),
      icon: <Building className="w-6 h-6" />,
      trend: { value: dashboardData.stats.projects.in_progress > 0 ? 10 : 0, isPositive: true }
    },
    {
      title: "契約数",
      value: dashboardData.stats.contracts.total.toString(),
      icon: <FileCheck className="w-6 h-6" />,
      trend: { value: 0, isPositive: true }
    },
    {
      title: "契約金額",
      value: formatCurrency(dashboardData.stats.contracts.totalAmount),
      icon: <DollarSign className="w-6 h-6" />,
      trend: { value: 0, isPositive: true }
    }
  ] : []

  // ローディング状態
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // 権限チェック
  if (userRole !== 'OrgAdmin' && userRole !== 'Staff') {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
            <p className="text-gray-600">このページは発注者組織のメンバーのみアクセス可能です。</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // データがない場合
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">データの取得に失敗しました</h2>
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {errorMessage || 'ページを再読み込みしてください。'}
              </pre>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-engineering-blue text-white rounded-lg hover:bg-engineering-blue/90 transition-colors font-medium"
                >
                  ページを再読み込み
                </button>
                <button
                  onClick={runDiagnostics}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  🔍 診断を実行
                </button>
              </div>
              {debugInfo && (
                <div className="mt-4 w-full max-w-2xl bg-gray-100 rounded-lg p-4 text-left">
                  <h3 className="font-semibold mb-2">診断結果:</h3>
                  <div className="space-y-2 text-xs font-mono">
                    {debugInfo.checks?.map((check: any, idx: number) => (
                      <div key={idx} className={`p-2 rounded ${check.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <span className={check.status === 'success' ? 'text-green-700' : 'text-red-700'}>
                          {check.status === 'success' ? '✅' : '❌'} {check.check}
                        </span>
                        {check.error && <div className="text-red-600 mt-1">エラー: {check.error}</div>}
                        {check.count !== undefined && <div className="text-gray-600">件数: {check.count}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                問題が続く場合は、以下を確認してください：
              </p>
              <ul className="text-xs text-gray-500 text-left list-disc list-inside space-y-1">
                <li>「診断を実行」ボタンをクリックして問題を特定</li>
                <li>ブラウザのコンソール（F12キー）でエラー詳細を確認</li>
                <li>発注者組織（OrgAdminまたはStaffロール）に所属しているか確認</li>
                <li>管理者に組織への追加を依頼</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />

      <div className="md:ml-64 transition-all duration-300">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building className="w-6 h-6 text-engineering-blue" />
                  {dashboardData.organization.name}
                </h1>
                <p className="text-gray-600">発注者ダッシュボード</p>
              </div>
              <div className="flex items-center gap-3">
                {dashboardData.notifications.length > 0 && (
                  <Link href="/notifications">
                    <Badge variant="outline" className="cursor-pointer hover:bg-engineering-blue/10">
                      <Bell className="w-4 h-4 mr-1" />
                      {dashboardData.notifications.length}件の通知
                    </Badge>
                  </Link>
                )}
                <Badge variant="engineering" className="animate-pulse">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-ping" />
                  システム稼働中
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-gray-600">最終更新</p>
                  <p className="text-sm font-medium">{new Date().toLocaleDateString('ja-JP')} {new Date().toLocaleTimeString('ja-JP')}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* 5つの主要セクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {/* ダッシュボード */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/dashboard" className="block">
                <Card className="hover-lift cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-engineering-blue/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-engineering-blue/20 transition-colors">
                      <BarChart3 className="w-6 h-6 text-engineering-blue" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">ダッシュボード</h3>
                    <p className="text-sm text-gray-600">全体の概要と統計</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* 案件管理（プロジェクト） */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/projects" className="block">
                <Card className="hover-lift cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-engineering-green/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-engineering-green/20 transition-colors">
                      <Briefcase className="w-6 h-6 text-engineering-green" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">案件管理</h3>
                    <p className="text-sm text-gray-600">プロジェクトの管理</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* 契約管理 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/contracts" className="block">
                <Card className="hover-lift cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                      <FileCheck className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">契約管理</h3>
                    <p className="text-sm text-gray-600">契約書の管理</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* 会計・請求 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/billing" className="block">
                <Card className="hover-lift cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                      <CreditCard className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">会計・請求</h3>
                    <p className="text-sm text-gray-600">支払いと請求管理</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {/* お気に入り会員 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link href="/favorite-members" className="block">
                <Card className="hover-lift cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
                      <Heart className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">お気に入り会員</h3>
                    <p className="text-sm text-gray-600">信頼できる受注者</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>

          {/* 承認待ち案件 */}
          {dashboardData.pendingApprovals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-5 h-5" />
                    承認待ち案件（{dashboardData.pendingApprovals.length}件）
                  </CardTitle>
                  <CardDescription>
                    あなたの承認が必要な案件があります
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.pendingApprovals.map((project, index) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 bg-white rounded-lg border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer"
                        >
                          <h4 className="font-semibold text-gray-900 mb-2">{project.title}</h4>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">予算</span>
                            <span className="font-semibold text-engineering-blue">
                              {formatCurrency(project.budget)}
                            </span>
                          </div>
                          {project.deadline && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                              <Calendar className="w-3 h-3" />
                              期限: {new Date(project.deadline).toLocaleDateString('ja-JP')}
                            </div>
                          )}
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                trend={metric.trend}
                variant={index % 4 === 0 ? "engineering" : index % 4 === 1 ? "gradient" : index % 4 === 2 ? "glass" : "default"}
              />
            ))}
          </div>

          {/* Charts and Stats Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* プロジェクトチャート */}
            <ProjectChart />

            {/* 契約状況 */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-engineering-blue" />
                  契約状況
                </CardTitle>
                <CardDescription>組織全体の契約概要</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-engineering-blue/5 rounded-lg">
                    <p className="text-sm text-gray-600">契約数</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {dashboardData.stats.contracts.total}件
                    </p>
                    <p className="text-xs text-gray-500">全契約数</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-gray-600">契約金額合計</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatCurrency(dashboardData.stats.contracts.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">現在有効な契約金額</p>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-engineering-blue/10 flex items-center justify-center">
                        <FileCheck className="w-5 h-5 text-engineering-blue" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">締結済み契約</p>
                        <p className="text-sm text-gray-600">署名が完了した契約</p>
                      </div>
                    </div>
                    <span className="font-semibold text-engineering-blue">
                      {dashboardData.stats.contracts.signed}件
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">締結待ち契約</p>
                        <p className="text-sm text-gray-600">署名待ちの契約</p>
                      </div>
                    </div>
                    <span className="font-semibold text-orange-500">
                      {dashboardData.stats.contracts.pending}件
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects & Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Projects */}
            <Card className="lg:col-span-2 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-engineering-blue" />
                  最近の案件
                </CardTitle>
                <CardDescription>
                  最近登録された案件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentProjects.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">案件がまだありません</p>
                  ) : (
                    dashboardData.recentProjects.map((project, index) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg border border-gray-200 hover:border-engineering-blue/50 transition-colors hover-lift cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{project.title}</h4>
                              <p className="text-xs text-gray-500">
                                {new Date(project.created_at).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                            <StatusIndicator status={project.status} size="sm" />
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {project.deadline ? new Date(project.deadline).toLocaleDateString('ja-JP') : '未設定'}
                            </div>
                            <div className="font-semibold text-engineering-blue">
                              {formatCurrency(project.budget)}
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-engineering-green" />
                  最近のアクティビティ
                </CardTitle>
                <CardDescription>
                  システム内の最近の動き
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentActivities.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">アクティビティがありません</p>
                  ) : (
                    dashboardData.recentActivities.slice(0, 5).map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-3 rounded-lg bg-gradient-to-r from-engineering-blue/5 to-engineering-green/5 border border-gray-200 hover:border-engineering-blue/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <h5 className="font-medium text-gray-900 text-sm">
                            {activity.title}
                          </h5>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{activity.description}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(activity.timestamp).toLocaleString('ja-JP')}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <Card variant="glass" className="border-engineering-blue/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">システム稼働状況</h3>
                      <p className="text-sm text-gray-600">全サービス正常稼働中 - {dashboardData.organization.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      API: 正常
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      データベース: 正常
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
