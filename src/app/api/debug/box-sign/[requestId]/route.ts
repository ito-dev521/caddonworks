import { NextRequest, NextResponse } from 'next/server'
import { boxSignAPI } from '@/lib/box-sign'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId

    // Box Sign リクエストの詳細情報を取得
    const detailedInfo = await boxSignAPI.getDetailedSignatureInfo(requestId)

    return NextResponse.json({
      success: true,
      requestId,
      detailedInfo,
      diagnostics: {
        hasSourceFiles: !!detailedInfo?.source_files?.length,
        hasSigners: !!detailedInfo?.signers?.length,
        status: detailedInfo?.status,
        isExpired: detailedInfo?.expires_at ? new Date(detailedInfo.expires_at) < new Date() : false,
        signingUrls: detailedInfo?.signers?.map((signer: any) => ({
          email: signer.email,
          hasEmbedUrl: !!signer.embed_url,
          hasRedirectUrl: !!signer.redirect_url,
          embedUrl: signer.embed_url,
          redirectUrl: signer.redirect_url
        }))
      }
    })

  } catch (error: any) {
    console.error('❌ Box Sign デバッグAPIエラー:', error)

    return NextResponse.json({
      success: false,
      error: error.message,
      requestId: params.requestId
    }, { status: 500 })
  }
}