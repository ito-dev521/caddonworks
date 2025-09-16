import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    
    // Supabaseクライアントを作成
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
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // 組織情報を別途取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', project.org_id)
      .single()

    if (orgError) {
      console.error('組織情報取得エラー:', orgError)
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
      org_name: organization?.name,
      required_contractors: project.required_contractors,
      assignee_name: project.assignee_name,
      bidding_deadline: project.bidding_deadline
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

export async function PUT(
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
    
    // Supabaseクライアントを作成
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

    // リクエストボディを取得
    const body = await request.json()
    const { title, description, budget, start_date, end_date, category, required_contractors, required_level, assignee_name, status } = body

    // 必須フィールドの検証
    if (!title || !description || !budget || !start_date || !end_date || !category || !required_contractors) {
      return NextResponse.json({ message: '必須フィールドが不足しています' }, { status: 400 })
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
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

    // 権限チェック（OrgAdminのみ編集可能）
    const isOrgAdmin = membership.role === 'OrgAdmin' && project.org_id === membership.org_id

    if (!isOrgAdmin) {
      return NextResponse.json({ message: 'この案件を編集する権限がありません' }, { status: 403 })
    }

    // 案件を更新
    const updateData: any = {
      title,
      description,
      budget: Number(budget),
      start_date,
      end_date,
      category,
      required_contractors: Number(required_contractors),
      required_level: required_level || 'beginner',
      assignee_name: assignee_name || null,
      updated_at: new Date().toISOString()
    }

    // ステータスが提供されている場合は追加
    if (status) {
      updateData.status = status
    }

    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('案件更新エラー:', updateError)
      return NextResponse.json({ message: '案件の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '案件が正常に更新されました',
      project: updatedProject
    }, { status: 200 })

  } catch (error) {
    console.error('案件更新APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}