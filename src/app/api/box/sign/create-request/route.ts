export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 緊急対応: Box Sign機能を一時停止
  return NextResponse.json({
    success: false,
    error: 'Box Sign機能は現在メンテナンス中です。しばらくお待ちください。'
  }, { status: 503 })
}