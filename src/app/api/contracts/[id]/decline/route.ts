import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    const body = await request.json()
    const { comment } = body

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { message: '辞退理由の入力が必須です' },
        { status: 400 }
      )
    }

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
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 受注者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました' },
        { status: 403 }
      )
    }

    const isContractor = memberships.some(m => m.role === 'Contractor')
    if (!isContractor) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（受注者権限が必要です）' },
        { status: 403 }
      )
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('contractor_id', userProfile.id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { message: '契約が見つかりません' },
        { status: 404 }
      )
    }

    if (contract.status !== 'pending_contractor') {
      return NextResponse.json(
        { message: 'この契約は辞退できません' },
        { status: 400 }
      )
    }

    // 契約ステータスを辞退に更新
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        status: 'declined',
        decline_reason: comment,
        declined_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      console.error('契約辞退エラー:', updateError)
      return NextResponse.json(
        { message: '辞退に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    // プロジェクト参加者から該当の受注者を削除（複数受注者案件の場合）
    await supabaseAdmin
      .from('project_participants')
      .delete()
      .eq('project_id', contract.project_id)
      .eq('user_id', contract.contractor_id)

    // 該当受注者の入札データを削除（募集状態の再計算のため）
    await supabaseAdmin
      .from('bids')
      .delete()
      .eq('project_id', contract.project_id)
      .eq('contractor_id', contract.contractor_id)

    // 案件のステータスを更新（入札可能な状態に戻す）
    // まず現在の案件情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, required_contractors, status')
      .eq('id', contract.project_id)
      .single()

    if (!projectError && project) {
      // 残りの参加者数を確認
      const { data: remainingParticipants } = await supabaseAdmin
        .from('project_participants')
        .select('id')
        .eq('project_id', contract.project_id)
        .eq('status', 'active')

      const remainingCount = remainingParticipants?.length || 0
      
      // 案件ステータスを更新
      await supabaseAdmin
        .from('projects')
        .update({ 
          status: 'bidding',
          contractor_id: null
        })
        .eq('id', contract.project_id)

      // 残りの入札数を再計算
      const { data: remainingBids } = await supabaseAdmin
        .from('bids')
        .select('id')
        .eq('project_id', contract.project_id)
        .eq('status', 'submitted')

      const remainingBidCount = remainingBids?.length || 0
      const isStillFull = remainingBidCount >= project.required_contractors

    }

    // 発注者に辞退通知を送信
    try {

      const { data: orgAdmins, error: orgAdminsError } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('org_id', contract.org_id)
        .eq('role', 'OrgAdmin')


      if (!orgAdminsError && orgAdmins && orgAdmins.length > 0) {
        for (const admin of orgAdmins) {
          try {

            const notificationData = {
              user_id: admin.user_id,
              type: 'contract_declined',
              title: '契約が辞退されました',
              message: `案件「${contract.contract_title}」の契約が受注者によって辞退されました。辞退理由: ${comment}`,
              data: {
                project_id: contract.project_id,
                contract_id: contract.id,
                contractor_id: contract.contractor_id,
                decline_comment: comment
              }
            }


            const { data: insertedNotification, error: notificationError } = await supabaseAdmin
              .from('notifications')
              .insert(notificationData)
              .select()

            if (notificationError) {
              console.error('通知送信エラー:', {
                adminUserId: admin.user_id,
                error: notificationError,
                errorMessage: notificationError.message,
                errorDetails: notificationError.details,
                errorHint: notificationError.hint
              })
            } else {
            }
          } catch (notificationErr) {
            console.error('通知送信例外:', {
              adminUserId: admin.user_id,
              error: notificationErr
            })
          }
        }
      } else {
        console.error('発注者情報取得エラー:', {
          orgAdminsError: orgAdminsError,
          orgAdmins: orgAdmins
        })
      }
    } catch (notificationProcessError) {
      console.error('通知送信処理全体でエラー:', notificationProcessError)
      // 通知送信エラーでも契約辞退は成功させる
    }

    return NextResponse.json({
      message: '契約を辞退しました',
      contract: updatedContract
    }, { status: 200 })

  } catch (error) {
    console.error('契約辞退エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
