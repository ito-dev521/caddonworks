"use client"

import React, { useEffect, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { motion } from "framer-motion"
import { Building2, Search, CheckCircle2, XCircle, Clock, AlertTriangle, Folder } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"

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
  description?: string
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

  const handleApproval = async (orgId: string, action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(orgId)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      })

      if (res.ok) {
        const updatedOrg = await res.json()
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, ...updatedOrg.organization } : o))
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

  const handleActiveToggle = async (orgId: string, currentActive: boolean) => {
    setActionLoading(orgId)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      })

      if (res.ok) {
        setOrgs(prev => prev.map(o => o.id === orgId ? { ...o, active: !o.active } : o))
      }
    } catch (e) {
      console.error(e)
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
                        {org.box_folder_id && (
                          <span className="text-blue-600 flex items-center gap-1 text-sm"><Folder className="w-4 h-4" />BOX連携済み</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>申請日: {new Date(org.created_at).toLocaleDateString('ja-JP')}</div>
                        {org.approved_at && <div>承認日: {new Date(org.approved_at).toLocaleDateString('ja-JP')}</div>}
                        {org.billing_email && <div>請求先: {org.billing_email}</div>}
                        <div>システム手数料: {org.system_fee ?? 50000}円</div>
                        {org.description && <div>説明: {org.description}</div>}
                        {org.rejection_reason && <div className="text-red-600">却下理由: {org.rejection_reason}</div>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {org.approval_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproval(org.id, 'approve')}
                            disabled={actionLoading === org.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                          >
                            {actionLoading === org.id ? '処理中...' : '承認'}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('却下理由を入力してください:')
                              if (reason) handleApproval(org.id, 'reject', reason)
                            }}
                            disabled={actionLoading === org.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            却下
                          </button>
                        </>
                      )}

                      {org.approval_status === 'approved' && (
                        <button
                          onClick={() => handleActiveToggle(org.id, org.active)}
                          disabled={actionLoading === org.id}
                          className={`px-4 py-2 rounded-lg text-sm ${
                            org.active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } disabled:opacity-50`}
                        >
                          {actionLoading === org.id ? '処理中...' : org.active ? '利用停止' : '利用再開'}
                        </button>
                      )}

                      {org.approval_status === 'rejected' && (
                        <button
                          onClick={() => handleApproval(org.id, 'approve')}
                          disabled={actionLoading === org.id}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          再承認
                        </button>
                      )}
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
    <AuthGuard>
      <AdminOrganizationsPageContent />
    </AuthGuard>
  )
}
