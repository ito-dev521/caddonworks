import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    const results = {
      message: 'データベース構造を確認しました',
      tables: {} as any,
      errors: [] as string[]
    }

    // 各テーブルの存在確認と構造チェック
    const tablesToCheck = ['chat_rooms', 'chat_messages', 'users', 'message_reactions']

    for (const tableName of tablesToCheck) {
      try {
        // テーブルが存在するかテストクエリで確認
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          results.tables[tableName] = {
            exists: false,
            error: error.message
          }
          results.errors.push(`${tableName}: ${error.message}`)
        } else {
          results.tables[tableName] = {
            exists: true,
            sample_data: data,
            message: 'テーブルが存在します'
          }
        }
      } catch (err) {
        results.tables[tableName] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        }
        results.errors.push(`${tableName}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    // chat_messagesテーブルが存在する場合、カラム構造を確認
    if (results.tables.chat_messages?.exists) {
      try {
        // サンプルデータからカラム構造を推測
        const { data: sampleData, error: sampleError } = await supabaseAdmin
          .from('chat_messages')
          .select('*')
          .limit(1)

        if (!sampleError && sampleData && sampleData.length > 0) {
          results.tables.chat_messages.columns = Object.keys(sampleData[0])
        }
      } catch (err) {
        results.tables.chat_messages.column_error = err instanceof Error ? err.message : 'Unknown error'
      }
    }

    // chat_roomsテーブルが存在する場合、カラム構造を確認
    if (results.tables.chat_rooms?.exists) {
      try {
        const { data: sampleData, error: sampleError } = await supabaseAdmin
          .from('chat_rooms')
          .select('*')
          .limit(1)

        if (!sampleError && sampleData && sampleData.length > 0) {
          results.tables.chat_rooms.columns = Object.keys(sampleData[0])
        }
      } catch (err) {
        results.tables.chat_rooms.column_error = err instanceof Error ? err.message : 'Unknown error'
      }
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error) {
    console.error('データベース構造確認エラー:', error)
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
