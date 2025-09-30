'use client'

import React from 'react'
import { BadgeIcon } from './badge-icon'

interface Badge {
  id: string
  code: string
  name: string
  description: string
  category: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'rainbow'
  icon_name: string
}

interface UserBadge {
  id: string
  badge_id: string
  earned_at: string
  badges: Badge
}

interface BadgeMiniProps {
  badges: UserBadge[]
  maxDisplay?: number
  size?: 'sm' | 'md'
  className?: string
}

/**
 * プロジェクト一覧などで使用する小さいバッジ表示コンポーネント
 * 上位のバッジのみを表示
 */
export function BadgeMini({ badges, maxDisplay = 3, size = 'sm', className = '' }: BadgeMiniProps) {
  if (!badges || badges.length === 0) {
    return null
  }

  // ティアの優先順位
  const tierPriority: Record<string, number> = {
    rainbow: 5,
    platinum: 4,
    gold: 3,
    silver: 2,
    bronze: 1
  }

  // ティアの優先度でソート
  const sortedBadges = [...badges].sort((a, b) => {
    const aPriority = tierPriority[a.badges.tier] || 0
    const bPriority = tierPriority[b.badges.tier] || 0

    if (aPriority !== bPriority) {
      return bPriority - aPriority // 降順
    }

    // 同じティアの場合は取得日時で降順
    return new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime()
  })

  // 表示するバッジを制限
  const displayBadges = sortedBadges.slice(0, maxDisplay)
  const remainingCount = badges.length - maxDisplay

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {displayBadges.map((badge) => (
        <div
          key={badge.id}
          title={`${badge.badges.name}: ${badge.badges.description}`}
          className="flex-shrink-0"
        >
          <BadgeIcon
            iconName={badge.badges.icon_name}
            tier={badge.badges.tier}
            size={size}
          />
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className="flex-shrink-0 text-xs text-gray-500 font-medium px-1"
          title={`他${remainingCount}個のバッジ`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

/**
 * シンプルなバッジカウント表示
 */
interface BadgeCountProps {
  count: number
  className?: string
}

export function BadgeCount({ count, className = '' }: BadgeCountProps) {
  if (count === 0) {
    return null
  }

  return (
    <div className={`inline-flex items-center gap-1 text-sm text-gray-600 ${className}`}>
      <span className="text-yellow-500">★</span>
      <span>{count}</span>
    </div>
  )
}