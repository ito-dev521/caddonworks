export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up default Box permissions for all users...')

    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    // 管理者メールアドレスチェック
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(user.email!)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 全ユーザーを取得
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')

    if (usersError) {
      console.error('Users fetch error:', usersError)
      return NextResponse.json({ error: 'ユーザー取得エラー' }, { status: 500 })
    }

    console.log(`👥 Found ${users?.length || 0} users`)

    let setupCount = 0
    for (const dbUser of users || []) {
      // デフォルトのBox権限を設定
      const permissions = [
        {
          user_id: dbUser.id,
          folder_type: '01_received',
          folder_name: '01_受取データ',
          can_preview: true,
          can_download: false, // 受取データはダウンロード不可
          can_upload: false,
          can_edit: false,
          can_delete: false
        },
        {
          user_id: dbUser.id,
          folder_type: '02_work',
          folder_name: '02_作業データ',
          can_preview: true,
          can_download: false, // 作業データもダウンロード不可
          can_upload: true,
          can_edit: true,
          can_delete: false
        },
        {
          user_id: dbUser.id,
          folder_type: '03_delivery',
          folder_name: '03_納品データ',
          can_preview: true,
          can_download: false, // 納品データもダウンロード不可
          can_upload: true,
          can_edit: false,
          can_delete: false
        },
        {
          user_id: dbUser.id,
          folder_type: '04_contract',
          folder_name: '04_契約データ',
          can_preview: true,
          can_download: true, // 契約データのみダウンロード可能
          can_upload: false,
          can_edit: false,
          can_delete: false
        }
      ]

      // 権限データを挿入（重複は無視）
      const { error: permError } = await supabaseAdmin
        .from('box_permissions')
        .upsert(permissions, {
          onConflict: 'user_id,folder_type',
          ignoreDuplicates: true
        })

      if (permError) {
        console.error(`Permission setup error for user ${dbUser.display_name}:`, permError)
        continue
      }

      // デフォルトの時間制限設定
      const { error: timeError } = await supabaseAdmin
        .from('box_time_restrictions')
        .upsert({
          user_id: dbUser.id,
          enabled: false,
          start_time: '09:00:00',
          end_time: '18:00:00',
          timezone: 'Asia/Tokyo',
          days_of_week: [1,2,3,4,5] // 月-金
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        })

      if (timeError) {
        console.error(`Time restriction setup error for user ${dbUser.display_name}:`, timeError)
      }

      // デフォルトの日次制限設定
      const { error: dailyError } = await supabaseAdmin
        .from('box_daily_limits')
        .upsert({
          user_id: dbUser.id,
          enabled: false,
          max_downloads_per_day: 10,
          max_size_per_day_mb: 100,
          reset_time: '00:00:00'
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        })

      if (dailyError) {
        console.error(`Daily limit setup error for user ${dbUser.display_name}:`, dailyError)
      }

      // 緊急停止状態（デフォルトは停止なし）
      const { error: emergencyError } = await supabaseAdmin
        .from('box_emergency_stops')
        .upsert({
          user_id: dbUser.id,
          is_stopped: false
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: true
        })

      if (emergencyError) {
        console.error(`Emergency stop setup error for user ${dbUser.display_name}:`, emergencyError)
      }

      setupCount++
      console.log(`✅ Default permissions set for: ${dbUser.display_name}`)
    }

    console.log(`🎉 Setup complete for ${setupCount} users`)

    return NextResponse.json({
      success: true,
      message: `${setupCount}人のユーザーにデフォルトBox権限を設定しました`,
      usersProcessed: setupCount
    })

  } catch (error: any) {
    console.error('❌ Setup default permissions error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to setup default Box permissions for all users'
  })
}