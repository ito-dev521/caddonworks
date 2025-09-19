import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMemberLevel, canAccessProject, type MemberLevel } from '@/lib/member-level'

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
      console.error('jobs API: 認証エラー:', authError)
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
      console.error('jobs API: ユーザープロフィールエラー:', userError)
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
        required_level
      `)
      .eq('status', 'bidding') // 入札中の案件のみ
      .order('created_at', { ascending: false })

    // 2. 署名済み契約の案件を取得（落札した案件）
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select(`
        project_id,
        status,
        bid_amount,
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
          required_level
        )
      `)
      .eq('status', 'signed')
      .eq('contractor_id', userProfile.id) // 自分が受注者として署名した契約

    if (biddingError || contractsError) {
      console.error('jobs API: 案件データ取得エラー:', { biddingError, contractsError })
      return NextResponse.json(
        { message: '案件データの取得に失敗しました' },
        { status: 400 }
      )
    }

    // 署名済み契約の案件を抽出（契約金額を含める）
    const awardedJobs = contracts?.map(contract => ({
      ...contract.projects,
      contract_amount: contract.bid_amount, // 契約金額を追加
      status: 'awarded' // 落札案件として明確にステータスを設定
    })).filter(Boolean) || []
    
    // 4. 現在のユーザーが契約辞退した案件を取得
    const { data: declinedContracts, error: declinedContractsError } = await supabaseAdmin
      .from('contracts')
      .select('project_id')
      .eq('contractor_id', userProfile.id)
      .eq('status', 'declined')
    
    if (declinedContractsError) {
      console.error('jobs API: 契約辞退案件取得エラー:', declinedContractsError)
    }
    
    const declinedProjectIds = declinedContracts?.map(c => c.project_id) || []
    
    // 契約辞退された案件を落札案件から除外
    const filteredAwardedJobs = awardedJobs.filter(job => 
      !declinedProjectIds.includes(job.id)
    )
    
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
          required_level
        )
      `)
      .eq('contractor_id', userProfile.id)
      .eq('response', 'declined')

    if (declinedError) {
      console.error('jobs API: 辞退案件取得エラー:', declinedError)
    }

    const declinedJobs = declinedInvitations?.map(invitation => invitation.projects).filter(Boolean) || []
    
    // 入札可能な案件を会員レベルでフィルタリング
    const filteredBiddingJobs = biddingJobs?.filter(job => {
      const requiredLevel = (job.required_level as MemberLevel) || 'beginner'
      return canAccessProject(userLevel as MemberLevel, requiredLevel)
    }) || []
    
    // 辞退した案件は表示しない（受注者案件一覧から除外）
    // const filteredDeclinedJobs = declinedJobs?.filter((job: any) => {
    //   const requiredLevel = (job.required_level as MemberLevel) || 'beginner'
    //   return canAccessProject(userLevel as MemberLevel, requiredLevel)
    // }) || []
    
    // フィルタリングされた入札可能な案件と落札した案件のみを結合（辞退した案件は除外）
    const jobsData = [...filteredBiddingJobs, ...filteredAwardedJobs]


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
      
      // 期限切れチェック
      const now = new Date()
      const deadline = new Date(job.bidding_deadline)
      const isExpired = deadline < now
      
      // この案件で現在のユーザーが辞退したかどうかをチェック
      const isDeclined = hasDeclinedContract
      
      // アドバイス生成
      const advice = generateAdvice(job, currentBidCount, isExpired)
      
      return {
        id: job.id,
        title: job.title,
        description: job.description,
        status: job.status,
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
        can_bid: !isFull && !isExpired && job.status === 'bidding' && !isDeclined,
        advice: advice,
        contract_amount: job.contract_amount // 契約金額を追加
      }
    }) || []

    // 期限切れ案件をフィルタリング（受注者側では表示しない）
    const activeJobs = formattedJobs.filter(job => !job.is_expired)


    return NextResponse.json({
      jobs: activeJobs
    }, { status: 200 })

  } catch (error) {
    console.error('jobs API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
