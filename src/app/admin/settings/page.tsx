"use client"

import React, { useEffect, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth/auth-guard"

interface Settings {
  support_fee_percent: number
}

function AdminSettingsPageContent() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [percent, setPercent] = useState<number>(8)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
        setPercent(data.settings?.support_fee_percent ?? 8)
      } else {
        setMessage(data.message || '設定取得に失敗しました')
      }
    } catch (e) {
      setMessage('設定取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const save = async () => {
    try {
      setLoading(true)
      setMessage(null)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ support_fee_percent: percent })
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings)
        setMessage('保存しました')
      } else {
        setMessage(data.message || '保存に失敗しました')
      }
    } catch (e) {
      setMessage('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">システム設定</h1>
        <div className="mt-6 max-w-lg bg-white border rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">サポート手数料（％）</label>
          <input
            type="number"
            min={0}
            max={100}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
          />
          <div className="mt-4">
            <Button onClick={save} variant="engineering" disabled={loading}>保存</Button>
          </div>
          {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
        </div>
      </div>
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <AuthGuard allowedRoles={['Admin', 'OrgAdmin']}>
      <AdminSettingsPageContent />
    </AuthGuard>
  )
}
