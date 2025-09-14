import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json(
        { message: '案件IDが必要です' },
        { status: 400 }
      )
    }

    // ユーザーの認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        org_id,
        memberships!inner (
          user_id,
          role
        )
      `)
      .eq('id', projectId)
      .eq('memberships.user_id', user.id)
      .eq('memberships.role', 'OrgAdmin')
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つからないか、削除権限がありません' },
        { status: 403 }
      )
    }

    // 案件を削除
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error('案件削除エラー:', deleteError)
      return NextResponse.json(
        { message: '案件の削除に失敗しました: ' + deleteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '案件が正常に削除されました'
    }, { status: 200 })

  } catch (error) {
    console.error('案件削除エラー:', error)
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
    const body = await request.json()
    const {
      title,
      description,
      budget,
      start_date,
      end_date,
      category,
      location,
      status
    } = body

    if (!projectId) {
      return NextResponse.json(
        { message: '案件IDが必要です' },
        { status: 400 }
      )
    }

    // ユーザーの認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        org_id,
        memberships!inner (
          user_id,
          role
        )
      `)
      .eq('id', projectId)
      .eq('memberships.user_id', user.id)
      .eq('memberships.role', 'OrgAdmin')
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つからないか、編集権限がありません' },
        { status: 403 }
      )
    }

    // 案件を更新
    const updateData: any = {}
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (budget) updateData.budget = Number(budget)
    if (start_date) updateData.start_date = start_date
    if (end_date) updateData.end_date = end_date
    if (category) updateData.category = category
    if (location) updateData.location = location
    if (status) updateData.status = status

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('案件更新エラー:', updateError)
      return NextResponse.json(
        { message: '案件の更新に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '案件が正常に更新されました',
      project: updatedProject
    }, { status: 200 })

  } catch (error) {
    console.error('案件更新エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
