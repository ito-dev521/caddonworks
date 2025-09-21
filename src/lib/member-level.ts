export type MemberLevel = 'beginner' | 'intermediate' | 'advanced'

export interface MemberLevelInfo {
  level: MemberLevel
  label: string
  description: string
  color: string
}

export const MEMBER_LEVELS: Record<MemberLevel, MemberLevelInfo> = {
  beginner: {
    level: 'beginner',
    label: '初級',
    description: '経験年数3年未満、未経験',
    color: 'bg-green-100 text-green-800'
  },
  intermediate: {
    level: 'intermediate',
    label: '中級',
    description: '経験年数3年以上7年未満',
    color: 'bg-yellow-100 text-yellow-800'
  },
  advanced: {
    level: 'advanced',
    label: '上級',
    description: '経験年数7年以上',
    color: 'bg-red-100 text-red-800'
  }
}

/**
 * 経験年数と専門分野から会員レベルを計算
 */
export function calculateMemberLevel(experienceYears: string | undefined, specialties: string[]): MemberLevel {
  // 未経験のみの場合は初級
  if (specialties.length === 0 || specialties.every(s => s === '未経験')) {
    return 'beginner'
  }

  const years = parseInt(experienceYears || '0', 10)
  
  if (years < 3) {
    return 'beginner'
  } else if (years < 7) {
    return 'intermediate'
  } else {
    return 'advanced'
  }
}

/**
 * 会員レベルが案件の必要レベルを満たしているかチェック
 */
export function canAccessProject(userLevel: MemberLevel, requiredLevel: MemberLevel): boolean {
  const levelOrder: MemberLevel[] = ['beginner', 'intermediate', 'advanced']
  const userIndex = levelOrder.indexOf(userLevel)
  const requiredIndex = levelOrder.indexOf(requiredLevel)
  
  return userIndex >= requiredIndex
}

/**
 * 会員レベルのラベルを取得
 */
export function getMemberLevelLabel(level: MemberLevel): string {
  return MEMBER_LEVELS[level].label
}

/**
 * 会員レベルの情報を取得
 */
export function getMemberLevelInfo(level: MemberLevel): MemberLevelInfo {
  return MEMBER_LEVELS[level]
}













