import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 重複するプロジェクトのチャットルームを統合
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title')
      .order('title')

    if (projectsError) {
      return NextResponse.json(
        { message: 'プロジェクトの取得に失敗しました' },
        { status: 400 }
      )
    }

    const results = []

    for (const project of projects || []) {
      try {
        // このプロジェクトに関連するすべての契約を取得
        const { data: contracts, error: contractsError } = await supabaseAdmin
          .from('contracts')
          .select('id, contractor_id, status')
          .eq('project_id', project.id)
          .eq('status', 'signed')

        if (contractsError) {
          results.push({
            project_id: project.id,
            project_title: project.title,
            status: 'error',
            message: '契約の取得に失敗しました'
          })
          continue
        }

        if (!contracts || contracts.length === 0) {
          results.push({
            project_id: project.id,
            project_title: project.title,
            status: 'skipped',
            message: '署名済み契約がありません'
          })
          continue
        }

        // このプロジェクトのすべてのチャットメッセージを取得
        const { data: messages, error: messagesError } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true })

        if (messagesError) {
          results.push({
            project_id: project.id,
            project_title: project.title,
            status: 'error',
            message: 'メッセージの取得に失敗しました'
          })
          continue
        }

        // メッセージが既に統合されているかチェック
        const uniqueSenders = new Set(messages?.map(msg => msg.sender_id) || [])
        
        if (uniqueSenders.size <= 1) {
          results.push({
            project_id: project.id,
            project_title: project.title,
            status: 'already_consolidated',
            message: '既に統合済みです'
          })
          continue
        }

        // メッセージを統合（重複を除去）
        const consolidatedMessages = messages?.reduce((acc, msg) => {
          const key = `${msg.sender_id}_${msg.message}_${msg.created_at}`
          if (!acc.find((m: any) => `${m.sender_id}_${m.message}_${m.created_at}` === key)) {
            acc.push(msg)
          }
          return acc
        }, [] as any[]) || []

        // 古いメッセージを削除
        if (messages && messages.length > 0) {
          const { error: deleteError } = await supabaseAdmin
            .from('chat_messages')
            .delete()
            .eq('project_id', project.id)

          if (deleteError) {
            results.push({
              project_id: project.id,
              project_title: project.title,
              status: 'error',
              message: '古いメッセージの削除に失敗しました'
            })
            continue
          }
        }

        // 統合されたメッセージを再挿入
        if (consolidatedMessages.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from('chat_messages')
            .insert(consolidatedMessages)

          if (insertError) {
            results.push({
              project_id: project.id,
              project_title: project.title,
              status: 'error',
              message: '統合メッセージの挿入に失敗しました'
            })
            continue
          }
        }

        results.push({
          project_id: project.id,
          project_title: project.title,
          status: 'success',
          message: `${consolidatedMessages.length}件のメッセージを統合しました`
        })

      } catch (error) {
        results.push({
          project_id: project.id,
          project_title: project.title,
          status: 'error',
          message: '予期しないエラーが発生しました'
        })
      }
    }

    return NextResponse.json({
      message: 'チャットルームの統合が完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('チャットルーム統合エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
