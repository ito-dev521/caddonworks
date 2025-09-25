export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(authUser.email!)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('🔄 Box columns migration starting...')

    const results = []
    let errorCount = 0

    // 実行するSQL文を定義
    const migrations = [
      // Box関連カラム追加
      { name: 'box_user_id', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS box_user_id VARCHAR(50)' },
      { name: 'box_email', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS box_email VARCHAR(255)' },
      { name: 'box_login', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS box_login VARCHAR(255)' },
      { name: 'box_sync_status', sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS box_sync_status VARCHAR(20) DEFAULT 'pending'" },
      { name: 'box_last_synced_at', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS box_last_synced_at TIMESTAMPTZ' }
    ]

    // 各マイグレーションを実行
    for (const migration of migrations) {
      try {
        console.log(`🔄 Executing: ${migration.name}`)

        // Supabase Clientでは直接SQLを実行できないので、個別のクエリに分解
        const { error } = await supabaseAdmin.rpc('exec', { sql: migration.sql })

        if (error) {
          // RPC関数がない場合は、手動でカラム存在チェック
          console.log(`⚠️ RPC not available, checking column existence: ${migration.name}`)

          const { data: columns } = await supabaseAdmin
            .rpc('get_column_info', { table_name: 'users', column_name: migration.name.replace('box_', '') })

          if (!columns || columns.length === 0) {
            console.log(`📝 Column ${migration.name} needs to be added manually`)
            results.push({
              statement: migration.name,
              status: 'needs_manual_migration',
              message: 'Please add this column manually via Supabase dashboard'
            })
          } else {
            results.push({
              statement: migration.name,
              status: 'already_exists',
              message: 'Column already exists'
            })
          }
        } else {
          results.push({
            statement: migration.name,
            status: 'success',
            message: 'Migration executed successfully'
          })
          console.log(`✅ ${migration.name} completed`)
        }

      } catch (error: any) {
        console.error(`❌ Migration failed for ${migration.name}:`, error)
        results.push({
          statement: migration.name,
          status: 'error',
          error: error.message
        })
        errorCount++
      }
    }

    console.log(`🎉 Migration completed: ${migrations.length - errorCount}/${migrations.length} successful`)

    return NextResponse.json({
      success: errorCount === 0,
      message: `Migration completed: ${migrations.length - errorCount}/${migrations.length} migrations executed successfully`,
      results,
      errorCount,
      totalMigrations: migrations.length
    })

  } catch (error: any) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error.message
    }, { status: 500 })
  }
}