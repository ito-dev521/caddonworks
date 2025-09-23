"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PasswordField } from "@/components/ui/password-field"
import { useAuth } from "@/contexts/auth-context"

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    organization: "",
    specialties: [] as string[],
    qualifications: [] as string[],
    experienceYears: ""
  })
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const { signUp } = useAuth()
  const router = useRouter()

  const specialtyOptions = [
    "未経験", "道路設計", "橋梁設計", "河川工事", "上下水道設計", "トンネル設計", "地下構造",
    "構造物点検", "測量業務", "地質調査", "環境評価", "施工管理"
  ]

  const qualificationOptions = [
    "技術士（建設部門）", "技術士（上下水道部門）", "技術士（その他）", "技術士補", "一級建築士", "測量士",
    "土木施工管理技士", "管工事施工管理技士",
    "造園施工管理技士", "土地家屋調査士"
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }))
    }
  }

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }

  const addQualification = (qualification: string) => {
    if (!formData.qualifications.includes(qualification)) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, qualification]
      }))
    }
  }

  const removeQualification = (qualification: string) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter(q => q !== qualification)
    }))
  }

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.displayName) {
      setError("必須項目を入力してください")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません")
      return false
    }
    if (formData.password.length < 6) {
      setError("パスワードは6文字以上で入力してください")
      return false
    }
    setError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2)
      }
      return
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      await signUp(formData.email, formData.password, {
        display_name: formData.displayName,
        formal_name: formData.displayName, // 正式名称として表示名を使用
        organization: formData.organization,
        specialties: formData.specialties,
        qualifications: formData.qualifications,
        experience_years: formData.experienceYears || undefined
      })

      setSuccess("アカウントを作成しました。確認メールをご確認ください。")
      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "アカウント作成に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

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
              <div className="w-12 h-12 bg-engineering-blue rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">土</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                アカウント作成
              </CardTitle>
              <CardDescription>
                土木設計業務プラットフォームへようこそ
              </CardDescription>
            </CardHeader>

            {/* Progress Indicator */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-center">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 1 ? 'bg-engineering-blue text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                      基本情報
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-0.5 mx-4 ${currentStep >= 2 ? 'bg-engineering-blue' : 'bg-gray-200'}`} />
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= 2 ? 'bg-engineering-blue text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                      専門情報
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          メールアドレス *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="example@company.com"
                            required
                          />
                        </div>
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          表示名 *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => handleInputChange('displayName', e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            placeholder="田中 太郎"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Password */}
                      <PasswordField
                        value={formData.password}
                        onChange={(value) => handleInputChange('password', value)}
                        label="パスワード *"
                        placeholder="••••••••"
                        required
                        showStrengthIndicator={true}
                      />

                      {/* Confirm Password */}
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

                    {/* Organization */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        屋号及び所属組織
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={formData.organization}
                          onChange={(e) => handleInputChange('organization', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="株式会社 土木設計"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Professional Information */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    {/* Specialties */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        専門分野
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                        {specialtyOptions.map(specialty => (
                          <button
                            key={specialty}
                            type="button"
                            onClick={() => addSpecialty(specialty)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-engineering-blue hover:bg-engineering-blue/5 transition-colors"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            {specialty}
                          </button>
                        ))}
                      </div>
                      {formData.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.specialties.map(specialty => (
                            <Badge
                              key={specialty}
                              variant="engineering"
                              className="cursor-pointer"
                              onClick={() => removeSpecialty(specialty)}
                            >
                              {specialty}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qualifications */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        資格・免許
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        {qualificationOptions.map(qualification => (
                          <button
                            key={qualification}
                            type="button"
                            onClick={() => addQualification(qualification)}
                            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-engineering-blue hover:bg-engineering-blue/5 transition-colors text-left"
                          >
                            <Plus className="w-3 h-3 inline mr-1" />
                            {qualification}
                          </button>
                        ))}
                      </div>
                      {formData.qualifications.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.qualifications.map(qualification => (
                            <Badge
                              key={qualification}
                              variant="success"
                              className="cursor-pointer"
                              onClick={() => removeQualification(qualification)}
                            >
                              {qualification}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Experience Years */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        経験年数 {formData.specialties.some(s => s !== '未経験') && '*'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.experienceYears}
                        onChange={(e) => handleInputChange('experienceYears', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="5"
                        required={formData.specialties.some(s => s !== '未経験')}
                      />
                      {formData.specialties.some(s => s !== '未経験') && (
                        <p className="text-sm text-gray-500 mt-1">
                          未経験以外の専門分野を選択した場合は必須です
                        </p>
                      )}
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

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  {currentStep === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                    >
                      戻る
                    </Button>
                  )}

                  <div className="ml-auto">
                    <Button
                      type="submit"
                      variant="engineering"
                      size="lg"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          作成中...
                        </>
                      ) : currentStep === 1 ? (
                        <>
                          次へ
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          アカウント作成
                          <CheckCircle className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Login Link */}
                <div className="text-center text-sm">
                  <span className="text-gray-600">すでにアカウントをお持ちですか？</span>
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