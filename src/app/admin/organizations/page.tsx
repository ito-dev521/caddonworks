"use client"

import React, { useEffect, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { motion } from "framer-motion"
import { Building2, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Folder, Play, Pause, Trash2, Eye } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface Org {
  id: string
  name: string
  active: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
  system_fee?: number
  created_at: string
  approved_at?: string
  rejection_reason?: string
  billing_email?: string
  box_folder_id?: string
}

function AdminOrganizationsPageContent() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/organizations")
        if (res.ok) {
          const json = await res.json()
          setOrgs(json.organizations || [])
        } else {
          console.error('Failed to fetch organizations:', res.status)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchOrgs()
  }, [])

  const handleActiveToggle = async (orgId: string, currentActive: boolean) => {
    if (!confirm(`組織を${currentActive ? '停止' : '有効化'}しますか？`)) return

    setActionLoading(orgId)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      })

      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, active: !o.active } : o))
        alert(`組織を${currentActive ? '停止' : '有効化'}しました`)
      } else {
        const error = await res.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (e) {
      console.error(e)
      alert('処理中にエラーが発生しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (orgId: string, orgName: string) => {
    if (!confirm(`「${orgName}」を完全に削除しますか？\n\n注意: この操作は取り消せません。BOXフォルダは削除されませんが、システムからデータが完全に削除されます。`)) return

    setActionLoading(orgId)
    try {
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        setOrgs(prev => prev.filter(o => o.id !== orgId))
        alert('組織を削除しました')
      } else {
        const error = await res.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (e) {
      console.error(e)
      alert('処理中にエラーが発生しました')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = orgs
    .filter(o => o.name.toLowerCase().includes(q.toLowerCase()))
    .filter(o => filterStatus === "all" || o.approval_status === filterStatus)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-yellow-600 flex items-center gap-1 text-sm"><Clock className="w-4 h-4" />承認待ち</span>
      case 'approved':
        return <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" />承認済み</span>
      case 'rejected':
        return <span className="text-red-600 flex items-center gap-1 text-sm"><XCircle className="w-4 h-4" />却下</span>
      default:
        return <span className="text-gray-600 flex items-center gap-1 text-sm"><AlertTriangle className="w-4 h-4" />不明</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-engineering-blue" />
              会社管理・承認システム
            </h1>
            <p className="text-gray-600 mt-1">組織申請の承認・却下、会社フォルダ作成、利用状況管理</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="組織名で検索"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
              >
                <option value="all">全ての状態</option>
                <option value="pending">承認待ち</option>
                <option value="approved">承認済み</option>
                <option value="rejected">却下</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <p className="text-gray-600">読み込み中...</p>
            ) : (
              filtered.map(org => (
                <div key={org.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-semibold text-gray-900 text-lg">{org.name}</div>
                        {getStatusBadge(org.approval_status)}
                        {org.active ? (
                          <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" />稼働中</span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1 text-sm"><XCircle className="w-4 h-4" />停止中</span>
                        )}
                        {org.box_folder_id ? (
                          <span className="text-green-600 flex items-center gap-1 text-sm"><Folder className="w-4 h-4" />BOX連携済み</span>
                        ) : (
                          <span className="text-orange-600 flex items-center gap-1 text-sm"><Folder className="w-4 h-4" />BOX未連携</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>申請日: {new Date(org.created_at).toLocaleDateString('ja-JP')}</div>
                        {org.approved_at && <div>承認日: {new Date(org.approved_at).toLocaleDateString('ja-JP')}</div>}
                        {org.billing_email && <div>請求先: {org.billing_email}</div>}
                        <div>システム手数料: {org.system_fee ?? 50000}円</div>
                        {org.box_folder_id && <div>BOXフォルダID: {org.box_folder_id}</div>}
                        {/* 説明は登録情報に含めないため非表示 */}
                        {org.rejection_reason && <div className="text-red-600">却下理由: {org.rejection_reason}</div>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* 承認状態表示（動的） */}
                      {org.approval_status === 'approved' && (
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">承認済み</div>
                      )}
                      {org.approval_status === 'pending' && (
                        <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm">承認待ち</div>
                      )}
                      {org.approval_status === 'rejected' && (
                        <div className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm">却下</div>
                      )}

                      {/* 詳細ボタン */}
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        詳細
                      </Link>

                      {/* 稼働停止・有効化ボタン */}
                      <button
                        onClick={() => handleActiveToggle(org.id, org.active)}
                        disabled={actionLoading === org.id}
                        className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 ${
                          org.active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {actionLoading === org.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : org.active ? (
                          <>
                            <Pause className="w-4 h-4" />
                            停止
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            有効化
                          </>
                        )}
                      </button>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        disabled={actionLoading === org.id}
                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === org.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            削除
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function AdminOrganizationsPage() {
  return (
    <AuthGuard allowedRoles={['Admin', 'OrgAdmin']}>
      <AdminOrganizationsPageContent />
    </AuthGuard>
  )
}
