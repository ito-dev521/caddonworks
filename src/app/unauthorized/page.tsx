"use client"

import React from "react"
import { motion } from "framer-motion"
import { Shield, ArrowLeft, Home } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"

export default function UnauthorizedPage() {
  const { userRole } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              アクセス権限がありません
            </CardTitle>
            <CardDescription className="text-gray-600">
              このページにアクセスする権限がありません
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {userRole && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  現在のロール: <span className="font-medium text-gray-900">{userRole}</span>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Link href="/dashboard">
                <Button variant="engineering" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  ダッシュボードに戻る
                </Button>
              </Link>
              
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ログインページに戻る
                </Button>
              </Link>
            </div>
            
            <div className="text-xs text-gray-500">
              権限に関する問題がある場合は、管理者にお問い合わせください
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
