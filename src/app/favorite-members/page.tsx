"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Search,
  User,
  Mail,
  Star,
  Trash2,
  Plus,
  Building,
  Calendar,
  Award,
  X
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { AuthGuard } from "@/components/auth/auth-guard"

interface FavoriteMember {
  id: string
  contractor_id: string
  added_at: string
  notes?: string
  is_active: boolean
  users: {
    id: string
    display_name: string
    email: string
    specialties: string[]
    experience_years?: number
    rating?: number
  }
}

function FavoriteMembersPageContent() {
  const { userProfile, userRole, loading } = useAuth()
  const [favoriteMembers, setFavoriteMembers] = useState<FavoriteMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<FavoriteMember[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const lastFetchKeyRef = useRef<string | null>(null)

  // お気に入り会員データを取得する関数
  const fetchFavoriteMembers = useCallback(async () => {
    try {
      setDataLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        setDataLoading(false)
        return
      }

      const response = await fetch('/api/favorite-members', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        setFavoriteMembers(result.favorite_members || [])
        setFilteredMembers(result.favorite_members || [])
      } else {
        console.error('お気に入り会員データの取得に失敗:', result.message)
        setFavoriteMembers([])
        setFilteredMembers([])
      }

    } catch (error) {
      console.error('データ取得エラー:', error)
      setFavoriteMembers([])
      setFilteredMembers([])
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!userProfile || userRole !== 'OrgAdmin') {
      setDataLoading(false)
      return
    }

    // 同一ユーザー・ロールの組み合わせでは1回のみフェッチ
    const fetchKey = `${userProfile.id}:${userRole}`
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey

    fetchFavoriteMembers()
  }, [userProfile, userRole, fetchFavoriteMembers])

  // フィルタリング
  useEffect(() => {
    let filtered = favoriteMembers

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.users.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.users.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.users.specialties.some(specialty => 
          specialty.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    setFilteredMembers(filtered)
  }, [favoriteMembers, searchTerm])

  // お気に入り会員削除
  const handleDeleteFavorite = async (favoriteId: string) => {
    setIsDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(`/api/favorite-members/${favoriteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('お気に入り会員から削除されました')
        setShowDeleteModal(null)
        await fetchFavoriteMembers()
      } else {
        alert('削除に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('削除エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsDeleting(false)
    }
  }

  // ローディング状態
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  // 権限チェック
  if (userRole !== 'OrgAdmin') {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Building className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
            <p className="text-gray-600">このページは発注者（組織管理者）のみアクセス可能です。</p>
          </CardContent>
        </Card>
      </div>
    )
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
                  <Heart className="w-6 h-6 text-pink-600" />
                  お気に入り会員管理
                </h1>
                <p className="text-gray-600">優先的に案件を依頼できる受注者を管理</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">登録会員数</p>
                <p className="text-sm font-medium">{favoriteMembers.length}名</p>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* 検索バー */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="名前、メール、専門分野で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
              />
            </div>
          </div>

          {/* お気に入り会員一覧 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover-lift group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-engineering-blue" />
                            {member.users.display_name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {member.users.email}
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDeleteModal(member.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* 評価情報 */}
                      {member.users.rating && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium text-gray-700">
                            評価: {member.users.rating.toFixed(1)}/5.0
                          </span>
                        </div>
                      )}

                      {/* 経験年数 */}
                      {member.users.experience_years && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">
                            経験年数: {member.users.experience_years}年
                          </span>
                        </div>
                      )}

                      {/* 専門分野 */}
                      {member.users.specialties && member.users.specialties.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">専門分野</p>
                          <div className="flex flex-wrap gap-1">
                            {member.users.specialties.map((specialty, idx) => (
                              <Badge key={idx} className="text-xs bg-blue-100 text-blue-800">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 登録日時 */}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        登録日: {new Date(member.added_at).toLocaleDateString('ja-JP')}
                      </div>

                      {/* メモ */}
                      {member.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">メモ</p>
                          <p className="text-sm text-gray-700">{member.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 空状態 */}
          {filteredMembers.length === 0 && !dataLoading && (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '検索結果が見つかりません' : 'お気に入り会員が登録されていません'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? '検索条件を変更してお試しください'
                  : '受注者を評価する際に「お気に入り会員に追加」ボタンで登録できます'
                }
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">お気に入り会員から削除</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                この受注者をお気に入り会員から削除してもよろしいですか？
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(null)}
                  disabled={isDeleting}
                >
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteFavorite(showDeleteModal)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      削除中...
                    </>
                  ) : (
                    '削除'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default function FavoriteMembersPage() {
  return (
    <AuthGuard requiredRole="OrgAdmin">
      <FavoriteMembersPageContent />
    </AuthGuard>
  )
}
