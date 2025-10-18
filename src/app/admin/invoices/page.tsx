"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Filter, Search, BarChart3, X } from "lucide-react"
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
  contractor: { id: string; name: string }
}

interface ContractorSummary {
  contractor_id: string
  contractor_name: string
  contractor_email: string
  invoice_count: number
  total_amount: number
  total_base_amount: number
  total_fee_amount: number
  total_withholding: number
  invoices: Array<{
    id: string
    invoice_number: string
    issue_date: string
    project_title: string
    client_org_name: string
    base_amount: number
    fee_amount: number
    subtotal: number
    withholding: number
    final_amount: number
    status: string
  }>
}

interface MonthlySummary {
  year: string
  month: string
  summaries: ContractorSummary[]
  total_contractors: number
  total_invoices: number
  grand_total: number
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<AdminInvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<string | "">("")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  // 集計機能のステート
  const [showSummary, setShowSummary] = useState(false)
  const [summaryYear, setSummaryYear] = useState(() => new Date().getFullYear().toString())
  const [summaryMonth, setSummaryMonth] = useState(() => (new Date().getMonth() + 1).toString())
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [expandedContractor, setExpandedContractor] = useState<string | null>(null)

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

  // 会社ごとにグループ化
  const groupedByOrg = useMemo(() => {
    const groups: Record<string, { orgName: string; invoices: AdminInvoiceRow[] }> = {}
    rows.forEach(row => {
      const orgId = row.client_org?.id || 'unknown'
      const orgName = row.client_org?.name || '不明な組織'
      if (!groups[orgId]) {
        groups[orgId] = { orgName, invoices: [] }
      }
      groups[orgId].invoices.push(row)
    })
    return Object.entries(groups).map(([orgId, data]) => ({
      orgId,
      orgName: data.orgName,
      invoices: data.invoices
    }))
  }, [rows])

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

  // 月次集計データを取得
  const fetchMonthlySummary = async () => {
    if (!summaryYear || !summaryMonth) {
      alert('年と月を選択してください')
      return
    }

    try {
      setSummaryLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('セッションが切れています')
        return
      }

      const res = await fetch(
        `/api/admin/invoices/summary?year=${summaryYear}&month=${summaryMonth}`,
        {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }
      )

      if (!res.ok) {
        const error = await res.json()
        alert('集計データの取得に失敗しました: ' + error.message)
        return
      }

      const data = await res.json()
      setMonthlySummary(data)
    } catch (error) {
      console.error('集計データ取得エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setSummaryLoading(false)
    }
  }

