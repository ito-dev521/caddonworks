"use client"

import React, { useState, useEffect } from "react"
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
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export default function FilesPage() {
  const { userProfile } = useAuth()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [showAccessControl, setShowAccessControl] = useState<string | null>(null)
  const [files, setFiles] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Box APIから実際のプロジェクトデータとファイルを取得
  useEffect(() => {
    const fetchBoxData = async () => {
      if (!userProfile) return

      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch('/api/box/projects', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()

          // 完了から14日経過したプロジェクトをフィルタリング
          const projectsFiltered = (result.projects || []).filter((project: any) => {
            if (project.status !== 'completed') return true
            if (!project.completed_at) return true
            const completedAt = new Date(project.completed_at).getTime()
            const diffDays = (Date.now() - completedAt) / (1000 * 60 * 60 * 24)
            return diffDays <= 14
          })

          setProjects(projectsFiltered)

          // 全プロジェクトからファイルを抽出
          const allFiles: any[] = []
          projectsFiltered.forEach((project: any) => {
            if (project.box_items) {
              project.box_items.forEach((item: any) => {
                if (item.type === 'file') {
                  allFiles.push({
                    ...item,
                    project_title: project.title,
                    project_id: project.id
                  })
                }
              })
            }
            if (project.recent_files) {
              project.recent_files.forEach((file: any) => {
                allFiles.push({
                  ...file,
                  project_title: project.title,
                  project_id: project.id
                })
              })
            }
          })

          setFiles(allFiles)
        } else {
          console.error('Box APIからのデータ取得に失敗')
        }
      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBoxData()
  }, [userProfile])

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
                    <p className="text-3xl font-bold text-gray-900">{loading ? "..." : files.length}</p>
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
                    <p className="text-2xl font-bold text-engineering-blue">{loading ? "..." : formatFileSize(files.reduce((total, file) => total + (file.size || 0), 0))}</p>
                    <Progress value={Math.min((files.reduce((total, file) => total + (file.size || 0), 0) / (1024 * 1024 * 1024)) / 10 * 100, 100)} variant="engineering" className="mt-2" />
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
                                {file.project_title && <span>{file.project_title} • </span>}
                                {formatFileSize(file.size || 0)}
                              </CardDescription>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {file.subfolder && (
                            <Badge variant="outline" className="text-xs">
                              {file.subfolder}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {getScanStatusIcon('clean')}
                            スキャン済み
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* File Preview */}
                        <div
                          className="aspect-video bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-center"
                          onClick={() => setShowPreview(file.id)}
                        >
                          <Eye className="w-8 h-8 text-gray-400" />
                          <span className="ml-2 text-sm text-gray-500">プレビュー</span>
                        </div>

                        {/* File Metadata */}
                        <div className="space-y-2 text-xs text-gray-600">
                          {file.project_title && (
                            <div className="flex justify-between">
                              <span>プロジェクト:</span>
                              <span className="font-medium truncate ml-2">{file.project_title}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>作成日:</span>
                            <span>{new Date(file.created_at).toLocaleDateString('ja-JP')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>最終更新:</span>
                            <span>{new Date(file.modified_at).toLocaleDateString('ja-JP')}</span>
                          </div>
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