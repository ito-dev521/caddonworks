import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMemberLevel, canAccessProject, type MemberLevel } from '@/lib/member-level'

export const dynamic = 'force-dynamic'

// アドバイス生成関数
function generateAdvice(job: any, currentBidCount: number, isExpired: boolean): string {
  if (isExpired) {
    return '期限が切れています。次回は早めの応募をお勧めします。'
  }
  
  if (currentBidCount === 0) {
    return 'まだ応募者がいません。早めの応募で受注のチャンスが高まります。'
  }
  
  const requiredContractors = job.required_contractors || 1
  const remainingSlots = requiredContractors - currentBidCount
  
  if (remainingSlots <= 0) {
    return '募集人数に達しました。'
  }
  
  // 期限までの日数を計算
  const now = new Date()
  const deadline = new Date(job.bidding_deadline)
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntilDeadline <= 1) {
    return '期限が迫っています。急いで応募してください。'
  }
  
  if (daysUntilDeadline <= 3) {
    return '期限まで3日以内です。早めの応募をお勧めします。'
  }
  
  // 競争率に基づくアドバイス
  const competitionRate = currentBidCount / requiredContractors
  
  if (competitionRate < 0.3) {
    return '競争率が低めです。受注のチャンスが高い案件です。'
  } else if (competitionRate < 0.7) {
    return '適度な競争があります。質の高い提案で差をつけましょう。'
  } else {
    return '競争が激しい案件です。差別化された提案が重要です。'
  }
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました: ' + (authError?.message || 'ユーザーが見つかりません') },
        { status: 401 }
      )
    }


    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, specialties, experience_years, member_level')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // ユーザーの会員レベルを計算
    const userLevel = userProfile.member_level || calculateMemberLevel(userProfile.experience_years, userProfile.specialties || [])

    // 1. 入札可能な案件を取得
    const { data: biddingJobs, error: biddingError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        description,
        status,
        budget,
        start_date,
        end_date,
        category,
        created_at,
        assignee_name,
        bidding_deadline,
        requirements,
        location,
        org_id,
        required_contractors,
        contractor_id,
        required_level,
        support_enabled
      `)
      .eq('status', 'bidding') // 入札中の案件のみ
      .order('created_at', { ascending: false })

    // 1.5 優先招待（受注者宛て・保留中）を取得し、プロジェクト情報を付与
    const { data: priorityInvitations } = await supabaseAdmin
      .from('priority_invitations')
      .select(`
        project_id,
        expires_at,
        response,
        projects (
          id,
          title,
          description,
          status,
          budget,
          start_date,
          end_date,
          category,
          created_at,
          assignee_name,
          bidding_deadline,
          requirements,
          location,
          org_id,
          required_contractors,
          contractor_id,
          required_level,
          support_enabled
        )
      `)
      .eq('contractor_id', userProfile.id)
      .eq('response', 'pending')

    // 2. 現在のユーザーの全契約を取得（プロジェクトごとの最新ステータス確認）
    const { data: allUserContracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select(`
        project_id,
        status,
        bid_amount,
        support_enabled,
        created_at,
        updated_at,
        projects (
          id,
          title,
          description,
          status,
          budget,
          start_date,
          end_date,
          category,
          created_at,
          assignee_name,
          bidding_deadline,
          requirements,
          location,
          org_id,
          required_contractors,
          contractor_id,
          required_level,
          support_enabled
        )
      `)
      .eq('contractor_id', userProfile.id)
      .order('created_at', { ascending: false }) // 最新の契約を優先

    if (biddingError || contractsError) {
      return NextResponse.json(
        { message: '案件データの取得に失敗しました' },
        { status: 400 }
      )
    }

    // プロジェクトごとの契約をグループ化し、最新の契約を特定
    const projectContractsMap = new Map()
    allUserContracts?.forEach(contract => {
      if (!projectContractsMap.has(contract.project_id)) {
        projectContractsMap.set(contract.project_id, [])
      }
      projectContractsMap.get(contract.project_id).push(contract)
    })

    // 各プロジェクトの最新契約を取得（created_atで最新を判定）
    const awardedJobs = []
    const declinedProjectIds = []
    
    for (const [projectId, contracts] of Array.from(projectContractsMap.entries())) {
      // 契約を作成日時でソートして最新を取得
      const sortedContracts = contracts.sort((a: any, b: any) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime()
        const bTime = new Date(b.updated_at || b.created_at).getTime()
        return bTime - aTime
      }
      )
      const latestContract = sortedContracts[0]
      // ここでのサマリーオブジェクトは未使用のため削除（ビルドエラー回避）
      
      if (latestContract.status === 'signed' && latestContract.projects) {
        awardedJobs.push({
          ...latestContract.projects,
          contract_amount: latestContract.bid_amount,
          contract_support_enabled: latestContract.support_enabled || false,
          status: 'awarded'
        })
      } else if (latestContract.status === 'declined') {
        declinedProjectIds.push(projectId)
      }
    }
    
    const filteredAwardedJobs = awardedJobs
    
    // 3. お気に入り会員が断った案件を取得（優先依頼で辞退された案件）
    const { data: declinedInvitations, error: declinedError } = await supabaseAdmin
      .from('priority_invitations')
      .select(`
        project_id,
        projects (
          id,
          title,
          description,
          status,
          budget,
          start_date,
          end_date,
          category,
          created_at,
          assignee_name,
          bidding_deadline,
          requirements,
          location,
          org_id,
          required_contractors,
          contractor_id,
          required_level,
          support_enabled
        )
      `)
      .eq('contractor_id', userProfile.id)
      .eq('response', 'declined')

    if (declinedError) {
    }

    const declinedJobs = declinedInvitations?.map(invitation => invitation.projects)
      .filter(Boolean) || []
    
    // 入札可能な案件を会員レベルでフィルタリング
    const levelFilteredBiddingJobs = biddingJobs?.filter(job => {
      const requiredLevel = (job.required_level as MemberLevel) || 'beginner'
      return canAccessProject(userLevel as MemberLevel, requiredLevel)
    }) || []

    // 優先招待案件（プロジェクト情報が取得できたもののみ）
    const priorityInvitationJobs = (priorityInvitations || [])
      .map((inv: any) => inv.projects)
      .filter((p: any) => !!p)
    
    // 辞退した案件のIDを収集
    const allDeclinedProjectIds = [
      ...declinedProjectIds.map((id: any) => String(id)), // 契約辞退した案件（最新ステータスベース）
      ...declinedJobs.map((job: any) => String(job.id)) // 優先依頼で辞退した案件
    ]
    
    // 入札可能な案件から辞退した案件を除外
    const filteredBiddingJobs = levelFilteredBiddingJobs.filter(job => 
      !allDeclinedProjectIds.includes(String(job.id))
    )
    
    // フィルタリングされた入札可能な案件と落札した案件、優先招待案件を結合（辞退した案件は除外）
    // 重複防止のため、同一IDが重なる場合は priority_invitation を優先
    const combined = [...filteredBiddingJobs, ...filteredAwardedJobs]
    const pidSet = new Set(combined.map((j: any) => String(j.id)))
    const onlyPriorityNew = priorityInvitationJobs.filter((p: any) => !pidSet.has(String(p.id)))
    let jobsData = [...combined, ...onlyPriorityNew]

    // 念のため、結合後にも辞退案件を全体から除外（型の違い等の取りこぼし対策）
    jobsData = jobsData.filter((job: any) => !allDeclinedProjectIds.includes(String(job.id)))


    // 組織名を取得
    const orgIds = Array.from(new Set(jobsData?.map((job: any) => job.org_id) || []))
    const { data: orgsData } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .in('id', orgIds)

    const orgMap = orgsData?.reduce((acc: any, org: any) => {
      acc[org.id] = org.name
      return acc
    }, {}) || {}

    // 各案件の入札数を取得（契約辞退された受注者の入札は除外）
    const jobIds = jobsData?.map((job: any) => job.id) || []
    
    // 契約辞退された受注者IDを取得（プロジェクトごと）
    const { data: declinedContractsForBidCount } = await supabaseAdmin
      .from('contracts')
      .select('project_id, contractor_id')
      .eq('status', 'declined')
      .in('project_id', jobIds)
    
    // プロジェクトごとの辞退受注者IDをマップ化
    const declinedContractorMap = declinedContractsForBidCount?.reduce((acc: any, contract: any) => {
      if (!acc[contract.project_id]) {
        acc[contract.project_id] = []
      }
      acc[contract.project_id].push(contract.contractor_id)
      return acc
    }, {}) || {}
    
    // 各案件の入札数を個別に計算
    const bidCountMap: { [key: string]: number } = {}
    
    for (const jobId of jobIds) {
      let bidCountsQuery = supabaseAdmin
        .from('bids')
        .select('contractor_id')
        .eq('project_id', jobId)
        .eq('status', 'submitted')
      
      // その案件で辞退した受注者の入札を除外
      const declinedContractorIds = declinedContractorMap[jobId] || []
      if (declinedContractorIds.length > 0) {
        bidCountsQuery = bidCountsQuery.not('contractor_id', 'in', `(${declinedContractorIds.join(',')})`)
      }
      
      const { data: bidCountsData } = await bidCountsQuery
      bidCountMap[jobId] = bidCountsData?.length || 0
    }

    // bidCountMapは上記のループで既に計算済み

    const formattedJobs = jobsData?.map((job: any) => {
      const currentBidCount = bidCountMap[job.id] || 0
      const isFull = currentBidCount >= (job.required_contractors || 1)
      
      // この案件で現在のユーザーが辞退したかどうかをチェック
      const hasDeclinedContract = declinedContractorMap[job.id]?.includes(userProfile.id) || false
      
      // 期限切れチェック（その日の終わり23:59:59まで有効）
      const now = new Date()
      const deadline = new Date(job.bidding_deadline)
      const endOfDeadlineDay = new Date(deadline)
      endOfDeadlineDay.setHours(23, 59, 59, 999)
      const isExpired = now > endOfDeadlineDay
      
      // この案件で現在のユーザーが辞退したかどうかをチェック
      const isDeclined = hasDeclinedContract
      
      // アドバイス生成
      const advice = generateAdvice(job, currentBidCount, isExpired)
      
      return {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status, // priority_invitation のまま返す
        budget: job.budget,
        start_date: job.start_date,
        end_date: job.end_date,
        category: job.category || '道路設計',
        created_at: job.created_at,
        org_name: orgMap[job.org_id] || '不明な組織',
        org_id: job.org_id,
        assignee_name: job.assignee_name,
        bidding_deadline: job.bidding_deadline,
        requirements: job.requirements,
        location: job.location,
        required_contractors: job.required_contractors || 1,
        required_level: job.required_level || 'beginner',
        current_bid_count: currentBidCount,
        is_full: isFull,
        is_expired: isExpired,
        is_declined: isDeclined,
        can_bid: !isFull && !isExpired && (job.status === 'bidding' || job.status === 'priority_invitation') && !isDeclined,
        advice: advice,
        contract_amount: job.contract_amount, // 契約金額を追加
        support_enabled: job.support_enabled || false, // プロジェクトレベルのサポート
        contract_support_enabled: job.contract_support_enabled || false // 契約レベルのサポート（落札済み案件のみ）
      }
    }) || []

    // 期限切れ案件の扱い:
    // - 入札中(bidding) と 優先招待(priority_invitation) は期限切れを一覧から除外
    // - 既に落札済み/進行中/完了などは表示対象（締切概念なし）
    const visibleJobs = formattedJobs.filter(job => {
      if (job.status === 'bidding' || job.status === 'priority_invitation') {
        return !job.is_expired
      }
      return true
    })

    return NextResponse.json({
      jobs: visibleJobs
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
