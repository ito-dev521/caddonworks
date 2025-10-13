"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Filter, Calendar, DollarSign, MapPin, Users } from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"

interface ProjectFiltersProps {
  isOpen: boolean
  onClose: () => void
}

export function ProjectFilters({ isOpen, onClose }: ProjectFiltersProps) {
  const [filters, setFilters] = useState({
    status: [] as string[],
    category: [] as string[],
    priority: [] as string[],
    client: [] as string[],
    location: [] as string[],
    budgetRange: { min: "", max: "" },
    dateRange: { start: "", end: "" }
  })

  const statusOptions = [
    { value: "draft", label: "下書き", color: "bg-gray-100 text-gray-800" },
    { value: "bidding", label: "入札中", color: "bg-blue-100 text-blue-800" },
    { value: "contracted", label: "契約済み", color: "bg-green-100 text-green-800" },
    { value: "in_progress", label: "進行中", color: "bg-yellow-100 text-yellow-800" },
    { value: "submitted", label: "提出済み", color: "bg-purple-100 text-purple-800" },
    { value: "completed", label: "完了", color: "bg-emerald-100 text-emerald-800" },
    { value: "cancelled", label: "キャンセル", color: "bg-red-100 text-red-800" }
  ]

  const categoryOptions = [
    "道路", "河川", "橋梁", "構造物", "上下水道", "共同溝", "造成", "電気設備"
  ]

  const priorityOptions = [
    { value: "low", label: "低", color: "bg-gray-100 text-gray-700" },
    { value: "medium", label: "中", color: "bg-blue-100 text-blue-700" },
    { value: "high", label: "高", color: "bg-orange-100 text-orange-700" },
    { value: "critical", label: "緊急", color: "bg-red-100 text-red-700" }
  ]

  const clientOptions = [
    "東京都建設局", "国土交通省", "県土整備部", "高速道路株式会社", "民間デベロッパー",
    "市役所建設課", "道路公社", "鉄道会社", "電力会社", "ガス会社"
  ]

  const locationOptions = [
    "東京都", "神奈川県", "千葉県", "埼玉県", "大阪府", "愛知県", "福岡県", "静岡県"
  ]

  const toggleFilter = (category: keyof typeof filters, value: string) => {
    if (category === "status" || category === "category" || category === "priority" || category === "client" || category === "location") {
      const current = filters[category] as string[]
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value]
      setFilters({ ...filters, [category]: updated })
    }
  }

  const clearAllFilters = () => {
    setFilters({
      status: [],
      category: [],
      priority: [],
      client: [],
      location: [],
      budgetRange: { min: "", max: "" },
      dateRange: { start: "", end: "" }
    })
  }

  const getActiveFilterCount = () => {
    return filters.status.length +
           filters.category.length +
           filters.priority.length +
           filters.client.length +
           filters.location.length +
           (filters.budgetRange.min || filters.budgetRange.max ? 1 : 0) +
           (filters.dateRange.start || filters.dateRange.end ? 1 : 0)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 300 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 300 }}
          className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-engineering-blue" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">フィルター設定</h2>
                <p className="text-sm text-gray-600">
                  {getActiveFilterCount() > 0 ? `${getActiveFilterCount()}個のフィルターが適用中` : "条件を設定してプロジェクトを絞り込み"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Filter Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
            {/* Status Filter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">ステータス</CardTitle>
                <CardDescription>プロジェクトの進捗状況で絞り込み</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        filters.status.includes(option.value)
                          ? 'border-engineering-blue ' + option.color
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => toggleFilter('status', option.value)}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Filter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">カテゴリー</CardTitle>
                <CardDescription>業務の種類で絞り込み</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categoryOptions.map(category => (
                    <motion.button
                      key={category}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className={`px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                        filters.category.includes(category)
                          ? 'border-engineering-blue bg-engineering-blue text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => toggleFilter('category', category)}
                    >
                      {category}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority Filter */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">優先度</CardTitle>
                <CardDescription>プロジェクトの優先度で絞り込み</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {priorityOptions.map(option => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
                        filters.priority.includes(option.value)
                          ? 'border-engineering-blue ' + option.color
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                      onClick={() => toggleFilter('priority', option.value)}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Client and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    発注者
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {clientOptions.slice(0, 5).map(client => (
                      <label key={client} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-engineering-blue focus:ring-engineering-blue"
                          checked={filters.client.includes(client)}
                          onChange={() => toggleFilter('client', client)}
                        />
                        <span className="text-sm text-gray-700">{client}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    所在地
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {locationOptions.map(location => (
                      <label key={location} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-engineering-blue focus:ring-engineering-blue"
                          checked={filters.location.includes(location)}
                          onChange={() => toggleFilter('location', location)}
                        />
                        <span className="text-sm text-gray-700">{location}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget and Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    予算範囲
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最小</label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        value={filters.budgetRange.min}
                        onChange={(e) => setFilters({
                          ...filters,
                          budgetRange: { ...filters.budgetRange, min: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最大</label>
                      <input
                        type="number"
                        placeholder="999999999"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        value={filters.budgetRange.max}
                        onChange={(e) => setFilters({
                          ...filters,
                          budgetRange: { ...filters.budgetRange, max: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    期間
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始日</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        value={filters.dateRange.start}
                        onChange={(e) => setFilters({
                          ...filters,
                          dateRange: { ...filters.dateRange, start: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了日</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        value={filters.dateRange.end}
                        onChange={(e) => setFilters({
                          ...filters,
                          dateRange: { ...filters.dateRange, end: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={clearAllFilters}
              disabled={getActiveFilterCount() === 0}
            >
              すべてクリア
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="button" variant="engineering" onClick={onClose}>
                フィルター適用 ({getActiveFilterCount()})
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}