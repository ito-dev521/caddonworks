"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building,
  Plus,
  Search,
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
  StopCircle,
  Settings,
  XCircle
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { authenticatedFetch } from "@/lib/api-client"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MEMBER_LEVELS, type MemberLevel } from "@/lib/member-level"
import { FavoriteMemberSelector } from "@/components/projects/favorite-member-selector"

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
  completed_at?: string | null
  assignee_name?: string
  bidding_deadline?: string
  required_contractors?: number
  required_level?: MemberLevel
  is_expired?: boolean
  days_until_deadline?: number | null
  support_enabled?: boolean
  has_active_priority_invitation?: boolean
  has_priority_invitation?: boolean
  priority_invitations?: Array<{
    contractor_id: string
    contractor_name: string
    response: string
    expires_at: string
    is_expired: boolean
  }>
  contracts?: Array<{
    contractor_id: string
    contract_amount: number
    contractor_name: string
    contractor_email: string
    support_enabled?: boolean
  }>
}

function ProjectsPageContent() {
  const { userProfile, userRole, loading } = useAuth()
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectData[]>([])
  const [selectedTab, setSelectedTab] = useState<'active' | 'completed' | 'pending_approval' | 'all'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
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
    required_level: 'beginner' as MemberLevel,
    approver_ids: [] as string[],
    support_enabled: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [supportPercent, setSupportPercent] = useState<number>(8)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings/public')
        const data = await res.json()
        if (res.ok && typeof data.support_fee_percent === 'number') {
          setSupportPercent(data.support_fee_percent)
        }
      } catch (_) {}
    }
    load()
  }, [])
  const [showProjectDetail, setShowProjectDetail] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null)
  const [showAttachmentsModal, setShowAttachmentsModal] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [showExpiredNotification, setShowExpiredNotification] = useState(false)
  const [expiredProjectsCount, setExpiredProjectsCount] = useState(0)
  const [favoriteMembers, setFavoriteMembers] = useState<any[]>([])
  const [selectedFavoriteContractorId, setSelectedFavoriteContractorId] = useState<string | null>(null)
  const [showFavoriteMembersModal, setShowFavoriteMembersModal] = useState(false)
  const [orgAdmins, setOrgAdmins] = useState<any[]>([])
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [organizationUsers, setOrganizationUsers] = useState<any[]>([])
  const [showReopenModal, setShowReopenModal] = useState<string | null>(null)
  const [reopenProject, setReopenProject] = useState<ProjectData | null>(null)
  const [reopenData, setReopenData] = useState({
    new_bidding_deadline: '',
    new_budget: '',
    new_start_date: '',
    new_end_date: '',
    new_required_contractors: 1,
    new_required_level: 'beginner' as MemberLevel
  })
  const [isReopening, setIsReopening] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [isSuspending, setIsSuspending] = useState(false)
  const [showProjectActionsModal, setShowProjectActionsModal] = useState<string | null>(null)
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

  // 組織設定とOrgAdmin一覧を取得
  const fetchOrganizationSettings = useCallback(async () => {
    if (!userProfile || (userRole !== 'OrgAdmin' && userRole !== 'Staff')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 組織設定を取得
      const settingsResponse = await fetch('/api/settings/organization', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setApprovalRequired(settingsData.organization.approval_required || false)
      }

      // OrgAdmin一覧を取得
      const adminsResponse = await fetch('/api/settings/orgadmins', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (adminsResponse.ok) {
        const adminsData = await adminsResponse.json()
        setOrgAdmins(adminsData.orgAdmins || [])
      }
    } catch (error) {
      console.error('組織設定取得エラー:', error)
    }
  }, [userProfile, userRole])

  // 組織内ユーザーを取得する関数
  const fetchOrganizationUsers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/settings/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setOrganizationUsers(data.users || [])
      }
    } catch (error) {
      console.error('組織ユーザー取得エラー:', error)
    }
  }, [])

  // 案件データを取得する関数
  const fetchProjects = useCallback(async () => {
    try {
      setDataLoading(true)

      // セッション取得とバリデーション
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('セッション取得エラー:', sessionError)
        setDataLoading(false)
        return
      }

      if (!session || !session.user) {
        console.error('セッションまたはユーザーが見つかりません')
        setDataLoading(false)
        return
      }

      if (!session.access_token) {
        console.error('アクセストークンが見つかりません')
        setDataLoading(false)
        return
      }

      // トークンの基本的な形式チェック
      const tokenParts = session.access_token.split('.')
      if (tokenParts.length !== 3) {
        console.error('JWT トークン形式エラー:', tokenParts.length, '個の部分')
        console.error('再ログインが必要です')
        setDataLoading(false)
        return
      }

      console.log('API呼び出し実行中 - ユーザー:', session.user.email)

      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        const projectsData = result.projects || []
        console.log('取得した案件とステータス:', projectsData.map((p: any) => ({ title: p.title, status: p.status })))
        const now = Date.now()
        const visibleProjects = projectsData.filter((p: ProjectData) => {
          if (p.status !== 'completed') return true
          if (!p.completed_at) return true
          const completedAt = new Date(p.completed_at).getTime()
          const diffDays = (now - completedAt) / (1000 * 60 * 60 * 24)
          return diffDays <= 14
        })
        setProjects(visibleProjects)
        setFilteredProjects(visibleProjects)

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
    if (!userProfile || (userRole !== 'OrgAdmin' && userRole !== 'Staff')) {
      setDataLoading(false)
      return
    }

    // 同一ユーザー・ロールの組み合わせでは1回のみフェッチ（開発時のStrictMode重複実行対策）
    const fetchKey = `${userProfile.id}:${userRole}`
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey

    // 重要なデータを優先的に読み込み
    fetchProjects().then(() => {
      // プロジェクトデータ読み込み後、他のデータを並列で読み込み
      Promise.all([
        fetchFavoriteMembers(),
        fetchOrganizationSettings(),
        fetchOrganizationUsers()
      ]).catch(error => {
        console.error('追加データ読み込みエラー:', error)
      })
    })
  }, [userProfile, userRole, fetchProjects, fetchFavoriteMembers, fetchOrganizationSettings, fetchOrganizationUsers])

  // URLパラメータからタブを読み取る
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['active', 'completed', 'pending_approval', 'all'].includes(tab)) {
      setSelectedTab(tab as 'active' | 'completed' | 'pending_approval' | 'all')
    }
  }, [searchParams])

  // フィルタリング
  useEffect(() => {
    let filtered = projects
    console.log('フィルタリング実行:', {
      selectedTab,
      totalProjects: projects.length,
      projectStatuses: projects.map((p: any) => ({ title: p.title, status: p.status }))
    })

    // ステータスフィルタ
    if (selectedTab === 'active') {
      filtered = filtered.filter(p => p.status === 'in_progress' || p.status === 'bidding' || p.status === 'priority_invitation')
    } else if (selectedTab === 'completed') {
      filtered = filtered.filter(p => p.status === 'completed' || p.status === 'suspended')
    } else if (selectedTab === 'pending_approval') {
      filtered = filtered.filter(p => p.status === 'pending_approval')
      console.log('承認待ちフィルタ結果:', filtered.length, filtered.map((p: any) => ({ title: p.title, status: p.status })))
    }

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(p => {
        const searchLower = searchTerm.toLowerCase()
        
        // 基本的な検索対象
        const basicMatch = 
          p.title.toLowerCase().includes(searchLower) ||
          p.contractor_name.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower) ||
          (p.assignee_name && p.assignee_name.toLowerCase().includes(searchLower))
        
        // 複数受注者の名前も検索対象に含める
        const contractorMatch = p.contracts?.some(contract => 
          contract.contractor_name.toLowerCase().includes(searchLower) ||
          contract.contractor_email.toLowerCase().includes(searchLower)
        ) || false
        
        return basicMatch || contractorMatch
      })
    }

    const now = Date.now()
    const visibleFiltered = filtered.filter(p => {
      if (p.status !== 'completed') return true
      if (!p.completed_at) return true
      const completedAt = new Date(p.completed_at).getTime()
      const diffDays = (now - completedAt) / (1000 * 60 * 60 * 24)
      return diffDays <= 14
    })

    setFilteredProjects(visibleFiltered)
  }, [projects, selectedTab, searchTerm])

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 承認が必要な場合のバリデーション
      if (approvalRequired && newProject.approver_ids.length === 0) {
        alert('承認が必要な組織では少なくとも1人の承認者を選択してください')
        setIsSubmitting(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !session.access_token) {
        alert('ログインが必要です')
        setIsSubmitting(false)
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
          budget: parseBudget(newProject.budget),
          selected_favorite_contractor_id: selectedFavoriteContractorId
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(result.message || '案件が正常に作成されました')

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
          required_level: 'beginner',
          approver_ids: [] as string[],
          support_enabled: false
        })
        setSelectedFavoriteContractorId(null)
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

  const deleteProject = async (projectId: string, deleteType: 'manual' | 'auto_archive' = 'manual') => {
    const confirmMessage = deleteType === 'manual'
      ? 'この案件を削除してもよろしいですか？（関連するBoxフォルダも削除されます）'
      : 'この案件を削除してもよろしいですか？'

    if (!confirm(confirmMessage)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const deleteUrl = `/api/projects/${projectId}?deleteType=${deleteType}`
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        const message = result.box_folder_preserved
          ? '案件が削除されました（Boxフォルダは保持されています）'
          : '案件が削除されました'
        alert(message)
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
      'suspended': '中止'
    }

    // 中止の場合は理由入力モーダルを開く
    if (newStatus === 'suspended') {
      openSuspendModal(projectId)
      return
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

        // ステータスが完了になっても自動発行はしない（手動ボタンで実行）
      } else {
        alert('ステータスの変更に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('ステータス変更エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  // 案件承認処理
  const handleProjectApproval = async (projectId: string, action: 'approve' | 'reject', comment?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/projects/${projectId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action,
          comment
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert(result.message)
        // 案件一覧を再読み込み
        await fetchProjects()
        
        // 承認処理後に適切なタブに移動
        if (action === 'approve') {
          // 承認された場合は「進行中」タブに移動
          setSelectedTab('active')
        } else if (action === 'reject') {
          // 却下された場合は「完了済み」タブに移動
          setSelectedTab('completed')
        }
      } else {
        alert('承認処理に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('承認処理エラー:', error)
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
    console.log('📤 uploadFile called with projectId:', projectId)
    console.log('📤 projectId length:', projectId.length)
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

      const encodedProjectId = encodeURIComponent(projectId)
      const requestUrl = `/api/projects/${encodedProjectId}/attachments`
      console.log('📤 Original projectId:', projectId)
      console.log('📤 Encoded projectId:', encodedProjectId)
      console.log('📤 Sending request to:', requestUrl)
      const response = await fetch(requestUrl, {
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
    console.log('🔍 openAttachmentsModal called with projectId:', projectId)
    console.log('🔍 projectId length:', projectId.length)
    setShowAttachmentsModal(projectId)
    loadAttachments(projectId)
  }

  // 期限切れ案件の再登録機能
  const openReopenModal = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setReopenProject(project)
      setReopenData({
        new_bidding_deadline: '',
        new_budget: project.budget?.toString() || '',
        new_start_date: project.start_date,
        new_end_date: project.end_date,
        new_required_contractors: project.required_contractors || 1,
        new_required_level: project.required_level || 'beginner'
      })
      setShowReopenModal(projectId)
    }
  }

  const handleReopenProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reopenProject) return

    setIsReopening(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/projects/${reopenProject.id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          new_bidding_deadline: reopenData.new_bidding_deadline,
          new_budget: parseBudget(reopenData.new_budget),
          new_start_date: reopenData.new_start_date,
          new_end_date: reopenData.new_end_date,
          new_required_contractors: reopenData.new_required_contractors,
          new_required_level: reopenData.new_required_level
        })
      })

      // レスポンスのContent-Typeをチェック
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('APIレスポンスがJSONではありません:', text)
        alert('サーバーエラーが発生しました。APIが正しく応答していません。')
        return
      }

      const result = await response.json()

      if (response.ok) {
        alert('案件を再登録しました。新しい入札を受け付けることができます。')
        setShowReopenModal(null)
        setReopenProject(null)
        await fetchProjects()
      } else {
        alert('案件の再登録に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('案件再登録エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsReopening(false)
    }
  }

  // 案件中止機能
  const openSuspendModal = (projectId: string) => {
    setShowSuspendModal(projectId)
    setSuspendReason('')
  }

  const handleSuspendProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showSuspendModal || !suspendReason.trim()) {
      alert('中止理由を入力してください')
      return
    }

    setIsSuspending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/projects/${showSuspendModal}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          reason: suspendReason
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('案件を中止しました。関係者に通知が送信されます。')
        setShowSuspendModal(null)
        setSuspendReason('')
        await fetchProjects()
      } else {
        alert('案件の中止に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('案件中止エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSuspending(false)
    }
  }

  // プロジェクトアクションモーダル
  const openProjectActionsModal = (projectId: string) => {
    setShowProjectActionsModal(projectId)
  }

  const handleProjectAction = async (action: string, projectId: string) => {
    setShowProjectActionsModal(null)
    
    switch (action) {
      case 'start':
        await updateProjectStatus(projectId, 'in_progress')
        break
      case 'complete':
        await updateProjectStatus(projectId, 'completed')
        break
      case 'suspend':
        openSuspendModal(projectId)
        break
      case 'delete':
        await deleteProject(projectId)
        break
      default:
        break
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bidding':
        return 'text-blue-600 bg-blue-100'
      case 'priority_invitation':
        return 'text-orange-700 bg-orange-100'
      case 'in_progress':
        return 'text-green-600 bg-green-100'
      case 'completed':
        return 'text-gray-600 bg-gray-100'
      case 'suspended':
        return 'text-red-600 bg-red-100'
      case 'pending_approval':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'bidding':
        return '入札中'
      case 'priority_invitation':
        return '優先招待中'
      case 'in_progress':
        return '進行中'
      case 'completed':
        return '完了'
      case 'suspended':
        return '中止'
      case 'pending_approval':
        return '承認待ち'
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

  // 権限チェック（発注者のみ許可）
  if (userRole !== 'OrgAdmin' && userRole !== 'Staff') {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Building className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
            <p className="text-gray-600">このページは発注者（組織管理者/スタッフ）のみアクセス可能です。</p>
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
                  { id: 'active', label: '進行中', count: projects.filter(p => p.status === 'in_progress' || p.status === 'bidding' || p.status === 'priority_invitation').length },
                  { id: 'completed', label: '完了済み', count: projects.filter(p => p.status === 'completed' || p.status === 'suspended').length },
                  { id: 'pending_approval', label: '承認待ち', count: projects.filter(p => p.status === 'pending_approval').length },
                  { id: 'all', label: 'すべて', count: projects.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedTab === tab.id
                        ? tab.id === 'pending_approval' 
                          ? 'bg-orange-100 text-orange-700 shadow-sm'
                          : 'bg-white text-engineering-blue shadow-sm'
                        : tab.id === 'pending_approval'
                          ? 'text-orange-600 hover:text-orange-800'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                    <Badge 
                      variant={tab.id === 'pending_approval' ? 'approval' : 'outline'} 
                      className="text-xs"
                    >
                      {tab.count}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* 検索 */}
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
            </div>
          </div>

          {/* 案件カード一覧 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProjects.map((project, index) => {
                const requiredContractors = project.required_contractors && project.required_contractors > 0
                  ? project.required_contractors
                  : 1
                const confirmedContractCount = project.contracts?.length ?? 0
                const showBiddingInfo = confirmedContractCount < requiredContractors
                const cardStatusClass = showBiddingInfo
                  ? project.is_expired
                    ? 'border-red-200 bg-red-50/50'
                    : project.days_until_deadline !== null && project.days_until_deadline !== undefined && project.days_until_deadline <= 3
                      ? 'border-orange-200 bg-orange-50/50'
                      : ''
                  : ''

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`hover-lift cursor-pointer group ${cardStatusClass}`} onClick={() => openProjectActionsModal(project.id)}>
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
                          {project.status === 'pending_approval' ? (
                            <Badge variant="approval">
                              {getStatusText(project.status)}
                            </Badge>
                          ) : (
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusText(project.status)}
                            </Badge>
                          )}
                          {showBiddingInfo && project.is_expired && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              期限切れ
                            </Badge>
                          )}
                          {showBiddingInfo && !project.is_expired && project.days_until_deadline !== null && project.days_until_deadline !== undefined && project.days_until_deadline <= 3 && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              期限間近
                            </Badge>
                          )}
                          {project.support_enabled && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              発注者サポート利用
                            </Badge>
                          )}
                          {project.contracts && project.contracts.some(contract => contract.support_enabled) && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              受注者サポート利用
                            </Badge>
                          )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* 案件詳細 */}
                        <div className="space-y-2 text-sm">
                        {showBiddingInfo && project.bidding_deadline && (
                          <div className={`flex items-center gap-2 font-medium ${
                            project.is_expired 
                              ? 'text-red-600' 
                              : project.days_until_deadline !== null && project.days_until_deadline !== undefined && project.days_until_deadline <= 3 
                                ? 'text-orange-600' 
                                : 'text-gray-600'
                          }`}>
                            <Clock className="w-4 h-4" />
                            入札締切: {project.bidding_deadline ? new Date(project.bidding_deadline).toLocaleDateString('ja-JP') : '未設定'}
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
                          納期: {project.end_date ? new Date(project.end_date).toLocaleDateString('ja-JP') : '未設定'}
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
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium text-gray-900">
                                        {contract.contractor_name}
                                      </p>
                                      <Badge variant="contractor" className="text-xs">
                                        受注者
                                      </Badge>
                                    </div>
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

                      {/* 承認待ち案件の承認ボタン */}
                      {project.status === 'pending_approval' && (
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleProjectApproval(project.id, 'approve')
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              承認
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                const comment = prompt('却下理由を入力してください（任意）:')
                                if (comment !== null) {
                                  handleProjectApproval(project.id, 'reject', comment)
                                }
                              }}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              却下
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* アクションボタン */}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 font-mono">
                          案件ID: {project.id}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openProjectDetail(project.id)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              editProject(project.id)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('📎 Attachment button clicked for project:', project.id)
                              console.log('📎 Project ID length:', project.id.length)
                              openAttachmentsModal(project.id)
                            }}
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          {/* 期限切れ案件の再登録ボタン */}
                          {project.is_expired && project.status === 'bidding' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openReopenModal(project.id)
                              }}
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              再登録
                            </Button>
                          )}
                        </div>
                      </div>
                      </CardContent>
                    </Card>
                </motion.div>
              )})}
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
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">サポート利用</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newProject.support_enabled}
                            onChange={(e) => setNewProject({ ...newProject, support_enabled: e.target.checked })}
                          />
                          <span className="text-sm text-gray-600">有効にすると運営サポートがチャットに参加します（手数料は契約金の{supportPercent}%）</span>
                        </div>
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

                    {/* お気に入り会員の中から1人を選択（任意） */}
                    <div className="md:col-span-2">
                      <FavoriteMemberSelector
                        selectedContractorId={selectedFavoriteContractorId}
                        onSelectionChange={(id) => setSelectedFavoriteContractorId(id)}
                        onSkip={() => setSelectedFavoriteContractorId(null)}
                        requiredLevel={newProject.required_level}
                      />
                    </div>

                    {/* 承認者選択（承認機能が有効な場合のみ表示） */}
                    {approvalRequired && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          承認者 *
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                          {orgAdmins.map(admin => (
                            <label key={admin.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newProject.approver_ids.includes(admin.id)}
                                onChange={(e) => {
                                  const updatedApprovers = e.target.checked
                                    ? [...newProject.approver_ids, admin.id]
                                    : newProject.approver_ids.filter(id => id !== admin.id)
                                  setNewProject({ ...newProject, approver_ids: updatedApprovers })
                                }}
                                className="w-4 h-4 text-engineering-blue bg-gray-100 border-gray-300 rounded focus:ring-engineering-blue focus:ring-2"
                              />
                              <span className="text-sm text-gray-700">
                                {admin.display_name} ({admin.email})
                              </span>
                            </label>
                          ))}
                          {orgAdmins.length === 0 && (
                            <p className="text-sm text-gray-500">利用可能な承認者がいません</p>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          選択した承認者に案件承認の通知が送信されます（複数選択可能）
                        </p>
                        {newProject.approver_ids.length === 0 && (
                          <p className="text-sm text-red-500 mt-1">
                            少なくとも1人の承認者を選択してください
                          </p>
                        )}
                      </div>
                    )}

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
                      <select
                        value={newProject.assignee_name}
                        onChange={(e) => setNewProject({ ...newProject, assignee_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      >
                        <option value="">担当者を選択してください（任意）</option>
                        {organizationUsers.map(user => (
                          <option key={user.id} value={user.display_name}>
                            {user.display_name} ({user.email})
                          </option>
                        ))}
                      </select>
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
                    {editingProject.status === 'pending_approval' ? (
                      // 承認待ちの場合は全項目編集可能
                      <>
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
                      </>
                    ) : (
                      // 承認済み・入札中・進行中の場合は納期のみ編集可能
                      <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-blue-800 text-sm">
                            <strong>注意:</strong> 案件が既に入札中または進行中のため、納期のみ変更可能です。
                            その他の変更が必要な場合は、新しい案件として作成することをお勧めします。
                          </p>
                        </div>

                        {/* 読み取り専用項目 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              案件名
                            </label>
                            <input
                              type="text"
                              value={editingProject.title}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                              disabled
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              カテゴリ
                            </label>
                            <input
                              type="text"
                              value={editingProject.category}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                              disabled
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            案件説明
                          </label>
                          <textarea
                            value={editingProject.description}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                            disabled
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              予算
                            </label>
                            <input
                              type="text"
                              value={`¥${editingProject.budget.toLocaleString()}`}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                              disabled
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              開始日
                            </label>
                            <input
                              type="date"
                              value={editingProject.start_date}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                              disabled
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
                            <p className="text-sm text-orange-600 mt-1">
                              納期の変更は関係者に通知されます
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {editingProject.status === 'pending_approval' ? (
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
                          <select
                            value={editingProject.assignee_name || ''}
                            onChange={(e) => setEditingProject({ ...editingProject, assignee_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          >
                            <option value="">担当者を選択してください（任意）</option>
                            {organizationUsers.map(user => (
                              <option key={user.id} value={user.display_name}>
                                {user.display_name} ({user.email})
                              </option>
                            ))}
                          </select>
                          <p className="text-sm text-gray-600 mt-1">案件の社内担当者を指定できます（任意）</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            募集人数
                          </label>
                          <input
                            type="text"
                            value={`${editingProject.required_contractors || 1}名`}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            担当者名
                          </label>
                          <input
                            type="text"
                            value={editingProject.assignee_name || '未設定'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                            disabled
                          />
                        </div>
                      </div>
                    )}

                    {editingProject.status === 'pending_approval' ? (
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
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          必要な会員レベル
                        </label>
                        <input
                          type="text"
                          value={MEMBER_LEVELS[editingProject.required_level as MemberLevel]?.label || '初級'}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                          disabled
                        />
                      </div>
                    )}

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
                            {project.status === 'pending_approval' ? (
                              <Badge variant="approval">
                                {getStatusText(project.status)}
                              </Badge>
                            ) : (
                              <Badge className={getStatusColor(project.status)}>
                                {getStatusText(project.status)}
                              </Badge>
                            )}
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
                            (() => {
                              const requiredContractors = project.required_contractors && project.required_contractors > 0
                                ? project.required_contractors
                                : 1
                              const showBiddingInfo = project.contracts.length < requiredContractors

                              return (
                                <>
                                  <div className="space-y-2">
                                    {project.contracts.map((contract) => (
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
                                  {showBiddingInfo && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">入札締切:</span>
                                      <span className="font-medium">
                                        {project.bidding_deadline ? new Date(project.bidding_deadline).toLocaleDateString('ja-JP') : '未設定'}
                                        {project.days_until_deadline !== null && project.days_until_deadline !== undefined && (
                                          <span className="text-sm text-gray-500 ml-2">
                                            ({project.days_until_deadline > 0 ? `あと${project.days_until_deadline}日` : '期限切れ'})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )
                            })()
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">予算:</span>
                                <span className="font-medium text-engineering-blue">
                                  ¥{project.budget?.toLocaleString() || '未設定'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">入札締切:</span>
                                <span className="font-medium">
                                  {project.bidding_deadline ? new Date(project.bidding_deadline).toLocaleDateString('ja-JP') : '未設定'}
                                  {project.days_until_deadline !== null && project.days_until_deadline !== undefined && (
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({project.days_until_deadline > 0 ? `あと${project.days_until_deadline}日` : '期限切れ'})
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">納期:</span>
                            <span className="font-medium">
                              {project.end_date ? new Date(project.end_date).toLocaleDateString('ja-JP') : '未設定'}
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
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-gray-900">{contract.contractor_name}</p>
                                      <Badge variant="contractor" className="text-xs">
                                        受注者
                                      </Badge>
                                    </div>
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
                          <span className="font-mono text-xs text-gray-500 break-all">{project.id}</span>
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

        {/* 再登録モーダル */}
        {showReopenModal && reopenProject && (
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
                    <Clock className="w-5 h-5 text-orange-600" />
                    期限切れ案件の再登録
                  </CardTitle>
                  <CardDescription>
                    「{reopenProject.title}」の入札期限と金額を変更して再登録します
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleReopenProject} className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">現在の情報</span>
                      </div>
                      <div className="text-sm text-orange-700 space-y-1">
                        <p>入札締切: {reopenProject.bidding_deadline ? new Date(reopenProject.bidding_deadline).toLocaleDateString('ja-JP') : '未設定'} (期限切れ)</p>
                        <p>予算: ¥{reopenProject.budget?.toLocaleString('ja-JP') || '未設定'}</p>
                        <p>納期: {reopenProject.end_date ? new Date(reopenProject.end_date).toLocaleDateString('ja-JP') : '未設定'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          新しい入札締切日 *
                        </label>
                        <input
                          type="date"
                          value={reopenData.new_bidding_deadline}
                          onChange={(e) => setReopenData({ ...reopenData, new_bidding_deadline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          新しい予算 * (円)
                        </label>
                        <input
                          type="text"
                          value={reopenData.new_budget}
                          onChange={(e) => {
                            const formatted = formatBudget(e.target.value)
                            setReopenData({ ...reopenData, new_budget: formatted })
                          }}
                          placeholder="例: 100,000"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          新しい開始日 *
                        </label>
                        <input
                          type="date"
                          value={reopenData.new_start_date}
                          onChange={(e) => setReopenData({ ...reopenData, new_start_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          新しい納期 *
                        </label>
                        <input
                          type="date"
                          value={reopenData.new_end_date}
                          onChange={(e) => setReopenData({ ...reopenData, new_end_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          募集人数 *
                        </label>
                        <select
                          value={reopenData.new_required_contractors}
                          onChange={(e) => setReopenData({ ...reopenData, new_required_contractors: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num}名</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          必要な会員レベル *
                        </label>
                        <select
                          value={reopenData.new_required_level}
                          onChange={(e) => setReopenData({ ...reopenData, new_required_level: e.target.value as MemberLevel })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        >
                          {Object.values(MEMBER_LEVELS).map(level => (
                            <option key={level.level} value={level.level}>
                              {level.label} - {level.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">注意事項</span>
                      </div>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• 再登録後、既存の入札データと契約データは削除されます</li>
                        <li>• 案件は「入札受付中」の状態に戻ります</li>
                        <li>• 新しい入札締切日は今日以降の日付を設定してください</li>
                      </ul>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowReopenModal(null)}
                        disabled={isReopening}
                      >
                        キャンセル
                      </Button>
                      <Button 
                        type="submit" 
                        variant="outline"
                        className="bg-orange-600 text-white border-orange-600 hover:bg-orange-700"
                        disabled={isReopening}
                      >
                        {isReopening ? '再登録中...' : '案件を再登録'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* 中止理由入力モーダル */}
        {showSuspendModal && (
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
              className="bg-white rounded-lg w-full max-w-md"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StopCircle className="w-5 h-5 text-red-600" />
                    案件の中止
                  </CardTitle>
                  <CardDescription>
                    案件を中止する理由を入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSuspendProject} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        中止理由 *
                      </label>
                      <textarea
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="例: 予算の都合により案件を中止します"
                        required
                      />
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <StopCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">注意事項</span>
                      </div>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• 案件を中止すると、入札者と受注者に通知が送信されます</li>
                        <li>• 中止された案件は「完了済み」タブに表示されます</li>
                        <li>• この操作は取り消すことができません</li>
                      </ul>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowSuspendModal(null)}
                        disabled={isSuspending}
                      >
                        キャンセル
                      </Button>
                      <Button 
                        type="submit" 
                        variant="outline"
                        className="bg-red-600 text-white border-red-600 hover:bg-red-700"
                        disabled={isSuspending}
                      >
                        {isSuspending ? '中止中...' : '案件を中止'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* プロジェクトアクションモーダル */}
        {showProjectActionsModal && (
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
              className="bg-white rounded-lg w-full max-w-md"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-engineering-blue" />
                    案件の操作
                  </CardTitle>
                  <CardDescription>
                    案件に対して実行したい操作を選択してください
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const project = projects.find(p => p.id === showProjectActionsModal)
                      if (!project) return null

                      return (
                        <>
                          {/* ステータス変更オプション */}
                          {project.status === 'bidding' && (
                            <Button
                              variant="outline"
                              className="w-full justify-start text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleProjectAction('start', project.id)}
                            >
                              <PlayCircle className="w-4 h-4 mr-2" />
                              案件を開始する
                            </Button>
                          )}
                          
                          {project.status === 'in_progress' && (
                            <Button
                              variant="outline"
                              className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleProjectAction('complete', project.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              案件を完了する
                            </Button>
                          )}

                          {(project.status === 'bidding' || project.status === 'in_progress') && (
                            <Button
                              variant="outline"
                              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleProjectAction('suspend', project.id)}
                            >
                              <StopCircle className="w-4 h-4 mr-2" />
                              案件を中止する
                            </Button>
                          )}

                          {/* 案件削除オプション */}
                          <Button
                            variant="outline"
                            className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleProjectAction('delete', project.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            案件を削除する
                          </Button>
                        </>
                      )
                    })()}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowProjectActionsModal(null)}
                    >
                      キャンセル
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <AuthGuard allowedRoles={["OrgAdmin", "Staff"]}>
      <ProjectsPageContent />
    </AuthGuard>
  )
}