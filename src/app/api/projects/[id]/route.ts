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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json({ message: '案件IDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 案件情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        organizations!projects_org_id_fkey (
          name
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 権限チェック
    const isOrgAdmin = membership.role === 'OrgAdmin' && project.org_id === membership.org_id
    const isContractor = membership.role === 'Contractor'

    if (!isOrgAdmin && !isContractor) {
      return NextResponse.json({ message: 'この案件を閲覧する権限がありません' }, { status: 403 })
    }

    // レスポンス用のデータを整形
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget,
      start_date: project.start_date,
      end_date: project.end_date,
      category: project.category,
      created_at: project.created_at,
      org_id: project.org_id,
      org_name: (project as any).organizations?.name
    }

    return NextResponse.json({ project: formattedProject }, { status: 200 })

  } catch (error) {
    console.error('案件取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}