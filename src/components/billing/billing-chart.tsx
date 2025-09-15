"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

interface BillingChartProps {
  data?: any[]
  className?: string
}

export function BillingChart({ data = [], className }: BillingChartProps) {
  // サンプルデータ
  const sampleData = [
    { month: "1月", revenue: 2400000, expenses: 1800000 },
    { month: "2月", revenue: 2800000, expenses: 2000000 },
    { month: "3月", revenue: 3200000, expenses: 2200000 },
    { month: "4月", revenue: 2900000, expenses: 2100000 },
    { month: "5月", revenue: 3500000, expenses: 2400000 },
    { month: "6月", revenue: 3800000, expenses: 2600000 }
  ]

  const chartData = data.length > 0 ? data : sampleData
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0)
  const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0)
  const profit = totalRevenue - totalExpenses

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-engineering-blue" />
          売上・費用チャート
        </CardTitle>
        <CardDescription>
          月別の売上と費用の推移
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* サマリー */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">総売上</p>
            <p className="text-2xl font-bold text-green-600">
              ¥{totalRevenue.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">総費用</p>
            <p className="text-2xl font-bold text-red-600">
              ¥{totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">利益</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ¥{profit.toLocaleString()}
            </p>
            {profit >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600 mx-auto mt-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600 mx-auto mt-1" />
            )}
          </div>
        </div>

        {/* 簡易チャート表示 */}
        <div className="space-y-3">
          {chartData.map((item, index) => {
            const maxValue = Math.max(...chartData.map(d => Math.max(d.revenue, d.expenses)))
            const revenueWidth = (item.revenue / maxValue) * 100
            const expenseWidth = (item.expenses / maxValue) * 100

            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.month}</span>
                  <div className="flex gap-4">
                    <span className="text-green-600">売上: ¥{item.revenue.toLocaleString()}</span>
                    <span className="text-red-600">費用: ¥{item.expenses.toLocaleString()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${revenueWidth}%` }}
                    />
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${expenseWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>売上</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>費用</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}