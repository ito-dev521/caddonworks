'use client'

import React from 'react'
import { 
  Award, 
  Star, 
  Trophy, 
  Crown, 
  Zap, 
  Target, 
  TrendingUp,
  Building,
  Waves,
  Mountain,
  Zap as Electrical,
  Droplets,
  Monitor,
  Calculator,
  MapPin,
  Users,
  MessageCircle,
  Clock,
  Presentation,
  CheckCircle,
  FileCheck,
  FileText,
  Shield,
  Sun,
  Snowflake,
  Leaf,
  Calendar,
  Map,
  DollarSign,
  TrendingUp as Growth,
  Target as Goal,
  Sparkles,
  Lightbulb,
  UserCheck
} from 'lucide-react'

interface BadgeIconProps {
  iconName: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'rainbow'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const iconMap: Record<string, React.ComponentType<any>> = {
  // 基本バッジ
  'first_project': Award,
  'project_master': Star,
  'project_expert': Trophy,
  'project_legend': Crown,
  
  // 継続性系
  'streak_3m': Zap,
  'speed_star': Zap,
  'perfectionist': Target,
  'growing_star': TrendingUp,
  
  // 設計分野別
  'bridge_designer': Building,
  'road_designer': Building,
  'building_designer': Building,
  'river_designer': Waves,
  'tunnel_designer': Mountain,
  'electrical_designer': Electrical,
  'water_designer': Droplets,
  
  // 技術レベル別
  'cad_master': Monitor,
  'structural_engineer': Calculator,
  'surveyor': MapPin,
  'bim_specialist': Building,
  
  // コミュニケーション系
  'communicator': MessageCircle,
  'team_player': Users,
  'response_king': Clock,
  'presenter': Presentation,
  
  // 品質管理系
  'quality_manager': CheckCircle,
  'checker': FileCheck,
  'document_master': FileText,
  'safety_designer': Shield,
  
  // 季節・イベント系
  'spring_designer': Leaf,
  'summer_designer': Sun,
  'autumn_designer': Leaf,
  'winter_designer': Snowflake,
  'new_year_challenger': Calendar,
  
  // 地域・規模系
  'urban_designer': Building,
  'rural_designer': Map,
  'mega_project': Building,
  'local_expert': MapPin,
  
  // 収益系
  'millionaire': DollarSign,
  'billionaire': DollarSign,
  'growth_stock': Growth,
  'goal_achiever': Goal,
  
  // レアバッジ
  'platform_mvp': Crown,
  'superstar': Sparkles,
  'innovator': Lightbulb,
  'mentor': UserCheck
}

const tierStyles = {
  bronze: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: 'text-amber-600'
  },
  silver: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-800',
    icon: 'text-gray-600'
  },
  gold: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    icon: 'text-yellow-600'
  },
  platinum: {
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-800',
    icon: 'text-blue-600'
  },
  rainbow: {
    bg: 'bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100',
    border: 'border-purple-300',
    text: 'text-purple-800',
    icon: 'text-purple-600'
  }
}

const sizeStyles = {
  sm: {
    container: 'w-8 h-8',
    icon: 'w-4 h-4'
  },
  md: {
    container: 'w-12 h-12',
    icon: 'w-6 h-6'
  },
  lg: {
    container: 'w-16 h-16',
    icon: 'w-8 h-8'
  }
}

export function BadgeIcon({ iconName, tier, size = 'md', className = '' }: BadgeIconProps) {
  const IconComponent = iconMap[iconName] || Award
  const tierStyle = tierStyles[tier]
  const sizeStyle = sizeStyles[size]

  return (
    <div 
      className={`
        ${sizeStyle.container}
        ${tierStyle.bg}
        ${tierStyle.border}
        border-2
        rounded-full
        flex
        items-center
        justify-center
        shadow-sm
        ${className}
      `}
      title={`${iconName} (${tier})`}
    >
      <IconComponent 
        className={`${sizeStyle.icon} ${tierStyle.icon}`}
      />
    </div>
  )
}

// バッジの詳細情報を表示するコンポーネント
interface BadgeTooltipProps {
  name: string
  description: string
  tier: string
  earnedAt?: string
}

export function BadgeTooltip({ name, description, tier, earnedAt }: BadgeTooltipProps) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <BadgeIcon iconName="award" tier={tier as any} size="sm" />
        <h4 className="font-semibold text-gray-900">{name}</h4>
      </div>
      <p className="text-sm text-gray-600 mb-2">{description}</p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="capitalize">{tier}</span>
        {earnedAt && (
          <span>{new Date(earnedAt).toLocaleDateString('ja-JP')}</span>
        )}
      </div>
    </div>
  )
}
