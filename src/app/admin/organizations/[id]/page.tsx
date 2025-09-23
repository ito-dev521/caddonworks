"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Navigation } from "@/components/layouts/navigation"
import { motion } from "framer-motion"
import { Building2, ArrowLeft, CheckCircle2, XCircle, Clock, Folder, Check, X, MessageSquare } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"

interface OrgDetail {
  id: string
  name: string
  active: boolean
  approval_status?: "pending" | "approved" | "rejected"
  system_fee?: number
  created_at: string
  approved_at?: string
  rejection_reason?: string
  billing_email?: string
  box_folder_id?: string
  address?: string
  phone?: string
  website?: string
  registration_number?: string | null
  tax_id?: string | null
  business_type?: string | null
  admin_contact?: {
    name?: string | null
    email?: string | null
    phone?: string | null
    department?: string | null
  } | null
}

function OrganizationDetailContent() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) || ""
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    if (!id) return
    const fetchOrg = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/organizations/${id}`)
        if (res.ok) {
          const json = await res.json()
          setOrg(json.organization)
        } else {
          console.error("Failed to fetch organization detail", res.status)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchOrg()
  }, [id])

  const statusBadge = (status?: string) => {
    if (status === "approved") return <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" />承認済み</span>
    if (status === "rejected") return <span className="text-red-600 flex items-center gap-1 text-sm"><XCircle className="w-4 h-4" />却下</span>
    if (status === "pending") return <span className="text-yellow-600 flex items-center gap-1 text-sm"><Clock className="w-4 h-4" />承認待ち</span>
    return null
  }

  const handleApprove = async () => {
    if (!confirm('この組織を承認しますか？')) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/organizations/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setOrg(prev => prev ? { ...prev, approval_status: 'approved' } : null)
        alert('組織を承認しました')
      } else {
        const error = await response.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('承認エラー:', error)
      alert('承認中にエラーが発生しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('却下理由を入力してください')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/organizations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason })
      })

      if (response.ok) {
        setOrg(prev => prev ? { ...prev, approval_status: 'rejected', rejection_reason: rejectionReason } : null)
        setShowRejectDialog(false)
        setRejectionReason("")
        alert('組織を却下しました')
      } else {
        const error = await response.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('却下エラー:', error)
      alert('却下中にエラーが発生しました')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <button onClick={() => router.push("/admin/organizations")} className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> 一覧へ戻る
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-engineering-blue" />
              会社詳細
            </h1>
            <p className="text-gray-600 mt-1">登録済みの会社情報の確認</p>
          </div>

          {loading ? (
            <p className="text-gray-600">読み込み中...</p>
          ) : !org ? (
            <p className="text-red-600">会社情報が見つかりませんでした。</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">{org.name}</h2>
                  {statusBadge(org.approval_status)}
                  <span className={`text-sm ${org.active ? "text-green-600" : "text-red-600"}`}>
                    {org.active ? "稼働中" : "停止中"}
                  </span>
                  {org.box_folder_id ? (
                    <span className="text-green-600 flex items-center gap-1 text-sm"><Folder className="w-4 h-4" />BOX連携済み</span>
                  ) : (
                    <span className="text-orange-600 flex items-center gap-1 text-sm"><Folder className="w-4 h-4" />BOX未連携</span>
                  )}
                </div>

                {/* 承認・却下ボタン */}
                {org.approval_status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      承認・BOXフォルダ作成
                    </button>
                    <button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      却下
                    </button>
                  </div>
                )}

              </div>

              {/* 基本情報セクション */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">作成日</div>
                    <div className="text-gray-900 mt-1">{new Date(org.created_at).toLocaleDateString("ja-JP")} {new Date(org.created_at).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                  {org.approved_at && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">承認日</div>
                      <div className="text-gray-900 mt-1">{new Date(org.approved_at).toLocaleDateString("ja-JP")} {new Date(org.approved_at).toLocaleTimeString("ja-JP", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-500">システム手数料</div>
                    <div className="text-gray-900 mt-1">{(org.system_fee ?? 50000).toLocaleString()} 円</div>
                  </div>
                  {org.billing_email && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">請求先メール</div>
                      <div className="text-gray-900 mt-1">{org.billing_email}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 会社情報セクション */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">会社情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">組織種別</div>
                    <div className="text-gray-900 mt-1">{org.business_type || '民間企業'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">法人番号</div>
                    <div className="text-gray-900 mt-1">{org.registration_number || org.tax_id || '未設定'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">代表電話</div>
                    <div className="text-gray-900 mt-1">{org.phone || '未設定'}</div>
                  </div>
                  {org.website && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">ウェブサイト</div>
                      <div className="text-gray-900 mt-1">
                        <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-engineering-blue hover:underline">
                          {org.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {!org.website && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">ウェブサイト</div>
                      <div className="text-gray-900 mt-1">未設定</div>
                    </div>
                  )}
                  {org.address && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-gray-500">住所</div>
                      <div className="text-gray-900 mt-1 whitespace-pre-wrap">{org.address}</div>
                    </div>
                  )}
                  {!org.address && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-gray-500">住所</div>
                      <div className="text-gray-900 mt-1">未設定</div>
                    </div>
                  )}
                </div>
              </div>

              {/* システム情報セクション */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">システム情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {org.box_folder_id && (
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium text-gray-500">BOXフォルダID</div>
                      <div className="text-gray-900 mt-1 font-mono">{org.box_folder_id}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* エラー情報セクション */}
              {org.rejection_reason && (
                <div className="border-b border-gray-200 pb-6">
                  <h3 className="text-lg font-medium text-red-700 mb-4">却下情報</h3>
                  <div>
                    <div className="text-sm font-medium text-gray-500">却下理由</div>
                    <div className="text-red-600 mt-1 p-3 bg-red-50 rounded-lg whitespace-pre-wrap">{org.rejection_reason}</div>
                  </div>
                </div>
              )}

              {/* 管理者情報セクション */}
              {org.admin_contact && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">登録時の管理者プロフィール（パスワード除く）</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {org.admin_contact.name && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">氏名</div>
                          <div className="text-gray-900 mt-1">{org.admin_contact.name}</div>
                        </div>
                      )}
                      {org.admin_contact.email && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">メール</div>
                          <div className="text-gray-900 mt-1">{org.admin_contact.email}</div>
                        </div>
                      )}
                      {org.admin_contact.phone && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">電話</div>
                          <div className="text-gray-900 mt-1">{org.admin_contact.phone}</div>
                        </div>
                      )}
                      {org.admin_contact.department && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">部署</div>
                          <div className="text-gray-900 mt-1">{org.admin_contact.department}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 却下理由入力ダイアログ */}
          {showRejectDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">却下理由の入力</h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    却下理由 *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={4}
                    placeholder="却下理由を詳しく入力してください..."
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowRejectDialog(false)
                      setRejectionReason("")
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    却下する
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function OrganizationDetailPage() {
  return (
    <AuthGuard>
      <OrganizationDetailContent />
    </AuthGuard>
  )
}


