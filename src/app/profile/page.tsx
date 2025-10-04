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
import { supabase } from "@/lib/supabase"
import { calculateMemberLevel, getMemberLevelInfo, type MemberLevel } from "@/lib/member-level"
import { getOrganizationDisplayName } from "@/lib/organization-utils"
import { OrganizationProfile } from "@/components/profile/organization-profile"
import { ContractorRatingDisplay } from "@/components/evaluations/contractor-rating-display"
import { BadgeCollection } from "@/components/badges/badge-collection"

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [evaluationData, setEvaluationData] = useState<any>(null)
  const [evaluationLoading, setEvaluationLoading] = useState(false)
  const [badgeData, setBadgeData] = useState<any[]>([])
  const [badgeLoading, setBadgeLoading] = useState(false)
  const [showLevelChangeModal, setShowLevelChangeModal] = useState(false)
  const [requestedLevel, setRequestedLevel] = useState<MemberLevel>('intermediate')
  const [levelChangeLoading, setLevelChangeLoading] = useState(false)
  const [formData, setFormData] = useState({
    display_name: userProfile?.display_name || '',
    specialties: userProfile?.specialties || [],
    qualifications: userProfile?.qualifications || [],
    experience_years: userProfile?.experience_years || '',
    phone: '',
    location: '',
    bio: '',
    linkedin: '',
    github: '',
    formal_name: userProfile?.formal_name || '',
    organization: userProfile?.organization || '',
    postal_code: userProfile?.postal_code || '',
    address: userProfile?.address || '',
    address_detail: userProfile?.address_detail || '',
    phone_number: userProfile?.phone_number || '',
    company_number: userProfile?.company_number || '',
    registration_number: userProfile?.registration_number || ''
  })

  const handleSave = async () => {
    // 必須項目のバリデーション
    if (!formData.formal_name.trim()) {
      alert('氏名を入力してください')
      return
    }

    // 受注者の場合のみ電話番号、住所を必須とする
    if (userRole === 'Contractor') {
      if (!formData.phone_number.trim()) {
        alert('電話番号を入力してください')
        return
      }
      if (!formData.address.trim()) {
        alert('住所を入力してください')
        return
      }
      if (!formData.address_detail.trim()) {
        alert('住所（その他）を入力してください')
        return
      }
    }

    // 未経験以外の専門分野を選択した場合は経験年数が必須
    const hasNonBeginnerSpecialty = formData.specialties.some(specialty => specialty !== '未経験')
    if (hasNonBeginnerSpecialty && !formData.experience_years.trim()) {
      alert('未経験以外の専門分野を選択した場合は経験年数を入力してください')
      return
    }

    setIsLoading(true)
    try {

      await updateProfile({
        display_name: formData.display_name,
        specialties: formData.specialties,
        qualifications: formData.qualifications,
        experience_years: formData.experience_years || undefined,
        formal_name: formData.formal_name || undefined,
        organization: formData.organization || undefined,
        postal_code: formData.postal_code || undefined,
        address: formData.address || undefined,
        address_detail: formData.address_detail || undefined,
        phone_number: formData.phone_number || undefined,
        company_number: formData.company_number || undefined,
        registration_number: formData.registration_number || undefined
      })
      
      setIsEditing(false)
      alert('プロフィールが正常に更新されました')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('プロフィールの更新に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    } finally {
      setIsLoading(false)
    }
  }

  // 評価データを取得
  const fetchEvaluationData = async () => {
    if (!userProfile || userRole !== 'Contractor') return
    
    setEvaluationLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/evaluations/contractor?contractor_id=${userProfile.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setEvaluationData(result.evaluations || [])
      }
    } catch (error) {
      console.error('評価データ取得エラー:', error)
    } finally {
      setEvaluationLoading(false)
    }
  }

  // バッジデータを取得
  const fetchBadgeData = async () => {
    if (!userProfile) return
    
    setBadgeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/badges/user/${userProfile.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setBadgeData(result.badges || [])
      }
    } catch (error) {
      console.error('バッジデータ取得エラー:', error)
    } finally {
      setBadgeLoading(false)
    }
  }

  // コンポーネントマウント時にデータを取得
  React.useEffect(() => {
    fetchEvaluationData()
    fetchBadgeData()
  }, [userProfile, userRole])

  const handleCancel = () => {
    setFormData({
      display_name: userProfile?.display_name || '',
      specialties: userProfile?.specialties || [],
      qualifications: userProfile?.qualifications || [],
      experience_years: userProfile?.experience_years || '',
      phone: '',
      location: '',
      bio: '',
      linkedin: '',
      github: '',
      formal_name: userProfile?.formal_name || '',
      organization: userProfile?.organization || '',
      postal_code: userProfile?.postal_code || '',
      address: userProfile?.address || '',
      address_detail: userProfile?.address_detail || '',
      phone_number: userProfile?.phone_number || '',
      company_number: userProfile?.company_number || '',
      registration_number: userProfile?.registration_number || ''
    })
    setIsEditing(false)
  }

  // 郵便番号から住所を取得する関数
  const fetchAddressFromPostalCode = async (postalCode: string) => {
    if (postalCode.length !== 7) return

    try {
      const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
      const data = await response.json()
      
      if (data.status === 200 && data.results && data.results.length > 0) {
        const result = data.results[0]
        const fullAddress = `${result.address1}${result.address2}${result.address3}`
        setFormData(prev => ({ ...prev, address: fullAddress }))
      } else {
      }
    } catch (error) {
      console.error('住所取得エラー:', error)
    }
  }

  // 郵便番号入力のハンドラー
  const handlePostalCodeChange = (value: string) => {
    // 数字のみを許可し、ハイフンを除去
    const cleanValue = value.replace(/[^0-9]/g, '')
    setFormData(prev => ({ ...prev, postal_code: cleanValue }))
    
    // 7桁になったら住所を自動取得
    if (cleanValue.length === 7) {
      fetchAddressFromPostalCode(cleanValue)
    }
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

  const handleAvatarUpload = async (file: File) => {
    if (!user || !file) return

    try {
      setIsUploadingAvatar(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        return
      }

      // FormDataを作成
      const formData = new FormData()
      formData.append('avatar', file)


      // APIエンドポイント経由でアバターをアップロード
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        // プロフィール情報を再取得
        window.location.reload()
      } else {
        console.error('アバターアップロードエラー:', result.message)
        alert('アバターのアップロードに失敗しました: ' + result.message)
      }

    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('アバターのアップロードに失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleLevelChangeRequest = async () => {
    if (!confirm(`会員レベルを「${requestedLevel === 'beginner' ? '初級' : requestedLevel === 'intermediate' ? '中級' : '上級'}」に変更リクエストしますか？\n\n運営側の承認が必要です。`)) {
      return
    }

    setLevelChangeLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('セッションが見つかりません')
        return
      }

      const response = await fetch('/api/profile/member-level-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ requested_level: requestedLevel })
      })

      const result = await response.json()

      if (response.ok) {
        alert('レベル変更リクエストを送信しました。運営側の承認をお待ちください。')
        setShowLevelChangeModal(false)
        window.location.reload()
      } else {
        alert(`エラー: ${result.message}`)
      }
    } catch (error) {
      console.error('レベル変更リクエストエラー:', error)
      alert('レベル変更リクエストに失敗しました')
    } finally {
      setLevelChangeLoading(false)
    }
  }

  const specialtyOptions = [
    "未経験", "道路設計", "橋梁設計", "河川工事", "上下水道設計", "トンネル設計", "地下構造",
    "構造物点検", "測量業務", "地質調査", "環境評価", "施工管理"
  ]

  const qualificationOptions = [
    "技術士（建設部門）", "技術士（上下水道部門）", "技術士（その他）", "技術士補", "一級建築士", "測量士",
    "土木施工管理技士", "管工事施工管理技士",
    "造園施工管理技士", "土地家屋調査士"
  ]

  const getCompletionPercentage = () => {
    const fields = [
      formData.display_name,
      formData.specialties.length > 0,
      formData.qualifications.length > 0,
      formData.experience_years,
      formData.bio,
      formData.location,
      formData.formal_name,
      formData.address,
      formData.address_detail,
      formData.phone_number,
      formData.company_number,
      formData.registration_number
    ]
    const completed = fields.filter(Boolean).length
    return Math.round((completed / fields.length) * 100)
  }

  // OrgAdminの場合は法人プロフィールを表示
  if (userRole === 'OrgAdmin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="container mx-auto px-4 py-8">
          <OrganizationProfile />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />

      <div className="md:ml-64 transition-all duration-300">
        <main className="px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 編集ボタン */}
            <div className="flex justify-end">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-engineering-blue hover:bg-engineering-blue/90"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  プロフィールを編集
                </Button>
              ) : (
                <div className="flex gap-4">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-engineering-green hover:bg-engineering-green/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? '保存中...' : '保存'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    キャンセル
                  </Button>
                </div>
              )}
            </div>

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
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt="プロフィール画像"
                          className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-engineering-blue rounded-full flex items-center justify-center text-white text-2xl font-bold">
                          {formData.display_name.charAt(0) || 'U'}
                        </div>
                      )}
                      {isEditing && (
                        <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 cursor-pointer">
                          <Camera className="w-4 h-4 text-gray-600" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleAvatarUpload(file)
                              }
                            }}
                            className="hidden"
                            disabled={isUploadingAvatar}
                          />
                        </label>
                      )}
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
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
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ロール
                          </label>
                          <Badge variant="engineering">
                            {userRole}
                          </Badge>
                        </div>
                        {/* 受注者の場合のみ会員レベルを表示 */}
                        {userRole === 'Contractor' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              会員レベル
                            </label>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const currentLevel = userProfile?.member_level || calculateMemberLevel(formData.experience_years, formData.specialties)
                                const levelInfo = getMemberLevelInfo(currentLevel as MemberLevel)
                                return (
                                  <Badge className={levelInfo.color}>
                                    {levelInfo.label}
                                  </Badge>
                                )
                              })()}
                              {!isEditing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowLevelChangeModal(true)}
                                  className="text-xs"
                                  disabled={userProfile?.level_change_status === 'pending'}
                                >
                                  {userProfile?.level_change_status === 'pending' ? '変更申請中' : 'レベル変更申請'}
                                </Button>
                              )}
                            </div>
                            {userProfile?.level_change_status === 'pending' && (
                              <p className="text-xs text-yellow-600 mt-1">
                                {userProfile.requested_member_level === 'beginner' ? '初級' :
                                 userProfile.requested_member_level === 'intermediate' ? '中級' : '上級'}への変更リクエストが承認待ちです
                              </p>
                            )}
                            {userProfile?.level_change_status === 'rejected' && (
                              <p className="text-xs text-red-600 mt-1">
                                レベル変更リクエストが却下されました: {userProfile.level_change_notes}
                              </p>
                            )}
                          </div>
                        )}
                        {/* 組織内ユーザーの場合は氏名を表示 */}
                        {(userRole === 'Admin' || userRole === 'Staff') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              氏名
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={formData.formal_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, formal_name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                                placeholder="田中 太郎"
                              />
                            ) : (
                              <p className="text-gray-900">{userProfile?.formal_name || '未設定'}</p>
                            )}
                          </div>
                        )}
                      </div>
                      {/* 受注者の場合のみ屋号及び所属組織を表示 */}
                      {userRole === 'Contractor' && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            屋号及び所属組織
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={formData.organization}
                              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                              placeholder="例: 田中建設事務所"
                            />
                          ) : (
                            <p className="text-gray-900">
                              {getOrganizationDisplayName(userProfile?.organization, userRole)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Professional Information - 受注者のみ表示 */}
            {userRole === 'Contractor' && (
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

                  {/* Experience Years */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      経験年数 {formData.specialties.some(s => s !== '未経験') && '*'}
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.experience_years}
                        onChange={(e) => setFormData(prev => ({ ...prev, experience_years: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="5"
                        required={formData.specialties.some(s => s !== '未経験')}
                      />
                    ) : userProfile?.experience_years ? (
                      <p className="text-gray-900">{userProfile.experience_years}年</p>
                    ) : (
                      <p className="text-gray-500">未設定</p>
                    )}
                    {isEditing && formData.specialties.some(s => s !== '未経験') && (
                      <p className="text-sm text-gray-500 mt-1">
                        未経験以外の専門分野を選択した場合は必須です
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            )}

            {/* Personal Information - 受注者のみ表示 */}
            {userRole === 'Contractor' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    個人情報
                  </CardTitle>
                  <CardDescription>
                    氏名、住所（自動入力）、住所（その他）、電話番号は必須項目です。会社番号、インボイス番号は任意で入力してください
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 氏名 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        氏名 *
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.formal_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, formal_name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="田中 太郎"
                          required
                        />
                      ) : (
                        <p className="text-gray-900">{userProfile?.formal_name || '未設定'}</p>
                      )}
                    </div>

                    {/* 電話番号 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        電話番号 *
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="03-1234-5678"
                          required
                        />
                      ) : (
                        <p className="text-gray-900">{userProfile?.phone_number || '未設定'}</p>
                      )}
                    </div>
                  </div>

                  {/* 郵便番号 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      郵便番号
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => handlePostalCodeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="1234567"
                        maxLength={7}
                      />
                    ) : (
                      <p className="text-gray-900">{userProfile?.postal_code || '未設定'}</p>
                    )}
                    {isEditing && (
                      <p className="text-sm text-gray-500 mt-1">
                        7桁の郵便番号を入力すると住所が自動入力されます
                      </p>
                    )}
                  </div>

                  {/* 住所（自動入力） */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      住所（自動入力） *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="東京都渋谷区..."
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{userProfile?.address || '未設定'}</p>
                    )}
                    {isEditing && (
                      <p className="text-sm text-gray-500 mt-1">
                        郵便番号から自動入力されます（手動でも編集可能）
                      </p>
                    )}
                  </div>

                  {/* 住所（その他） */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      住所（その他） *
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.address_detail}
                        onChange={(e) => setFormData(prev => ({ ...prev, address_detail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="マンション名、部屋番号など"
                        required
                      />
                    ) : (
                      <p className="text-gray-900">{userProfile?.address_detail || '未設定'}</p>
                    )}
                    {isEditing && (
                      <p className="text-sm text-gray-500 mt-1">
                        マンション名、部屋番号、建物名などを入力してください（必須項目）
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 会社番号 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        会社番号（法人番号）
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.company_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, company_number: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="1234567890123"
                        />
                      ) : (
                        <p className="text-gray-900">{userProfile?.company_number || '未設定'}</p>
                      )}
                    </div>

                    {/* インボイス番号 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        インボイス番号（Tを除く）
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.registration_number}
                          onChange={(e) => {
                            // Tを除く番号のみを許可
                            const value = e.target.value.replace(/[^0-9]/g, '')
                            setFormData(prev => ({ ...prev, registration_number: value }))
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="1234567890123"
                          maxLength={13}
                        />
                      ) : (
                        <p className="text-gray-900">
                          {userProfile?.registration_number ? `T${userProfile.registration_number}` : '未設定'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            )}

            {/* 受注者評価表示 */}
            {userRole === 'Contractor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ContractorRatingDisplay 
                  evaluations={evaluationData || []} 
                  loading={evaluationLoading} 
                />
              </motion.div>
            )}

            {/* バッジコレクション表示 */}
            {userRole === 'Contractor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <BadgeCollection
                  badges={badgeData || []}
                  loading={badgeLoading}
                />
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* レベル変更リクエストモーダル */}
      {showLevelChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">会員レベル変更申請</h3>
            <p className="text-sm text-gray-600 mb-4">
              変更を希望する会員レベルを選択してください。運営側の承認が必要です。
            </p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="level"
                  value="beginner"
                  checked={requestedLevel === 'beginner'}
                  onChange={(e) => setRequestedLevel(e.target.value as MemberLevel)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">初級</div>
                  <div className="text-xs text-gray-500">経験年数3年未満、未経験</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="level"
                  value="intermediate"
                  checked={requestedLevel === 'intermediate'}
                  onChange={(e) => setRequestedLevel(e.target.value as MemberLevel)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">中級</div>
                  <div className="text-xs text-gray-500">経験年数3年以上7年未満</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="level"
                  value="advanced"
                  checked={requestedLevel === 'advanced'}
                  onChange={(e) => setRequestedLevel(e.target.value as MemberLevel)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">上級</div>
                  <div className="text-xs text-gray-500">経験年数7年以上</div>
                </div>
              </label>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleLevelChangeRequest}
                disabled={levelChangeLoading}
                className="flex-1 bg-engineering-blue hover:bg-engineering-blue/90"
              >
                {levelChangeLoading ? '送信中...' : '申請する'}
              </Button>
              <Button
                onClick={() => setShowLevelChangeModal(false)}
                variant="outline"
                disabled={levelChangeLoading}
                className="flex-1"
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}