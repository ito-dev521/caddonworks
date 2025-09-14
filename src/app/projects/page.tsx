"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  DollarSign,
  Paperclip,
  Upload,
  File,
  X
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

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
  contractor_email: string
  progress: number
  category: string
  created_at: string
}

export default function ProjectsPage() {
  const { userProfile, userRole, loading } = useAuth()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([])
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed' | 'all'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [showChatModal, setShowChatModal] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    budget: 0,
    start_date: '',
    end_date: '',
    category: '',
    contractor_id: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showProjectDetail, setShowProjectDetail] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null)
  const [showAttachmentsModal, setShowAttachmentsModal] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)

  // 会社間の情報分離を確実にするため、組織IDでデータをフィルタリング
  useEffect(() => {
    if (!userProfile || userRole !== 'OrgAdmin') {
      setDataLoading(false)
      return
    }

    const fetchProjects = async () => {
      try {
        // ユーザーの組織情報を取得
        const { data: membership, error: membershipError } = await supabase
          .from('memberships')
          .select(`
            org_id,
            organizations (
              id,
              name
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

        const company = membership.organizations as any

        // 組織の案件データを取得（会社間分離）
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
            category,
            created_at,
            users!projects_contractor_id_fkey (
              display_name,
              email
            )
          `)
          .eq('org_id', company.id) // 組織IDでフィルタリング
          .order('created_at', { ascending: false })

        if (projectsError) {
          console.error('案件データの取得に失敗:', projectsError)
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
            contractor_email: (project.users as any)?.email || '',
            progress: Math.floor(Math.random() * 100), // 実際の進捗計算ロジックに置き換え
            category: project.category || '道路設計',
            created_at: project.created_at
          })) || []
          setProjects(formattedProjects)
          setFilteredProjects(formattedProjects)
        }

      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchProjects()
  }, [userProfile, userRole])

  // フィルタリング
  useEffect(() => {
    let filtered = projects

    // ステータスフィルタ
    if (selectedTab === 'active') {
      filtered = filtered.filter(p => p.status === 'in_progress' || p.status === 'bidding')
    } else if (selectedTab === 'completed') {
      filtered = filtered.filter(p => p.status === 'completed' || p.status === 'cancelled')
    }

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredProjects(filtered)
  }, [projects, selectedTab, searchTerm])

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newProject)
      })

      const result = await response.json()

      if (response.ok) {
        alert('案件が正常に作成されました')
        setShowNewProjectForm(false)
        setNewProject({
          title: '',
          description: '',
          budget: 0,
          start_date: '',
          end_date: '',
          category: '',
          contractor_id: ''
        })
        // 案件一覧を再読み込み
        window.location.reload()
      } else {
        alert('案件の作成に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('案件作成エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadChatMessages = async (projectId: string) => {
    setIsLoadingMessages(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/chat?project_id=${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        setChatMessages(result.messages)
      } else {
        console.error('メッセージ取得エラー:', result.message)
        setChatMessages([])
      }
    } catch (error) {
      console.error('メッセージ取得エラー:', error)
      setChatMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const sendMessage = async (projectId: string) => {
    if (!newMessage.trim()) return

    setIsSendingMessage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          message: newMessage,
          sender_type: 'client' // 発注者側
        })
      })

      const result = await response.json()

      if (response.ok) {
        setNewMessage('')
        // メッセージ一覧を再読み込み
        await loadChatMessages(projectId)
      } else {
        alert('メッセージの送信に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const openChatModal = (projectId: string) => {
    setShowChatModal(projectId)
    loadChatMessages(projectId)
  }

  const openProjectDetail = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setShowProjectDetail(projectId)
    }
  }

  const editProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setEditingProject(project)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('この案件を削除してもよろしいですか？')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('案件が削除されました')
        window.location.reload()
      } else {
        alert('案件の削除に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('案件削除エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  const loadAttachments = async (projectId: string) => {
    setIsLoadingAttachments(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        setAttachments(result.attachments)
      } else {
        console.error('添付資料取得エラー:', result.message)
        setAttachments([])
      }
    } catch (error) {
      console.error('添付資料取得エラー:', error)
      setAttachments([])
    } finally {
      setIsLoadingAttachments(false)
    }
  }

  const uploadFile = async (projectId: string, file: File) => {
    setIsUploadingFile(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        alert('ファイルが正常にアップロードされました')
        // 添付資料一覧を再読み込み
        await loadAttachments(projectId)
      } else {
        alert('ファイルのアップロードに失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('ファイルアップロードエラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const deleteAttachment = async (projectId: string, attachmentId: string) => {
    if (!confirm('この添付資料を削除してもよろしいですか？')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/projects/${projectId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('添付資料が削除されました')
        // 添付資料一覧を再読み込み
        await loadAttachments(projectId)
      } else {
        alert('添付資料の削除に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('添付資料削除エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  const openAttachmentsModal = (projectId: string) => {
    setShowAttachmentsModal(projectId)
    loadAttachments(projectId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bidding':
        return 'text-blue-600 bg-blue-100'
      case 'in_progress':
        return 'text-green-600 bg-green-100'
      case 'completed':
        return 'text-gray-600 bg-gray-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'bidding':
        return '入札中'
      case 'in_progress':
        return '進行中'
      case 'completed':
        return '完了'
      case 'cancelled':
        return 'キャンセル'
      default:
        return status
    }
  }

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
            <Building className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
                  案件管理
                </h1>
                <p className="text-gray-600">新規案件登録と過去案件の管理</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="engineering"
                  onClick={() => setShowNewProjectForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新規案件登録
                </Button>
                <div className="text-right">
                  <p className="text-sm text-gray-600">総案件数</p>
                  <p className="text-sm font-medium">{projects.length}件</p>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* フィルターと検索 */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* タブナビゲーション */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: 'active', label: '進行中', count: projects.filter(p => p.status === 'in_progress' || p.status === 'bidding').length },
                  { id: 'completed', label: '完了済み', count: projects.filter(p => p.status === 'completed' || p.status === 'cancelled').length },
                  { id: 'all', label: 'すべて', count: projects.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedTab === tab.id
                        ? 'bg-white text-engineering-blue shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                    <Badge variant="outline" className="text-xs">
                      {tab.count}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* 検索とフィルター */}
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="案件名・受注者で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent w-64"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  フィルター
                </Button>
              </div>
            </div>
          </div>

          {/* 案件カード一覧 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover-lift cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 group-hover:text-engineering-blue transition-colors">
                            {project.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {project.contractor_name} • {project.category}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusText(project.status)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* 進捗バー */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">進捗</span>
                          <span className="text-sm text-gray-600">{project.progress}%</span>
                        </div>
                        <Progress
                          value={project.progress}
                          variant="engineering"
                          className="mb-3"
                        />
                      </div>

                      {/* 案件詳細 */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          納期: {new Date(project.end_date).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(project.budget)}
                        </div>
                      </div>

                      {/* 受注者情報 */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-engineering-blue/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-engineering-blue" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{project.contractor_name}</p>
                            <p className="text-xs text-gray-600">{project.contractor_email}</p>
                          </div>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          案件ID: {project.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openProjectDetail(project.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => editProject(project.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteProject(project.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openAttachmentsModal(project.id)}
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          {(project.status === 'in_progress' || project.status === 'bidding') && (
                            <Button
                              variant="engineering"
                              size="sm"
                              onClick={() => openChatModal(project.id)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              チャット
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 案件がない場合 */}
          {filteredProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">案件が見つかりません</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? '検索条件に一致する案件がありません。' : 'まだ案件が登録されていません。'}
              </p>
              <Button
                variant="engineering"
                onClick={() => setShowNewProjectForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                新規案件登録
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      {/* 新規案件登録モーダル */}
      <AnimatePresence>
        {showNewProjectForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-engineering-blue" />
                    新規案件登録
                  </CardTitle>
                  <CardDescription>
                    新しい案件の詳細を入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleNewProject} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          案件名 *
                        </label>
                        <input
                          type="text"
                          value={newProject.title}
                          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          カテゴリ *
                        </label>
                        <select
                          value={newProject.category}
                          onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        >
                          <option value="">選択してください</option>
                          <option value="道路設計">道路設計</option>
                          <option value="橋梁設計">橋梁設計</option>
                          <option value="河川工事">河川工事</option>
                          <option value="構造物点検">構造物点検</option>
                          <option value="地下構造">地下構造</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        案件説明 *
                      </label>
                      <textarea
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          予算 *
                        </label>
                        <input
                          type="number"
                          value={newProject.budget}
                          onChange={(e) => setNewProject({ ...newProject, budget: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          開始日 *
                        </label>
                        <input
                          type="date"
                          value={newProject.start_date}
                          onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          納期 *
                        </label>
                        <input
                          type="date"
                          value={newProject.end_date}
                          onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                    </div>


                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewProjectForm(false)}
                        disabled={isSubmitting}
                      >
                        キャンセル
                      </Button>
                      <Button 
                        type="submit" 
                        variant="engineering"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? '作成中...' : '案件を登録'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* チャットモーダル */}
      <AnimatePresence>
        {showChatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-engineering-blue/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-engineering-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">受注者とのチャット</h3>
                    <p className="text-sm text-gray-600">
                      {projects.find(p => p.id === showChatModal)?.contractor_name}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChatModal(null)}
                >
                  ×
                </Button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {isLoadingMessages ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue mx-auto mb-4"></div>
                      <p>メッセージを読み込み中...</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>まだメッセージがありません</p>
                      <p className="text-sm">受注者とのコミュニケーションを開始しましょう</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_type === 'client'
                              ? 'bg-engineering-blue text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_type === 'client' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.created_at).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="メッセージを入力..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && showChatModal) {
                        sendMessage(showChatModal)
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    disabled={isSendingMessage}
                  />
                  <Button 
                    variant="engineering" 
                    onClick={() => showChatModal && sendMessage(showChatModal)}
                    disabled={isSendingMessage || !newMessage.trim()}
                  >
                    {isSendingMessage ? '送信中...' : '送信'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 添付資料モーダル */}
      <AnimatePresence>
        {showAttachmentsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-engineering-blue/10 rounded-full flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-engineering-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">添付資料管理</h3>
                    <p className="text-sm text-gray-600">
                      {projects.find(p => p.id === showAttachmentsModal)?.title}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAttachmentsModal(null)}
                >
                  ×
                </Button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {/* ファイルアップロードエリア */}
                <div className="mb-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">ファイルをドラッグ&ドロップまたはクリックしてアップロード</p>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && showAttachmentsModal) {
                          uploadFile(showAttachmentsModal, file)
                        }
                      }}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      disabled={isUploadingFile}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? 'アップロード中...' : 'ファイルを選択'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      対応形式: PDF, Word, Excel, 画像 (最大10MB)
                    </p>
                  </div>
                </div>

                {/* 添付資料一覧 */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">添付資料一覧</h4>
                  {isLoadingAttachments ? (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue mx-auto mb-4"></div>
                      <p>添付資料を読み込み中...</p>
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>まだ添付資料がありません</p>
                      <p className="text-sm">ファイルをアップロードしてください</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <File className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{attachment.file_name}</p>
                              <p className="text-sm text-gray-600">
                                {(attachment.file_size / 1024 / 1024).toFixed(2)} MB • 
                                {new Date(attachment.created_at).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // ファイルダウンロード機能（実装は後で追加）
                                alert('ダウンロード機能は準備中です')
                              }}
                            >
                              ダウンロード
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => showAttachmentsModal && deleteAttachment(showAttachmentsModal, attachment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}