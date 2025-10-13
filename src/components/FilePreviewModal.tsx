"use client"

import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { authenticatedFetch } from '@/lib/api-client'

interface FilePreviewModalProps {
  fileId: string
  fileName: string
  isOpen: boolean
  onClose: () => void
}

export function FilePreviewModal({ fileId, fileName, isOpen, onClose }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen && fileId) {
      loadPreview()
    }
  }, [isOpen, fileId])

  const loadPreview = async () => {
    try {
      setLoading(true)
      setError('')

      // Box file IDから "box://" プレフィックスを除去
      let cleanFileId = fileId.replace('box://', '')

      // 古い形式のfile_path (projects/UUID/filename.ext) から Box File IDを抽出できない場合の対応
      // 新しい形式: box://1234567890 (数字のみ)
      // 古い形式: box://projects/UUID/filename.ext
      if (cleanFileId.includes('/')) {
        // 古い形式の場合、ダウンロード機能のみ提供し、プレビューはサポートしない
        setError('このファイルは古い形式で保存されているため、プレビューできません。ダウンロードボタンをご利用ください。')
        setLoading(false)
        return
      }

      console.log('🔍 Loading preview for file:', { original: fileId, clean: cleanFileId })

      // authenticatedFetchは既にJSONパース済みのデータを返す
      const apiUrl = `/api/box/file-preview/${cleanFileId}`
      console.log('📡 API request URL:', apiUrl)
      const data = await authenticatedFetch(apiUrl)
      console.log('✅ API response:', data)

      // 共有リンクがある場合はそれを使用、ない場合はアクセストークン方式
      let embedUrl: string
      if (data.sharedLinkUrl) {
        // 共有リンクをEmbed用に変換（/s/をembed/s/に）
        const sharedUrl = new URL(data.sharedLinkUrl)
        const pathParts = sharedUrl.pathname.split('/')
        const shareId = pathParts[pathParts.length - 1]
        embedUrl = `https://app.box.com/embed/s/${shareId}?sortColumn=date&view=list&showParentPath=false`
      } else {
        // フォールバック: アクセストークン方式
        embedUrl = `https://api.box.com/2.0/files/${data.fileId}/content?access_token=${data.accessToken}`
      }

      setPreviewUrl(embedUrl)

    } catch (err: any) {
      console.error('Preview load error:', err)
      setError(err.message || 'プレビューの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{fileName}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={loadPreview}>再試行</Button>
              </div>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-storage-access-by-user-activation"
            />
          )}
        </div>
      </div>
    </div>
  )
}
