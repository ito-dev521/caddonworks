"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { DollarSign, TrendingUp, Calendar } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const revenueData = [
  { month: "8月", revenue: 8500000, expenses: 6200000, projects: 12 },
  { month: "9月", revenue: 12200000, expenses: 8800000, projects: 18 },
  { month: "10月", revenue: 15800000, expenses: 11200000, projects: 24 },
  { month: "11月", revenue: 18500000, expenses: 12800000, projects: 28 },
  { month: "12月", revenue: 22100000, expenses: 15400000, projects: 32 },
  { month: "1月", revenue: 19800000, expenses: 13600000, projects: 29 }
]

const quarterData = [
  { quarter: "Q1 2023", revenue: 45600000, growth: 12.5 },
  { quarter: "Q2 2023", revenue: 52800000, growth: 15.8 },
  { quarter: "Q3 2023", revenue: 48200000, growth: -8.7 },
  { quarter: "Q4 2023", revenue: 68400000, growth: 41.9 }
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.name}</span>
            </div>
            <span className="font-semibold">
              {typeof entry.value === 'number' && entry.value > 1000
                ? formatCurrency(entry.value)
                : entry.value
              }
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart() {
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly')

  const currentData = viewMode === 'monthly' ? revenueData : quarterData
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0)
  const totalExpenses = revenueData.reduce((sum, item) => sum + item.expenses, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1)

  return (
    <Card className="hover-lift border-engineering-green/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-engineering-green" />
            売上・収益分析
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'monthly' ? 'engineering' : 'outline'}
              size="sm"
              onClick={() => setViewMode('monthly')}
            >
              月別
            </Button>
            <Button
              variant={viewMode === 'quarterly' ? 'engineering' : 'outline'}
              size="sm"
              onClick={() => setViewMode('quarterly')}
            >
              四半期
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Revenue Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg"
          >
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              総売上
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg"
          >
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-gray-600 flex items-center justify-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              総支出
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg"
          >
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(netProfit)}</p>
            <p className="text-xs text-gray-600 mt-1">純利益</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg"
          >
            <p className="text-2xl font-bold text-orange-600">{profitMargin}%</p>
            <p className="text-xs text-gray-600 mt-1">利益率</p>
          </motion.div>
        </div>

        {/* Charts */}
        {viewMode === 'monthly' ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#D1D5DB' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#D1D5DB' }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="売上"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stackId="2"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.4}
                  name="支出"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="quarter"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#D1D5DB' }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={{ stroke: '#D1D5DB' }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0066CC"
                  strokeWidth={3}
                  dot={{ fill: '#0066CC', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#0066CC', strokeWidth: 2 }}
                  name="四半期売上"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gradient-to-r from-engineering-blue/10 to-engineering-green/10 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">成長率</span>
              </div>
              <p className="text-xl font-bold text-green-600">+23.4%</p>
              <p className="text-xs text-gray-500">前年同期比</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">平均案件単価</span>
              </div>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(5420000)}</p>
              <p className="text-xs text-gray-500">過去6ヶ月平均</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">予想年間売上</span>
              </div>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(278000000)}</p>
              <p className="text-xs text-gray-500">現在のペース</p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}