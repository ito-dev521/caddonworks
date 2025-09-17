'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BadgeIcon, BadgeTooltip } from './badge-icon'
import { Trophy, Star, Award } from 'lucide-react'

interface UserBadge {
  id: string
  badge_id: string
  earned_at: string
  project_id?: string
  metadata: any
  badges: {
    id: string
    code: string
    name: string
    description: string
    category: string
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'rainbow'
    icon_name: string
  }
}

interface BadgeCollectionProps {
  badges: UserBadge[]
  loading?: boolean
  showAll?: boolean
  maxDisplay?: number
}

export function BadgeCollection({ 
  badges, 
  loading = false, 
  showAll = false, 
  maxDisplay = 12 
}: BadgeCollectionProps) {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            バッジコレクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!badges || badges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            バッジコレクション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">まだバッジがありません</p>
            <p className="text-sm text-gray-500 mt-2">
              案件を完了してバッジを獲得しましょう
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // バッジをティア別にグループ化
  const badgesByTier = badges.reduce((acc, badge) => {
    const tier = badge.badges.tier
    if (!acc[tier]) acc[tier] = []
    acc[tier].push(badge)
    return acc
  }, {} as Record<string, UserBadge[]>)

  // ティアの順序
  const tierOrder = ['rainbow', 'platinum', 'gold', 'silver', 'bronze']
  const tierLabels = {
    rainbow: 'レア',
    platinum: 'プラチナ',
    gold: 'ゴールド',
    silver: 'シルバー',
    bronze: 'ブロンズ'
  }

  const displayBadges = showAll ? badges : badges.slice(0, maxDisplay)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          バッジコレクション
          <Badge variant="secondary" className="ml-2">
            {badges.length}個
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ティア別統計 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {tierOrder.map(tier => {
            const count = badgesByTier[tier]?.length || 0
            if (count === 0) return null
            
            return (
              <div key={tier} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600">{tierLabels[tier as keyof typeof tierLabels]}</div>
              </div>
            )
          })}
        </div>

        {/* バッジグリッド */}
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {displayBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              <div
                className="cursor-pointer hover:scale-110 transition-transform"
                onMouseEnter={() => {
                  setSelectedBadge(badge)
                  setShowTooltip(true)
                }}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => {
                  setSelectedBadge(badge)
                  setShowTooltip(!showTooltip)
                }}
              >
                <BadgeIcon
                  iconName={badge.badges.icon_name}
                  tier={badge.badges.tier}
                  size="md"
                />
              </div>
              
              {/* ツールチップ */}
              {showTooltip && selectedBadge?.id === badge.id && (
                <div className="absolute z-10 top-full left-1/2 transform -translate-x-1/2 mt-2">
                  <BadgeTooltip
                    name={badge.badges.name}
                    description={badge.badges.description}
                    tier={badge.badges.tier}
                    earnedAt={badge.earned_at}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* もっと見るボタン */}
        {!showAll && badges.length > maxDisplay && (
          <div className="text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              +{badges.length - maxDisplay}個のバッジを表示
            </button>
          </div>
        )}

        {/* 最近獲得したバッジ */}
        {badges.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">最近獲得したバッジ</h4>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {badges
                .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
                .slice(0, 5)
                .map((badge) => (
                  <div key={badge.id} className="flex-shrink-0">
                    <BadgeIcon
                      iconName={badge.badges.icon_name}
                      tier={badge.badges.tier}
                      size="sm"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// バッジの詳細表示コンポーネント
interface BadgeDetailProps {
  badge: UserBadge
  onClose: () => void
}

export function BadgeDetail({ badge, onClose }: BadgeDetailProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg p-6 max-w-md w-full"
      >
        <div className="text-center">
          <BadgeIcon
            iconName={badge.badges.icon_name}
            tier={badge.badges.tier}
            size="lg"
            className="mx-auto mb-4"
          />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {badge.badges.name}
          </h3>
          <p className="text-gray-600 mb-4">
            {badge.badges.description}
          </p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge className="capitalize">
              {badge.badges.tier}
            </Badge>
            <span className="text-sm text-gray-500">
              獲得日: {new Date(badge.earned_at).toLocaleDateString('ja-JP')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            閉じる
          </button>
        </div>
      </motion.div>
    </div>
  )
}
