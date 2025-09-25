"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/layouts/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { supabase } from "@/lib/supabase"

type Result = { endpoint: string; status: number; ok: boolean; note?: string }

const ENDPOINTS: { path: string; auth?: boolean }[] = [
  { path: "/api/admin/contractors" },
  { path: "/api/projects", auth: true },
  { path: "/api/jobs", auth: true },
  { path: "/api/invoices", auth: true },
  { path: "/api/settings/users", auth: true },
  { path: "/api/admin/users", auth: true },
  { path: "/api/chat/participants", auth: true },
]

export default function AdminHealthcheckPage() {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const fetches = ENDPOINTS.map(async ep => {
        try {
          const res = await fetch(ep.path, {
            headers: ep.auth && token ? { Authorization: `Bearer ${token}` } : undefined
          })
          const ok = res.status >= 200 && res.status < 300
          return { endpoint: ep.path, status: res.status, ok }
        } catch {
          return { endpoint: ep.path, status: 0, ok: false, note: 'network error' }
        }
      })
      const out = await Promise.all(fetches)
      setResults(out)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { run() }, [])

  const okCount = results.filter(r => r.ok).length

  return (
    <AuthGuard requiredRole="Admin">
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ヘルスチェック</h1>
            <button onClick={run} disabled={loading} className="px-4 py-2 bg-engineering-blue text-white rounded">
              {loading ? '実行中…' : '再実行'}
            </button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>主要API スモークテスト</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-600">OK: {okCount} / {ENDPOINTS.length}</div>
              <div className="grid gap-2">
                {results.map(r => (
                  <div key={r.endpoint} className="flex items-center justify-between p-3 border rounded">
                    <div className="text-sm font-mono text-gray-800">{r.endpoint}</div>
                    <div className="flex items-center gap-2">
                      <Badge className={r.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {r.status || 'ERR'}
                      </Badge>
                      {r.note && <span className="text-xs text-gray-500">{r.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  )
}


