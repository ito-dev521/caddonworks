"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Calendar,
  Upload,
  Plus,
  Trash2,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface Project {
  id: string
  title: string
  description: string
  location: string
  category: string
  start_date: string
  end_date: string
  budget: number
}

interface Contract {
  id: string
  bid_amount: number
  start_date: string
  end_date: string
  signed_at: string
}

interface Deliverable {
  id?: string
  name: string
  type: 'drawing' | 'calculation' | 'report' | 'photo' | 'other'
  description: string
  file_id?: string
  category: string
  subcategory?: string
}

interface TechnicalStaff {
  name: string
  role: string
  qualification: string
}

interface Technology {
  name: string
  description: string
}

interface CompletionReportData {
  id?: string
  project_id: string
  contract_id: string
  actual_completion_date: string
  work_summary: string
  deliverables: Deliverable[]
  technical_staff: TechnicalStaff[]
  technologies_used: Technology[]
  special_notes: string
  quality_check_results: {
    technical_review: string
    quality_inspection: string
    legal_compliance: string
  }
  environmental_considerations: string
  self_evaluation: string
  improvement_points: string
  proposals: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
}

interface CompletionReportFormProps {
  project: Project
  contract: Contract
  onSubmit: (data: CompletionReportData) => void
  onSave: (data: CompletionReportData) => void
  existingReport?: CompletionReportData
  readOnly?: boolean
}

