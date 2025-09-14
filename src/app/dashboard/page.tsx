"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building,
  Users,
  FileText,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  Briefcase,
  FileCheck,
  CreditCard,
  Heart,
  BarChart3,
  Settings,
  Bell
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { MetricCard } from "@/components/ui/metric-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { ProjectChart } from "@/components/charts/project-chart"
import { RevenueChart } from "@/components/charts/revenue-chart"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface CompanyData {
  id: string
  name: string
  description: string
  billing_email: string
  system_fee: number
  active: boolean
}

interface ProjectData {
  id: string
  title: string
  description: string
  status: string
  budget: number
  start_date: string
  end_date: string
  contractor_id: string
  contractor_name: string
  progress: number
}

interface ContractData {
  id: string
  project_id: string
  project_title: string
  contractor_name: string
  status: string
  amount: number
  signed_date: string
}

interface BillingData {
  id: string
  project_id: string
  project_title: string
  amount: number
  status: string
  due_date: string
  paid_date?: string
}

interface FavoriteContractor {
  id: string
  name: string
  specialties: string[]
  rating: number
  completed_projects: number
}

export default function DashboardPage() {
  const { userProfile, userRole, loading } = useAuth()
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [billing, setBilling] = useState<BillingData[]>([])
  const [favoriteContractors, setFavoriteContractors] = useState<FavoriteContractor[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // 会社間の情報分離を確実にするため、組織IDでデータをフィルタリング
  useEffect(() => {
    if (!userProfile || userRole !== 'OrgAdmin') {
      setDataLoading(false)
      return
    }

    const fetchCompanyData = async () => {
      try {
        // ユーザーの組織情報を取得
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            org_id,
            organizations (
              id,
              name,
              description,
              billing_email,
              system_fee,
              active
            )
          `)
          .eq('user_id', userProfile.id)
          .eq('role', 'OrgAdmin')
          .single()

        if (membershipError || !membership) {
          console.error('組織情報の取得に失敗:', membershipError)
          setDataLoading(false)
          return
        }

        const company = membership.organizations as CompanyData
        setCompanyData(company)

        // 組織のプロジェクトデータを取得（会社間分離）
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(`
            id,
            title,
            description,
            status,
            budget,
            start_date,
            end_date,
            contractor_id,
            users!projects_contractor_id_fkey (
              display_name
            )
          `)
          .eq('org_id', company.id) // 組織IDでフィルタリング

        if (projectsError) {
          console.error('プロジェクトデータの取得に失敗:', projectsError)
        } else {
          const formattedProjects = projectsData?.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description,
            status: project.status,
            budget: project.budget,
            start_date: project.start_date,
            end_date: project.end_date,
            contractor_id: project.contractor_id,
            contractor_name: (project.users as any)?.display_name || '未割当',
            progress: Math.floor(Math.random() * 100) // 実際の進捗計算ロジックに置き換え
          })) || []
          setProjects(formattedProjects)
        }

        // 契約データを取得（会社間分離）
        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select(`
            id,
            project_id,
            projects!inner (
              title,
              org_id
            ),
            users!contracts_contractor_id_fkey (
              display_name
            ),
            status,
            amount,
            signed_date
          `)
          .eq('projects.org_id', company.id) // 組織IDでフィルタリング

        if (contractsError) {
          console.error('契約データの取得に失敗:', contractsError)
        } else {
          const formattedContracts = contractsData?.map(contract => ({
            id: contract.id,
            project_id: contract.project_id,
            project_title: (contract.projects as any)?.title || '',
            contractor_name: (contract.users as any)?.display_name || '',
            status: contract.status,
            amount: contract.amount,
            signed_date: contract.signed_date
          })) || []
          setContracts(formattedContracts)
        }

        // 請求データを取得（会社間分離）
        const { data: billingData, error: billingError } = await supabase
          .from('billing')
          .select(`
            id,
            project_id,
            projects!inner (
              title,
              org_id
            ),
            amount,
            status,
            due_date,
            paid_date
          `)
          .eq('projects.org_id', company.id) // 組織IDでフィルタリング

        if (billingError) {
          console.error('請求データの取得に失敗:', billingError)
        } else {
          const formattedBilling = billingData?.map(bill => ({
            id: bill.id,
            project_id: bill.project_id,
            project_title: (bill.projects as any)?.title || '',
            amount: bill.amount,
            status: bill.status,
            due_date: bill.due_date,
            paid_date: bill.paid_date
          })) || []
          setBilling(formattedBilling)
        }

        // お気に入り受注者を取得（会社間分離）
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('favorite_contractors')
          .select(`
            contractor_id,
            users!favorite_contractors_contractor_id_fkey (
              id,
              display_name,
              specialties,
              rating
            )
          `)
          .eq('org_id', company.id) // 組織IDでフィルタリング

        if (favoritesError) {
          console.error('お気に入り受注者データの取得に失敗:', favoritesError)
        } else {
          const formattedFavorites = favoritesData?.map(fav => ({
            id: fav.contractor_id,
            name: (fav.users as any)?.display_name || '',
            specialties: (fav.users as any)?.specialties || [],
            rating: (fav.users as any)?.rating || 0,
            completed_projects: Math.floor(Math.random() * 20) + 1 // 実際の完了プロジェクト数に置き換え
          })) || []
          setFavoriteContractors(formattedFavorites)
        }

      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchCompanyData()
  }, [userProfile, userRole])

  // メトリクス計算
  const metrics = [
    {
      title: "アクティブ案件",
      value: projects.filter(p => p.status === 'in_progress').length.toString(),
      icon: <Building className="w-6 h-6" />,
      trend: { value: 12, isPositive: true }
    },
    {
      title: "月間支出",
      value: formatCurrency(
        billing
          .filter(b => b.status === 'paid' && new Date(b.paid_date || '').getMonth() === new Date().getMonth())
          .reduce((sum, b) => sum + b.amount, 0)
      ),
      icon: <DollarSign className="w-6 h-6" />,
      trend: { value: 8, isPositive: false }
    },
    {
      title: "契約済み受注者",
      value: contracts.filter(c => c.status === 'signed').length.toString(),
      icon: <Users className="w-6 h-6" />,
      trend: { value: 3, isPositive: true }
    },
    {
      title: "案件完了率",
      value: `${Math.round((projects.filter(p => p.status === 'completed').length / Math.max(projects.length, 1)) * 100)}%`,
      icon: <Target className="w-6 h-6" />,
      trend: { value: 2, isPositive: true }
    }
  ]

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
  if (userRole !== 'OrgAdmin') {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
            <p className="text-gray-600">このページは発注者（組織管理者）のみアクセス可能です。</p>
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
                  {companyData?.name || '発注者ダッシュボード'}
                </h1>
                <p className="text-gray-600">土木設計業務管理プラットフォーム</p>
              </div>
              <div className="flex items-center gap-3">
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
              <Card className="hover-lift cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-engineering-blue/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-engineering-blue/20 transition-colors">
                    <BarChart3 className="w-6 h-6 text-engineering-blue" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">ダッシュボード</h3>
                  <p className="text-sm text-gray-600">全体の概要と統計</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* 案件管理（プロジェクト） */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover-lift cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-engineering-green/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-engineering-green/20 transition-colors">
                    <Briefcase className="w-6 h-6 text-engineering-green" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">案件管理</h3>
                  <p className="text-sm text-gray-600">プロジェクトの管理</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* 契約管理 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="hover-lift cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                    <FileCheck className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">契約管理</h3>
                  <p className="text-sm text-gray-600">契約書の管理</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* 会計・請求 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="hover-lift cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">会計・請求</h3>
                  <p className="text-sm text-gray-600">支払いと請求管理</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* お気に入り会員 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="hover-lift cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-red-200 transition-colors">
                    <Heart className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">お気に入り会員</h3>
                  <p className="text-sm text-gray-600">信頼できる受注者</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ProjectChart />
            <RevenueChart />
          </div>

          {/* Recent Projects & Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Projects */}
            <Card className="lg:col-span-2 hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-engineering-blue" />
                  最近の案件
                </CardTitle>
                <CardDescription>
                  進行中の主要案件の状況
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.slice(0, 3).map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg border border-gray-200 hover:border-engineering-blue/50 transition-colors hover-lift"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{project.title}</h4>
                          <p className="text-sm text-gray-600">{project.contractor_name}</p>
                        </div>
                        <StatusIndicator status={project.status} size="sm" />
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">進捗</span>
                        <span className="text-sm text-gray-600">{project.progress}%</span>
                      </div>
                      <Progress
                        value={project.progress}
                        variant="engineering"
                        className="mb-3"
                      />

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          納期: {new Date(project.end_date).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="font-semibold text-engineering-blue">
                          {formatCurrency(project.budget)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-engineering-green" />
                  今後のタスク
                </CardTitle>
                <CardDescription>
                  期限が近いタスク
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {billing.filter(b => b.status === 'pending').slice(0, 3).map((bill, index) => (
                    <motion.div
                      key={bill.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg bg-gradient-to-r from-engineering-blue/5 to-engineering-green/5 border border-gray-200 hover:border-engineering-blue/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 text-sm">
                          支払い処理
                        </h5>
                        <Badge variant="outline" className="text-xs">
                          {Math.ceil((new Date(bill.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{bill.project_title}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(bill.due_date).toLocaleDateString('ja-JP')}
                      </div>
                    </motion.div>
                  ))}
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
                      <p className="text-sm text-gray-600">全サービス正常稼働中 - {companyData?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Supabase API: 正常
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