import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Box API接続テスト開始...')

    // 環境変数の確認
    const requiredEnvVars = [
      'BOX_CLIENT_ID',
      'BOX_CLIENT_SECRET',
      'BOX_ENTERPRISE_ID',
      'BOX_JWT_PRIVATE_KEY',
      'BOX_JWT_PRIVATE_KEY_PASSPHRASE',
      'BOX_PUBLIC_KEY_ID',
      'BOX_PROJECTS_ROOT_FOLDER_ID'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        missingVars,
        message: `次の環境変数が設定されていません: ${missingVars.join(', ')}`
      }, { status: 500 })
    }

    console.log('✅ 環境変数OK')
    console.log('BOX_CLIENT_ID:', process.env.BOX_CLIENT_ID?.substring(0, 10) + '...')
    console.log('BOX_ENTERPRISE_ID:', process.env.BOX_ENTERPRISE_ID)
    console.log('BOX_PUBLIC_KEY_ID:', process.env.BOX_PUBLIC_KEY_ID)

    // 1. アクセストークンを取得
    console.log('🔄 Box アクセストークン取得中...')
    const accessToken = await getAppAuthAccessToken()
    console.log('✅ アクセストークン取得成功:', accessToken.substring(0, 20) + '...')

    // 2. Box API で認証をテスト（現在のユーザー情報を取得）
    console.log('🔄 Box API認証テスト中...')
    const userResponse = await fetch('https://api.box.com/2.0/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ Box API認証失敗:', userResponse.status, errorText)
      return NextResponse.json({
        success: false,
        error: 'Box API authentication failed',
        status: userResponse.status,
        details: errorText
      }, { status: 500 })
    }

    const userData = await userResponse.json()
    console.log('✅ Box API認証成功:', userData.name, userData.login)

    // 3. プロジェクトルートフォルダにアクセステスト
    const rootFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID
    console.log('🔄 ルートフォルダアクセステスト中...', rootFolderId)

    const folderResponse = await fetch(`https://api.box.com/2.0/folders/${rootFolderId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text()
      console.error('❌ ルートフォルダアクセス失敗:', folderResponse.status, errorText)
      return NextResponse.json({
        success: false,
        error: 'Root folder access failed',
        status: folderResponse.status,
        details: errorText,
        folderId: rootFolderId
      }, { status: 500 })
    }

    const folderData = await folderResponse.json()
    console.log('✅ ルートフォルダアクセス成功:', folderData.name)

    // 4. フォルダ内容の取得テスト
    console.log('🔄 フォルダ内容取得テスト中...')
    const itemsResponse = await fetch(`https://api.box.com/2.0/folders/${rootFolderId}/items?limit=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    let itemsData = null
    if (itemsResponse.ok) {
      itemsData = await itemsResponse.json()
      console.log('✅ フォルダ内容取得成功:', itemsData.total_count, '件')
    } else {
      console.log('⚠️ フォルダ内容取得失敗:', itemsResponse.status)
    }

    return NextResponse.json({
      success: true,
      message: 'Box API接続テスト成功',
      user: {
        id: userData.id,
        name: userData.name,
        login: userData.login
      },
      rootFolder: {
        id: folderData.id,
        name: folderData.name,
        itemCount: itemsData?.total_count || 'N/A'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Box API接続テストエラー:', error)

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}