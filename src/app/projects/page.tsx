"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
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
  X,
  Clock,
  CheckCircle,
  PlayCircle,
  StopCircle
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MEMBER_LEVELS, type MemberLevel } from "@/lib/member-level"

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
  assignee_name?: string
  bidding_deadline?: string
  required_contractors?: number
  required_level?: MemberLevel
  is_expired?: boolean
  days_until_deadline?: number | null
  contracts?: Array<{
    contractor_id: string
    contract_amount: number
    contractor_name: string
    contractor_email: string
  }>
}

function ProjectsPageContent() {
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
    budget: '',
    start_date: '',
    end_date: '',
    bidding_deadline: '',
    category: '',
    contractor_id: '',
    assignee_name: '',
    required_contractors: 1,
    required_level: 'beginner' as MemberLevel
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
  const [showExpiredNotification, setShowExpiredNotification] = useState(false)
  const [expiredProjectsCount, setExpiredProjectsCount] = useState(0)
  const [favoriteMembers, setFavoriteMembers] = useState<any[]>([])
  const [selectedFavoriteMembers, setSelectedFavoriteMembers] = useState<string[]>([])
  const [showFavoriteMembersModal, setShowFavoriteMembersModal] = useState(false)
  const lastFetchKeyRef = useRef<string | null>(null)

  // 予算のフォーマット処理
  const formatBudget = (value: string) => {
    // 数字以外を除去
    const numericValue = value.replace(/[^\d]/g, '')
    // 3桁ごとにカンマを追加
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // 予算の値を数値に変換
  const parseBudget = (value: string) => {
    return parseInt(value.replace(/[^\d]/g, ''), 10) || 0
  }

  // お気に入り会員データを取得する関数
  const fetchFavoriteMembers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/favorite-members', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (response.ok) {
        setFavoriteMembers(result.favorite_members || [])
      }
    } catch (error) {
      console.error('お気に入り会員取得エラー:', error)
    }
  }, [])

  // 案件データを取得する関数
  const fetchProjects = useCallback(async () => {
    try {
      setDataLoading(true)
      // APIを経由して案件データを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        setDataLoading(false)
        return
      }

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        const projectsData = result.projects || []
        setProjects(projectsData)
        setFilteredProjects(projectsData)
        
        // 期限切れ案件の通知設定
        const expiredCount = projectsData.filter((p: ProjectData) => p.is_expired).length
        setExpiredProjectsCount(expiredCount)
        setShowExpiredNotification(expiredCount > 0)
      } else {
        console.error('fetchProjects: 案件データの取得に失敗:', result.message)
        setProjects([])
        setFilteredProjects([])
      }

    } catch (error) {
      console.error('データ取得エラー:', error)
      setProjects([])
      setFilteredProjects([])
    } finally {
      setDataLoading(false)
    }
  }, [])  // 空の依存配列でメモ化

  // 会社間の情報分離を確実にするため、組織IDでデータをフィルタリング
  useEffect(() => {
    if (!userProfile || userRole !== 'OrgAdmin') {
      setDataLoading(false)
      return
    }

    // 同一ユーザー・ロールの組み合わせでは1回のみフェッチ（開発時のStrictMode重複実行対策）
    const fetchKey = `${userProfile.id}:${userRole}`
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey

    fetchProjects()
    fetchFavoriteMembers()
  }, [userProfile, userRole, fetchProjects, fetchFavoriteMembers])

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
        body: JSON.stringify({
          ...newProject,
          budget: parseBudget(newProject.budget)
        })
      })

      const result = await response.json()

      if (response.ok) {
        const projectId = result.project.id
        
        // お気に入り会員に優先依頼を送信
        if (selectedFavoriteMembers.length > 0) {
          try {
            const invitationResponse = await fetch('/api/priority-invitations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                project_id: projectId,
                contractor_ids: selectedFavoriteMembers,
                expires_in_hours: 72 // 3日間
              })
            })

            const invitationResult = await invitationResponse.json()
            if (invitationResponse.ok) {
              alert(`案件が正常に作成されました。${selectedFavoriteMembers.length}名のお気に入り会員に優先依頼を送信しました。`)
            } else {
              alert(`案件は作成されましたが、優先依頼の送信に失敗しました: ${invitationResult.message}`)
            }
          } catch (error) {
            console.error('優先依頼送信エラー:', error)
            alert('案件は作成されましたが、優先依頼の送信に失敗しました')
          }
        } else {
          alert('案件が正常に作成されました')
        }

        setShowNewProjectForm(false)
        setNewProject({
          title: '',
          description: '',
          budget: '',
          start_date: '',
          end_date: '',
          bidding_deadline: '',
          category: '',
          contractor_id: '',
          assignee_name: '',
          required_contractors: 1,
          required_level: 'beginner'
        })
        setSelectedFavoriteMembers([])
        // 案件一覧を再読み込み
        await fetchProjects()
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

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    setIsSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: editingProject.title,
          description: editingProject.description,
          budget: editingProject.budget,
          start_date: editingProject.start_date,
          end_date: editingProject.end_date,
          category: editingProject.category,
          required_contractors: editingProject.required_contractors,
          required_level: editingProject.required_level,
          assignee_name: editingProject.assignee_name
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('案件が正常に更新されました')
        setEditingProject(null)
        await fetchProjects()
      } else {
        alert('案件の更新に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('案件更新エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSubmitting(false)
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
        await fetchProjects()
      } else {
        alert('案件の削除に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('案件削除エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  // ステータス変更機能
  const updateProjectStatus = async (projectId: string, newStatus: string) => {
    const statusLabels: { [key: string]: string } = {
      'bidding': '入札受付中',
      'in_progress': '進行中',
      'completed': '完了',
      'cancelled': 'キャンセル'
    }

    if (!confirm(`この案件のステータスを「${statusLabels[newStatus]}」に変更してもよろしいですか？`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const project = projects.find(p => p.id === projectId)
      if (!project) {
        alert('案件が見つかりません')
        return
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          budget: project.budget,
          start_date: project.start_date,
          end_date: project.end_date,
          category: project.category,
          required_contractors: project.required_contractors,
          status: newStatus,
          isStatusUpdate: true // ステータス更新フラグを追加
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(`案件のステータスが「${statusLabels[newStatus]}」に変更されました`)
        await fetchProjects()

        // ステータスが完了になった場合、請求書関連の処理を呼び出し
        if (newStatus === 'completed') {
          await createInvoiceForCompletedProject(projectId)
        }
      } else {
        alert('ステータスの変更に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('ステータス変更エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  // 完了案件の請求書作成
  const createInvoiceForCompletedProject = async (projectId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 請求書作成APIを呼び出し（後で実装）
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          type: 'completion'
        })
      })

      if (response.ok) {
      }
    } catch (error) {
      console.error('請求書作成エラー:', error)
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
        setAttachments(result.attachments || [])
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
        console.error('セッションがありません')
        alert('ログインが必要です')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      
      // タイムアウト処理を追加（5分）
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('リクエストタイムアウト（5分）')
        controller.abort()
      }, 5 * 60 * 1000)

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const result = await response.json()

      if (response.ok) {
        alert('ファイルが正常にアップロードされました')
        // 添付資料一覧を再読み込み
        await loadAttachments(projectId)
      } else {
        console.error('ファイルアップロードエラー:', result)
        let errorMessage = 'ファイルのアップロードに失敗しました'
        if (result.message) {
          errorMessage += ': ' + result.message
        }
        if (result.details) {
          errorMessage += '\n詳細: ' + result.details
        }
        if (result.duration) {
          errorMessage += `\n処理時間: ${result.duration}`
        }
        alert(errorMessage)
      }
    } catch (error) {
      console.error('=== フロントエンド: ファイルアップロードエラー ===', {
        error: error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
      
      if (error instanceof Error && error.name === 'AbortError') {
        alert('ファイルアップロードがタイムアウトしました（5分）')
      } else if (error instanceof Error && error.message.includes('fetch')) {
        alert('ネットワークエラーが発生しました。サーバーが起動しているか確認してください。')
      } else {
        alert('エラーが発生しました: ' + (error instanceof Error ? error.message : 'Unknown error'))
      }
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
          {/* 期限切れ案件の通知バナー */}
          {showExpiredNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">
                      入札期限切れ案件があります
                    </h3>
                    <p className="text-sm text-red-700">
                      {expiredProjectsCount}件の案件の入札期限が切れています。対応が必要です。
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpiredNotification(false)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

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
                  <Card className={`hover-lift cursor-pointer group ${
                    project.is_expired 
                      ? 'border-red-200 bg-red-50/50' 
                      : project.days_until_deadline !== null && project.days_until_deadline !== undefined && project.days_until_deadline <= 3 
                        ? 'border-orange-200 bg-orange-50/50' 
                        : ''
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 group-hover:text-engineering-blue transition-colors">
                            {project.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {project.contracts && project.contracts.length > 0 
                              ? `${project.contracts.length}名の受注者` 
                              : project.contractor_name || '未割当'
                            } • {project.category}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge className={getStatusColor(project.status)}>
                            {getStatusText(project.status)}
                          </Badge>
                          {project.is_expired && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              期限切れ
                            </Badge>
                          )}
                          {!project.is_expired && project.days_until_deadline !== null && project.days_until_deadline !== undefined && project.days_until_deadline <= 3 && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              期限間近
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* 案件詳細 */}
                      <div className="space-y-2 text-sm">
                        {project.bidding_deadline && (
                          <div className={`flex items-center gap-2 font-medium ${
                            project.is_expired 
                              ? 'text-red-600' 
                              : project.days_until_deadline !== null && project.days_until_deadline !== undefined && project.days_until_deadline <= 3 
                                ? 'text-orange-600' 
                                : 'text-gray-600'
                          }`}>
                            <Clock className="w-4 h-4" />
                            入札締切: {new Date(project.bidding_deadline).toLocaleDateString('ja-JP')}
                            {project.days_until_deadline !== null && project.days_until_deadline !== undefined && (
                              <span className="text-xs">
                                ({project.days_until_deadline > 0 ? `あと${project.days_until_deadline}日` : '期限切れ'})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <div className="flex flex-col">
                            {project.contracts && project.contracts.length > 0 ? (
                              <div className="space-y-1">
                                {project.contracts.map((contract, index) => (
                                  <div key={contract.contractor_id} className="flex items-center gap-2">
                                    <span className="text-green-600 font-semibold">
                                      ¥{contract.contract_amount.toLocaleString('ja-JP')} ({contract.contractor_name})
                                    </span>
                                  </div>
                                ))}
                                <span className="text-xs text-gray-500">
                                  合計: ¥{project.contracts.reduce((sum, contract) => sum + contract.contract_amount, 0).toLocaleString('ja-JP')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span>予算: {project.budget ? project.budget.toLocaleString('ja-JP') : '未設定'}円</span>
                                <span className="text-xs text-gray-400">
                                  契約データ: {project.contracts ? `${project.contracts.length}件` : 'なし'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          納期: {new Date(project.end_date).toLocaleDateString('ja-JP')}
                        </div>
                        {project.required_contractors && project.required_contractors > 1 && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <User className="w-4 h-4" />
                            募集人数: {project.required_contractors}名
                          </div>
                        )}
                        {project.required_level && (
                          <div className="flex items-center gap-2">
                            <Badge className={MEMBER_LEVELS[project.required_level].color}>
                              必要レベル: {MEMBER_LEVELS[project.required_level].label}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* 担当者・受注者情報 */}
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        {project.assignee_name && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-500">担当者</p>
                              <p className="text-sm font-medium text-gray-900">{project.assignee_name}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-engineering-blue/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-engineering-blue" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">受注者</p>
                            {project.contracts && project.contracts.length > 0 ? (
                              <div className="space-y-1">
                                {project.contracts.map((contract, index) => (
                                  <div key={contract.contractor_id} className="border-l-2 border-blue-200 pl-2">
                                    <p className="text-sm font-medium text-gray-900">
                                      {contract.contractor_name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      ¥{contract.contract_amount.toLocaleString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900">{project.contractor_name || '未割当'}</p>
                                <p className="text-xs text-gray-600">{project.contractor_email || ''}</p>
                              </>
                            )}
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
                          {/* ステータス変更ボタン */}
                          {project.status === 'bidding' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateProjectStatus(project.id, 'in_progress')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {project.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateProjectStatus(project.id, 'completed')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {(project.status === 'bidding' || project.status === 'in_progress') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateProjectStatus(project.id, 'cancelled')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <StopCircle className="w-4 h-4" />
                            </Button>
                          )}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          予算 * (円)
                        </label>
                        <input
                          type="text"
                          value={newProject.budget}
                          onChange={(e) => {
                            const formatted = formatBudget(e.target.value)
                            setNewProject({ ...newProject, budget: formatted })
                          }}
                          placeholder="例: 10,000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          募集人数 *
                        </label>
                        <select
                          value={newProject.required_contractors}
                          onChange={(e) => setNewProject({ ...newProject, required_contractors: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num}名</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        必要な会員レベル *
                      </label>
                      <select
                        value={newProject.required_level}
                        onChange={(e) => setNewProject({ ...newProject, required_level: e.target.value as MemberLevel })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        required
                      >
                        {Object.values(MEMBER_LEVELS).map(level => (
                          <option key={level.level} value={level.level}>
                            {level.label} - {level.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          入札締切日 *
                        </label>
                        <input
                          type="date"
                          value={newProject.bidding_deadline}
                          onChange={(e) => setNewProject({ ...newProject, bidding_deadline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        担当者名
                      </label>
                      <input
                        type="text"
                        value={newProject.assignee_name}
                        onChange={(e) => setNewProject({ ...newProject, assignee_name: e.target.value })}
                        placeholder="例: 田中太郎"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      />
                      <p className="text-sm text-gray-600 mt-1">案件の社内担当者を指定できます（任意）</p>
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
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip,.rar,.dwg,.p21,.sfc,.bfo"
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
                      対応形式: PDF, Word, Excel, PowerPoint, 画像, ZIP, RAR, DWG, P21, SFC, BFO (最大200MB)
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

      {/* 編集モーダル */}
      <AnimatePresence>
        {editingProject && (
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
                    <Edit className="w-5 h-5 text-engineering-blue" />
                    案件編集
                  </CardTitle>
                  <CardDescription>
                    案件の詳細を編集してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEditProject} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          案件名 *
                        </label>
                        <input
                          type="text"
                          value={editingProject.title}
                          onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          カテゴリ *
                        </label>
                        <select
                          value={editingProject.category}
                          onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
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
                        value={editingProject.description}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
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
                          value={editingProject.budget}
                          onChange={(e) => setEditingProject({ ...editingProject, budget: Number(e.target.value) })}
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
                          value={editingProject.start_date}
                          onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
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
                          value={editingProject.end_date}
                          onChange={(e) => setEditingProject({ ...editingProject, end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          募集人数 *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editingProject.required_contractors || 1}
                          onChange={(e) => setEditingProject({ ...editingProject, required_contractors: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                        <p className="text-sm text-gray-600 mt-1">この案件に必要な受注者の人数</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          担当者名
                        </label>
                        <input
                          type="text"
                          value={editingProject.assignee_name || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, assignee_name: e.target.value })}
                          placeholder="例: 田中太郎"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        />
                        <p className="text-sm text-gray-600 mt-1">案件の社内担当者を指定できます（任意）</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        必要な会員レベル *
                      </label>
                      <select
                        value={editingProject.required_level || 'beginner'}
                        onChange={(e) => setEditingProject({ ...editingProject, required_level: e.target.value as MemberLevel })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        required
                      >
                        {Object.values(MEMBER_LEVELS).map(level => (
                          <option key={level.level} value={level.level}>
                            {level.label} - {level.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingProject(null)}
                        disabled={isSubmitting}
                      >
                        キャンセル
                      </Button>
                      <Button
                        type="submit"
                        variant="engineering"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? '更新中...' : '更新'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* 案件詳細モーダル */}
        {showProjectDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProjectDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const project = projects.find(p => p.id === showProjectDetail)
                if (!project) return null

                return (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {project.title}
                          </h2>
                          <p className="text-gray-600 mb-4">
                            {project.contracts && project.contracts.length > 0 
                              ? `${project.contracts.length}名の受注者` 
                              : project.contractor_name || '未割当'
                            } • {project.category}
                          </p>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusText(project.status)}
                            </Badge>
                            {project.is_expired && (
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                期限切れ
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowProjectDetail(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* 案件詳細 */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">案件詳細</h3>
                        <div className="space-y-3">
                          {project.contracts && project.contracts.length > 0 ? (
                            <div className="space-y-2">
                              {project.contracts.map((contract, index) => (
                                <div key={contract.contractor_id} className="flex justify-between">
                                  <span className="text-gray-600">契約金額 ({contract.contractor_name}):</span>
                                  <span className="font-medium text-green-600">
                                    ¥{contract.contract_amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between border-t border-gray-200 pt-2">
                                <span className="text-gray-600 font-semibold">契約金額合計:</span>
                                <span className="font-semibold text-green-600">
                                  ¥{project.contracts.reduce((sum, contract) => sum + contract.contract_amount, 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-gray-600">予算:</span>
                              <span className="font-medium text-engineering-blue">
                                ¥{project.budget?.toLocaleString() || '未設定'}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">入札締切:</span>
                            <span className="font-medium">
                              {new Date(project.bidding_deadline).toLocaleDateString('ja-JP')}
                              {project.days_until_deadline !== null && project.days_until_deadline !== undefined && (
                                <span className="text-sm text-gray-500 ml-2">
                                  ({project.days_until_deadline > 0 ? `あと${project.days_until_deadline}日` : '期限切れ'})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">納期:</span>
                            <span className="font-medium">
                              {new Date(project.end_date).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          {project.required_contractors && project.required_contractors > 1 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">募集人数:</span>
                              <span className="font-medium">{project.required_contractors}名</span>
                            </div>
                          )}
                          {project.required_level && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">必要レベル:</span>
                              <Badge className={MEMBER_LEVELS[project.required_level].color}>
                                {MEMBER_LEVELS[project.required_level].label}
                              </Badge>
                            </div>
                          )}
                          {project.location && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">場所:</span>
                              <span className="font-medium">{project.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 案件説明 */}
                      {project.description && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">案件説明</h3>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
                          </div>
                        </div>
                      )}

                      {/* 要件 */}
                      {project.requirements && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">要件</h3>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-700 whitespace-pre-wrap">{project.requirements}</p>
                          </div>
                        </div>
                      )}

                      {/* 受注者情報 */}
                      {project.contracts && project.contracts.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">受注者情報</h3>
                          <div className="space-y-3">
                            {project.contracts.map((contract, index) => (
                              <div key={contract.contractor_id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 bg-engineering-blue/10 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-engineering-blue" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{contract.contractor_name}</p>
                                    <p className="text-sm text-gray-600">{contract.contractor_email}</p>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">契約金額:</span>
                                  <span className="font-medium text-green-600">
                                    ¥{contract.contract_amount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 担当者情報 */}
                      {project.assignee_name && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">担当者情報</h3>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{project.assignee_name}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 案件ID */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">案件ID:</span>
                          <span className="font-mono text-sm text-gray-500">
                            {project.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowProjectDetail(null)}
                      >
                        閉じる
                      </Button>
                      <Button
                        variant="engineering"
                        onClick={() => {
                          setShowProjectDetail(null)
                          editProject(project.id)
                        }}
                      >
                        編集
                      </Button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <AuthGuard requiredRole="OrgAdmin">
      <ProjectsPageContent />
    </AuthGuard>
  )
}