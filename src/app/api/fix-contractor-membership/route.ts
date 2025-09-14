import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // 受注者ユーザーを取得
    const { data: contractorUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'contractor@demo.com')
      .single()

    if (userError || !contractorUser) {
      return NextResponse.json(
        { message: '受注者ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 既存のメンバーシップを削除
    const { error: deleteError } = await supabase
      .from('memberships')
      .delete()
      .eq('user_id', contractorUser.id)

    if (deleteError) {
      console.error('Delete membership error:', deleteError)
    }

    // 受注者用のダミー組織を作成または取得
    let contractorOrgId = null
    
    // 既存の受注者用組織をチェック
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', '個人事業主（受注者）')
      .single()

    if (existingOrg) {
      contractorOrgId = existingOrg.id
    } else {
      // 新しい受注者用組織を作成
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: '個人事業主（受注者）',
          description: '受注者用のダミー組織',
          billing_email: 'contractor@demo.com',
          system_fee: 0,
          active: true
        })
        .select()
        .single()

      if (orgError) {
        console.error('Create contractor org error:', orgError)
        return NextResponse.json(
          { message: '受注者用組織の作成に失敗しました: ' + orgError.message },
          { status: 400 }
        )
      }

      contractorOrgId = orgData.id
    }

    // 新しいメンバーシップを作成
    const { error: insertError } = await supabase
      .from('memberships')
      .insert({
        org_id: contractorOrgId,
        user_id: contractorUser.id,
        role: 'Contractor'
      })

    if (insertError) {
      console.error('Insert membership error:', insertError)
      return NextResponse.json(
        { message: 'メンバーシップの作成に失敗しました: ' + insertError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '受注者のメンバーシップを修正しました',
      userId: contractorUser.id
    }, { status: 200 })

  } catch (error) {
    console.error('Fix contractor membership error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
