"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Star, User, Clock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface FavoriteMember {
  id: string
  contractor_id: string
  contractor_name: string
  contractor_email: string
  profile_image_url?: string
  notes?: string
  added_at: string
}

interface FavoriteMemberSelectorProps {
  selectedContractorId: string | null
  onSelectionChange: (contractorId: string | null) => void
  onSkip: () => void
}

export function FavoriteMemberSelector({
  selectedContractorId,
  onSelectionChange,
  onSkip
}: FavoriteMemberSelectorProps) {
  const { userProfile } = useAuth()
  const [favoriteMembers, setFavoriteMembers] = useState<FavoriteMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadFavoriteMembers()
  }, [])

  const loadFavoriteMembers = async () => {
    if (!userProfile) return

    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')

      const response = await fetch('/api/favorite-members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('お気に入り会員の取得に失敗しました')
      }

      const data = await response.json()
      setFavoriteMembers(data.favorite_members || [])
    } catch (err) {
      console.error('お気に入り会員取得エラー:', err)
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            お気に入り会員への優先招待
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            お気に入り会員への優先招待
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={loadFavoriteMembers}>
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (favoriteMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            お気に入り会員への優先招待
          </CardTitle>
          <CardDescription>
            お気に入り会員が登録されていません。一般公開で案件を作成します。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          お気に入り会員への優先招待
        </CardTitle>
        <CardDescription>
          お気に入り会員の中から1人を選んで優先的に案件を依頼できます。24時間以内に回答がない場合、一般公開されます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedContractorId || ""}
          onValueChange={onSelectionChange}
        >
          {favoriteMembers.map((member) => (
            <div key={member.id} className="flex items-center space-x-2">
              <RadioGroupItem
                value={member.contractor_id}
                id={member.contractor_id}
                className="mt-1"
              />
              <Label
                htmlFor={member.contractor_id}
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.profile_image_url} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {member.contractor_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.contractor_email}
                    </div>
                    {member.notes && (
                      <div className="text-xs text-gray-400 mt-1">
                        {member.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      登録: {new Date(member.added_at).toLocaleDateString('ja-JP')}
                    </Badge>
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1"
          >
            スキップして一般公開
          </Button>
          {selectedContractorId && (
            <Button
              onClick={() => onSelectionChange(selectedContractorId)}
              className="flex-1"
            >
              選択した会員に優先招待
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}