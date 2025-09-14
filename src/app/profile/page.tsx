"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Mail,
  Building,
  Award,
  Star,
  Edit,
  Save,
  X,
  Plus,
  Camera,
  Globe,
  Calendar,
  MapPin,
  Phone,
  LinkedinIcon,
  GithubIcon
} from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  )
}

function ProfilePageContent() {
  const { user, userProfile, userRole, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    display_name: userProfile?.display_name || '',
    specialties: userProfile?.specialties || [],
    qualifications: userProfile?.qualifications || [],
    portfolio_url: userProfile?.portfolio_url || '',
    phone: '',
    location: '',
    bio: '',
    linkedin: '',
    github: ''
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateProfile({
        display_name: formData.display_name,
        specialties: formData.specialties,
        qualifications: formData.qualifications,
        portfolio_url: formData.portfolio_url || undefined
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      display_name: userProfile?.display_name || '',
      specialties: userProfile?.specialties || [],
      qualifications: userProfile?.qualifications || [],
      portfolio_url: userProfile?.portfolio_url || '',
      phone: '',
      location: '',
      bio: '',
      linkedin: '',
      github: ''
    })
    setIsEditing(false)
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

  const specialtyOptions = [
    "道路設計", "橋梁設計", "河川工事", "トンネル設計", "地下構造",
    "構造物点検", "測量業務", "地質調査", "環境評価", "施工管理", "維持管理"
  ]

  const qualificationOptions = [
    "技術士（建設部門）", "技術士（上下水道部門）", "一級建築士", "測量士",
    "土木施工管理技士", "建築施工管理技士", "管工事施工管理技士",
    "造園施工管理技士", "建設機械施工技士", "土地家屋調査士"
  ]

  const getCompletionPercentage = () => {
    const fields = [
      formData.display_name,
      formData.specialties.length > 0,
      formData.qualifications.length > 0,
      formData.portfolio_url,
      formData.bio,
      formData.location
    ]
    const completed = fields.filter(Boolean).length
    return Math.round((completed / fields.length) * 100)
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />

      <div className="md:ml-64 transition-all duration-300">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-6 h-6 text-engineering-blue" />
                  プロフィール管理
                </h1>
                <p className="text-gray-600">あなたの専門情報と設定を管理</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="engineering">
                  プロフィール完成度: {getCompletionPercentage()}%
                </Badge>
                {!isEditing ? (
                  <Button variant="engineering" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      キャンセル
                    </Button>
                    <Button variant="engineering" onClick={handleSave} disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Completion Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card variant="engineering">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">プロフィール完成度</h3>
                    <span className="text-2xl font-bold text-white">{getCompletionPercentage()}%</span>
                  </div>
                  <Progress value={getCompletionPercentage()} className="mb-4" />
                  <p className="text-white/80 text-sm">
                    プロフィールを完成させると、より適切な案件のマッチングや評価を受けられます。
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    基本情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-engineering-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {formData.display_name.charAt(0) || 'U'}
                      </div>
                      {isEditing && (
                        <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50">
                          <Camera className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            表示名
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.display_name}
                              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900 font-medium">{userProfile?.display_name}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            メールアドレス
                          </label>
                          <p className="text-gray-900">{user?.email}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            認証済み
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ロール
                        </label>
                        <Badge variant="engineering">
                          {userRole}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    専門情報
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Specialties */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      専門分野
                    </label>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {specialtyOptions
                            .filter(s => !formData.specialties.includes(s))
                            .map(specialty => (
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
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {userProfile?.specialties?.map(specialty => (
                          <Badge key={specialty} variant="engineering">
                            {specialty}
                          </Badge>
                        )) || <p className="text-gray-500">未設定</p>}
                      </div>
                    )}
                  </div>

                  {/* Qualifications */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      資格・免許
                    </label>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {qualificationOptions
                            .filter(q => !formData.qualifications.includes(q))
                            .map(qualification => (
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
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {userProfile?.qualifications?.map(qualification => (
                          <Badge key={qualification} variant="success">
                            {qualification}
                          </Badge>
                        )) || <p className="text-gray-500">未設定</p>}
                      </div>
                    )}
                  </div>

                  {/* Portfolio URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ポートフォリオURL
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={formData.portfolio_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="https://portfolio.example.com"
                      />
                    ) : userProfile?.portfolio_url ? (
                      <a
                        href={userProfile.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-engineering-blue hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                        {userProfile.portfolio_url}
                      </a>
                    ) : (
                      <p className="text-gray-500">未設定</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Stats */}
            {userProfile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      パフォーマンス
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-engineering-blue mb-2">
                          {userProfile.rating ? userProfile.rating.toFixed(1) : 'N/A'}
                        </div>
                        <p className="text-sm text-gray-600">平均評価</p>
                        <div className="flex justify-center mt-2">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                userProfile.rating && star <= userProfile.rating
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-engineering-green mb-2">12</div>
                        <p className="text-sm text-gray-600">完了プロジェクト</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
                        <p className="text-sm text-gray-600">納期達成率</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}