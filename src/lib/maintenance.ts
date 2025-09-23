// メンテナンスモードのチェック機能

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    const response = await fetch(`${baseUrl}/api/system-settings?key=maintenance_mode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (response.ok) {
      const data = await response.json()
      return data.value === true
    } else {
      console.warn('メンテナンスモード取得失敗:', response.status)
    }
  } catch (error) {
    console.error('メンテナンスモード確認エラー:', error)
  }
  return false
}

export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
  .split(',')
  .map(e => e.trim().toLowerCase())

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}