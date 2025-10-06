import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')

    let query = supabaseAdmin
      .from('deliverables')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: deliverables, error } = await query

    if (error) {
      console.error('Deliverables fetch error:', error)
      return NextResponse.json({ message: 'データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(deliverables || [])

  } catch (error) {
    console.error('Deliverables API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

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

    const body = await request.json()
    const { project_id, name, description, format, due_date } = body

    // 必須フィールドの検証
    if (!project_id || !name) {
      return NextResponse.json({ message: '必須フィールドが不足しています' }, { status: 400 })
    }

    // 成果物を作成
    const { data: deliverable, error } = await supabaseAdmin
      .from('deliverables')
      .insert({
        project_id,
        name,
        description,
        format,
        due_date,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Deliverable creation error:', error)
      return NextResponse.json({ message: '成果物の作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(deliverable, { status: 201 })

  } catch (error) {
    console.error('Deliverables creation API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}