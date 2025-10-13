"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, DollarSign, Clock, Download, Eye } from "lucide-react"

interface Invoice {
  id: string
  number: string
  client_name: string
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issue_date: string
  due_date: string
  project_title?: string
}

interface InvoiceCardProps {
  invoice: Invoice
  onView?: (invoice: Invoice) => void
  onDownload?: (invoice: Invoice) => void
  className?: string
}

export function InvoiceCard({
  invoice,
  onView,
  onDownload,
  className
}: InvoiceCardProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700'
      case 'sent':
        return 'bg-blue-100 text-blue-700'
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'overdue':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '下書き'
      case 'sent':
        return '送信済み'
      case 'paid':
        return '支払済み'
      case 'overdue':
        return '期限切れ'
      default:
        return status
    }
  }

  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status !== 'paid'

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-engineering-blue" />
              請求書 #{invoice.number}
            </CardTitle>
            <CardDescription className="mt-1">
              {invoice.client_name}
              {invoice.project_title && ` • ${invoice.project_title}`}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {getStatusText(invoice.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 金額 */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-600" />
          <span className="text-2xl font-bold text-gray-900">
            ¥{invoice.amount.toLocaleString()}
          </span>
        </div>

        {/* 日付情報 */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            発行日: {new Date(invoice.issue_date).toLocaleDateString('ja-JP')}
          </div>
          <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            <Clock className="w-4 h-4" />
            支払期限: {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
            {isOverdue && (
              <Badge variant="destructive" className="text-xs ml-2">
                期限切れ
              </Badge>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(invoice)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            詳細
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload?.(invoice)}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>

        {/* 追加情報 */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-50">
          請求書ID: {invoice.id.slice(0, 8).toUpperCase()}
        </div>
      </CardContent>
    </Card>
  )
}

// デフォルトの請求書データを生成する関数
export function createSampleInvoice(): Invoice {
  // 20日締めの当月末払い/翌月末払いロジックを適用
  const issueDate = new Date()
  const day = issueDate.getDate()

  let dueDate: Date
  if (day <= 20) {
    // 当月末
    dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 0)
  } else {
    // 翌月末
    dueDate = new Date(issueDate.getFullYear(), issueDate.getMonth() + 2, 0)
  }

  return {
    id: 'inv_' + Math.random().toString(36).substr(2, 9),
    number: 'INV-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    client_name: '株式会社サンプル',
    amount: Math.floor(Math.random() * 5000000) + 1000000,
    status: ['draft', 'sent', 'paid', 'overdue'][Math.floor(Math.random() * 4)] as any,
    issue_date: issueDate.toISOString(),
    due_date: dueDate.toISOString(),
    project_title: '道路設計業務'
  }
}