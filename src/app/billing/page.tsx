"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Building,
  Users,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MetricCard } from "@/components/ui/metric-card"
import { BillingChart } from "@/components/billing/billing-chart"
import { InvoiceCard } from "@/components/billing/invoice-card"
import { PayoutCard } from "@/components/billing/payout-card"
import { formatCurrency } from "@/lib/utils"

export default function BillingPage() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'invoices' | 'payouts' | 'analytics'>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState('current')

  // Mock billing data
  const billingMetrics = {
    totalRevenue: 278500000,
    monthlyRevenue: 23200000,
    totalPayouts: 195000000,
    monthlyPayouts: 16240000,
    systemFees: 83500000,
    monthlySystemFees: 6960000,
    pendingInvoices: 12,
    overdueInvoices: 3,
    processingPayouts: 8,
    profitMargin: 29.8
  }

  const invoices = [
    {
      id: "INV-2024-001",
      clientOrg: "東京都建設局",
      period: "2024年1月",
      baseAmount: 15600000,
      feeAmount: 4680000,
      systemFee: 50000,
      totalAmount: 20330000,
      status: "paid",
      issueDate: "2024-01-31",
      dueDate: "2024-02-29",
      paidDate: "2024-02-15",
      projects: [
        { name: "東京都道路設計業務", amount: 5200000 },
        { name: "橋梁点検業務", amount: 3800000 },
        { name: "河川改修設計", amount: 6600000 }
      ]
    },
    {
      id: "INV-2024-002",
      clientOrg: "国土交通省",
      period: "2024年1月",
      baseAmount: 8900000,
      feeAmount: 2670000,
      systemFee: 50000,
      totalAmount: 11620000,
      status: "issued",
      issueDate: "2024-02-01",
      dueDate: "2024-03-01",
      paidDate: null,
      projects: [
        { name: "トンネル設計業務", amount: 8900000 }
      ]
    },
    {
      id: "INV-2024-003",
      clientOrg: "県土整備部",
      period: "2024年1月",
      baseAmount: 4200000,
      feeAmount: 1260000,
      systemFee: 50000,
      totalAmount: 5510000,
      status: "overdue",
      issueDate: "2024-01-31",
      dueDate: "2024-02-29",
      paidDate: null,
      projects: [
        { name: "地下構造物設計", amount: 4200000 }
      ]
    }
  ]

  const payouts = [
    {
      id: "PAY-2024-001",
      contractorOrg: "田中設計事務所",
      contractorUser: "田中太郎",
      period: "2024年1月",
      amount: 3640000,
      status: "paid",
      scheduledDate: "2024-01-31",
      paidDate: "2024-01-31",
      method: "銀行振込",
      projects: [
        { name: "東京都道路設計業務", amount: 5200000, payout: 3640000 }
      ]
    },
    {
      id: "PAY-2024-002",
      contractorOrg: "佐藤エンジニアリング",
      contractorUser: "佐藤花子",
      period: "2024年1月",
      amount: 2660000,
      status: "scheduled",
      scheduledDate: "2024-02-29",
      paidDate: null,
      method: "銀行振込",
      projects: [
        { name: "橋梁点検業務", amount: 3800000, payout: 2660000 }
      ]
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100'
      case 'issued':
        return 'text-blue-600 bg-blue-100'
      case 'overdue':
        return 'text-red-600 bg-red-100'
      case 'scheduled':
        return 'text-yellow-600 bg-yellow-100'
      case 'processing':
        return 'text-purple-600 bg-purple-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />
      case 'issued':
        return <Send className="w-4 h-4" />
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />
      case 'scheduled':
        return <Clock className="w-4 h-4" />
      case 'processing':
        return <CreditCard className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />

      <div className="md:ml-64 transition-all duration-300">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-engineering-blue" />
                  会計・請求システム
                </h1>
                <p className="text-gray-600">運営会社による一括請求・支払代行システム</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="engineering" className="animate-pulse">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  月間売上: {formatCurrency(billingMetrics.monthlyRevenue)}
                </Badge>
                <Button variant="engineering">
                  <Download className="w-4 h-4 mr-2" />
                  月次レポート
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="月間売上"
              value={formatCurrency(billingMetrics.monthlyRevenue)}
              icon={<TrendingUp className="w-6 h-6" />}
              trend={{ value: 12.5, isPositive: true }}
              variant="engineering"
            />
            <MetricCard
              title="月間支払"
              value={formatCurrency(billingMetrics.monthlyPayouts)}
              icon={<ArrowUpRight className="w-6 h-6" />}
              trend={{ value: 8.3, isPositive: true }}
              variant="gradient"
            />
            <MetricCard
              title="システム手数料"
              value={formatCurrency(billingMetrics.monthlySystemFees)}
              icon={<PieChart className="w-6 h-6" />}
              trend={{ value: 15.2, isPositive: true }}
              variant="glass"
            />
            <MetricCard
              title="利益率"
              value={`${billingMetrics.profitMargin}%`}
              icon={<BarChart3 className="w-6 h-6" />}
              trend={{ value: 2.1, isPositive: true }}
              variant="default"
            />
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">未払い請求書</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-red-600">{billingMetrics.overdueInvoices}</p>
                      <p className="text-sm text-gray-500">/ {billingMetrics.pendingInvoices}件</p>
                    </div>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">支払処理中</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-purple-600">{billingMetrics.processingPayouts}</p>
                      <p className="text-sm text-gray-500">件</p>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">今月の純利益</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(billingMetrics.monthlyRevenue - billingMetrics.monthlyPayouts)}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <ArrowDownRight className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {[
                  { id: 'overview', label: '概要', icon: BarChart3 },
                  { id: 'invoices', label: '請求管理', icon: Receipt, count: billingMetrics.pendingInvoices },
                  { id: 'payouts', label: '支払管理', icon: CreditCard, count: billingMetrics.processingPayouts },
                  { id: 'analytics', label: '分析・レポート', icon: TrendingUp }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      selectedTab === tab.id
                        ? 'border-engineering-blue text-engineering-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <Badge variant="destructive" className="ml-1 text-xs">
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {/* Overview */}
            {selectedTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <BillingChart />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Invoices */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-engineering-blue" />
                        最近の請求書
                      </CardTitle>
                      <CardDescription>直近の請求状況</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {invoices.slice(0, 3).map((invoice, index) => (
                          <motion.div
                            key={invoice.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{invoice.clientOrg}</div>
                              <div className="text-sm text-gray-600">{invoice.period}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-engineering-blue">
                                {formatCurrency(invoice.totalAmount)}
                              </div>
                              <Badge className={getStatusColor(invoice.status)}>
                                {getStatusIcon(invoice.status)}
                                <span className="ml-1">
                                  {invoice.status === 'paid' && '支払済'}
                                  {invoice.status === 'issued' && '発行済'}
                                  {invoice.status === 'overdue' && '未払'}
                                </span>
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Payouts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-engineering-green" />
                        最近の支払
                      </CardTitle>
                      <CardDescription>受注者への支払状況</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {payouts.slice(0, 3).map((payout, index) => (
                          <motion.div
                            key={payout.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{payout.contractorUser}</div>
                              <div className="text-sm text-gray-600">{payout.period}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-engineering-green">
                                {formatCurrency(payout.amount)}
                              </div>
                              <Badge className={getStatusColor(payout.status)}>
                                {getStatusIcon(payout.status)}
                                <span className="ml-1">
                                  {payout.status === 'paid' && '支払済'}
                                  {payout.status === 'scheduled' && '予定'}
                                  {payout.status === 'processing' && '処理中'}
                                </span>
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Invoices */}
            {selectedTab === 'invoices' && (
              <motion.div
                key="invoices"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">請求書管理</h2>
                  <div className="flex gap-2">
                    <select
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                    >
                      <option value="current">今月</option>
                      <option value="last">先月</option>
                      <option value="quarter">今四半期</option>
                      <option value="year">今年</option>
                    </select>
                    <Button variant="engineering">
                      <Send className="w-4 h-4 mr-2" />
                      一括送信
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {invoices.map((invoice, index) => (
                    <InvoiceCard key={invoice.id} invoice={invoice} index={index} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Payouts */}
            {selectedTab === 'payouts' && (
              <motion.div
                key="payouts"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">支払管理</h2>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Calendar className="w-4 h-4 mr-2" />
                      支払スケジュール
                    </Button>
                    <Button variant="engineering">
                      <CreditCard className="w-4 h-4 mr-2" />
                      一括支払処理
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {payouts.map((payout, index) => (
                    <PayoutCard key={payout.id} payout={payout} index={index} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Analytics */}
            {selectedTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-gray-900">財務分析・レポート</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>収益構造分析</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">基本売上</span>
                            <span className="font-semibold">{formatCurrency(195000000)}</span>
                          </div>
                          <Progress value={70} variant="engineering" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">手数料収入 (30%)</span>
                            <span className="font-semibold">{formatCurrency(58500000)}</span>
                          </div>
                          <Progress value={21} variant="gradient" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">システム利用料</span>
                            <span className="font-semibold">{formatCurrency(25000000)}</span>
                          </div>
                          <Progress value={9} variant="glass" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>月別推移</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { month: '10月', revenue: 18500000, growth: 8.5 },
                          { month: '11月', revenue: 21200000, growth: 14.6 },
                          { month: '12月', revenue: 19800000, growth: -6.6 },
                          { month: '1月', revenue: 23200000, growth: 17.2 }
                        ].map((item, index) => (
                          <motion.div
                            key={item.month}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <span className="font-medium">{item.month}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                              <div className="flex items-center gap-1">
                                {item.growth > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                ) : (
                                  <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                                )}
                                <span className={`text-sm font-medium ${
                                  item.growth > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {Math.abs(item.growth)}%
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}