'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/layouts/navigation'

interface OrganizationSummary {
  org_id: string
  org_name: string
  org_address: string
  org_email: string
  projects: Array<{
    project_id: string
    project_title: string
    contract_id: string
    contract_amount: number
    completion_date: string
    support_enabled: boolean
    support_fee: number
    system_fee: number
  }>
  total_contract_amount: number
  total_support_fee: number
  total_system_fee: number
  total_billing_amount: number
}

interface BillingSummary {
  billing_period: {
    year: number
    month: number
    start_date: string
    end_date: string
    label: string
  }
  support_fee_percent: number
  total_organizations: number
  total_projects: number
  grand_total_amount: number
  grand_total_support_fee: number
  grand_total_system_fee: number
  organizations: OrganizationSummary[]
}

export default function MonthlyBillingPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // 20日を過ぎているかチェック
  const isAfter20th = () => {
    const today = new Date()
    const currentDay = today.getDate()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    // 選択された年月が現在の年月と同じ場合のみ20日チェック
    if (year === currentYear && month === currentMonth) {
      return currentDay > 20
    }

    // 過去の年月は常に有効
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return true
    }

    // 未来の年月は無効
    return false
  }

  const fetchSummary = async () => {
    try {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('認証が必要です')
        return
      }

      const response = await fetch(
        `/api/admin/monthly-billing/summary?year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '集計データの取得に失敗しました')
      }

      const data = await response.json()
      setSummary(data)

    } catch (error: any) {
      console.error('集計エラー:', error)
      alert(error.message || '集計データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const generateInvoices = async () => {
    if (!confirm(`${year}年${month}月分の請求書を一括生成しますか？`)) {
      return
    }

    try {
      setGenerating(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('認証が必要です')
        return
      }

      const response = await fetch('/api/admin/monthly-billing/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ year, month })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '請求書の生成に失敗しました')
      }

      // エラー詳細を含むメッセージを生成
      let message = `請求書の一括生成が完了しました\n` +
        `作成: ${data.summary.created_invoices}件\n` +
        `エラー: ${data.summary.errors}件`

      // エラーがある場合は詳細を表示
      if (data.errors && data.errors.length > 0) {
        message += '\n\n--- エラー詳細 ---'
        data.errors.forEach((err: any) => {
          message += `\n・${err.org_name}: ${err.error}`
        })
      }

      alert(message)

      // 再度集計を取得
      fetchSummary()

    } catch (error: any) {
      console.error('請求書生成エラー:', error)
      alert(error.message || '請求書の生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8 space-y-6">
        <Card>
        <CardHeader>
          <CardTitle>月次請求書管理</CardTitle>
          <CardDescription>
            毎月20日締めの完了案件を集計し、請求書を一括生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">年</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2 w-32"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">月</label>
              <input
                type="number"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                min="1"
                max="12"
                className="border rounded px-3 py-2 w-32"
              />
            </div>
            <Button onClick={fetchSummary} disabled={loading}>
              {loading ? '集計中...' : '集計を表示'}
            </Button>
          </div>

          {summary && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg mb-2">
                  {summary.billing_period.label}
                </h3>
                <p className="text-sm text-gray-600">
                  対象期間: {formatDate(summary.billing_period.start_date)} 〜 {formatDate(summary.billing_period.end_date)}
                </p>
                <p className="text-sm text-gray-600">
                  サポート手数料: {summary.support_fee_percent}%
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">請求組織数</p>
                  <p className="text-2xl font-bold">{summary.total_organizations}社</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">完了案件数</p>
                  <p className="text-2xl font-bold">{summary.total_projects}件</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">手数料合計</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary.grand_total_support_fee)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-600">請求総額</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.grand_total_amount)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="space-y-2">
                  {!isAfter20th() && (
                    <p className="text-sm text-gray-600 text-right">
                      ※ 請求書は20日を過ぎてから生成できます
                    </p>
                  )}
                  <Button
                    onClick={generateInvoices}
                    disabled={generating || summary.total_organizations === 0 || !isAfter20th()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {generating ? '生成中...' : '請求書を一括生成'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold">組織別集計</h3>
                {summary.organizations.map((org) => (
                  <Card key={org.org_id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{org.org_name}</CardTitle>
                          <CardDescription className="text-sm">
                            {org.org_email}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">請求額</p>
                          <p className="text-xl font-bold text-blue-600">
                            {formatCurrency(org.total_billing_amount)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">プロジェクト</th>
                            <th className="text-left py-2">完了日</th>
                            <th className="text-right py-2">契約金額</th>
                            <th className="text-right py-2">サポート利用金額</th>
                            <th className="text-right py-2">手数料</th>
                            <th className="text-right py-2">請求額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {org.projects.map((project) => (
                            <tr key={project.project_id} className="border-b">
                              <td className="py-2">{project.project_title}</td>
                              <td className="py-2">{formatDate(project.completion_date)}</td>
                              <td className="text-right py-2">
                                {formatCurrency(project.contract_amount)}
                              </td>
                              <td className="text-right py-2">
                                {project.support_enabled ? (
                                  formatCurrency(project.support_fee)
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="text-right py-2">
                                {formatCurrency(project.system_fee)}
                              </td>
                              <td className="text-right py-2 font-semibold">
                                {formatCurrency(project.contract_amount + project.support_fee + project.system_fee)}
                              </td>
                            </tr>
                          ))}
                          <tr className="font-bold">
                            <td className="py-2" colSpan={2}>合計（{org.projects.length}件）</td>
                            <td className="text-right py-2">
                              {formatCurrency(org.total_contract_amount)}
                            </td>
                            <td className="text-right py-2">
                              {formatCurrency(org.total_support_fee)}
                            </td>
                            <td className="text-right py-2">
                              {formatCurrency(org.total_system_fee)}
                            </td>
                            <td className="text-right py-2 text-blue-600">
                              {formatCurrency(org.total_billing_amount)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  )
}
