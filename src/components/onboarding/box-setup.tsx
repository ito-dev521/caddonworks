"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  Download,
  UserPlus,
  Mail,
  ArrowRight,
  ExternalLink,
  Clock
} from 'lucide-react'

interface BoxSetupProps {
  userEmail: string
  userName: string
  onComplete: () => void
  onSkip: () => void
}

export function BoxSetup({ userEmail, userName, onComplete, onSkip }: BoxSetupProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const steps = [
    {
      id: 1,
      title: 'BOX Drive をダウンロード',
      description: 'ファイル同期に必要なアプリケーションをインストールします',
      icon: <Download className="w-6 h-6" />,
      action: 'ダウンロード',
      url: 'https://www.box.com/drive'
    },
    {
      id: 2,
      title: 'BOX アカウントを作成',
      description: `メールアドレス「${userEmail}」でアカウントを作成してください`,
      icon: <UserPlus className="w-6 h-6" />,
      action: 'アカウント作成',
      url: 'https://account.box.com/signup'
    },
    {
      id: 3,
      title: '管理者に連絡',
      description: 'アカウント作成後、権限付与を依頼してください',
      icon: <Mail className="w-6 h-6" />,
      action: '連絡する',
      url: `mailto:ito.dev@ii-stylelab.com?subject=BOXアカウント作成完了&body=お疲れ様です。%0A%0A名前: ${userName}%0Aメール: ${userEmail}%0A%0ABOXアカウントの作成が完了しました。%0A権限設定をお願いいたします。`
    }
  ]

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }

    if (stepId < steps.length) {
      setCurrentStep(stepId + 1)
    }
  }

  const handleExternalLink = (url: string, stepId: number) => {
    window.open(url, '_blank')
    // ステップ完了マークを追加（ユーザーが手動で完了を報告する想定）
    setTimeout(() => {
      handleStepComplete(stepId)
    }, 2000)
  }

  const allStepsCompleted = completedSteps.length === steps.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8"
      >
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Download className="w-8 h-8 text-blue-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BOX Drive セットアップ
          </h1>
          <p className="text-gray-600">
            プロジェクトファイル共有のため、BOX Drive の設定を行います
          </p>
        </div>

        {/* プログレスバー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">進捗状況</span>
            <span className="text-sm text-gray-500">
              {completedSteps.length} / {steps.length} 完了
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* ステップリスト */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = currentStep === step.id
            const isUpcoming = step.id > currentStep

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isCompleted
                    ? 'border-green-200 bg-green-50'
                    : isCurrent
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${
                    isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isCurrent
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : step.icon}
                  </div>

                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      isCompleted ? 'text-green-800' : 'text-gray-900'
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {step.description}
                    </p>

                    {!isCompleted && (
                      <button
                        onClick={() => handleExternalLink(step.url, step.id)}
                        disabled={isUpcoming}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          isUpcoming
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {step.action}
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    {isCompleted && (
                      <div className="inline-flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        完了
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onSkip}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              後で設定する
            </div>
          </button>

          <button
            onClick={onComplete}
            disabled={!allStepsCompleted}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              allStepsCompleted
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2">
              セットアップ完了
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>注意:</strong> BOXアカウント作成時は、必ず登録時のメールアドレス（{userEmail}）を使用してください。
            異なるメールアドレスでは権限付与ができません。
          </p>
        </div>
      </motion.div>
    </div>
  )
}