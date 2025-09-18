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

    // デモ建設株式会社の設立日をnullに更新
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        established_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('name', 'デモ建設株式会社')
      .select()
      .single()

    if (updateError) {
      console.error('設立日削除エラー:', updateError)
      return NextResponse.json(
        { message: '設立日の削除に失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }


    return NextResponse.json({
      message: 'デモ建設株式会社の設立日を削除しました',
      organization: updatedOrg
    }, { status: 200 })

  } catch (error) {
    console.error('remove-established-date API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}