export function CompletionReportForm({
  project,
  contract,
  onSubmit,
  onSave,
  existingReport,
  readOnly = false
}: CompletionReportFormProps) {
  const { userProfile } = useAuth()
  const [formData, setFormData] = useState<CompletionReportData>({
    project_id: project.id,
    contract_id: contract.id,
    actual_completion_date: new Date().toISOString().split('T')[0],
    work_summary: '',
    deliverables: [],
    technical_staff: [],
    technologies_used: [],
    special_notes: '',
    quality_check_results: {
      technical_review: '',
      quality_inspection: '',
      legal_compliance: ''
    },
    environmental_considerations: '',
    self_evaluation: '',
    improvement_points: '',
    proposals: '',
    status: 'draft',
    ...existingReport
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // ファイルタイプのアイコンを取得
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'drawing': return <FileCode className="w-4 h-4" />
      case 'calculation': return <FileSpreadsheet className="w-4 h-4" />
      case 'report': return <FileText className="w-4 h-4" />
      case 'photo': return <FileImage className="w-4 h-4" />
      default: return <File className="w-4 h-4" />
    }
  }

  // 成果物を追加
  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        {
          name: '',
          type: 'drawing',
          description: '',
          category: '設計図面'
        }
      ]
    }))
  }

  // 成果物を削除
  const removeDeliverable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }))
  }

  // 技術者を追加
  const addTechnicalStaff = () => {
    setFormData(prev => ({
      ...prev,
      technical_staff: [
        ...prev.technical_staff,
        {
          name: '',
          role: '',
          qualification: ''
        }
      ]
    }))
  }

  // 技術者を削除
  const removeTechnicalStaff = (index: number) => {
    setFormData(prev => ({
      ...prev,
      technical_staff: prev.technical_staff.filter((_, i) => i !== index)
    }))
  }

  // 技術・工法を追加
  const addTechnology = () => {
    setFormData(prev => ({
      ...prev,
      technologies_used: [
        ...prev.technologies_used,
        {
          name: '',
          description: ''
        }
      ]
    }))
  }

  // 技術・工法を削除
  const removeTechnology = (index: number) => {
    setFormData(prev => ({
      ...prev,
      technologies_used: prev.technologies_used.filter((_, i) => i !== index)
    }))
  }

  // バリデーション
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.actual_completion_date) {
      newErrors.actual_completion_date = '実際の完了日は必須です'
    }
    if (!formData.work_summary.trim()) {
      newErrors.work_summary = '業務内容の要約は必須です'
    }
    if (formData.deliverables.length === 0) {
      newErrors.deliverables = '成果物を少なくとも1つ追加してください'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 下書き保存
  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  // 提出
  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        status: 'submitted'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-800' },
      submitted: { label: '提出済み', className: 'bg-blue-100 text-blue-800' },
      under_review: { label: '審査中', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '承認済み', className: 'bg-green-100 text-green-800' },
      rejected: { label: '差し戻し', className: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                業務完了届
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {project.title}
              </p>
            </div>
            {getStatusBadge(formData.status)}
          </div>
        </CardHeader>
      </Card>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">業務名</label>
              <input
                type="text"
                value={project.title}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">業務場所</label>
              <input
                type="text"
                value={project.location}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">契約期間</label>
              <input
                type="text"
                value={`${contract.start_date} ～ ${contract.end_date}`}
                disabled
                className="w-full px-3 py-2 border rounded-md bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">実際の完了日 *</label>
              <input
                type="date"
                value={formData.actual_completion_date}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_completion_date: e.target.value }))}
                disabled={readOnly}
                className="w-full px-3 py-2 border rounded-md"
              />
              {errors.actual_completion_date && (
                <p className="text-red-500 text-sm mt-1">{errors.actual_completion_date}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 業務内容 */}
      <Card>
        <CardHeader>
          <CardTitle>業務内容</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">業務内容の要約 *</label>
            <textarea
              value={formData.work_summary}
              onChange={(e) => setFormData(prev => ({ ...prev, work_summary: e.target.value }))}
              disabled={readOnly}
              rows={4}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="実施した業務の概要を記載してください"
            />
            {errors.work_summary && (
              <p className="text-red-500 text-sm mt-1">{errors.work_summary}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">特記事項</label>
            <textarea
              value={formData.special_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, special_notes: e.target.value }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="変更事項、課題、対応策等を記載してください"
            />
          </div>
        </CardContent>
      </Card>

      {/* 成果物一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>成果物一覧</CardTitle>
            {!readOnly && (
              <Button onClick={addDeliverable} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                成果物を追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {formData.deliverables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              成果物が登録されていません
            </div>
          ) : (
            <div className="space-y-4">
              {formData.deliverables.map((deliverable, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(deliverable.type)}
                      <span className="font-medium">成果物 {index + 1}</span>
                    </div>
                    {!readOnly && (
                      <Button
                        onClick={() => removeDeliverable(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">ファイル名</label>
                      <input
                        type="text"
                        value={deliverable.name}
                        onChange={(e) => {
                          const updated = [...formData.deliverables]
                          updated[index] = { ...updated[index], name: e.target.value }
                          setFormData(prev => ({ ...prev, deliverables: updated }))
                        }}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="ファイル名を入力"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">種別</label>
                      <select
                        value={deliverable.type}
                        onChange={(e) => {
                          const updated = [...formData.deliverables]
                          updated[index] = { ...updated[index], type: e.target.value as any }
                          setFormData(prev => ({ ...prev, deliverables: updated }))
                        }}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="drawing">設計図面</option>
                        <option value="calculation">計算書</option>
                        <option value="report">報告書</option>
                        <option value="photo">写真</option>
                        <option value="other">その他</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">分類</label>
                      <input
                        type="text"
                        value={deliverable.category}
                        onChange={(e) => {
                          const updated = [...formData.deliverables]
                          updated[index] = { ...updated[index], category: e.target.value }
                          setFormData(prev => ({ ...prev, deliverables: updated }))
                        }}
                        disabled={readOnly}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="分類を入力"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">説明</label>
                    <textarea
                      value={deliverable.description}
                      onChange={(e) => {
                        const updated = [...formData.deliverables]
                        updated[index] = { ...updated[index], description: e.target.value }
                        setFormData(prev => ({ ...prev, deliverables: updated }))
                      }}
                      disabled={readOnly}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="成果物の説明を入力"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {errors.deliverables && (
            <p className="text-red-500 text-sm mt-2">{errors.deliverables}</p>
          )}
        </CardContent>
      </Card>

      {/* 技術者情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>業務実施体制</CardTitle>
            {!readOnly && (
              <Button onClick={addTechnicalStaff} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                技術者を追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {formData.technical_staff.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              技術者が登録されていません
            </div>
          ) : (
            <div className="space-y-3">
              {formData.technical_staff.map((staff, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <input
                      type="text"
                      value={staff.name}
                      onChange={(e) => {
                        const updated = [...formData.technical_staff]
                        updated[index] = { ...updated[index], name: e.target.value }
                        setFormData(prev => ({ ...prev, technical_staff: updated }))
                      }}
                      disabled={readOnly}
                      placeholder="氏名"
                      className="px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="text"
                      value={staff.role}
                      onChange={(e) => {
                        const updated = [...formData.technical_staff]
                        updated[index] = { ...updated[index], role: e.target.value }
                        setFormData(prev => ({ ...prev, technical_staff: updated }))
                      }}
                      disabled={readOnly}
                      placeholder="担当業務"
                      className="px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="text"
                      value={staff.qualification}
                      onChange={(e) => {
                        const updated = [...formData.technical_staff]
                        updated[index] = { ...updated[index], qualification: e.target.value }
                        setFormData(prev => ({ ...prev, technical_staff: updated }))
                      }}
                      disabled={readOnly}
                      placeholder="資格"
                      className="px-3 py-2 border rounded-md text-sm"
                    />
                  </div>
                  {!readOnly && (
                    <Button
                      onClick={() => removeTechnicalStaff(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用技術・工法 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>使用技術・工法</CardTitle>
            {!readOnly && (
              <Button onClick={addTechnology} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                技術・工法を追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {formData.technologies_used.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              技術・工法が登録されていません
            </div>
          ) : (
            <div className="space-y-3">
              {formData.technologies_used.map((tech, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={tech.name}
                        onChange={(e) => {
                          const updated = [...formData.technologies_used]
                          updated[index] = { ...updated[index], name: e.target.value }
                          setFormData(prev => ({ ...prev, technologies_used: updated }))
                        }}
                        disabled={readOnly}
                        placeholder="技術・工法名"
                        className="w-full px-3 py-2 border rounded-md text-sm font-medium"
                      />
                      <textarea
                        value={tech.description}
                        onChange={(e) => {
                          const updated = [...formData.technologies_used]
                          updated[index] = { ...updated[index], description: e.target.value }
                          setFormData(prev => ({ ...prev, technologies_used: updated }))
                        }}
                        disabled={readOnly}
                        placeholder="詳細説明"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                    {!readOnly && (
                      <Button
                        onClick={() => removeTechnology(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 品質管理 */}
      <Card>
        <CardHeader>
          <CardTitle>品質管理情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">技術的照査結果</label>
            <textarea
              value={formData.quality_check_results.technical_review}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                quality_check_results: {
                  ...prev.quality_check_results,
                  technical_review: e.target.value
                }
              }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="技術的照査の結果を記載してください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">品質検査結果</label>
            <textarea
              value={formData.quality_check_results.quality_inspection}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                quality_check_results: {
                  ...prev.quality_check_results,
                  quality_inspection: e.target.value
                }
              }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="品質検査の結果を記載してください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">法令適合性確認</label>
            <textarea
              value={formData.quality_check_results.legal_compliance}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                quality_check_results: {
                  ...prev.quality_check_results,
                  legal_compliance: e.target.value
                }
              }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="関連法令への適合性について記載してください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">環境配慮事項</label>
            <textarea
              value={formData.environmental_considerations}
              onChange={(e) => setFormData(prev => ({ ...prev, environmental_considerations: e.target.value }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="環境負荷軽減の取り組み等を記載してください"
            />
          </div>
        </CardContent>
      </Card>

      {/* 評価・反省 */}
      <Card>
        <CardHeader>
          <CardTitle>評価・反省</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">自己評価</label>
            <textarea
              value={formData.self_evaluation}
              onChange={(e) => setFormData(prev => ({ ...prev, self_evaluation: e.target.value }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="業務の自己評価を記載してください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">改善点</label>
            <textarea
              value={formData.improvement_points}
              onChange={(e) => setFormData(prev => ({ ...prev, improvement_points: e.target.value }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="今後の改善課題を記載してください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">提案事項</label>
            <textarea
              value={formData.proposals}
              onChange={(e) => setFormData(prev => ({ ...prev, proposals: e.target.value }))}
              disabled={readOnly}
              rows={3}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="発注者への提案事項を記載してください"
            />
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      {!readOnly && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={handleSave}
                variant="outline"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-1" />
                下書き保存
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={loading || formData.status !== 'draft'}
                className="bg-engineering-blue hover:bg-engineering-blue-dark"
              >
                <Send className="w-4 h-4 mr-1" />
                提出
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}