"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Edit,
  Save,
  X,
  Calendar,
  Users,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface OrganizationData {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  employee_count?: number
  business_type?: string
  registration_number?: string
  contact_person?: string
  created_at: string
  updated_at: string
}

export function OrganizationProfile() {
  const { userProfile, userRole } = useAuth()
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<OrganizationData>({
    id: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    employee_count: 0,
    business_type: '',
    registration_number: '',
    contact_person: '',
    created_at: '',
    updated_at: ''
  })

  // 組織情報を取得
  const fetchOrganization = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/organization/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('組織情報の取得に失敗しました')
      }

      const data = await response.json()
      // APIのレスポンスをコンポーネント用フォーマットに変換
      const orgData = {
        id: data.organization.id,
        name: data.organization.name,
        address: data.organization.address,
        phone: data.organization.phone_number,
        email: data.organization.email || '',
        website: data.organization.website,
        employee_count: data.organization.employee_count || 0,
        business_type: data.organization.business_type,
        registration_number: data.organization.business_registration_number,
        contact_person: data.organization.representative_name,
        created_at: data.organization.created_at || '',
        updated_at: data.organization.updated_at
      }
      setOrganization(orgData)
      setFormData(orgData)
    } catch (error) {
      console.error('組織情報取得エラー:', error)
      alert('組織情報の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 組織情報を保存
  const handleSave = async () => {
    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationData: {
            name: formData.name,
            address: formData.address,
            phone_number: formData.phone,
            email: formData.email,
            website: formData.website,
            employee_count: formData.employee_count,
            business_type: formData.business_type,
            business_registration_number: formData.registration_number,
            representative_name: formData.contact_person
          }
        })
      })

      if (!response.ok) {
        throw new Error('組織情報の更新に失敗しました')
      }

      const data = await response.json()
      // APIのレスポンスをコンポーネント用フォーマットに変換
      const orgData = {
        id: data.organization.id,
        name: data.organization.name,
        address: data.organization.address,
        phone: data.organization.phone_number,
        email: data.organization.email || '',
        website: data.organization.website,
        employee_count: data.organization.employee_count || 0,
        business_type: data.organization.business_type,
        registration_number: data.organization.business_registration_number,
        contact_person: data.organization.representative_name,
        created_at: data.organization.created_at || '',
        updated_at: data.organization.updated_at
      }
      setOrganization(orgData)
      setIsEditing(false)
      alert('組織情報が正常に更新されました')
    } catch (error) {
      console.error('組織情報保存エラー:', error)
      alert('組織情報の更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 編集をキャンセル
  const handleCancel = () => {
    setFormData(organization || formData)
    setIsEditing(false)
  }

  useEffect(() => {
    fetchOrganization()
  }, [])

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">法人プロフィール</h1>
            <p className="text-gray-600 mt-2">組織の基本情報を管理します</p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-engineering-blue hover:bg-engineering-blue/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? '保存中...' : '保存'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-2" />
                  キャンセル
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-engineering-blue hover:bg-engineering-blue/90"
              >
                <Edit className="w-4 h-4 mr-2" />
                編集
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* 基本情報 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              基本情報
            </CardTitle>
            <CardDescription>
              法人の基本情報を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 法人名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  法人名 *
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    placeholder="株式会社サンプル"
                    required
                  />
                ) : (
                  <p className="text-gray-900">{organization?.name || '未設定'}</p>
                )}
              </div>

              {/* 事業種別 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  事業種別
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.business_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    placeholder="建設業"
                  />
                ) : (
                  <p className="text-gray-900">{organization?.business_type || '未設定'}</p>
                )}
              </div>
            </div>

            {/* 法人番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                法人番号
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  placeholder="1234567890123"
                />
              ) : (
                <p className="text-gray-900">{organization?.registration_number || '未設定'}</p>
              )}
            </div>

            {/* 管理者名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理者名
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  placeholder="管理者デモ"
                />
              ) : (
                <p className="text-gray-900">{organization?.contact_person || '未設定'}</p>
              )}
            </div>


            {/* 従業員数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                従業員数
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.employee_count || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_count: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="50"
                />
              ) : (
                <p className="text-gray-900">{organization?.employee_count ? `${organization.employee_count}名` : '未設定'}</p>
              )}
            </div>

          </CardContent>
        </Card>
      </motion.div>

      {/* 連絡先情報 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              連絡先情報
            </CardTitle>
            <CardDescription>
              法人の連絡先情報を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 電話番号 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  電話番号
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    placeholder="03-1234-5678"
                  />
                ) : (
                  <p className="text-gray-900">{organization?.phone || '未設定'}</p>
                )}
              </div>

              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    placeholder="info@company.com"
                  />
                ) : (
                  <p className="text-gray-900">{organization?.email || '未設定'}</p>
                )}
              </div>
            </div>

            {/* 住所 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                住所
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  placeholder="東京都渋谷区..."
                />
              ) : (
                <p className="text-gray-900">{organization?.address || '未設定'}</p>
              )}
            </div>

            {/* ウェブサイト */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ウェブサイト
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  placeholder="https://www.company.com"
                />
              ) : (
                <p className="text-gray-900">
                  {organization?.website ? (
                    <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-engineering-blue hover:underline">
                      {organization.website}
                    </a>
                  ) : '未設定'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
