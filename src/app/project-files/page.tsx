"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FolderOpen,
  File,
  Download,
  Eye,
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Box,
  Building2,
  Calendar,
  Users,
  FileText,
  Image,
  Archive,
  RefreshCw
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { supabase } from "@/lib/supabase"

interface BoxProject {
  id: string
  title: string
  box_folder_id: string
  subfolders?: Record<string, string>
  status: string
  created_at: string
  box_items: BoxItem[]
  recent_files?: BoxItem[]
  error?: string
}

interface BoxItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified_at: string
  created_at: string
  path_collection: {
    entries: Array<{ name: string }>
  }
}

export default function ProjectFilesPage() {
  const { user, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<BoxProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<{id: string, name: string} | null>(null)
  const [folderContents, setFolderContents] = useState<BoxItem[]>([])
  const [loadingFolder, setLoadingFolder] = useState(false)

  useEffect(() => {
    if (authLoading) {
      // 認証状態を確認中
      return
    }

    if (user) {
      fetchProjects()
    } else {
      // ユーザーが認証されていない場合はローディングを停止
      setLoading(false)
      setError('認証が必要です')
    }
  }, [user, authLoading])

  const fetchProjects = async () => {
    try {
      setLoading(true)

      // Supabaseから現在のセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('認証に失敗しました')
      }

      const response = await fetch('/api/box/projects', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API error response:', errorText)
        throw new Error(`プロジェクト取得に失敗しました: ${response.status}`)
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = async (folderId: string, folderName: string) => {
    try {
      setLoadingFolder(true)
      setSelectedFolder({id: folderId, name: folderName})

      // Supabaseから現在のセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('認証に失敗しました')
      }

      // BOXフォルダの中身を取得するAPIエンドポイントを呼び出し
      const response = await fetch(`/api/box/folder/${folderId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`フォルダ内容の取得に失敗しました: ${response.status}`)
      }

      const data = await response.json()
      setFolderContents(data.items || [])
    } catch (err: any) {
      console.error('Folder click error:', err)
      alert(`フォルダを開けませんでした: ${err.message}`)
    } finally {
      setLoadingFolder(false)
    }
  }

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      console.log(`Downloading file: ${fileName} (${fileId})`)

      // Supabaseから現在のセッションを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error('認証に失敗しました')
      }

      // BOXファイルダウンロードAPIを呼び出し
      const response = await fetch(`/api/box/download/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error(`ダウンロードに失敗しました: ${response.status}`)
      }

      // ファイルをダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log(`✅ File downloaded: ${fileName}`)
    } catch (err: any) {
      console.error('Download error:', err)
      alert(`ダウンロードに失敗しました: ${err.message}`)
    }
  }

  const getFileIcon = (name: string, type: string) => {
    if (type === 'folder') {
      return <FolderOpen className="w-6 h-6 text-blue-600" />
    }

    const ext = name.split('.').pop()?.toLowerCase()
    const icons = {
      dwg: <FileText className="w-6 h-6 text-blue-600" />,
      pdf: <FileText className="w-6 h-6 text-red-600" />,
      xlsx: <FileText className="w-6 h-6 text-green-600" />,
      docx: <FileText className="w-6 h-6 text-blue-600" />,
      jpg: <Image className="w-6 h-6 text-purple-600" />,
      png: <Image className="w-6 h-6 text-purple-600" />,
      zip: <Archive className="w-6 h-6 text-orange-600" />
    }
    return icons[ext as keyof typeof icons] || <File className="w-6 h-6 text-gray-600" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 0) {
      return `${diffDays}日前`
    } else if (diffHours > 0) {
      return `${diffHours}時間前`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分前`
    } else {
      return 'たった今'
    }
  }

  const getRecentFiles = (project: BoxProject) => {
    // recent_files が利用可能な場合はそれを使用、そうでなければ従来の方法
    if (project.recent_files && project.recent_files.length > 0) {
      return project.recent_files.slice(0, 5)
    }

    // フォールバック: box_items から取得
    return project.box_items
      .filter(item => item.type === 'file')
      .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
      .slice(0, 5)
  }

  const getSubfolderName = (subfolderKey: string) => {
    const nameMap: Record<string, string> = {
      '受取': '受取フォルダ',
      '作業': '作業フォルダ',
      '納品': '納品フォルダ',
      '契約': '契約フォルダ'
    }
    return nameMap[subfolderKey] || subfolderKey
  }

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navigation />
        <div className="md:ml-64 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-engineering-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">認証状態を確認中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navigation />
        <div className="md:ml-64 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-engineering-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">プロジェクトファイルを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navigation />
        <div className="md:ml-64 flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchProjects}>再試行</Button>
          </div>
        </div>
      </div>
    )
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
                  <Box className="w-6 h-6 text-engineering-blue" />
                  案件ファイル管理
                </h1>
                <p className="text-gray-600">Box連携プロジェクトファイル管理システム</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchProjects}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  更新
                </Button>
                <Badge variant="engineering" className="animate-pulse">
                  <Box className="w-3 h-3 mr-1" />
                  Box連携
                </Badge>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Box連携案件数</p>
                    <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総ファイル数</p>
                    <p className="text-3xl font-bold text-engineering-blue">
                      {projects.reduce((total, project) => total + (project.box_items?.length || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-engineering-blue/10 rounded-lg">
                    <FileText className="w-6 h-6 text-engineering-blue" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">アクティブ案件</p>
                    <p className="text-3xl font-bold text-green-600">
                      {projects.filter(p => ['contract_pending', 'in_progress'].includes(p.status)).length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
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
                    placeholder="案件名で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Projects Grid/List */}
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full hover-lift group relative overflow-hidden">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <FolderOpen className="w-8 h-8 text-engineering-blue" />
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base truncate group-hover:text-engineering-blue transition-colors">
                                {project.title}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                {project.box_items?.length || 0} ファイル
                              </CardDescription>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <StatusIndicator status={project.status} size="sm" />
                          <Badge variant="outline" className="text-xs">
                            Box ID: {project.box_folder_id ? project.box_folder_id.slice(0, 8) + '...' : '設定中'}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {project.error ? (
                          <div className="text-center py-4 text-red-600">
                            <p className="text-sm">{project.error}</p>
                          </div>
                        ) : (
                          <>
                            {/* Subfolders */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">サブフォルダ</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(project.subfolders || {}).map(([name, folderId]) => (
                                  <button
                                    key={name}
                                    onClick={() => handleFolderClick(folderId, getSubfolderName(name))}
                                    className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded text-xs transition-colors cursor-pointer"
                                  >
                                    <FolderOpen className="w-3 h-3 text-blue-500" />
                                    <span className="truncate">{getSubfolderName(name)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Recent Files */}
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">最近のファイル</h4>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {getRecentFiles(project).map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 p-1 text-xs hover:bg-gray-50 rounded"
                                  >
                                    {getFileIcon(item.name, item.type)}
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{item.name}</div>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                        <span>{formatRelativeTime(item.modified_at)}</span>
                                        {(item as any).subfolder && (
                                          <>
                                            <span>•</span>
                                            <span className="text-blue-600">{(item as any).subfolder}</span>
                                          </>
                                        )}
                                        {item.size && (
                                          <>
                                            <span>•</span>
                                            <span>{formatFileSize(item.size)}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleFileDownload(item.id, item.name)}
                                      className="ml-2 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                                      title="ダウンロード"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {getRecentFiles(project).length === 0 && (
                                  <p className="text-xs text-gray-500 text-center py-2">
                                    ファイルはありません
                                  </p>
                                )}
                                {(project.box_items?.filter(item => item.type === 'file').length || 0) > 5 && (
                                  <p className="text-xs text-gray-500 text-center">
                                    他 {(project.box_items?.filter(item => item.type === 'file').length || 0) - 5} ファイル
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                              <div className="flex justify-between">
                                <span>作成日:</span>
                                <span>{new Date(project.created_at).toLocaleDateString('ja-JP')}</span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="flex items-center text-xs text-gray-500">
                            <Box className="w-3 h-3 mr-1" />
                            Box連携
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                              className="group/btn"
                            >
                              <Eye className="w-4 h-4 group-hover/btn:text-engineering-blue" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="group/btn"
                            >
                              <Upload className="w-4 h-4 group-hover/btn:text-engineering-blue" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>

                      {/* Expanded file list */}
                      <AnimatePresence>
                        {selectedProject === project.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-200"
                          >
                            <CardContent className="p-4 bg-gray-50">
                              <h4 className="font-medium mb-3">全ファイル一覧</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(project.box_items || []).map((item) => (
                                  <div key={item.id} className="flex items-center gap-2 p-2 bg-white rounded text-sm">
                                    {getFileIcon(item.name, item.type)}
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate font-medium">{item.name}</p>
                                      <p className="text-xs text-gray-500">
                                        {item.size ? formatFileSize(item.size) : 'フォルダ'} •
                                        {new Date(item.modified_at).toLocaleDateString('ja-JP')}
                                      </p>
                                    </div>
                                    {item.type === 'file' && (
                                      <Button variant="outline" size="sm">
                                        <Download className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover-lift">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <FolderOpen className="w-8 h-8 text-engineering-blue" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
                            <p className="text-sm text-gray-600">
                              {project.box_items?.length || 0} ファイル •
                              Box ID: {project.box_folder_id ? project.box_folder_id.slice(0, 12) + '...' : '設定中'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusIndicator status={project.status} size="sm" />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Upload className="w-4 h-4" />
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

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Box連携案件がありません</h3>
              <p className="text-gray-600">
                {projects.length === 0
                  ? 'まだBox連携が設定された案件がありません。入札承認後にBoxフォルダが作成されます。'
                  : '検索条件に該当する案件がありません。'
                }
              </p>
            </div>
          )}

          {/* Folder Contents Modal */}
          <AnimatePresence>
            {selectedFolder && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedFolder(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="w-6 h-6 text-blue-600" />
                        <div>
                          <h2 className="text-xl font-semibold text-gray-900">{selectedFolder.name}</h2>
                          <p className="text-sm text-gray-600">フォルダID: {selectedFolder.id}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFolder(null)}
                      >
                        ✕ 閉じる
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loadingFolder ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue mx-auto mb-4"></div>
                        <p className="text-gray-600">フォルダ内容を読み込み中...</p>
                      </div>
                    ) : folderContents.length === 0 ? (
                      <div className="text-center py-8">
                        <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">このフォルダは空です</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {folderContents.map((item) => (
                          <Card key={item.id} className="hover-lift">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                {getFileIcon(item.name, item.type)}
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.type === 'folder' ? 'フォルダ' : formatFileSize(item.size)}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(item.modified_at).toLocaleDateString('ja-JP')}
                                  </p>
                                </div>
                              </div>
                              {item.type === 'folder' && (
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleFolderClick(item.id, item.name)}
                                  >
                                    <FolderOpen className="w-3 h-3 mr-2" />
                                    開く
                                  </Button>
                                </div>
                              )}
                              {item.type === 'file' && (
                                <div className="mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => handleFileDownload(item.id, item.name)}
                                  >
                                    <Download className="w-3 h-3 mr-2" />
                                    ダウンロード
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}