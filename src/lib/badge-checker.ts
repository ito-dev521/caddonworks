import { createClient } from '@supabase/supabase-js'

export interface Badge {
  id: string
  code: string
  name: string
  description: string
  category: string
  tier: string
  icon_name: string
  requirements: Record<string, any>
}

export interface UserBadge {
  badge_id: string
  user_id: string
  earned_at: string
  project_id?: string
  metadata?: Record<string, any>
}

/**
 * バッジ判定ロジック
 * プロジェクト完了時に呼び出され、条件を満たしたバッジを自動付与
 */
export class BadgeChecker {
  private supabase

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  /**
   * ユーザーの全バッジをチェックして、新規取得可能なバッジを付与
   */
  async checkAndAwardBadges(userId: string, projectId?: string): Promise<UserBadge[]> {
    try {
      // 全バッジを取得
      const { data: allBadges, error: badgesError } = await this.supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)

      if (badgesError) {
        console.error('バッジ取得エラー:', badgesError)
        return []
      }

      // ユーザーが既に取得済みのバッジを取得
      const { data: userBadges, error: userBadgesError } = await this.supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)

      if (userBadgesError) {
        console.error('ユーザーバッジ取得エラー:', userBadgesError)
        return []
      }

      const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || [])

      // 未取得のバッジをフィルタリング
      const unearnedBadges = allBadges?.filter(badge => !earnedBadgeIds.has(badge.id)) || []

      // 各バッジの条件をチェック
      const newlyAwardedBadges: UserBadge[] = []

      for (const badge of unearnedBadges) {
        const meetsRequirements = await this.checkRequirements(userId, badge.requirements, projectId)

        if (meetsRequirements) {
          // バッジを付与
          const { data: newBadge, error: insertError } = await this.supabase
            .from('user_badges')
            .insert({
              user_id: userId,
              badge_id: badge.id,
              project_id: projectId,
              metadata: { awarded_by: 'system' }
            })
            .select()
            .single()

          if (!insertError && newBadge) {
            newlyAwardedBadges.push(newBadge)
            console.log(`✅ バッジ付与: ${badge.name} (${badge.code}) → ユーザー: ${userId}`)
          } else if (insertError) {
            console.error(`バッジ付与エラー: ${badge.code}`, insertError)
          }
        }
      }

      return newlyAwardedBadges
    } catch (error) {
      console.error('バッジチェック処理エラー:', error)
      return []
    }
  }

  /**
   * バッジの条件をチェック
   */
  private async checkRequirements(
    userId: string,
    requirements: Record<string, any>,
    projectId?: string
  ): Promise<boolean> {
    const type = requirements.type

    switch (type) {
      case 'first_project':
        return await this.checkFirstProject(userId)

      case 'project_count':
        return await this.checkProjectCount(userId, requirements.count)

      case 'monthly_streak':
        return await this.checkMonthlyStreak(userId, requirements.months)

      case 'category_count':
        return await this.checkCategoryCount(userId, requirements.category, requirements.count)

      case 'skill_count':
        return await this.checkSkillCount(userId, requirements.skill, requirements.count)

      case 'rating_threshold':
        return await this.checkRatingThreshold(
          userId,
          requirements.metric,
          requirements.threshold,
          requirements.count
        )

      case 'total_revenue':
        return await this.checkTotalRevenue(userId, requirements.threshold)

      case 'budget_threshold':
        return await this.checkBudgetThreshold(userId, requirements.threshold)

      case 'perfect_rating':
        return await this.checkPerfectRating(userId, requirements.count)

      case 'early_completion':
        return await this.checkEarlyCompletion(userId, requirements.count)

      case 'seasonal':
        return await this.checkSeasonal(userId, requirements.season)

      case 'new_year_first':
        return await this.checkNewYearFirst(userId)

      case 'revenue_growth':
        return await this.checkRevenueGrowth(userId, requirements.ratio)

      case 'rating_improvement':
        return await this.checkRatingImprovement(userId, requirements.streak)

      default:
        console.warn(`未実装の条件タイプ: ${type}`)
        return false
    }
  }

  /**
   * 初回案件完了チェック
   */
  private async checkFirstProject(userId: string): Promise<boolean> {
    const { count } = await this.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', userId)
      .eq('status', 'completed')

    return count === 1
  }

  /**
   * 案件完了数チェック
   */
  private async checkProjectCount(userId: string, requiredCount: number): Promise<boolean> {
    const { count } = await this.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', userId)
      .eq('status', 'completed')

    return (count || 0) >= requiredCount
  }

  /**
   * 連続月数チェック
   */
  private async checkMonthlyStreak(userId: string, requiredMonths: number): Promise<boolean> {
    const { data: projects } = await this.supabase
      .from('projects')
      .select('completed_at')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (!projects || projects.length === 0) return false

    let streak = 0
    let currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    for (let i = 0; i < requiredMonths; i++) {
      const monthStart = new Date(currentMonth)
      const monthEnd = new Date(currentMonth)
      monthEnd.setMonth(monthEnd.getMonth() + 1)

      const hasProjectInMonth = projects.some(p => {
        if (!p.completed_at) return false
        const completedDate = new Date(p.completed_at)
        return completedDate >= monthStart && completedDate < monthEnd
      })

      if (hasProjectInMonth) {
        streak++
      } else {
        break
      }

      currentMonth.setMonth(currentMonth.getMonth() - 1)
    }

    return streak >= requiredMonths
  }

  /**
   * カテゴリ別案件数チェック
   */
  private async checkCategoryCount(
    userId: string,
    category: string,
    requiredCount: number
  ): Promise<boolean> {
    const { count } = await this.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .eq('category', category)

    return (count || 0) >= requiredCount
  }

  /**
   * スキル別案件数チェック（プロジェクトのcategoryをスキルとして扱う）
   */
  private async checkSkillCount(
    userId: string,
    skill: string,
    requiredCount: number
  ): Promise<boolean> {
    const { count } = await this.supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .ilike('category', `%${skill}%`)

    return (count || 0) >= requiredCount
  }

  /**
   * 評価閾値チェック
   */
  private async checkRatingThreshold(
    userId: string,
    metric: string,
    threshold: number,
    requiredCount: number
  ): Promise<boolean> {
    const { data: evaluations } = await this.supabase
      .from('contractor_evaluations')
      .select('*')
      .eq('contractor_id', userId)

    if (!evaluations || evaluations.length === 0) return false

    let qualifiedCount = 0

    for (const evaluation of evaluations) {
      let score = 0

      switch (metric) {
        case 'quality_score':
          score = evaluation.quality_score || 0
          break
        case 'communication_score':
          score = evaluation.communication_score || 0
          break
        case 'deadline_score':
          score = evaluation.deadline_score || 0
          break
        default:
          score = evaluation.overall_rating || 0
      }

      if (score >= threshold) {
        qualifiedCount++
      }
    }

    return qualifiedCount >= requiredCount
  }

  /**
   * 累計収益チェック
   */
  private async checkTotalRevenue(userId: string, threshold: number): Promise<boolean> {
    const { data: projects } = await this.supabase
      .from('projects')
      .select('budget')
      .eq('contractor_id', userId)
      .eq('status', 'completed')

    if (!projects || projects.length === 0) return false

    const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    return totalRevenue >= threshold
  }

  /**
   * 予算閾値チェック
   */
  private async checkBudgetThreshold(userId: string, threshold: number): Promise<boolean> {
    const { data: projects } = await this.supabase
      .from('projects')
      .select('budget')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .gte('budget', threshold)
      .limit(1)

    return (projects?.length || 0) > 0
  }

  /**
   * 完璧評価数チェック
   */
  private async checkPerfectRating(userId: string, requiredCount: number): Promise<boolean> {
    const { count } = await this.supabase
      .from('contractor_evaluations')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', userId)
      .eq('overall_rating', 5)

    return (count || 0) >= requiredCount
  }

  /**
   * 早期完了数チェック
   */
  private async checkEarlyCompletion(userId: string, requiredCount: number): Promise<boolean> {
    const { data: projects } = await this.supabase
      .from('projects')
      .select('end_date, completed_at')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)

    if (!projects || projects.length === 0) return false

    let earlyCount = 0

    for (const project of projects) {
      const endDate = new Date(project.end_date)
      const completedDate = new Date(project.completed_at!)

      if (completedDate < endDate) {
        earlyCount++
      }
    }

    return earlyCount >= requiredCount
  }

  /**
   * 季節チェック
   */
  private async checkSeasonal(userId: string, season: string): Promise<boolean> {
    const { data: projects } = await this.supabase
      .from('projects')
      .select('completed_at')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)

    if (!projects || projects.length === 0) return false

    const seasonMap: Record<string, number[]> = {
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      autumn: [9, 10, 11],
      winter: [12, 1, 2]
    }

    const targetMonths = seasonMap[season]
    if (!targetMonths) return false

    return projects.some(p => {
      const month = new Date(p.completed_at!).getMonth() + 1
      return targetMonths.includes(month)
    })
  }

  /**
   * 新年最初の案件チェック
   */
  private async checkNewYearFirst(userId: string): Promise<boolean> {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 0, 7) // 1月7日まで

    const { data: projects } = await this.supabase
      .from('projects')
      .select('completed_at')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', yearStart.toISOString())
      .lte('completed_at', yearEnd.toISOString())
      .order('completed_at', { ascending: true })
      .limit(1)

    return (projects?.length || 0) > 0
  }

  /**
   * 収益成長率チェック
   */
  private async checkRevenueGrowth(userId: string, requiredRatio: number): Promise<boolean> {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const { data: currentMonthProjects } = await this.supabase
      .from('projects')
      .select('budget')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', currentMonthStart.toISOString())

    const { data: lastMonthProjects } = await this.supabase
      .from('projects')
      .select('budget')
      .eq('contractor_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', lastMonthStart.toISOString())
      .lt('completed_at', currentMonthStart.toISOString())

    const currentRevenue = currentMonthProjects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
    const lastRevenue = lastMonthProjects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0

    if (lastRevenue === 0) return false

    const growthRatio = currentRevenue / lastRevenue
    return growthRatio >= requiredRatio
  }

  /**
   * 評価向上チェック
   */
  private async checkRatingImprovement(userId: string, requiredStreak: number): Promise<boolean> {
    const { data: evaluations } = await this.supabase
      .from('contractor_evaluations')
      .select('overall_rating, created_at')
      .eq('contractor_id', userId)
      .order('created_at', { ascending: false })
      .limit(requiredStreak + 1)

    if (!evaluations || evaluations.length < requiredStreak + 1) return false

    for (let i = 0; i < requiredStreak; i++) {
      if (evaluations[i].overall_rating <= evaluations[i + 1].overall_rating) {
        return false
      }
    }

    return true
  }
}

/**
 * バッジチェッカーのインスタンスを作成
 */
export function createBadgeChecker() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return new BadgeChecker(supabaseUrl, supabaseKey)
}