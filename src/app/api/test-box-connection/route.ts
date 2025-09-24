export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken, getBoxFolderItems } from '@/lib/box'

export async function GET(request: NextRequest) {
  try {
    // Environment variables check
    const envVars = {
      BOX_CLIENT_ID: process.env.BOX_CLIENT_ID,
      BOX_CLIENT_SECRET: process.env.BOX_CLIENT_SECRET ? '***set***' : undefined,
      BOX_ENTERPRISE_ID: process.env.BOX_ENTERPRISE_ID,
      BOX_JWT_PRIVATE_KEY: process.env.BOX_JWT_PRIVATE_KEY ? '***set***' : undefined,
      BOX_JWT_PRIVATE_KEY_PASSPHRASE: process.env.BOX_JWT_PRIVATE_KEY_PASSPHRASE ? '***set***' : undefined,
      BOX_PROJECTS_ROOT_FOLDER_ID: process.env.BOX_PROJECTS_ROOT_FOLDER_ID,
      BOX_PUBLIC_KEY_ID: process.env.BOX_PUBLIC_KEY_ID
    }

    console.log('Environment variables status:', envVars)

    // Check if all required variables are set
    const missingVars = Object.entries(envVars).filter(([key, value]) => !value).map(([key]) => key)

    if (missingVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        missing: missingVars,
        env_status: envVars
      }, { status: 400 })
    }

    // Test Box API authentication
    console.log('Testing Box API authentication...')
    const accessToken = await getAppAuthAccessToken()
    console.log('✅ Box authentication successful, token length:', accessToken.length)

    // Test folder access
    const rootFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '342069286897'
    console.log('Testing folder access for ID:', rootFolderId)

    const folderItems = await getBoxFolderItems(rootFolderId)
    console.log('✅ Box folder access successful, items count:', folderItems.length)

    return NextResponse.json({
      status: 'success',
      message: 'Box API connection successful',
      env_status: envVars,
      test_results: {
        authentication: 'success',
        token_length: accessToken.length,
        folder_access: 'success',
        folder_items_count: folderItems.length,
        sample_items: folderItems.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          type: item.type
        }))
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Box API connection test failed:', error)

    return NextResponse.json({
      status: 'error',
      message: 'Box API connection failed',
      error: error.message,
      error_details: error.stack?.split('\n').slice(0, 5) || []
    }, { status: 500 })
  }
}