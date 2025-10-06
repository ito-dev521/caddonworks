export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const templateType = formData.get('type') as string
    const templateName = formData.get('name') as string

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    if (!templateType || !['order', 'completion', 'monthly_invoice'].includes(templateType)) {
      return NextResponse.json({ error: '無効なテンプレートタイプです' }, { status: 400 })
    }

    // ファイル拡張子チェック
    const allowedExtensions = ['.xlsx', '.xls']
    const fileExtension = path.extname(file.name).toLowerCase()

    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        error: 'Excelファイル（.xlsx, .xls）のみアップロード可能です'
      }, { status: 400 })
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'ファイルサイズは10MB以下にしてください'
      }, { status: 400 })
    }

    console.log('📤 テンプレートアップロード開始:', {
      fileName: file.name,
      size: file.size,
      type: templateType
    })

    // テンプレートディレクトリパス
    const templatesDir = path.join(process.cwd(), 'templates', 'documents')

    // ディレクトリが存在しない場合は作成
    if (!existsSync(templatesDir)) {
      await mkdir(templatesDir, { recursive: true })
    }

    // ファイル名を生成（既存ファイルを上書き）
    const fileName = `${templateType}_template${fileExtension}`
    const filePath = path.join(templatesDir, fileName)

    // ファイルを保存
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // データベースにテンプレート情報を記録
    const { data: template, error } = await supabaseAdmin
      .from('document_templates')
      .upsert({
        name: templateName || `${getTemplateLabel(templateType)}テンプレート`,
        type: templateType,
        file_path: filePath,
        file_name: fileName,
        file_size: file.size,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'type',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('❌ テンプレート情報記録エラー:', error)
      return NextResponse.json({
        error: 'データベース記録エラー',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ テンプレートアップロード完了:', {
      id: template.id,
      fileName: fileName,
      filePath: filePath
    })

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        fileName: fileName,
        fileSize: file.size
      }
    })

  } catch (error: any) {
    console.error('❌ テンプレートアップロードエラー:', error)
    return NextResponse.json({
      error: 'アップロードエラー',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // 現在のテンプレート一覧を取得
    const { data: templates, error } = await supabaseAdmin
      .from('document_templates')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ テンプレート一覧取得エラー:', error)
      return NextResponse.json({
        error: 'データベースエラー'
      }, { status: 500 })
    }

    // ファイル存在チェック
    const templatesWithStatus = await Promise.all(
      (templates || []).map(async (template) => {
        const fileExists = template.file_path ? existsSync(template.file_path) : false

        return {
          ...template,
          fileExists,
          label: getTemplateLabel(template.type)
        }
      })
    )

    return NextResponse.json({
      templates: templatesWithStatus
    })

  } catch (error: any) {
    console.error('❌ テンプレート一覧取得エラー:', error)
    return NextResponse.json({
      error: 'サーバーエラー',
      details: error.message
    }, { status: 500 })
  }
}

function getTemplateLabel(type: string): string {
  const labels: Record<string, string> = {
    order: '発注書',
    completion: '完了届',
    monthly_invoice: '月次請求書'
  }
  return labels[type] || type
}