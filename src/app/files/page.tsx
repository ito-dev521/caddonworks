"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload,
  Download,
  Eye,
  Share2,
  Lock,
  Shield,
  FileText,
  Image,
  Archive,
  Search,
  Filter,
  Grid3X3,
  List,
  FolderOpen,
  File,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  UserCheck
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { FileUploadZone } from "@/components/files/file-upload-zone"
import { FilePreview } from "@/components/files/file-preview"
import { AccessControlModal } from "@/components/files/access-control-modal"
import { formatDate } from "@/lib/utils"

export default function FilesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [showAccessControl, setShowAccessControl] = useState<string | null>(null)

  // ファイルデータ（実装時に実際のAPIから取得）
  const files: any[] = []

  const getFileIcon = (type: string) => {
    const icons = {
      dwg: <FileText className="w-8 h-8 text-blue-600" />,
      pdf: <FileText className="w-8 h-8 text-red-600" />,
      xlsx: <FileText className="w-8 h-8 text-green-600" />,
      docx: <FileText className="w-8 h-8 text-blue-600" />,
      jpg: <Image className="w-8 h-8 text-purple-600" />,
      png: <Image className="w-8 h-8 text-purple-600" />
    }
    return icons[type as keyof typeof icons] || <File className="w-8 h-8 text-gray-600" />
  }

  const getScanStatusIcon = (status: string) => {
    switch (status) {
      case 'clean':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'infected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'scanning':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
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
                  <FolderOpen className="w-6 h-6 text-engineering-blue" />
                  ファイル管理システム
                </h1>
                <p className="text-gray-600">Box API連携セキュアファイル管理 (VDR)</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="engineering" className="animate-pulse">
                  <Shield className="w-3 h-3 mr-1" />
                  セキュア
                </Badge>
                <Button variant="outline" onClick={() => setShowUpload(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  アップロード
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* Storage Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総ファイル数</p>
                    <p className="text-3xl font-bold text-gray-900">1,247</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ストレージ使用量</p>
                    <p className="text-2xl font-bold text-engineering-blue">847 GB</p>
                    <Progress value={65} variant="engineering" className="mt-2" />
                  </div>
                  <div className="p-3 bg-engineering-blue/10 rounded-lg">
                    <Archive className="w-6 h-6 text-engineering-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">セキュリティスキャン</p>
                    <p className="text-3xl font-bold text-green-600">100%</p>
                    <p className="text-xs text-green-600">全ファイル安全</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">アクセス制御</p>
                    <p className="text-3xl font-bold text-purple-600">VDR</p>
                    <p className="text-xs text-purple-600">完全閉域</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Lock className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Controls */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="ファイル名、プロジェクト、タグで検索..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    フィルター
                  </Button>
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === 'grid' ? 'engineering' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-none border-none"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'engineering' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-none border-none border-l border-gray-200"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Grid/List */}
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {files.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full hover-lift group relative overflow-hidden">
                      {file.checkInStatus === 'locked' && (
                        <div className="absolute top-4 right-4 z-10">
                          <Lock className="w-5 h-5 text-red-500" />
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {getFileIcon(file.type)}
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base truncate group-hover:text-engineering-blue transition-colors">
                                {file.name}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                v{file.version} • {formatFileSize(file.size)}
                              </CardDescription>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <StatusIndicator status={file.status} size="sm" />
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {getScanStatusIcon(file.scanStatus)}
                            {file.scanStatus}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* File Preview */}
                        {file.previewUrl && (
                          <div
                            className="aspect-video bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center"
                            onClick={() => setShowPreview(file.id)}
                          >
                            <Eye className="w-8 h-8 text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500">プレビュー</span>
                          </div>
                        )}

                        {/* File Metadata */}
                        <div className="space-y-2 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>プロジェクト:</span>
                            <span className="font-medium truncate ml-2">{file.project}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>アップロード:</span>
                            <span>{file.uploadedBy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>最終更新:</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString('ja-JP')}</span>
                          </div>
                          {file.checkOutBy && (
                            <div className="flex justify-between">
                              <span>チェックアウト:</span>
                              <span className="text-orange-600 font-medium">{file.checkOutBy}</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {file.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="flex items-center text-xs text-gray-500">
                            <Activity className="w-3 h-3 mr-1" />
                            {file.downloadCount} DL
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowPreview(file.id)}
                              className="group/btn"
                            >
                              <Eye className="w-4 h-4 group-hover/btn:text-engineering-blue" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!file.permissions.canDownload}
                              className="group/btn"
                            >
                              <Download className="w-4 h-4 group-hover/btn:text-engineering-blue" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowAccessControl(file.id)}
                              className="group/btn"
                            >
                              <UserCheck className="w-4 h-4 group-hover/btn:text-engineering-blue" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>

                      {/* Security overlay for sensitive files */}
                      {file.status === 'final' && (
                        <div className="absolute inset-0 bg-gradient-to-br from-engineering-blue/5 to-engineering-green/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
                      )}
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {files.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover-lift">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {getFileIcon(file.type)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
                            <p className="text-sm text-gray-600">
                              v{file.version} • {formatFileSize(file.size)} • {file.project}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIndicator status={file.status} size="sm" />
                            {getScanStatusIcon(file.scanStatus)}
                            {file.checkInStatus === 'locked' && <Lock className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => setShowPreview(file.id)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" disabled={!file.permissions.canDownload}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowAccessControl(file.id)}>
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <FileUploadZone isOpen={showUpload} onClose={() => setShowUpload(false)} />

      {showPreview && (
        <FilePreview
          fileId={showPreview}
          onClose={() => setShowPreview(null)}
        />
      )}

      {showAccessControl && (
        <AccessControlModal
          fileId={showAccessControl}
          onClose={() => setShowAccessControl(null)}
        />
      )}
    </div>
  )
}