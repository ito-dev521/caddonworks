// レート制限機能
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export function rateLimit(config: RateLimitConfig) {
  return function checkRateLimit(identifier: string): boolean {
    const now = Date.now()
    const window = store[identifier]

    // ウィンドウがリセット時刻を過ぎているか、初回の場合
    if (!window || now > window.resetTime) {
      store[identifier] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return true
    }

    // リクエスト数が制限を超えている場合
    if (window.count >= config.maxRequests) {
      return false
    }

    // リクエスト数をインクリメント
    window.count++
    return true
  }
}

// BOXファイル操作用のレート制限設定
export const boxRateLimit = rateLimit({
  maxRequests: 30, // 30リクエスト
  windowMs: 60 * 1000 // 1分間
})

// BOXアップロード用のレート制限設定（より厳しい制限）
export const boxUploadRateLimit = rateLimit({
  maxRequests: 10, // 10リクエスト
  windowMs: 60 * 1000 // 1分間
})

// 古いエントリをクリーンアップする関数
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}

// 定期的にクリーンアップを実行
if (typeof global !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000) // 5分毎
}