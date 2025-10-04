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
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 管理者チェック
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())
    const isEmailAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    let isOrgAdmin = false
    if (userProfile?.id) {
      const { data: memberships } = await supabaseAdmin
        .from('memberships')
        .select('role, organizations!inner(name)')
        .eq('user_id', userProfile.id)
        .in('role', ['Admin', 'OrgAdmin'])

      isOrgAdmin = memberships?.some((m: any) =>
        m.role === 'Admin' ||
        (m.role === 'OrgAdmin' && m.organizations?.name === '運営会社')
      ) || false
    }

    if (!isEmailAdmin && !isOrgAdmin) {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // 移行処理開始
    const results = {
      total: 0,
      added: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    }

    // すべてのチャットルームを取得
    const { data: chatRooms, error: roomsError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id, project_id, name')
      .order('created_at', { ascending: true })

    if (roomsError) {
      return NextResponse.json({
        message: 'チャットルーム取得エラー',
        error: roomsError.message
      }, { status: 500 })
    }

    results.total = chatRooms?.length || 0

    for (const room of chatRooms || []) {
      const roomResult: any = {
        room_name: room.name,
        room_id: room.id,
        status: 'processing'
      }

      // プロジェクトの承認者を取得
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, approved_by, title')
        .eq('id', room.project_id)
        .single()

      if (projectError || !project) {
        roomResult.status = 'error'
        roomResult.message = 'プロジェクト情報の取得失敗'
        results.errors++
        results.details.push(roomResult)
        continue
      }

      if (!project.approved_by) {
        roomResult.status = 'skipped'
        roomResult.message = '承認者が設定されていません'
        results.skipped++
        results.details.push(roomResult)
        continue
      }

      // 承認者のauth_user_idを取得
      const { data: approver, error: approverError } = await supabaseAdmin
        .from('users')
        .select('id, auth_user_id, display_name, email')
        .eq('id', project.approved_by)
        .single()

      if (approverError || !approver || !approver.auth_user_id) {
        roomResult.status = 'error'
        roomResult.message = '承認者情報の取得失敗'
        results.errors++
        results.details.push(roomResult)
        continue
      }

      roomResult.approver = approver.display_name || approver.email

      // 既に参加者として登録されているかチェック
      const { data: existingParticipant } = await supabaseAdmin
        .from('chat_participants')
        .select('id, role')
        .eq('room_id', room.id)
        .eq('user_id', approver.auth_user_id)
        .single()

      if (existingParticipant) {
        roomResult.status = 'skipped'
        roomResult.message = `既に参加者として登録済み (role: ${existingParticipant.role})`
        results.skipped++
        results.details.push(roomResult)
        continue
      }

      // 承認者を参加者として追加
      const { error: addError } = await supabaseAdmin
        .from('chat_participants')
        .insert({
          room_id: room.id,
          user_id: approver.auth_user_id,
          role: 'admin',
          is_active: true
        })

      if (addError) {
        roomResult.status = 'error'
        roomResult.message = `参加者追加エラー: ${addError.message}`
        results.errors++
      } else {
        roomResult.status = 'added'
        roomResult.message = '承認者を参加者に追加しました'
        results.added++
      }

      results.details.push(roomResult)
    }

    return NextResponse.json({
      message: '移行処理が完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('移行処理エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
