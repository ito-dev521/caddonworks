import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 緊急対応: Box Sign機能を一時停止
  return NextResponse.json({
    message: 'デジタル署名機能は現在メンテナンス中です。手動での署名をご利用ください。',
    status: 'maintenance'
  }, { status: 503 })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 緊急対応: Box Sign機能を一時停止
  return NextResponse.json({
    message: '署名ステータス確認機能は現在メンテナンス中です。',
    status: 'maintenance'
  }, { status: 503 })
}