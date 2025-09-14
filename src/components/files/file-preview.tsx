"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Download,
  Share2,
  Lock,
  Unlock,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  FileText,
  Shield,
  Clock,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Separator } from "../ui/separator"

interface FilePreviewProps {
  fileId: string
  onClose: () => void
}

export function FilePreview({ fileId, onClose }: FilePreviewProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Mock file data - in reality this would be fetched based on fileId
  const file = {
    id: fileId,
    name: "道路設計図面_Rev3.dwg",
    type: "dwg",
    size: 15420000,
    uploadedAt: "2024-01-18T10:30:00Z",
    uploadedBy: "田中太郎",
    project: "東京都道路設計業務",
    version: 3,
    status: "approved",
    scanStatus: "clean",
    checkInStatus: "checked_out",
    checkOutBy: "田中太郎",
    previewUrl: "/api/files/preview/road-design.jpg",
    watermarkUrl: "/api/files/preview/road-design-watermark.jpg",
    downloadCount: 12,
    lastAccessed: "2024-01-18T14:15:00Z",
    metadata: {
      drawing_number: "RD-001",
      scale: "1:1000",
      revision: "Rev.3",
      approval_status: "承認済み",
      drawing_type: "平面図",
      coordinate_system: "平面直角座標系",
      created_by: "CADソフト v2024",
      last_modified: "2024-01-18T10:30:00Z"
    },
    permissions: {
      canView: true,
      canDownload: true,
      canEdit: true,
      canShare: false
    },
    tags: ["図面", "道路", "平面図"],
    auditLog: [
      {
        action: "viewed",
        user: "田中太郎",
        timestamp: "2024-01-18T14:15:00Z",
        ip: "192.168.1.100"
      },
      {
        action: "downloaded",
        user: "佐藤花子",
        timestamp: "2024-01-18T11:30:00Z",
        ip: "192.168.1.101"
      },
      {
        action: "checked_out",
        user: "田中太郎",
        timestamp: "2024-01-18T10:45:00Z",
        ip: "192.168.1.100"
      }
    ]
  }

  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200))
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 25))
  const handleRotate = () => setRotation((rotation + 90) % 360)

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string) => {
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full h-full flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border-b border-white/20">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-lg font-semibold text-white">{file.name}</h2>
                  <p className="text-sm text-white/70">
                    v{file.version} • {formatFileSize(file.size)} • {file.project}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <ZoomOut className="w-4 h-4" />
                  {zoom}%
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRotate} className="text-white hover:bg-white/20">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <Maximize className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
              {/* Security Watermark Notice */}
              <div className="absolute top-4 left-4 z-10">
                <Badge variant="glass" className="text-white border-white/30">
                  <Shield className="w-3 h-3 mr-1" />
                  セキュア プレビュー
                </Badge>
              </div>

              {/* Mock Preview Image */}
              <motion.div
                className="relative max-w-full max-h-full bg-white rounded-lg shadow-2xl overflow-hidden"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
                }}
                animate={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="w-[800px] h-[600px] bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center relative">
                  {/* Watermark Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="grid grid-cols-4 grid-rows-3 h-full">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-center">
                          <div className="transform rotate-45 text-2xl font-bold text-gray-600">
                            {file.project.substring(0, 4)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mock CAD Content */}
                  <div className="relative z-10 text-center">
                    <FileText className="w-32 h-32 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{file.name}</h3>
                    <p className="text-gray-600 mb-4">図面番号: {file.metadata.drawing_number}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>縮尺: {file.metadata.scale}</div>
                      <div>種別: {file.metadata.drawing_type}</div>
                    </div>

                    {/* Mock Drawing Elements */}
                    <div className="mt-8 flex justify-center space-x-4">
                      <div className="w-16 h-2 bg-blue-500"></div>
                      <div className="w-24 h-2 bg-green-500"></div>
                      <div className="w-12 h-2 bg-red-500"></div>
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                      ※ この画面は透かし付きプレビューです
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= 25}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-white text-sm font-medium">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    className="text-white hover:bg-white/20"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-white/10 backdrop-blur-sm border-t border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="glass" className="text-white border-white/30">
                    {getStatusIcon(file.scanStatus)}
                    セキュリティ: {file.scanStatus}
                  </Badge>
                  <Badge variant="glass" className="text-white border-white/30">
                    <User className="w-3 h-3 mr-1" />
                    チェックアウト: {file.checkOutBy}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!file.permissions.canDownload}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    ダウンロード
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!file.permissions.canShare}
                    className="text-white hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    共有
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-80 bg-white h-full overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* File Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    ファイル情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-600">ファイル形式:</div>
                    <div className="font-medium">{file.type.toUpperCase()}</div>

                    <div className="text-gray-600">ファイルサイズ:</div>
                    <div className="font-medium">{formatFileSize(file.size)}</div>

                    <div className="text-gray-600">バージョン:</div>
                    <div className="font-medium">v{file.version}</div>

                    <div className="text-gray-600">ステータス:</div>
                    <div>
                      <Badge variant="success" className="text-xs">
                        {file.status}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">アップロード者:</span>
                      <span className="font-medium">{file.uploadedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">アップロード日:</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">最終アクセス:</span>
                      <span>{new Date(file.lastAccessed).toLocaleString('ja-JP')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ダウンロード回数:</span>
                      <span>{file.downloadCount}回</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Metadata */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    技術メタデータ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600">図面番号:</div>
                    <div className="font-medium">{file.metadata.drawing_number}</div>

                    <div className="text-gray-600">縮尺:</div>
                    <div className="font-medium">{file.metadata.scale}</div>

                    <div className="text-gray-600">リビジョン:</div>
                    <div className="font-medium">{file.metadata.revision}</div>

                    <div className="text-gray-600">図面種別:</div>
                    <div className="font-medium">{file.metadata.drawing_type}</div>

                    <div className="text-gray-600">座標系:</div>
                    <div className="font-medium text-xs">{file.metadata.coordinate_system}</div>

                    <div className="text-gray-600">作成ソフト:</div>
                    <div className="font-medium text-xs">{file.metadata.created_by}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    タグ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {file.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Access Log */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    アクセスログ
                  </CardTitle>
                  <CardDescription>直近のファイルアクセス履歴</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {file.auditLog.slice(0, 5).map((log, index) => (
                      <div key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-engineering-blue rounded-full mt-2 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.action}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <div className="text-gray-600">
                            {log.user} ({log.ip})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    セキュリティ状態
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    {getStatusIcon(file.scanStatus)}
                    <span className="font-medium text-green-700">
                      ウイルススキャン: 脅威なし
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="w-4 h-4 text-engineering-blue" />
                    <span className="font-medium text-engineering-blue">
                      Box API暗号化済み
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">
                      SHA-256ハッシュ検証済み
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}