  // 月次集計CSVエクスポート
  const exportMonthlySummaryCsv = () => {
    if (!monthlySummary) return

    const header = [
      '受注者名',
      '受注者メール',
      '請求書番号',
      '案件名',
      '発注者',
      '発行日',
      '契約金額',
      'サポート料',
      '源泉税',
      '請求額',
      '状態'
    ]

    const lines: string[] = []

    // 受注者ごとに出力
    monthlySummary.summaries.forEach(summary => {
      // 各請求書を出力
      summary.invoices.forEach(invoice => {
        lines.push([
          summary.contractor_name,
          summary.contractor_email,
          invoice.invoice_number,
          invoice.project_title,
          invoice.client_org_name,
          invoice.issue_date,
          invoice.base_amount,
          invoice.fee_amount,
          invoice.withholding,
          invoice.final_amount,
          invoice.status === 'paid' ? '支払済み' :
          invoice.status === 'issued' ? '発行済み' :
          invoice.status === 'draft' ? '下書き' : invoice.status
        ].join(','))
      })

      // 受注者別の合計行を追加
      lines.push([
        `【${summary.contractor_name} 合計】`,
        '',
        '',
        '',
        '',
        '',
        summary.total_base_amount,
        summary.total_fee_amount,
        summary.total_withholding,
        summary.total_amount,
        `${summary.invoice_count}件`
      ].join(','))

      // 空行を追加（受注者間の区切り）
      lines.push('')
    })

    // 全体の合計行を追加
    const grandTotalBaseAmount = monthlySummary.summaries.reduce((sum, s) => sum + s.total_base_amount, 0)
    const grandTotalFeeAmount = monthlySummary.summaries.reduce((sum, s) => sum + s.total_fee_amount, 0)
    const grandTotalWithholding = monthlySummary.summaries.reduce((sum, s) => sum + s.total_withholding, 0)

    lines.push([
      '【総合計】',
      '',
      '',
      '',
      '',
      '',
      grandTotalBaseAmount,
      grandTotalFeeAmount,
      grandTotalWithholding,
      monthlySummary.grand_total,
      `${monthlySummary.total_invoices}件`
    ].join(','))

    const csv = [header.join(','), ...lines].join('\n')
    const bom = '\uFEFF' // UTF-8 BOM for Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `月次請求集計_${monthlySummary.year}年${monthlySummary.month}月_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">請求書管理（受注者からの請求）</h1>
            <p className="text-gray-600 mt-1">受注者から運営者への請求書を管理します。発注者への請求は月次請求書管理で確認できます。</p>
          </div>
          <Button
            onClick={() => setShowSummary(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            集計
          </Button>
        </div>

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
            ) : groupedByOrg.length === 0 ? (
              <div className="py-10 text-center text-gray-600">請求書がありません</div>
            ) : (
              <div className="space-y-6">
                {groupedByOrg.map(group => (
                  <div key={group.orgId} className="border-b pb-6 last:border-b-0">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">{group.orgName}</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 bg-gray-50">
                            <th className="px-2 py-2">番号</th>
                            <th className="px-2 py-2">受注者</th>
                            <th className="px-2 py-2">案件</th>
                            <th className="px-2 py-2">発行日</th>
                            <th className="px-2 py-2">期限</th>
                            <th className="px-2 py-2">請求額</th>
                            <th className="px-2 py-2">状態</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.invoices.map(r => (
                            <tr key={r.id} className="border-t">
                              <td className="px-2 py-2 font-mono text-xs">{r.invoice_number}</td>
                              <td className="px-2 py-2">{r.contractor?.name || '—'}</td>
                              <td className="px-2 py-2 font-medium">{r.project?.title || '—'}</td>
                              <td className="px-2 py-2">{r.issue_date}</td>
                              <td className="px-2 py-2">{r.due_date}</td>
                              <td className="px-2 py-2 font-semibold">¥{r.total_amount?.toLocaleString?.() || r.total_amount}</td>
                              <td className="px-2 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  r.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  r.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {r.status === 'paid' ? '支払済み' :
                                   r.status === 'issued' ? '発行済み' :
                                   r.status === 'draft' ? '下書き' : r.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 月次集計モーダル */}
        {showSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">月次請求書管理</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowSummary(false)
                      setMonthlySummary(null)
                    }}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* 年月選択フォーム */}
                {!monthlySummary ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-gray-600 mb-6">
                        毎月20日締めの完了案件を集計し、請求書を一括作成します
                      </p>
                      <div className="flex items-end gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">年</label>
                          <input
                            type="number"
                            value={summaryYear}
                            onChange={(e) => setSummaryYear(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="2025"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">月</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={summaryMonth}
                            onChange={(e) => setSummaryMonth(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="10"
                          />
                        </div>
                        <Button
                          onClick={fetchMonthlySummary}
                          disabled={summaryLoading}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {summaryLoading ? '読み込み中...' : '集計を表示'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* 集計サマリー */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {monthlySummary.year}年{monthlySummary.month}月の請求集計
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              受注者 {monthlySummary.total_contractors}名 / 請求書 {monthlySummary.total_invoices}件
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Button
                              onClick={exportMonthlySummaryCsv}
                              variant="outline"
                              className="bg-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              CSV
                            </Button>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">合計請求額</p>
                              <p className="text-3xl font-bold text-blue-600">
                                ¥{monthlySummary.grand_total.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 受注者別集計 */}
                    {monthlySummary.summaries.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center text-gray-500">
                          対象月の請求書はありません
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {monthlySummary.summaries.map((summary) => (
                          <Card key={summary.contractor_id} className="border-2 hover:border-blue-300 transition-colors">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{summary.contractor_name}</h4>
                                  <p className="text-sm text-gray-500">{summary.contractor_email}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">請求件数</p>
                                    <p className="text-lg font-semibold text-gray-900">{summary.invoice_count}件</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">合計請求額</p>
                                    <p className="text-xl font-bold text-blue-600">
                                      ¥{summary.total_amount.toLocaleString()}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExpandedContractor(
                                      expandedContractor === summary.contractor_id ? null : summary.contractor_id
                                    )}
                                  >
                                    {expandedContractor === summary.contractor_id ? '閉じる' : '詳細'}
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>

                            {/* 請求書詳細リスト */}
                            {expandedContractor === summary.contractor_id && (
                              <CardContent className="border-t">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr className="text-left text-gray-600">
                                        <th className="px-3 py-2">請求書番号</th>
                                        <th className="px-3 py-2">案件名</th>
                                        <th className="px-3 py-2">発注者</th>
                                        <th className="px-3 py-2">発行日</th>
                                        <th className="px-3 py-2 text-right">契約金額</th>
                                        <th className="px-3 py-2 text-right">サポート料</th>
                                        <th className="px-3 py-2 text-right">源泉税</th>
                                        <th className="px-3 py-2 text-right">請求額</th>
                                        <th className="px-3 py-2">状態</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {summary.invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-t">
                                          <td className="px-3 py-2 font-mono text-xs">{invoice.invoice_number}</td>
                                          <td className="px-3 py-2">{invoice.project_title}</td>
                                          <td className="px-3 py-2">{invoice.client_org_name}</td>
                                          <td className="px-3 py-2">{invoice.issue_date}</td>
                                          <td className="px-3 py-2 text-right">
                                            ¥{invoice.base_amount.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2 text-right text-red-600">
                                            ¥{invoice.fee_amount.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2 text-right text-orange-600">
                                            ¥{invoice.withholding.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2 text-right font-semibold text-blue-600">
                                            ¥{invoice.final_amount.toLocaleString()}
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded text-xs ${
                                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                              invoice.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {invoice.status === 'paid' ? '支払済み' :
                                               invoice.status === 'issued' ? '発行済み' :
                                               invoice.status === 'draft' ? '下書き' : invoice.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-semibold border-t-2">
                                      <tr>
                                        <td colSpan={4} className="px-3 py-2 text-right">合計 ({summary.invoice_count}件)</td>
                                        <td className="px-3 py-2 text-right">¥{summary.total_base_amount.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right text-red-600">¥{summary.total_fee_amount.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right text-orange-600">¥{summary.total_withholding.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right text-blue-600">
                                          ¥{summary.total_amount.toLocaleString()}
                                        </td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* 再検索ボタン */}
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setMonthlySummary(null)}
                      >
                        別の月を検索
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


