"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Settings, Clock, AlertTriangle, Shield } from "lucide-react"

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-20 h-20 bg-engineering-blue rounded-xl flex items-center justify-center mx-auto mb-6"
        >
          <Settings className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-3xl font-bold text-gray-900 mb-4"
        >
          システムメンテナンス中
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-gray-600 mb-6"
        >
          現在、システムのメンテナンスを実施しております。<br />
          ご不便をおかけして申し訳ございません。
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="bg-white rounded-lg p-6 shadow-lg"
        >
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-engineering-blue mr-2" />
            <span className="text-sm font-medium text-gray-700">メンテナンス情報</span>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-orange-500 mr-2" />
              <span>サービス一時停止中</span>
            </div>
            <p>
              メンテナンスが完了次第、サービスを再開いたします。<br />
              完了予定時刻については改めてお知らせいたします。
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mt-6 space-y-3"
        >
          <div className="text-sm text-gray-500">
            お急ぎの場合は <a href="mailto:support@caddon.jp" className="text-engineering-blue hover:underline">support@caddon.jp</a> までお問い合わせください
          </div>
          <div className="pt-2 border-t border-gray-200">
            <Link
              href="/auth/admin-login"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-red-600 transition-colors"
            >
              <Shield className="w-4 h-4" />
              管理者ログイン
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}