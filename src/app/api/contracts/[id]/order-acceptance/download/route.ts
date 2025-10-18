import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { downloadBoxFile } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

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

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        contractor_id,
        order_acceptance_box_id,
        order_acceptance_number,
        projects!inner(
          id,
          title,
          created_by,
          organizations!inner(
            id,
            name
          ),
          memberships!inner(
            user_id,
            role
          )
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    if (!contract.order_acceptance_box_id) {
      return NextResponse.json({ message: '注文請書が生成されていません' }, { status: 404 })
    }

    // 権限チェック：受注者または発注者のみダウンロード可能
    const isContractor = contract.contractor_id === userProfile.id
    const isProjectCreator = (contract as any).projects.created_by === userProfile.id
    const isOrgMember = (contract as any).projects.memberships.some(
      (m: any) => m.user_id === userProfile.id && ['OrgAdmin', 'Staff'].includes(m.role)
    )

    if (!isContractor && !isProjectCreator && !isOrgMember) {
      return NextResponse.json({ message: 'この注文請書をダウンロードする権限がありません' }, { status: 403 })
    }

    // BoxからPDFをダウンロード
    const boxResponse = await downloadBoxFile(contract.order_acceptance_box_id)

    if (!boxResponse.ok) {
      console.error('❌ Box ダウンロードエラー:', boxResponse.status)
      return NextResponse.json({ message: 'ファイルのダウンロードに失敗しました' }, { status: 500 })
    }

    const pdfArrayBuffer = await boxResponse.arrayBuffer()
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    // ファイル名を生成
    const fileName = `注文請書_${(contract as any).projects.title}_${contract.order_acceptance_number || 'N/A'}.pdf`

    // PDFとして返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('❌ 注文請書ダウンロードエラー:', error)
    return NextResponse.json({
      message: '注文請書のダウンロードに失敗しました',
      error: error.message
    }, { status: 500 })
  }
}