/**
 * シンプルなメモリベースのキャッシュユーティリティ
 * BOX APIコール削減のためのキャッシング機能を提供
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL: number = 5 * 60 * 1000 // デフォルト5分

  /**
   * キャッシュに値を設定
   * @param key キャッシュキー
   * @param value 保存する値
   * @param ttl Time To Live（ミリ秒）、指定しない場合はデフォルト値
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { data: value, expiresAt })
  }

  /**
   * キャッシュから値を取得
   * @param key キャッシュキー
   * @returns キャッシュされた値、存在しないか期限切れの場合はnull
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 期限切れチェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * 特定のキーのキャッシュを削除
   * @param key キャッシュキー
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * パターンに一致するキーのキャッシュを削除
   * @param pattern 削除するキーのパターン（前方一致）
   */
  deletePattern(pattern: string): void {
    const keysToDelete: string[] = []

    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 期限切れのキャッシュエントリを削除
   */
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * キャッシュの統計情報を取得
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// シングルトンインスタンス
export const cache = new MemoryCache()

// 定期的なクリーンアップ（10分ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup()
  }, 10 * 60 * 1000)
}

/**
 * キャッシュキー生成ヘルパー
 */
export const CacheKeys = {
  boxFolder: (folderId: string) => `box_folder_${folderId}`,
  boxFolderItems: (folderId: string) => `box_folder_items_${folderId}`,
  boxFileInfo: (fileId: string) => `box_file_info_${fileId}`,
  boxProjects: () => 'box_projects_list',
  boxProjectDetail: (projectId: string) => `box_project_${projectId}`,
} as const
