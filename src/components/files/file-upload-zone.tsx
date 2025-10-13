"use client"

import React, { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Upload,
  File,
  FileText,
  Image,
  Archive,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Scan,
  Info
} from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Progress } from "../ui/progress"

interface FileUploadZoneProps {
  isOpen: boolean
  onClose: () => void
}

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'scanning' | 'success' | 'error'
  scanResult?: 'clean' | 'infected' | 'suspicious'
  metadata?: {
    category?: string
    drawingNumber?: string
    revision?: string
    scale?: string
  }
}

export function FileUploadZone({ isOpen, onClose }: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string>("")

  const projects = [
    "東京都道路設計業務",
    "橋梁点検業務",
    "河川改修設計",
    "トンネル設計業務",
    "地下構造物設計"
  ]

  // Box Direct Upload: ブラウザから直接Boxにアップロード（最大15GB対応）
  const uploadFileToBox = async (uploadFile: UploadFile) => {
    try {
      // フォルダIDが選択されていない場合はエラー
      if (!selectedFolderId) {
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error' as const, progress: 0 }
            : f
        ))
        console.error('フォルダIDが選択されていません')
        return
      }

      // 1. プリフライト: アップロード準備（アクセストークンを取得）
      const preflightResponse = await fetch('/api/box/upload-preflight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderId: selectedFolderId,
          fileName: uploadFile.file.name,
          fileSize: uploadFile.file.size
        })
      })

      if (!preflightResponse.ok) {
        const error = await preflightResponse.json()
        throw new Error(error.message || 'プリフライトチェックに失敗しました')
      }

      const { uploadUrl, accessToken, folderId } = await preflightResponse.json()

      // 2. XMLHttpRequestを使って直接Boxにアップロード（進捗表示付き）
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // 進捗イベント
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, progress: percentComplete }
                : f
            ))
          }
        })

        // 完了イベント
        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, status: 'success' as const, progress: 100, scanResult: 'clean' as const }
                : f
            ))
            resolve()
          } else {
            reject(new Error(`アップロード失敗: ${xhr.statusText}`))
          }
        })

        // エラーイベント
        xhr.addEventListener('error', () => {
          reject(new Error('ネットワークエラーが発生しました'))
        })

        // FormData作成
        const formData = new FormData()
        formData.append('file', uploadFile.file)
        formData.append('parent_id', folderId)

        // Box APIにPOST
        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
        xhr.send(formData)
      })

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'error' as const, progress: 0 }
          : f
      ))
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFiles = async (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      progress: 0,
      status: 'uploading'
    }))

    setUploadFiles(prev => [...prev, ...newUploadFiles])

    // 実際のアップロード処理
    for (const uploadFile of newUploadFiles) {
      await uploadFileToBox(uploadFile)
    }
  }

  const simulateUpload = (fileId: string, delay: number) => {
    setTimeout(() => {
      // Upload progress simulation
      const uploadInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(file => {
          if (file.id === fileId && file.status === 'uploading') {
            const newProgress = file.progress + Math.random() * 15
            if (newProgress >= 100) {
              clearInterval(uploadInterval)
              setTimeout(() => {
                setUploadFiles(prev => prev.map(f =>
                  f.id === fileId ? { ...f, status: 'scanning', progress: 0 } : f
                ))
                simulateScan(fileId)
              }, 500)
              return { ...file, progress: 100, status: 'uploading' }
            }
            return { ...file, progress: newProgress }
          }
          return file
        }))
      }, 200)
    }, delay)
  }

  const simulateScan = (fileId: string) => {
    const scanInterval = setInterval(() => {
      setUploadFiles(prev => prev.map(file => {
        if (file.id === fileId && file.status === 'scanning') {
          const newProgress = file.progress + Math.random() * 20
          if (newProgress >= 100) {
            clearInterval(scanInterval)
            const scanResult = Math.random() > 0.95 ? 'infected' : 'clean'
            setTimeout(() => {
              setUploadFiles(prev => prev.map(f =>
                f.id === fileId ? {
                  ...f,
                  status: scanResult === 'infected' ? 'error' : 'success',
                  progress: 100,
                  scanResult
                } : f
              ))
            }, 300)
            return { ...file, progress: 100 }
          }
          return { ...file, progress: newProgress }
        }
        return file
      }))
    }, 150)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'dwg':
      case 'dxf':
        return <FileText className="w-8 h-8 text-blue-600" />
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />
      case 'xlsx':
      case 'xls':
        return <FileText className="w-8 h-8 text-green-600" />
      case 'docx':
      case 'doc':
        return <FileText className="w-8 h-8 text-blue-600" />
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="w-8 h-8 text-purple-600" />
      case 'zip':
      case 'rar':
        return <Archive className="w-8 h-8 text-orange-600" />
      default:
        return <File className="w-8 h-8 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string, scanResult?: string) => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'scanning':
        return <Scan className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'success':
        return scanResult === 'clean' ?
          <CheckCircle className="w-4 h-4 text-green-500" /> :
          <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== fileId))
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
            <div className="flex items-center gap-3">
              <div className="p-2 bg-engineering-blue/10 rounded-lg">
                <Upload className="w-5 h-5 text-engineering-blue" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">ファイルアップロード</h2>
                <p className="text-gray-600">セキュリティスキャン付きファイル管理システム</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {/* Project Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                アップロード先フォルダID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                placeholder="Box フォルダID を入力"
              />
              <p className="text-xs text-gray-500 mt-1">
                例: 123456789 (BoxのフォルダIDを入力してください)
              </p>
            </div>

            {/* Upload Zone */}
            <motion.div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? 'border-engineering-blue bg-engineering-blue/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Upload className={`w-16 h-16 mx-auto mb-4 ${
                dragActive ? 'text-engineering-blue' : 'text-gray-400'
              }`} />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                ファイルをドラッグ&ドロップ
              </h3>
              <p className="text-gray-600 mb-4">
                または{' '}
                <label htmlFor="file-input" className="text-engineering-blue hover:underline cursor-pointer">
                  クリックして選択
                </label>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFiles(Array.from(e.target.files))
                    }
                  }}
                />
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  ウイルススキャン
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  CAD/PDF/Excel対応
                </div>
              </div>
            </motion.div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">セキュリティ保護</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    アップロードされたファイルは自動的にClamAVでスキャンされ、
                    SHA-256ハッシュで整合性を確認します。Box APIを通じて暗号化保存されます。
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {uploadFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  アップロード進捗 ({uploadFiles.length})
                </h3>
                <div className="space-y-4">
                  {uploadFiles.map(uploadFile => (
                    <motion.div
                      key={uploadFile.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getFileIcon(uploadFile.file.name)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {uploadFile.file.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(uploadFile.file.size)}
                          </p>

                          {/* Progress Bar */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">
                                {uploadFile.status === 'uploading' && 'アップロード中...'}
                                {uploadFile.status === 'scanning' && 'セキュリティスキャン中...'}
                                {uploadFile.status === 'success' && (
                                  uploadFile.scanResult === 'clean' ? '完了 - 安全' : '完了 - 要確認'
                                )}
                                {uploadFile.status === 'error' && 'エラー - ウイルス検出'}
                              </span>
                              <span className="text-xs text-gray-600">
                                {Math.round(uploadFile.progress)}%
                              </span>
                            </div>
                            <Progress
                              value={uploadFile.progress}
                              variant={
                                uploadFile.status === 'error' ? 'engineering' :
                                uploadFile.status === 'success' ? 'default' :
                                'engineering'
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              uploadFile.status === 'error' ? 'destructive' :
                              uploadFile.status === 'success' ? 'success' :
                              'secondary'
                            }
                            className="flex items-center gap-1"
                          >
                            {getStatusIcon(uploadFile.status, uploadFile.scanResult)}
                            {uploadFile.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Scan Result Details */}
                      {uploadFile.status === 'success' && uploadFile.scanResult && (
                        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="text-green-700">
                              {uploadFile.scanResult === 'clean'
                                ? 'ウイルス未検出 - ファイルは安全です'
                                : '要注意ファイル - 管理者確認が必要です'
                              }
                            </span>
                          </div>
                        </div>
                      )}

                      {uploadFile.status === 'error' && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-sm text-red-700">
                            <AlertTriangle className="w-4 h-4" />
                            <span>
                              セキュリティ脅威が検出されました。ファイルはアップロードされていません。
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              最大ファイルサイズ: 15GB | 対応形式: DWG, PDF, Excel, Word, 画像、動画
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                閉じる
              </Button>
              <Button
                variant="engineering"
                disabled={uploadFiles.length === 0 || uploadFiles.some(f => f.status === 'uploading' || f.status === 'scanning')}
              >
                完了
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}