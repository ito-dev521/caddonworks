export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    // 管理者権限チェック（省略 - 上記と同じ）
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報と権限設定を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        box_permissions (*),
        box_time_restrictions (*),
        box_daily_limits (*),
        box_emergency_stops (*)
      `)
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません', details: userError }, { status: 404 })
    }

    // 権限データを整形
    const permissions = user.box_permissions?.map(p => ({
      folderId: p.folder_type,
      folderName: p.folder_name,
      download: p.can_download,
      preview: p.can_preview,
      upload: p.can_upload,
      edit: p.can_edit,
      delete: p.can_delete
    })) || []

    // 時間制限設定
    const timeRestrictions = user.box_time_restrictions?.[0] || {}

    // 日次制限設定
    const dailyLimits = user.box_daily_limits?.[0] || {}

    // 緊急停止状態
    const emergencyStop = user.box_emergency_stops?.[0] || {}

    const userPermissions = {
      userId: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      permissions,
      timeRestrictions: {
        enabled: timeRestrictions.enabled || false,
        startTime: timeRestrictions.start_time || '09:00',
        endTime: timeRestrictions.end_time || '18:00',
        timezone: timeRestrictions.timezone || 'Asia/Tokyo',
        daysOfWeek: timeRestrictions.days_of_week || [1,2,3,4,5]
      },
      downloadLimits: {
        enabled: dailyLimits.enabled || false,
        maxPerDay: dailyLimits.max_downloads_per_day || 10,
        maxSizePerDay: `${dailyLimits.max_size_per_day_mb || 100}MB`
      },
      emergencyStop: {
        isStopped: emergencyStop.is_stopped || false,
        stoppedAt: emergencyStop.stopped_at,
        reason: emergencyStop.reason
      }
    }

    return NextResponse.json({
      success: true,
      userPermissions
    })

  } catch (error: any) {
    console.error('❌ User permissions fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}