"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Upload,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  Users,
  Tag,
  AlertCircle,
  CheckCircle,
  Building
} from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { supabase } from "@/lib/supabase"

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client: "",
    location: "",
    budget: "",
    startDate: "",
    dueDate: "",
    category: "",
    priority: "medium",
    tags: [] as string[],
    requirements: "",
    standards: [] as string[]
  })

  const steps = [
    { id: 1, title: "基本情報", description: "プロジェクトの概要を入力" },
    { id: 2, title: "詳細設定", description: "期間、予算、場所の設定" },
    { id: 3, title: "要件・基準", description: "技術要件と適用基準の選択" },
    { id: 4, title: "確認・作成", description: "入力内容の確認と作成" }
  ]

  const categories = [
    "道路", "河川", "橋梁", "構造物", "上下水道", "共同溝", "造成", "電気設備"
  ]

  const standardsList = [
    "道路構造令", "道路橋示方書", "河川管理施設等構造令", "トンネル標準示方書",
    "土木学会指針", "NEXCO設計要領", "下水道施設設計指針", "港湾構造物設計基準"
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Supabaseからセッションを取得
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        alert('認証が必要です。再度ログインしてください。')
        return
      }

      // リクエストデータをログ出力
      const requestData = {
        title: formData.title,
        description: formData.description,
        budget: formData.budget,
        start_date: formData.startDate,
        end_date: formData.dueDate,
        category: formData.category
      }

      // APIエンドポイントを呼び出し
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (response.ok) {
        alert('案件が正常に作成されました！')
        onSuccess?.()
        onClose()
        // フォームをリセット
        setFormData({
          title: "",
          description: "",
          client: "",
          location: "",
          budget: "",
          startDate: "",
          dueDate: "",
          category: "",
          priority: "medium",
          tags: [],
          requirements: "",
          standards: []
        })
        setCurrentStep(1)
      } else {
        alert(`エラー: ${result.message}`)
      }
    } catch (error) {
      console.error('案件作成エラー:', error)
      alert('案件の作成中にエラーが発生しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, steps.length))
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 1))

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  const addStandard = (standard: string) => {
    if (!formData.standards.includes(standard)) {
      setFormData({ ...formData, standards: [...formData.standards, standard] })
    }
  }

  const removeStandard = (standard: string) => {
    setFormData({ ...formData, standards: formData.standards.filter(s => s !== standard) })
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">新規プロジェクト作成</h2>
              <p className="text-gray-600">土木設計業務の新しい案件を登録します</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <motion.div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step.id
                          ? 'bg-engineering-blue text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                      animate={{
                        backgroundColor: currentStep >= step.id ? '#0066CC' : '#E5E7EB',
                        color: currentStep >= step.id ? '#FFFFFF' : '#6B7280'
                      }}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </motion.div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-engineering-blue' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <FileText className="w-4 h-4 inline mr-2" />
                          プロジェクトタイトル
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="例: 東京都道路設計業務"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Building className="w-4 h-4 inline mr-2" />
                          発注者・クライアント
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="例: 東京都建設局"
                          value={formData.client}
                          onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          カテゴリー
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          required
                        >
                          <option value="">カテゴリーを選択</option>
                          {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          プロジェクト概要
                        </label>
                        <textarea
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="プロジェクトの詳細な説明を入力してください..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          開始日
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          完了予定日
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-2" />
                          予算（円）
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="5000000"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <MapPin className="w-4 h-4 inline mr-2" />
                          所在地
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="東京都新宿区"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <AlertCircle className="w-4 h-4 inline mr-2" />
                          優先度
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { value: 'low', label: '低', color: 'bg-gray-100 text-gray-700' },
                            { value: 'medium', label: '中', color: 'bg-blue-100 text-blue-700' },
                            { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700' },
                            { value: 'critical', label: '緊急', color: 'bg-red-100 text-red-700' }
                          ].map(priority => (
                            <button
                              key={priority.value}
                              type="button"
                              className={`px-3 py-2 rounded-lg border-2 transition-colors ${
                                formData.priority === priority.value
                                  ? 'border-engineering-blue ' + priority.color
                                  : 'border-gray-200 bg-white text-gray-700 hover:' + priority.color
                              }`}
                              onClick={() => setFormData({ ...formData, priority: priority.value })}
                            >
                              {priority.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Requirements */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        適用基準・指針
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                        {standardsList.map(standard => (
                          <button
                            key={standard}
                            type="button"
                            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                              formData.standards.includes(standard)
                                ? 'border-engineering-blue bg-engineering-blue text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-engineering-blue'
                            }`}
                            onClick={() => formData.standards.includes(standard)
                              ? removeStandard(standard)
                              : addStandard(standard)
                            }
                          >
                            {standard}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        技術要件・特記事項
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="特別な技術要件や注意事項があれば記載してください..."
                        value={formData.requirements}
                        onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Tag className="w-4 h-4 inline mr-2" />
                        タグ
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map(tag => (
                          <Badge key={tag} variant="engineering" className="cursor-pointer" onClick={() => removeTag(tag)}>
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="タグを入力してEnterを押す"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addTag(e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>入力内容の確認</CardTitle>
                        <CardDescription>以下の内容でプロジェクトを作成します</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">基本情報</h4>
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                              <p><strong>タイトル:</strong> {formData.title}</p>
                              <p><strong>クライアント:</strong> {formData.client}</p>
                              <p><strong>カテゴリー:</strong> {formData.category}</p>
                              <p><strong>所在地:</strong> {formData.location}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">スケジュール・予算</h4>
                            <div className="mt-2 text-sm text-gray-600 space-y-1">
                              <p><strong>開始日:</strong> {formData.startDate}</p>
                              <p><strong>完了予定:</strong> {formData.dueDate}</p>
                              <p><strong>予算:</strong> ¥{Number(formData.budget).toLocaleString()}</p>
                              <p><strong>優先度:</strong> {formData.priority}</p>
                            </div>
                          </div>
                        </div>
                        {formData.description && (
                          <div>
                            <h4 className="font-semibold text-gray-900">概要</h4>
                            <p className="mt-2 text-sm text-gray-600">{formData.description}</p>
                          </div>
                        )}
                        {formData.standards.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900">適用基準</h4>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {formData.standards.map(standard => (
                                <Badge key={standard} variant="outline">{standard}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {formData.tags.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900">タグ</h4>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {formData.tags.map(tag => (
                                <Badge key={tag} variant="engineering">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              前へ
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                キャンセル
              </Button>
              {currentStep < steps.length ? (
                <Button type="button" variant="engineering" onClick={nextStep}>
                  次へ
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="engineering"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '作成中...' : 'プロジェクト作成'}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}