"use client"

import React from "react"
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
  Target
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

export default function DashboardPage() {
  // Mock data
  const metrics = [
    {
      title: "アクティブプロジェクト",
      value: "24",
      icon: <Building className="w-6 h-6" />,
      trend: { value: 12, isPositive: true }
    },
    {
      title: "月間売上",
      value: formatCurrency(15420000),
      icon: <DollarSign className="w-6 h-6" />,
      trend: { value: 8, isPositive: true }
    },
    {
      title: "受注者",
      value: "156",
      icon: <Users className="w-6 h-6" />,
      trend: { value: 3, isPositive: true }
    },
    {
      title: "完了率",
      value: "89%",
      icon: <Target className="w-6 h-6" />,
      trend: { value: 2, isPositive: true }
    }
  ]

  const recentProjects = [
    {
      id: "1",
      title: "東京都道路設計業務",
      client: "東京都建設局",
      status: "in_progress",
      progress: 65,
      dueDate: "2024-03-15",
      budget: 5200000
    },
    {
      id: "2",
      title: "橋梁点検業務",
      client: "国土交通省",
      status: "submitted",
      progress: 100,
      dueDate: "2024-02-28",
      budget: 3800000
    },
    {
      id: "3",
      title: "河川改修設計",
      client: "県土整備部",
      status: "bidding",
      progress: 0,
      dueDate: "2024-04-30",
      budget: 7500000
    }
  ]

  const upcomingTasks = [
    { id: "1", task: "品質検査レポート提出", project: "東京都道路設計業務", due: "2024-01-20" },
    { id: "2", task: "中間報告書作成", project: "橋梁点検業務", due: "2024-01-22" },
    { id: "3", task: "図面修正完了", project: "河川改修設計", due: "2024-01-25" },
  ]

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
                <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
                <p className="text-gray-600">土木設計業務管理プラットフォーム</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="engineering" className="animate-pulse">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-ping" />
                  システム稼働中
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-gray-600">最終更新</p>
                  <p className="text-sm font-medium">2024年1月18日 14:30</p>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
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
                  最近のプロジェクト
                </CardTitle>
                <CardDescription>
                  進行中の主要案件の状況
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProjects.map((project, index) => (
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
                          <p className="text-sm text-gray-600">{project.client}</p>
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
                          納期: {new Date(project.dueDate).toLocaleDateString('ja-JP')}
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
                  {upcomingTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-lg bg-gradient-to-r from-engineering-blue/5 to-engineering-green/5 border border-gray-200 hover:border-engineering-blue/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 text-sm">
                          {task.task}
                        </h5>
                        <Badge variant="outline" className="text-xs">
                          {Math.ceil((new Date(task.due).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{task.project}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due).toLocaleDateString('ja-JP')}
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
                      <p className="text-sm text-gray-600">全サービス正常稼働中</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Box API: 正常
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