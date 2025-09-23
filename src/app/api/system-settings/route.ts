import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// 公開設定の取得（認証不要）
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      // 特定のキーの値を取得
      let query = supabaseAdmin
        .from('system_settings')
        .select('setting_value, setting_type')
        .eq('setting_key', key)

      // maintenance_mode以外は公開設定のみ
      if (key !== 'maintenance_mode') {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query.single()

      if (error) {
        console.error('System setting fetch error:', error)
        // 設定が見つからない場合はデフォルト値を返す
        if (error.code === 'PGRST116') {
          if (key === 'default_system_fee') {
            return NextResponse.json({ value: 50000 })
          } else if (key === 'maintenance_mode') {
            return NextResponse.json({ value: false })
          }
        }
        return NextResponse.json(
          { message: '設定の取得に失敗しました' },
          { status: 404 }
        )
      }

      // 型変換
      let value = data.setting_value
      if (data.setting_type === 'number') {
        value = parseInt(value)
      } else if (data.setting_type === 'boolean') {
        value = value === 'true'
      } else if (data.setting_type === 'json') {
        value = JSON.parse(value)
      }

      return NextResponse.json({ value })
    } else {
      // 全ての公開設定を取得
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .select('setting_key, setting_value, setting_type')
        .eq('is_public', true)

      if (error) {
        console.error('System settings fetch error:', error)
        return NextResponse.json(
          { message: '設定の取得に失敗しました' },
          { status: 500 }
        )
      }

      // 型変換してオブジェクトに変換
      const settings: { [key: string]: any } = {}
      data.forEach(setting => {
        let value = setting.setting_value
        if (setting.setting_type === 'number') {
          value = parseInt(value)
        } else if (setting.setting_type === 'boolean') {
          value = value === 'true'
        } else if (setting.setting_type === 'json') {
          value = JSON.parse(value)
        }
        settings[setting.setting_key] = value
      })

      return NextResponse.json({ settings })
    }
  } catch (error) {
    console.error('System settings API error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}