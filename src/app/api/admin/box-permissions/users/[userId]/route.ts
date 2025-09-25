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

    console.log('👤 Individual user permissions API called for userId:', userId)

    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    console.log('🔑 Auth header present:', !!authHeader)

    if (!authHeader) {
      console.log('❌ No auth header provided')
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    console.log('👤 Admin user auth check:', { user: authUser?.email, error: authError?.message })

    if (authError || !authUser) {
      console.log('❌ Auth error or no user')
      return NextResponse.json({ error: '認証エラー', details: authError?.message }, { status: 401 })
    }

    // 管理者メールアドレスチェック
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    console.log('🔧 Admin check:', { userEmail: authUser.email, isAdmin: adminEmails.includes(authUser.email!) })

    if (!adminEmails.includes(authUser.email!)) {
      console.log('❌ User is not admin')
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('📊 Fetching user data for userId:', userId)

    // まず基本的なユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email, organization')
      .eq('id', userId)
      .single()

    console.log('👥 User query result:', {
      found: !userError,
      user: user ? { id: user.id, name: user.display_name, email: user.email } : null,
      error: userError?.message
    })

    if (userError || !user) {
      console.log('❌ User not found')
      return NextResponse.json({ error: 'ユーザーが見つかりません', details: userError }, { status: 404 })
    }

    // デフォルトの権限データを作成（Box関連テーブルからは後で取得）
    const permissions = [
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
        name: user.display_name || user.email || 'Unknown User',
        email: user.email,
        role: 'contractor'
      },
      permissions,
      timeRestrictions: {
        enabled: false,
        startTime: '09:00',
        endTime: '18:00',
        timezone: 'Asia/Tokyo',
        daysOfWeek: [1,2,3,4,5]
      },
      downloadLimits: {
        enabled: false,
        maxPerDay: 10,
        maxSizePerDay: '100MB'
      }
    }

    console.log('✅ User permissions prepared:', {
      userId: userPermissions.userId,
      userName: userPermissions.user.name,
      permissionsCount: permissions.length
    })

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