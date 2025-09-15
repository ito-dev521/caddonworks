"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Calendar, DollarSign, Building, ArrowRight, CheckCircle } from "lucide-react"

interface Payout {
  id: string
  contractor_name: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  scheduled_date: string
  project_title?: string
  bank_account?: {
    bank_name: string
    account_number: string
  }
}

interface PayoutCardProps {
  payout: Payout
  onProcess?: (payout: Payout) => void
  onView?: (payout: Payout) => void
  className?: string
}

export function PayoutCard({
  payout,
  onProcess,
  onView,
  className
}: PayoutCardProps) {

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '処理待ち'
      case 'processing':
        return '処理中'
      case 'completed':
        return '完了'
      case 'failed':
        return '失敗'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      default:
        return <ArrowRight className="w-4 h-4" />
    }
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-engineering-blue" />
              支払処理
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Building className="w-4 h-4" />
              {payout.contractor_name}
              {payout.project_title && ` • ${payout.project_title}`}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(payout.status)}>
            {getStatusText(payout.status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 金額 */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-600" />
          <span className="text-2xl font-bold text-gray-900">
            ¥{payout.amount.toLocaleString()}
          </span>
        </div>

        {/* 予定日 */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          支払予定日: {new Date(payout.scheduled_date).toLocaleDateString('ja-JP')}
        </div>

        {/* 銀行口座情報 */}
        {payout.bank_account && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 mb-1">振込先</p>
            <p className="text-sm text-gray-600">
              {payout.bank_account.bank_name}
            </p>
            <p className="text-sm text-gray-600">
              口座番号: ****{payout.bank_account.account_number.slice(-4)}
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {payout.status === 'pending' && (
            <Button
              variant="engineering"
              size="sm"
              onClick={() => onProcess?.(payout)}
              className="flex-1"
            >
              {getStatusIcon(payout.status)}
              <span className="ml-2">処理開始</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(payout)}
            className={payout.status === 'pending' ? '' : 'flex-1'}
          >
            詳細確認
          </Button>
        </div>

        {/* 追加情報 */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-50">
          支払ID: {payout.id.slice(0, 8).toUpperCase()}
        </div>
      </CardContent>
    </Card>
  )
}

// デフォルトの支払データを生成する関数
export function createSamplePayout(): Payout {
  const statuses = ['pending', 'processing', 'completed', 'failed'] as const
  return {
    id: 'pay_' + Math.random().toString(36).substr(2, 9),
    contractor_name: '株式会社建設パートナー',
    amount: Math.floor(Math.random() * 3000000) + 500000,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    scheduled_date: new Date(Date.now() + Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000).toISOString(),
    project_title: '橋梁設計業務',
    bank_account: {
      bank_name: 'みずほ銀行',
      account_number: '1234567890'
    }
  }
}