"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Filter, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AdminInvoiceRow {
  id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string
  total_amount: number
  project: { id: string; title: string }
  client_org: { id: string; name: string }
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<AdminInvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string | "">("")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/invoices?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      setRows(json.invoices || [])
      setLoading(false)
    }
    fetchInvoices()
  }, [q, status, from, to])

  const exportCsv = () => {
    const header = [
      'id','invoice_number','status','issue_date','due_date','total_amount','project_title','client_org_name'
    ]
    const lines = rows.map(r => [
      r.id,
      r.invoice_number,
      r.status,
      r.issue_date,
      r.due_date,
      r.total_amount,
      r.project?.title || '',
      r.client_org?.name || ''
    ].join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `invoices_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">請求書管理</h1>

        <Card className="mb-4">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className="w-full pl-9 pr-3 py-2 border rounded" placeholder="請求書番号/案件/組織"
                  value={q} onChange={e=>setQ(e.target.value)} />
              </div>
            </div>
            <div>
              <select className="w-full border rounded p-2" value={status} onChange={e=>setStatus(e.target.value)}>
                <option value="">すべてのステータス</option>
                <option value="draft">下書き</option>
                <option value="issued">発行済み</option>
                <option value="paid">支払済み</option>
              </select>
            </div>
            <input type="date" className="border rounded p-2" value={from} onChange={e=>setFrom(e.target.value)} />
            <input type="date" className="border rounded p-2" value={to} onChange={e=>setTo(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>一覧</CardTitle>
            <Button onClick={exportCsv}><Download className="w-4 h-4 mr-2" />CSV</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-gray-600">読み込み中...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-2 py-2">番号</th>
                      <th className="px-2 py-2">案件</th>
                      <th className="px-2 py-2">組織</th>
                      <th className="px-2 py-2">発行日</th>
                      <th className="px-2 py-2">期限</th>
                      <th className="px-2 py-2">合計</th>
                      <th className="px-2 py-2">状態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r=> (
                      <tr key={r.id} className="border-t">
                        <td className="px-2 py-2">{r.invoice_number}</td>
                        <td className="px-2 py-2">{r.project?.title}</td>
                        <td className="px-2 py-2">{r.client_org?.name}</td>
                        <td className="px-2 py-2">{r.issue_date}</td>
                        <td className="px-2 py-2">{r.due_date}</td>
                        <td className="px-2 py-2">¥{r.total_amount?.toLocaleString?.() || r.total_amount}</td>
                        <td className="px-2 py-2">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


