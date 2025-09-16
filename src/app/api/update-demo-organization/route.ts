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

export async function POST(request: NextRequest) {
  try {
    console.log('update-demo-organization API: 開始')

    // デモ建設株式会社の組織情報を更新
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        name: 'デモ建設株式会社',
        description: '土木工事を中心とした総合建設会社',
        address: '〒100-0001 東京都千代田区千代田1-1-1',
        phone: '03-1234-5678',
        email: 'info@demo-construction.co.jp',
        website: 'https://www.demo-construction.co.jp',
        business_type: '建設業',
        registration_number: '1234567890123',
        employee_count: 150,
        contact_person: '発注者デモ',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'デモ建設株式会社')
      .select()
      .single()

    if (updateError) {
      console.error('組織情報更新エラー:', updateError)
      return NextResponse.json(
        { message: '組織情報の更新に失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('組織情報更新成功:', updatedOrg)

    return NextResponse.json({
      message: 'デモ建設株式会社の組織情報を更新しました',
      organization: updatedOrg
    }, { status: 200 })

  } catch (error) {
    console.error('update-demo-organization API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
