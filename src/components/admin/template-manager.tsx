"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye
} from 'lucide-react'

interface Template {
  id: string
  name: string
  type: string
  fileName: string
  fileSize: number
  fileExists: boolean
  label: string
  updated_at: string
}

const templateTypes = [
  { value: 'order', label: '発注書', description: 'プロジェクト発注時に使用' },
  { value: 'completion', label: '完了届', description: 'プロジェクト完了時に使用' },
  { value: 'monthly_invoice', label: '月次請求書', description: '月次システム利用料請求に使用' }
]

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedType, setSelectedType] = useState<string>('')
  const [templateName, setTemplateName] = useState<string>('')

  const fetchTemplates = async () => {
    try {
      setError(null)
      const response = await fetch('/api/templates/upload')

      if (!response.ok) {
        throw new Error('テンプレート一覧取得に失敗しました')
      }

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err: any) {
      setError(err.message)
      console.error('テンプレート取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // ファイル名からテンプレート名を推測
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      setTemplateName(baseName)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      setError('ファイルとテンプレートタイプを選択してください')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', selectedType)
      formData.append('name', templateName)

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      const result = await response.json()
      console.log('✅ テンプレートアップロード成功:', result)

      // フォームをリセット
      setSelectedFile(null)
      setSelectedType('')
      setTemplateName('')

      // ファイル入力をリセット
      const fileInput = document.getElementById('template-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // テンプレート一覧を更新
      await fetchTemplates()

    } catch (err: any) {
      setError(err.message)
      console.error('アップロードエラー:', err)
    } finally {
      setUploading(false)
    }
  }

  const getStatusIcon = (template: Template) => {
    if (template.fileExists) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    } else {
      return <AlertCircle className="w-5 h-5 text-red-600" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">テンプレート読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ドキュメントテンプレート管理
              </h2>
              <p className="text-gray-600 text-sm">
                電子署名用のExcelテンプレートをアップロード・管理します
              </p>
            </div>
          </div>

          <button
            onClick={fetchTemplates}
            className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
            title="更新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">エラー</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* アップロードフォーム */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">新しいテンプレートをアップロード</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テンプレートファイル
              </label>
              <input
                id="template-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Excel形式（.xlsx, .xls）のファイルのみ対応
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テンプレートタイプ
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">選択してください</option>
                {templateTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テンプレート名（任意）
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="自動生成されます"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedType}
              className={`w-full px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                uploading || !selectedFile || !selectedType
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  アップロード
                </>
              )}
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">テンプレート仕様</h4>
            <div className="space-y-3 text-sm">
              {templateTypes.map((type) => (
                <div key={type.value} className="border-l-4 border-blue-500 pl-3">
                  <div className="font-medium text-gray-800">{type.label}</div>
                  <div className="text-gray-600">{type.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>重要:</strong> テンプレートのセル配置については、
                <code className="bg-blue-100 px-1 rounded">templates/README.md</code>
                を参照してください。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* テンプレート一覧 */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">現在のテンプレート</h3>
          <p className="text-sm text-gray-600 mt-1">
            アップロード済みのテンプレート一覧
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          <AnimatePresence>
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(template)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {template.name}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <span className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-2">
                          {template.label}
                        </span>
                        <span>{template.fileName}</span>
                        <span className="mx-2">•</span>
                        <span>{formatFileSize(template.fileSize)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        更新: {new Date(template.updated_at).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      {template.fileExists ? (
                        <span className="text-green-600 font-medium">利用可能</span>
                      ) : (
                        <span className="text-red-600 font-medium">ファイル未検出</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {templates.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                テンプレートがありません
              </h3>
              <p className="text-gray-600">
                上記のフォームから最初のテンプレートをアップロードしてください
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}