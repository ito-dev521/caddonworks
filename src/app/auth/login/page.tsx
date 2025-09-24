"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Building,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { signIn, getRedirectPath, userRole, loading } = useAuth()

  // デバッグログ削除
  const router = useRouter()

  // 認証状態の変更を監視してリダイレクト
  useEffect(() => {
    if (!loading && userRole && success) {

      // ユーザーロールに基づいてリダイレクト先を決定
      const redirectPath = getRedirectPath()

      // セッションストレージに保存されたリダイレクト先を確認
      // 前回のキャッシュはすべてクリア
      try {
        sessionStorage.removeItem('redirectAfterLogin')
        sessionStorage.removeItem('previousPage')
        sessionStorage.removeItem('currentPage')
      } catch {}
      router.push(redirectPath)
    }
  }, [userRole, loading, success, router, getRedirectPath])

  // 既にログイン済みユーザーの自動リダイレクトを防ぐ
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
      
      // タイムアウト処理を追加
      const loginPromise = signIn(email, password)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ログイン処理がタイムアウトしました（60秒）')), 60000)
      })
      
      await Promise.race([loginPromise, timeoutPromise])
      
      setSuccess("ログインに成功しました")
      // リダイレクトはuseEffectで処理される
    } catch (err: any) {
      console.error('Login form: ログインエラー', err)
      setError(err.message || "ログインに失敗しました")
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:block"
        >
          <div className="text-center lg:text-left">
            <div className="flex items-center gap-3 justify-center lg:justify-start mb-8">
              <div className="w-16 h-16 bg-engineering-blue rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">土</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-engineering-blue">
                  土木設計業務プラットフォーム
                </h1>
                <p className="text-lg text-gray-600">Civil Engineering Platform</p>
              </div>
            </div>

            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">セキュアなファイル管理</h3>
                  <p className="text-gray-600">Box API連携によるVDR機能</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">プロジェクト管理</h3>
                  <p className="text-gray-600">発注から完了まで一元管理</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">自動化ワークフロー</h3>
                  <p className="text-gray-600">AI検査・評価・請求処理</p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="w-full max-w-md mx-auto hover-lift">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-engineering-blue rounded-lg flex items-center justify-center mx-auto mb-4 lg:hidden">
                <span className="text-white font-bold text-xl">土</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                ログイン
              </CardTitle>
              <CardDescription>
                アカウントにサインインしてご利用ください
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent transition-colors"
                      placeholder="example@company.com"
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
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent transition-colors"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
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
                  variant="engineering"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ログイン中...
                    </>
                  ) : (
                    <>
                      ログイン
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Additional Links */}
                <div className="flex items-center justify-between text-sm">
                  <Link
                    href="/auth/forgot-password"
                    className="text-engineering-blue hover:underline"
                  >
                    パスワードを忘れた方
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-engineering-blue hover:underline"
                  >
                    新規登録
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>

        </motion.div>
      </div>
    </div>
  )
}