'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface GenerateInvoiceButtonProps {
  completionReportId: string
  onSuccess?: () => void
}

export function GenerateInvoiceButton({ completionReportId, onSuccess }: GenerateInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true)

      // 現在のユーザーセッションを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('認証が必要です')
        return
      }

      // 請求書生成APIを呼び出し
      const response = await fetch(`/api/completion-reports/${completionReportId}/generate-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || '請求書の生成に失敗しました')
      }

      alert('請求書が正常に作成されました')

      // PDFを新しいタブで開く
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank')
      }

      // 成功コールバック
      if (onSuccess) {
        onSuccess()
      }

    } catch (error: any) {
      console.error('請求書生成エラー:', error)
      alert(error.message || '請求書の生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerateInvoice}
      disabled={loading}
      variant="outline"
      className="w-full sm:w-auto"
    >
      {loading ? (
        <>
          <span className="mr-2">⏳</span>
          請求書生成中...
        </>
      ) : (
        <>
          <span className="mr-2">📄</span>
          請求書を生成
        </>
      )}
    </Button>
  )
}
