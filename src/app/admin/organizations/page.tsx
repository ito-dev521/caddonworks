"use client"

import React, { useEffect, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { motion } from "framer-motion"
import { Building2, Search, CheckCircle2, XCircle } from "lucide-react"

interface Org {
  id: string
  name: string
  active: boolean
  system_fee?: number
  created_at: string
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/organizations")
        const json = await res.json()
        setOrgs(json.organizations || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchOrgs()
  }, [])

  const filtered = orgs.filter(o => o.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-engineering-blue" />
              発注者の利用管理
            </h1>
            <p className="text-gray-600 mt-1">組織（発注者）の利用状況、アクティブ/停止の切替。</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="組織名で検索"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <p className="text-gray-600">読み込み中...</p>
            ) : (
              filtered.map(org => (
                <div key={org.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{org.name}</div>
                    <div className="text-sm text-gray-600">作成: {new Date(org.created_at).toLocaleDateString('ja-JP')} / 手数料: {org.system_fee ?? 0}円</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {org.active ? (
                      <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle2 className="w-4 h-4" />アクティブ</span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1 text-sm"><XCircle className="w-4 h-4" />停止</span>
                    )}
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/admin/organizations/${org.id}`, { method: 'PUT', body: JSON.stringify({ active: !org.active }) })
                        if (res.ok) setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, active: !o.active } : o))
                      }}
                      className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                    >
                      {org.active ? '停止' : '再開'}
                    </button>
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
