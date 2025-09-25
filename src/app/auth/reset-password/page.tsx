"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<"verifying" | "set" | "done" | "error">("verifying")
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    // Supabase のパスワード回復は URL フラグメントに access_token 等が入る
    if (!hash) {
      setStep("error")
      setError("無効なリンクです")
      return
    }

    // フラグメントからセッションを復元
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStep("set")
      }
    })

    // パスワード回復リンクの処理
    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        // 既に回復状態ならそのまま
        setStep("set")
      } catch (e) {
        setStep("error")
        setError("リンクの検証に失敗しました")
      }
    })()
  }, [searchParams])

  const handleUpdate = async () => {
    if (password.length < 8) {
      setError("8文字以上のパスワードを入力してください")
      return
    }
    if (password !== confirm) {
      setError("パスワードが一致しません")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStep("done")
      setTimeout(() => router.push("/auth/login"), 1500)
    } catch (e: any) {
      setError(e.message || "更新に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  if (step === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>リンクを確認しています...</p>
      </div>
    )
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow">
          <p className="text-red-600 mb-2">{error || "エラーが発生しました"}</p>
          <Button onClick={() => router.push("/auth/login")}>ログインへ戻る</Button>
        </div>
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow">
          <p className="text-green-700">パスワードを更新しました。ログイン画面へ移動します。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow w-full max-w-md">
        <h1 className="text-lg font-semibold mb-4">新しいパスワードを設定</h1>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <div className="space-y-3">
          <input
            type="password"
            placeholder="新しいパスワード"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="確認のため再入力"
            className="w-full border rounded px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button onClick={handleUpdate} disabled={loading} className="w-full">
            {loading ? '更新中...' : '更新する'}
          </Button>
        </div>
      </div>
    </div>
  )
}








