"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, Loader2, Users, Building, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SetupDemoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [isCompleted, setIsCompleted] = useState(false)

  const handleSetupDemoAccounts = async () => {
    setIsLoading(true)
    setResults([])
    setIsCompleted(false)

    try {
      const response = await fetch('/api/setup-demo-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results)
        setIsCompleted(true)
      } else {
        setResults([{
          email: 'system',
          status: 'error',
          message: data.message || 'セットアップに失敗しました'
        }])
      }
    } catch (error) {
      setResults([{
        email: 'system',
        status: 'error',
        message: 'ネットワークエラーが発生しました'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'already_exists':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'error':
      case 'auth_error':
      case 'profile_error':
      case 'org_error':
      case 'membership_error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'already_exists':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'error':
      case 'auth_error':
      case 'profile_error':
      case 'org_error':
      case 'membership_error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getAccountInfo = (email: string) => {
    switch (email) {
      case 'admin@demo.com':
        return { name: '管理者デモ', role: 'OrgAdmin', icon: <Building className="w-4 h-4" /> }
      case 'contractor@demo.com':
        return { name: '受注者デモ', role: 'Contractor', icon: <Users className="w-4 h-4" /> }
      case 'reviewer@demo.com':
        return { name: '監督員デモ', role: 'Reviewer', icon: <Shield className="w-4 h-4" /> }
      default:
        return { name: 'システム', role: 'System', icon: <AlertCircle className="w-4 h-4" /> }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="hover-lift">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-engineering-blue rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">デモアカウントセットアップ</CardTitle>
              <p className="text-gray-600">
                ログインページで使用するデモアカウントを作成します
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">作成されるデモアカウント</h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>管理者デモ: admin@demo.com / demo123</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>受注者デモ: contractor@demo.com / demo123</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>監督員デモ: reviewer@demo.com / demo123</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={handleSetupDemoAccounts}
                  disabled={isLoading}
                  className="bg-engineering-blue hover:bg-engineering-blue-dark"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      セットアップ中...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      デモアカウントを作成
                    </>
                  )}
                </Button>
              </div>

              {results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">セットアップ結果</h3>
                  {results.map((result, index) => {
                    const accountInfo = getAccountInfo(result.email)
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(result.status)}
                          <div className="flex items-center gap-2">
                            {accountInfo.icon}
                            <span className="font-medium">{accountInfo.name}</span>
                            <span className="text-xs bg-white/50 px-2 py-1 rounded">
                              {result.email}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm mt-1 ml-8">{result.message}</p>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">セットアップ完了</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    デモアカウントが作成されました。ログインページでテストできます。
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
