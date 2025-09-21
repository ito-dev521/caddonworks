"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, Edit, Save, X, Shield, Mail } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

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
  const [displayName, setDisplayName] = useState<string>(userProfile?.display_name || userProfile?.formal_name || '')
  const [formalName, setFormalName] = useState<string>(userProfile?.formal_name || '')
  const [orgContactName, setOrgContactName] = useState<string | null>(null)

  // 発注者の場合は組織の代表者名を取得して表示に利用
  useEffect(() => {
    const fetchOrgProfile = async () => {
      try {
        if (userRole !== 'OrgAdmin' && userRole !== 'Staff') return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/organization/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
        if (!res.ok) return
        const json = await res.json()
        const name = json?.organization?.representative_name || json?.organization?.contact_person || null
        if (name) setOrgContactName(name)
      } catch {}
    }
    fetchOrgProfile()
  }, [userRole])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateProfile({ display_name: displayName, formal_name: formalName })
      setIsEditing(false)
      alert('プロフィールが正常に更新されました')
    } catch (_) {
      alert('プロフィールの更新に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setDisplayName(userProfile?.display_name || '')
    setFormalName(userProfile?.formal_name || '')
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />
      <div className="md:ml-64 transition-all duration-300">
        <main className="px-6 py-8">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex justify-end">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="bg-engineering-blue hover:bg-engineering-blue/90">
                  <Edit className="w-4 h-4 mr-2" />
                  プロフィールを編集
                </Button>
              ) : (
                <div className="flex gap-4">
                  <Button onClick={handleSave} disabled={isLoading} className="bg-engineering-green hover:bg-engineering-green/90">
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? '保存中...' : '保存'}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
                    <X className="w-4 h-4 mr-2" />
                    キャンセル
                  </Button>
                </div>
              )}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    プロフィール
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{orgContactName || userProfile?.display_name || userProfile?.formal_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">氏名</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formalName}
                        onChange={(e) => setFormalName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        placeholder="山田 太郎"
                      />
                    ) : (
                      <p className="text-gray-900">{orgContactName || userProfile?.formal_name || '未設定'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                    <p className="text-gray-900 inline-flex items-center gap-2"><Mail className="w-4 h-4" />{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ロール</label>
                    <Badge variant="engineering" className="inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {userRole}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}



