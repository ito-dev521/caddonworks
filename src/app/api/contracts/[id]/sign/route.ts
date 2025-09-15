import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    if (!contractId) {
      return NextResponse.json({ message: '契約IDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        projects (title),
        organizations (name),
        contractors:users!contracts_contractor_id_fkey (display_name, email)
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    let newStatus = contract.status
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    // 署名処理
    if (membership.role === 'OrgAdmin' && contract.org_id === membership.org_id) {
      // 発注者の署名
      if (!contract.org_signed_at) {
        updateData.org_signed_at = new Date().toISOString()
        if (contract.contractor_signed_at) {
          newStatus = 'signed'
        } else {
          newStatus = 'org_signed'
        }
      } else {
        return NextResponse.json({ message: '既に署名済みです' }, { status: 400 })
      }
    } else if (membership.role === 'Contractor' && contract.contractor_id === userProfile.id) {
      // 受注者の署名
      if (!contract.contractor_signed_at) {
        updateData.contractor_signed_at = new Date().toISOString()
        if (contract.org_signed_at) {
          newStatus = 'signed'
        } else {
          newStatus = 'contractor_signed'
        }
      } else {
        return NextResponse.json({ message: '既に署名済みです' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ message: 'この契約に署名する権限がありません' }, { status: 403 })
    }

    updateData.status = newStatus

    // 契約を更新
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      console.error('契約更新エラー:', updateError)
      return NextResponse.json({ message: '契約の更新に失敗しました' }, { status: 500 })
    }

    // 契約が完了した場合の通知
    if (newStatus === 'signed') {
      // 案件のステータスを更新
      await supabaseAdmin
        .from('projects')
        .update({ status: 'in_progress' })
        .eq('id', contract.project_id)

      // 両者に契約完了通知を送信
      const notifications = [
        {
          user_id: contract.contractor_id,
          type: 'contract_signed',
          title: '契約が完了しました',
          message: `案件「${contract.projects?.title}」の契約が完了しました。`,
          data: {
            project_id: contract.project_id,
            contract_id: contractId,
            org_name: contract.organizations?.name
          }
        }
      ]

      // 発注者にも通知（組織の管理者全員）
      const { data: orgAdmins } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('org_id', contract.org_id)
        .eq('role', 'OrgAdmin')

      if (orgAdmins) {
        orgAdmins.forEach(admin => {
          notifications.push({
            user_id: admin.user_id,
            type: 'contract_signed',
            title: '契約が完了しました',
            message: `案件「${contract.projects?.title}」の契約が完了しました。`,
            data: {
              project_id: contract.project_id,
              contract_id: contractId,
              contractor_name: contract.contractors?.display_name
            }
          })
        })
      }

      await supabaseAdmin.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      message: '契約の署名が完了しました',
      contract: updatedContract
    }, { status: 200 })

  } catch (error) {
    console.error('契約署名APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
