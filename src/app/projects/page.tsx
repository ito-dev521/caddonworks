"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Search,
  Filter,
  SortDesc,
  Grid3X3,
  List,
  Calendar,
  MapPin,
  Users,
  FileText,
  Clock,
  DollarSign,
  Eye,
  Edit,
  Archive,
  AlertTriangle
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { ProjectCard } from "@/components/projects/project-card"
import { ProjectFilters } from "@/components/projects/project-filters"
import { CreateProjectModal } from "@/components/projects/create-project-modal"
import { formatCurrency, formatDate } from "@/lib/utils"

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("all")

  // Mock project data
  const projects = [
    {
      id: "1",
      title: "東京都道路設計業務",
      description: "都内主要幹線道路の改修設計および交通解析業務",
      client: "東京都建設局",
      status: "in_progress",
      progress: 65,
      startDate: "2024-01-15",
      dueDate: "2024-03-15",
      budget: 5200000,
      location: "東京都新宿区",
      team: ["田中太郎", "佐藤花子", "山田次郎"],
      category: "道路設計",
      priority: "high",
      tags: ["道路", "交通解析", "CAD設計"],
      lastActivity: "2024-01-18T10:30:00Z"
    },
    {
      id: "2",
      title: "橋梁点検業務",
      description: "県内橋梁の定期点検および健全性診断",
      client: "国土交通省",
      status: "submitted",
      progress: 100,
      startDate: "2023-12-01",
      dueDate: "2024-02-28",
      budget: 3800000,
      location: "神奈川県横浜市",
      team: ["鈴木一郎", "田村美咲"],
      category: "構造物点検",
      priority: "medium",
      tags: ["橋梁", "点検", "診断"],
      lastActivity: "2024-01-17T15:45:00Z"
    },
    {
      id: "3",
      title: "河川改修設計",
      description: "河川護岸工事設計および環境影響評価",
      client: "県土整備部",
      status: "bidding",
      progress: 0,
      startDate: "2024-02-01",
      dueDate: "2024-04-30",
      budget: 7500000,
      location: "千葉県市川市",
      team: [],
      category: "河川工事",
      priority: "high",
      tags: ["河川", "護岸", "環境評価"],
      lastActivity: "2024-01-16T09:20:00Z"
    },
    {
      id: "4",
      title: "トンネル設計業務",
      description: "山岳トンネルの詳細設計および施工計画立案",
      client: "高速道路株式会社",
      status: "contracted",
      progress: 25,
      startDate: "2024-01-10",
      dueDate: "2024-06-30",
      budget: 12000000,
      location: "静岡県熱海市",
      team: ["中村健太", "小林由美", "高橋誠", "渡辺恵子"],
      category: "トンネル設計",
      priority: "critical",
      tags: ["トンネル", "山岳工法", "施工計画"],
      lastActivity: "2024-01-18T14:15:00Z"
    },
    {
      id: "5",
      title: "地下構造物設計",
      description: "地下駐車場および地下街の構造設計",
      client: "民間デベロッパー",
      status: "completed",
      progress: 100,
      startDate: "2023-10-01",
      dueDate: "2023-12-31",
      budget: 8900000,
      location: "大阪府大阪市",
      team: ["青木信子", "森田浩司"],
      category: "地下構造",
      priority: "medium",
      tags: ["地下構造", "駐車場", "商業施設"],
      lastActivity: "2024-01-05T11:00:00Z"
    }
  ]

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.category.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = selectedFilter === "all" || project.status === selectedFilter

    return matchesSearch && matchesFilter
  })

  const getProjectStats = () => {
    const total = projects.length
    const active = projects.filter(p => p.status === "in_progress").length
    const completed = projects.filter(p => p.status === "completed").length
    const overdue = projects.filter(p => new Date(p.dueDate) < new Date() && p.status !== "completed").length

    return { total, active, completed, overdue }
  }

  const stats = getProjectStats()

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
                  <FileText className="w-6 h-6 text-engineering-blue" />
                  プロジェクト管理
                </h1>
                <p className="text-gray-600">案件の進捗管理と品質監視</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  フィルター
                </Button>
                <Button variant="engineering" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新規プロジェクト
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総プロジェクト数</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">進行中</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.active}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">完了</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">期限超過</p>
                    <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Controls */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="プロジェクト名、クライアント、カテゴリで検索..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <select
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                >
                  <option value="all">全てのステータス</option>
                  <option value="draft">下書き</option>
                  <option value="bidding">入札中</option>
                  <option value="contracted">契約済み</option>
                  <option value="in_progress">進行中</option>
                  <option value="submitted">提出済み</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>

                {/* View Mode Toggle */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'engineering' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none border-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'engineering' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none border-none border-l border-gray-200"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid/List */}
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {filteredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {project.title}
                              </h3>
                              <StatusIndicator status={project.status} size="sm" />
                              {project.priority === 'critical' && (
                                <Badge variant="destructive">緊急</Badge>
                              )}
                              {project.priority === 'high' && (
                                <Badge variant="warning">高</Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-3">{project.description}</p>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Users className="w-4 h-4" />
                                {project.client}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4" />
                                {project.location}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                {formatDate(project.dueDate)}
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <DollarSign className="w-4 h-4" />
                                {formatCurrency(project.budget)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600 mb-1">進捗</p>
                              <p className="text-2xl font-bold text-engineering-blue">
                                {project.progress}%
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <Progress value={project.progress} variant="engineering" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {filteredProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                プロジェクトが見つかりません
              </h3>
              <p className="text-gray-600 mb-6">
                検索条件を変更するか、新しいプロジェクトを作成してください。
              </p>
              <Button variant="engineering" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新規プロジェクト作成
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <ProjectFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />
    </div>
  )
}