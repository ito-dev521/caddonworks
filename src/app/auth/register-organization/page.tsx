"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Building,
  Mail,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PasswordField } from "@/components/ui/password-field"
import { validateEmail } from "@/lib/email-validation"

export default function OrganizationRegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Organization Info
    organizationName: "",
    organizationType: "private_corp",
    taxId: "",
    address: "",
    phone: "",
    billingEmail: "",
    website: "",
    description: "",

    // Admin User Info
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
    adminPhone: "",
    adminDepartment: "",

    // Billing Info
    systemFee: 50000,
    paymentMethod: "",
    billingAddress: "",

    // Agreement
    agreedToTerms: false,
    agreedToPrivacy: false
  })

  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailValidation, setEmailValidation] = useState<{ [key: string]: any }>({})

  const router = useRouter()

  const organizationTypes = [
    { value: "private_corp", label: "民間企業" }
  ]

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // メールアドレスの場合は検証を実行
    if (field === 'billingEmail' || field === 'adminEmail') {
      if (typeof value === 'string' && value.length > 0) {
        const validation = validateEmail(value, {
          requireBusiness: field === 'billingEmail' // 請求先は企業メール推奨
        })
        setEmailValidation(prev => ({ ...prev, [field]: validation }))
      } else {
        setEmailValidation(prev => ({ ...prev, [field]: null }))
      }
    }
  }

  const generateSecurePassword = () => {
    // 文字セット定義
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    const allChars = lowercase + uppercase + numbers + specialChars

    let password = ''

    // 各文字種から最低1文字を保証
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += specialChars[Math.floor(Math.random() * specialChars.length)]

    // 残りの文字をランダムに追加（合計12文字）
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // 文字をシャッフル
    const passwordArray = password.split('')
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]]
    }

    return passwordArray.join('')
  }

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword()
    setFormData(prev => ({
      ...prev,
      adminPassword: newPassword,
      confirmPassword: newPassword
    }))
  }


  const validateStep1 = () => {
    const required = ['organizationName', 'billingEmail', 'phone']
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        setError(`${field}は必須項目です`)
        return false
      }
    }
    setError(null)
    return true
  }

  const validateStep2 = () => {
    const required = ['adminName', 'adminEmail', 'adminPassword', 'confirmPassword']
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        setError(`${field}は必須項目です`)
        return false
      }
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      setError("パスワードが一致しません")
      return false
    }
    if (formData.adminPassword.length < 8) {
      setError("パスワードは8文字以上で入力してください")
      return false
    }
    setError(null)
    return true
  }

  const validateStep3 = () => {
    if (!formData.agreedToTerms || !formData.agreedToPrivacy) {
      setError("利用規約とプライバシーポリシーへの同意が必要です")
      return false
    }
    setError(null)
    return true
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/register-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess("組織登録が完了しました。ログインページに移動します。")
        
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      } else {
        setError(result.message || "登録に失敗しました。もう一度お試しください。")
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError("ネットワークエラーが発生しました。もう一度お試しください。")
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    { id: 1, title: "組織情報", description: "基本的な組織情報" },
    { id: 2, title: "管理者設定", description: "システム管理者アカウント" },
    { id: 3, title: "契約条件", description: "利用規約と料金設定" },
    { id: 4, title: "確認・申請", description: "内容確認と申請" }
  ]

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Card className="hover-lift">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-engineering-blue rounded-xl flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                発注者組織 登録申請
              </CardTitle>
              <CardDescription>
                土木設計業務の発注を行う組織・自治体向け登録
              </CardDescription>
            </CardHeader>

            {/* Progress Indicator */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-center overflow-x-auto">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step.id ? 'bg-engineering-blue text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
                      </div>
                      <div className="ml-3 hidden sm:block">
                        <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${
                        currentStep > step.id ? 'bg-engineering-blue' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Organization Information */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
                      >
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <span className="text-red-700">{error}</span>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          組織名 *
                        </label>
                        <input
                          type="text"
                          value={formData.organizationName}
                          onChange={(e) => handleInputChange('organizationName', e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="例: 株式会社○○建設"
                          required
                        />

                      </div>


                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          法人番号 / 団体コード
                        </label>
                        <input
                          type="text"
                          value={formData.taxId}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, ''); // 数字のみ
                            if (value.length <= 13) {
                              handleInputChange('taxId', value);
                            }
                          }}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="1234567890123 (13桁の数字)"
                          maxLength={13}
                        />
                        {formData.taxId && formData.taxId.length > 0 && formData.taxId.length !== 13 && (
                          <p className="text-xs text-red-500 mt-1">
                            法人番号は13桁の数字で入力してください
                          </p>
                        )}
                        {formData.taxId && formData.taxId.length === 13 && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ 正しい法人番号の形式です
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          <a
                            href="https://www.houjin-bangou.nta.go.jp/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-engineering-blue hover:underline"
                          >
                            国税庁法人番号公表サイト
                          </a>
                          で確認できます
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          請求先メールアドレス *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            value={formData.billingEmail}
                            onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent ${
                              emailValidation.billingEmail?.isValid === false
                                ? 'border-red-300 bg-red-50'
                                : emailValidation.billingEmail?.isValid
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-300'
                            }`}
                            placeholder="billing@company.co.jp"
                            required
                          />
                        </div>
                        {emailValidation.billingEmail?.error && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {emailValidation.billingEmail.error}
                          </p>
                        )}
                        {emailValidation.billingEmail?.suggestions && emailValidation.billingEmail.suggestions.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-blue-600 mb-1">もしかして:</p>
                            {emailValidation.billingEmail.suggestions.map((suggestion: string, index: number) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleInputChange('billingEmail', suggestion)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline mr-2"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                        {emailValidation.billingEmail?.isValid && !emailValidation.billingEmail?.error && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            有効なメールアドレスです
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          代表電話番号 *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="03-1234-5678"
                            required
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          所在地
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                          <textarea
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="〒100-0001 東京都千代田区..."
                            rows={2}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ウェブサイト
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="https://www.company.co.jp"
                        />
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* Step 2: Admin User Setup */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-blue-900 mb-2">システム管理者アカウント</h3>
                      <p className="text-sm text-blue-700">
                        組織のシステム管理者となる方の情報を入力してください。
                        この方がプラットフォームの初期設定と運用管理を行います。
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          管理者氏名 *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={formData.adminName}
                            onChange={(e) => handleInputChange('adminName', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="田中 太郎"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          所属部署
                        </label>
                        <input
                          type="text"
                          value={formData.adminDepartment}
                          onChange={(e) => handleInputChange('adminDepartment', e.target.value)}
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="情報システム課"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          管理者メールアドレス *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            value={formData.adminEmail}
                            onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent ${
                              emailValidation.adminEmail?.isValid === false
                                ? 'border-red-300 bg-red-50'
                                : emailValidation.adminEmail?.isValid
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-300'
                            }`}
                            placeholder="admin@company.co.jp"
                            required
                          />
                        </div>
                        {emailValidation.adminEmail?.error && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {emailValidation.adminEmail.error}
                          </p>
                        )}
                        {emailValidation.adminEmail?.suggestions && emailValidation.adminEmail.suggestions.length > 0 && (
                          <div className="mt-1">
                            <p className="text-xs text-blue-600 mb-1">もしかして:</p>
                            {emailValidation.adminEmail.suggestions.map((suggestion: string, index: number) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => handleInputChange('adminEmail', suggestion)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline mr-2"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                        {emailValidation.adminEmail?.isValid && !emailValidation.adminEmail?.error && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            有効なメールアドレスです
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          管理者電話番号
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="tel"
                            value={formData.adminPhone}
                            onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="03-1234-5678"
                          />
                        </div>
                      </div>

                      <PasswordField
                        value={formData.adminPassword}
                        onChange={(value) => handleInputChange('adminPassword', value)}
                        label="パスワード *"
                        placeholder="••••••••"
                        required
                        showStrengthIndicator={true}
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          パスワード確認 *
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="••••••••"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Contract Terms */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Pricing Information */}
                    <Card variant="engineering">
                      <CardContent className="p-6 text-white">
                        <h3 className="text-xl font-bold mb-4">料金体系</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold">30%</div>
                            <div className="text-sm opacity-80">利用額に対する手数料</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">¥50,000</div>
                            <div className="text-sm opacity-80">月額システム利用料</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">月末</div>
                            <div className="text-sm opacity-80">受注者への支払代行</div>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-white/20 rounded-lg">
                          <p className="text-sm">
                            請求額 = 利用額合計 + (利用額合計 × 30%) + ¥50,000/月
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Terms Agreement */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="terms"
                          checked={formData.agreedToTerms}
                          onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)}
                          className="mt-1 w-4 h-4 text-engineering-blue focus:ring-engineering-blue border-gray-300 rounded"
                        />
                        <label htmlFor="terms" className="text-sm text-gray-700">
                          <Link href="/terms" className="text-engineering-blue hover:underline">
                            利用規約
                          </Link>
                          に同意します *
                        </label>
                      </div>

                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="privacy"
                          checked={formData.agreedToPrivacy}
                          onChange={(e) => handleInputChange('agreedToPrivacy', e.target.checked)}
                          className="mt-1 w-4 h-4 text-engineering-blue focus:ring-engineering-blue border-gray-300 rounded"
                        />
                        <label htmlFor="privacy" className="text-sm text-gray-700">
                          <Link href="/privacy" className="text-engineering-blue hover:underline">
                            プライバシーポリシー
                          </Link>
                          に同意します *
                        </label>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800">登録申請について</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            組織登録は審査制となります。申請後、1-2営業日で承認結果をメールにてご連絡いたします。
                            承認後、システム管理者アカウントでログインして初期設定を行ってください。
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-800">申請内容の確認</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">組織情報</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>組織名:</strong> {formData.organizationName}</p>
                            <p><strong>種別:</strong> {organizationTypes.find(t => t.value === formData.organizationType)?.label}</p>
                            <p><strong>請求先:</strong> {formData.billingEmail}</p>
                            <p><strong>電話番号:</strong> {formData.phone}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">管理者情報</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>氏名:</strong> {formData.adminName}</p>
                            <p><strong>メール:</strong> {formData.adminEmail}</p>
                            <p><strong>部署:</strong> {formData.adminDepartment}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

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

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                    >
                      戻る
                    </Button>
                  )}

                  <div className="ml-auto">
                    {currentStep < 4 ? (
                      <Button
                        type="button"
                        variant="engineering"
                        onClick={handleNext}
                      >
                        次へ
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        variant="engineering"
                        size="lg"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            申請中...
                          </>
                        ) : (
                          <>
                            登録申請する
                            <CheckCircle className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center text-sm pt-4 border-t border-gray-200">
                  <span className="text-gray-600">既に組織アカウントをお持ちですか？</span>
                  <Link href="/auth/login" className="text-engineering-blue hover:underline ml-1">
                    ログイン
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