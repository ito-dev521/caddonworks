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

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // Box権限設定を取得（まだテーブルがないので仮データ）
    const defaultPermissions = [
      {
        folderId: '01_received',
        folderName: '01_受取データ',
        download: false,
        preview: true,
        upload: false,
        edit: false
      },
      {
        folderId: '02_work',
        folderName: '02_作業データ',
        download: false,
        preview: true,
        upload: true,
        edit: true
      },
      {
        folderId: '03_delivery',
        folderName: '03_納品データ',
        download: false,
        preview: true,
        upload: true,
        edit: false
      },
      {
        folderId: '04_contract',
        folderName: '04_契約データ',
        download: true,
        preview: true,
        upload: false,
        edit: false
      }
    ]

    const userPermissions = {
      userId: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      permissions: defaultPermissions,
      timeRestrictions: {
        enabled: false,
        startTime: '09:00',
        endTime: '18:00',
        timezone: 'Asia/Tokyo'
      },
      downloadLimits: {
        enabled: false,
        maxPerDay: 10,
        maxSizePerDay: '100MB'
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