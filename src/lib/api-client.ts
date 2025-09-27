import { supabase } from '@/lib/supabase'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  signal?: AbortSignal
}

/**
 * 認証付きAPI呼び出しのヘルパー関数
 * セッション取得とエラーハンドリングを統一
 */
export async function authenticatedFetch(url: string, options: ApiOptions = {}) {
  try {
    // セッション取得とバリデーション
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('セッション取得エラー:', sessionError)
      throw new Error('認証エラー: セッションの取得に失敗しました')
    }

    if (!session) {
      throw new Error('認証エラー: ログインが必要です')
    }

    if (!session.access_token) {
      throw new Error('認証エラー: アクセストークンが見つかりません')
    }

    // トークンの基本的な形式チェック（JWT形式）
    const tokenParts = session.access_token.split('.')
    if (tokenParts.length !== 3) {
      console.error('JWT トークン形式エラー:', tokenParts.length, '個の部分')
      throw new Error('認証エラー: 無効なトークン形式です。再ログインしてください')
    }

    // ヘッダーの構築
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers
    }

    // Content-TypeはPOST/PUTの場合のみ設定
    const method = options.method || 'GET'
    if (method !== 'GET' && method !== 'DELETE') {
      headers['Content-Type'] = 'application/json'
    }

    // APIリクエスト実行
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options.signal
    }

    // bodyはPOST/PUTの場合のみ設定
    if (options.body && method !== 'GET' && method !== 'DELETE') {
      fetchOptions.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, fetchOptions)

    // レスポンス処理
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`APIエラー (${response.status}): ${errorData.message || response.statusText}`)
    }

    return response.json()

  } catch (error) {
    console.error('API呼び出しエラー:', error)
    throw error
  }
}

/**
 * FormData用の認証付きAPI呼び出し（ファイルアップロード等）
 */
export async function authenticatedFetchFormData(url: string, formData: FormData, options: { signal?: AbortSignal } = {}) {
  try {
    // セッション取得とバリデーション
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('セッション取得エラー:', sessionError)
      throw new Error('認証エラー: セッションの取得に失敗しました')
    }

    if (!session) {
      throw new Error('認証エラー: ログインが必要です')
    }

    if (!session.access_token) {
      throw new Error('認証エラー: アクセストークンが見つかりません')
    }

    // FormDataの場合はContent-Typeを設定しない（ブラウザが自動設定）
    const headers = {
      'Authorization': `Bearer ${session.access_token}`
    }

    // APIリクエスト実行
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      signal: options.signal
    })

    // レスポンス処理
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`APIエラー (${response.status}): ${errorData.message || response.statusText}`)
    }

    return response.json()

  } catch (error) {
    console.error('FormData API呼び出しエラー:', error)
    throw error
  }
}

/**
 * 認証不要のAPI呼び出し（公開エンドポイント用）
 */
export async function publicFetch(url: string, options: ApiOptions = {}) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`APIエラー (${response.status}): ${errorData.message || response.statusText}`)
    }

    return response.json()

  } catch (error) {
    console.error('公開API呼び出しエラー:', error)
    throw error
  }
}