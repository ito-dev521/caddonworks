import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBoxFolderItems, renameBoxFolder } from '@/lib/box'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5分

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（管理者のみ）
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
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('📁 既存プロジェクトフォルダの正規化を開始します...')

    // すべてのプロジェクトを取得
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .not('box_folder_id', 'is', null)

    if (projectsError) {
      throw new Error(`プロジェクト取得エラー: ${projectsError.message}`)
    }

    console.log(`📊 対象プロジェクト数: ${projects?.length || 0}`)

    const results = {
      total: projects?.length || 0,
      processed: 0,
      renamed: 0,
      errors: [] as string[]
    }

    // 標準フォルダ名マッピング
    const standardFolderNames: Record<string, string> = {
      '作業内容': '00_作業内容',
      '受取': '01_受取データ',
      '受取データ': '01_受取データ',
      '作業': '02_作業フォルダ',
      '作業フォルダ': '02_作業フォルダ',
      '納品': '03_納品データ',
      '納品データ': '03_納品データ',
      '契約': '04_契約資料',
      '契約資料': '04_契約資料'
    }

    // 番号なしパターン
    const nonNumberedPatterns = ['作業内容', '受取', '受取データ', '作業', '作業フォルダ', '納品', '納品データ', '契約', '契約資料']

    for (const project of projects || []) {
      try {
        console.log(`\n🔄 処理中: ${project.title} (Box ID: ${project.box_folder_id})`)

        // プロジェクトフォルダのアイテムを取得
        const items = await getBoxFolderItems(project.box_folder_id)

        let projectRenamed = 0

        for (const item of items) {
          if (item.type !== 'folder') continue

          const folderName = item.name

          // 既に番号付きの場合はスキップ
          if (/^\d{2}_/.test(folderName)) {
            console.log(`  ✓ ${folderName} - すでに番号付き`)
            continue
          }

          // 番号なしフォルダの場合、リネームを試行
          if (nonNumberedPatterns.includes(folderName)) {
            const newName = standardFolderNames[folderName]
            if (newName && newName !== folderName) {
              try {
                console.log(`  🔁 リネーム: ${folderName} -> ${newName}`)
                await renameBoxFolder(item.id, newName)
                projectRenamed++
                results.renamed++
                console.log(`  ✅ リネーム成功`)
              } catch (renameError: any) {
                const errorMsg = `${project.title} / ${folderName}: ${renameError.message}`
                console.error(`  ❌ リネーム失敗: ${errorMsg}`)
                results.errors.push(errorMsg)
              }
            }
          }
        }

        console.log(`✅ ${project.title}: ${projectRenamed}個のフォルダをリネーム`)
        results.processed++

      } catch (error: any) {
        const errorMsg = `${project.title}: ${error.message}`
        console.error(`❌ プロジェクト処理エラー: ${errorMsg}`)
        results.errors.push(errorMsg)
      }
    }

    console.log('\n📊 正規化完了:')
    console.log(`  - 処理プロジェクト: ${results.processed}/${results.total}`)
    console.log(`  - リネーム数: ${results.renamed}`)
    console.log(`  - エラー数: ${results.errors.length}`)

    return NextResponse.json({
      message: '既存プロジェクトフォルダの正規化が完了しました',
      results
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ フォルダ正規化エラー:', error)
    return NextResponse.json({
      message: 'フォルダ正規化に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}
