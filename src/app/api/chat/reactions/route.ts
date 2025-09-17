import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '@/lib/supabase'

// リアクション一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
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

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('message_id')

    if (!messageId) {
      return NextResponse.json({ message: 'メッセージIDが必要です' }, { status: 400 })
    }

    // リアクション一覧を取得
    const { data: reactions, error: reactionsError } = await supabaseAdmin
      .from('message_reactions')
      .select(`
        id,
        reaction_type,
        created_at,
        user_id,
        users (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true })

    if (reactionsError) {
      console.error('リアクション取得エラー:', reactionsError)
      return NextResponse.json({ 
        message: 'リアクションの取得に失敗しました',
        error: reactionsError.message,
        details: reactionsError
      }, { status: 500 })
    }


    // リアクションタイプごとにグループ化
    const groupedReactions = reactions?.reduce((acc, reaction) => {
      const type = reaction.reaction_type
      if (!acc[type]) {
        acc[type] = []
      }
      
      acc[type].push({
        id: reaction.id,
        type,
        user_id: reaction.user_id,
        users: reaction.users,
        display_name: (reaction.users as any)?.display_name || 'Unknown',
        avatar_url: (reaction.users as any)?.avatar_url,
        created_at: reaction.created_at
      })
      return acc
    }, {} as Record<string, any[]>) || {}


    return NextResponse.json({
      reactions: groupedReactions
    }, { status: 200 })

  } catch (error) {
    console.error('リアクション取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// リアクションを追加/削除
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    const { message_id, reaction_type, action } = await request.json()

    if (!message_id || !reaction_type || !action) {
      return NextResponse.json({ message: '必要なパラメータが不足しています' }, { status: 400 })
    }

    if (action === 'add') {
      // リアクションを追加
      
      const { data, error } = await supabaseAdmin
        .from('message_reactions')
        .insert({
          message_id,
          user_id: userProfile.id,
          reaction_type
        })
        .select()

      if (error) {
        console.error('リアクション追加エラー:', error)
        console.error('エラー詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return NextResponse.json({ 
          message: 'リアクションの追加に失敗しました',
          error: error.message,
          details: error
        }, { status: 500 })
      }

      return NextResponse.json({
        message: 'リアクションを追加しました',
        reaction: data[0]
      }, { status: 200 })

    } else if (action === 'remove') {
      // リアクションを削除
      
      const { error } = await supabaseAdmin
        .from('message_reactions')
        .delete()
        .eq('message_id', message_id)
        .eq('user_id', userProfile.id)
        .eq('reaction_type', reaction_type)

      if (error) {
        console.error('リアクション削除エラー:', error)
        console.error('エラー詳細:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return NextResponse.json({ 
          message: 'リアクションの削除に失敗しました',
          error: error.message,
          details: error
        }, { status: 500 })
      }

      return NextResponse.json({
        message: 'リアクションを削除しました'
      }, { status: 200 })

    } else {
      return NextResponse.json({ message: '無効なアクションです' }, { status: 400 })
    }

  } catch (error) {
    console.error('リアクション操作エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
