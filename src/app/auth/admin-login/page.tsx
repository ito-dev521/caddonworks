"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

function AdminLoginPageContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { signIn, getRedirectPath, userRole, loading } = useAuth()
  const router = useRouter()

  // 認証状態の変更を監視してリダイレクト
  useEffect(() => {
    if (!loading && userRole && success) {
      const redirectPath = getRedirectPath()

      try {
        sessionStorage.removeItem('redirectAfterLogin')
        sessionStorage.removeItem('previousPage')
        sessionStorage.removeItem('currentPage')
      } catch {}
      router.push(redirectPath)
    }
  }, [userRole, loading, success, router, getRedirectPath])

  // 既にログイン済みユーザーの自動リダイレクト
  useEffect(() => {
    if (!loading && userRole && !success) {
      try {
        sessionStorage.removeItem('redirectAfterLogin')
        sessionStorage.removeItem('previousPage')
        sessionStorage.removeItem('currentPage')
      } catch {}
      const redirectPath = getRedirectPath()
      router.push(redirectPath)
    }
  }, [userRole, loading, success, router, getRedirectPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const loginPromise = signIn(email, password)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ログイン処理がタイムアウトしました（60秒）')), 60000)
      })

      await Promise.race([loginPromise, timeoutPromise])

      setSuccess("ログインに成功しました")
    } catch (err: any) {
      console.error('Admin login: ログインエラー', err)
      setError(err.message || "ログインに失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  const adminDemo = () => {
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)[0] || 'admin@demo.com'

    setEmail(adminEmail)
    setPassword('AdminDemo123!')
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="w-full hover-lift">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                管理者ログイン
              </CardTitle>
              <CardDescription>
                メンテナンス中でも管理者はこちらからログインできます
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    管理者メールアドレス
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{success}</span>
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ログイン中...
                    </>
                  ) : (
                    <>
                      管理者ログイン
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Demo Button */}
                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={adminDemo}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    管理者デモアカウント
                  </Button>
                </div>

                {/* Back to regular login */}
                <div className="text-center text-sm">
                  <Link
                    href="/auth/login"
                    className="text-gray-600 hover:text-gray-900 hover:underline"
                  >
                    通常ログインに戻る
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">セキュリティ注意事項</h3>
                <p className="text-sm text-amber-700 mt-1">
                  このページは管理者専用です。メンテナンス中でもアクセス可能ですが、
                  適切な管理者権限を持つアカウントでのみログインしてください。
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return <AdminLoginPageContent />
}