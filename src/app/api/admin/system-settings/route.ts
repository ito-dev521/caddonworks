import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 全てのシステム設定を取得（管理者用）
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .order('setting_key')

    if (error) {
      console.error('Admin system settings fetch error:', error)
      return NextResponse.json(
        { message: '設定の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 型変換
    const settings = data.map(setting => ({
      ...setting,
      parsed_value: (() => {
        if (setting.setting_type === 'number') {
          return parseInt(setting.setting_value)
        } else if (setting.setting_type === 'boolean') {
          return setting.setting_value === 'true'
        } else if (setting.setting_type === 'json') {
          return JSON.parse(setting.setting_value)
        }
        return setting.setting_value
      })()
    }))

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Admin system settings API error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// システム設定を更新（管理者用）
export async function PUT(request: NextRequest) {
  try {
    const { setting_key, setting_value, setting_type, description, is_public } = await request.json()

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json(
        { message: '必要な項目が不足しています' },
        { status: 400 }
      )
    }

    // 値を文字列に変換
    let stringValue = setting_value
    if (setting_type === 'json') {
      stringValue = JSON.stringify(setting_value)
    } else {
      stringValue = String(setting_value)
    }

    // 既存の設定を更新
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .update({
        setting_value: stringValue,
        setting_type: setting_type || 'string',
        description,
        is_public: is_public !== undefined ? is_public : false
      })
      .eq('setting_key', setting_key)
      .select()

    if (error) {
      console.error('System setting update error:', error)
      return NextResponse.json(
        { message: '設定の更新に失敗しました', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '設定を更新しました',
      setting: data[0]
    })
  } catch (error) {
    console.error('System setting update API error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}