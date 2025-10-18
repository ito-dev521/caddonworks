'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { GenerateInvoiceButton } from '@/components/completion-report/generate-invoice-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CompletionReport {
  id: string
  project_id: string
  contract_id: string
  completion_date: string
  created_at: string
  projects: {
    title: string
    organizations: {
      name: string
    }
  }
  contracts: {
    bid_amount: number
  }
  has_invoice: boolean
}

export default function AdminCompletionReportsPage() {
  const [reports, setReports] = useState<CompletionReport[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    try {
      setLoading(true)

      // 完了届を取得
      const { data: reportsData, error: reportsError } = await supabase
        .from('completion_reports')
        .select(`
          id,
          project_id,
          contract_id,
          completion_date,
          created_at,
          projects:project_id (
            title,
            organizations:org_id (
              name
            )
          ),
          contracts:contract_id (
            bid_amount
          )
        `)
        .order('created_at', { ascending: false })

      if (reportsError) throw reportsError

      // 各完了届に対して請求書の存在を確認
      const reportsWithInvoiceStatus = await Promise.all(
        (reportsData || []).map(async (report) => {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('id')
            .eq('contract_id', report.contract_id)
            .eq('direction', 'from_operator')
            .maybeSingle()

          return {
            ...report,
            has_invoice: !!invoices
          }
        })
      )

      setReports(reportsWithInvoiceStatus as any)
    } catch (error) {
      console.error('完了届取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

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
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>業務完了届一覧（運営者）</CardTitle>
          <CardDescription>
            完了届から請求書を生成できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              完了届がありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プロジェクト名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">発注者</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">完了日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">契約金額</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">請求書</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {(report as any).projects?.title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(report as any).projects?.organizations?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.completion_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency((report as any).contracts?.bid_amount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {report.has_invoice ? (
                          <span className="text-green-600">✓ 作成済み</span>
                        ) : (
                          <span className="text-gray-400">未作成</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!report.has_invoice && (
                          <GenerateInvoiceButton
                            completionReportId={report.id}
                            onSuccess={fetchReports}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
