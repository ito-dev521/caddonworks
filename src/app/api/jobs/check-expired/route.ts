import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 期限切れの案件を取得
    // 各案件の締切日の23:59:59を過ぎているかをアプリケーション側で判定
    const { data: biddingJobs, error: expiredError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        org_id,
        bidding_deadline,
        required_contractors,
        organizations (
          id,
          name
        )
      `)
      .eq('status', 'bidding')
    
    if (expiredError) {
      return NextResponse.json(
        { message: '案件の取得に失敗しました' },
        { status: 400 }
      )
    }

    // アプリケーション側で期限切れを判定
    const now = new Date()
    const expiredJobs = (biddingJobs || []).filter(job => {
      if (!job.bidding_deadline) return false
      const deadline = new Date(job.bidding_deadline)
      const endOfDeadlineDay = new Date(deadline)
      endOfDeadlineDay.setHours(23, 59, 59, 999)
      return now > endOfDeadlineDay
    })

    const results = []

    for (const job of expiredJobs || []) {
      try {
        // この案件の入札数を取得
        const { data: bids, error: bidsError } = await supabaseAdmin
          .from('bids')
          .select('id')
          .eq('project_id', job.id)
          .eq('status', 'submitted')

        if (bidsError) {
          results.push({
            project_id: job.id,
            project_title: job.title,
            status: 'error',
            message: '入札数の取得に失敗しました'
          })
          continue
        }

        const bidCount = bids?.length || 0
        const requiredContractors = job.required_contractors || 1

        // 募集が足りない場合のみ通知
        if (bidCount < requiredContractors) {
          // 発注者組織のメンバーを取得
          const { data: orgMembers, error: membersError } = await supabaseAdmin
            .from('memberships')
            .select(`
              user_id,
              role,
              users (
                id,
                display_name,
                email
              )
            `)
            .eq('org_id', job.org_id)
            .eq('role', 'OrgAdmin')

          if (membersError) {
            results.push({
              project_id: job.id,
              project_title: job.title,
              status: 'error',
              message: '組織メンバーの取得に失敗しました'
            })
            continue
          }

          // アドバイスを生成
          const advice = generateExpiredAdvice(job, bidCount, requiredContractors)

          // 各発注者に通知を作成
          for (const member of orgMembers || []) {
            const { error: notificationError } = await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: member.user_id,
                type: 'project_expired',
                title: '案件の募集期限が切れました',
                message: `案件「${job.title}」の募集期限が切れました。応募者数: ${bidCount}/${requiredContractors}人。${advice}`,
                data: {
                  project_id: job.id,
                  project_title: job.title,
                  bid_count: bidCount,
                  required_contractors: requiredContractors,
                  advice: advice
                },
                is_read: false
              })

            if (notificationError) {
              console.error('通知作成エラー:', notificationError)
            }
          }

          // 案件ステータスを更新
          const { error: updateError } = await supabaseAdmin
            .from('projects')
            .update({ 
              status: 'expired',
              updated_at: now
            })
            .eq('id', job.id)

          if (updateError) {
            console.error('案件ステータス更新エラー:', updateError)
          }

          results.push({
            project_id: job.id,
            project_title: job.title,
            status: 'notified',
            message: `応募者数不足 (${bidCount}/${requiredContractors}) - 発注者に通知しました`,
            advice: advice
          })
        } else {
          results.push({
            project_id: job.id,
            project_title: job.title,
            status: 'sufficient_bids',
            message: `十分な応募があります (${bidCount}/${requiredContractors})`
          })
        }

      } catch (error) {
        results.push({
          project_id: job.id,
          project_title: job.title,
          status: 'error',
          message: '予期しないエラーが発生しました'
        })
      }
    }

    return NextResponse.json({
      message: '期限切れ案件のチェックが完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('期限切れ案件チェックエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 期限切れ案件のアドバイス生成
function generateExpiredAdvice(job: any, bidCount: number, requiredContractors: number): string {
  const shortfall = requiredContractors - bidCount
  
  if (bidCount === 0) {
    return '応募者がいませんでした。単価の見直しや納期の延長、要件の緩和を検討してください。'
  }
  
  if (shortfall === 1) {
    return 'あと1名の応募が必要でした。単価を10-20%上げるか、納期を1-2週間延長することをお勧めします。'
  }
  
  if (shortfall <= 3) {
    return `あと${shortfall}名の応募が必要でした。単価を15-25%上げるか、納期を2-4週間延長することをお勧めします。`
  }
  
  return `大幅な応募不足です（${shortfall}名不足）。単価を20-30%上げるか、納期を1ヶ月以上延長し、要件を見直すことをお勧めします。`
}
