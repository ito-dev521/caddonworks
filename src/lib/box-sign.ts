import { getAppAuthAccessToken } from './box'

export interface SignerInfo {
  email: string
  role: 'client' | 'contractor' | 'operator'
  name?: string
  order?: number
}

export interface SignatureRequestOptions {
  documentName: string
  documentContent?: Buffer | string // PDFバイナリまたはBox file ID
  boxFileId?: string
  signers: SignerInfo[]
  message?: string
  daysUntilExpiration?: number
  isDocumentPreparationNeeded?: boolean
  redirectUrl?: string
  declineRedirectUrl?: string
  parentFolderId?: string // 署名済みドキュメントの保存先フォルダID（指定しない場合はデフォルトフォルダ）
}

export interface SignatureRequestResponse {
  success: boolean
  signRequestId?: string
  prepareUrl?: string
  signingUrls?: Array<{
    email: string
    url: string
  }>
  error?: string
}

export interface SignatureStatus {
  id: string
  status: 'converting' | 'created' | 'sent' | 'viewed' | 'downloaded' | 'signed' | 'declined' | 'cancelled' | 'expired' | 'finalizing' | 'error'
  signers: Array<{
    email: string
    hasViewed: boolean
    hasDeclined: boolean
    declinedReason?: string
    hasSigned: boolean
    signedAt?: string
    role: string
  }>
  sourceFiles: Array<{
    id: string
    name: string
    type: string
  }>
  signFiles?: {
    files: Array<{
      id: string
      name: string
      type: string
    }>
  }
  createdAt: string
  completedAt?: string
  expiresAt?: string
}

class BoxSignAPI {
  private async makeBoxSignRequest(
    method: string,
    endpoint: string,
    data?: any,
    retryCount: number = 0
  ): Promise<any> {
    const accessToken = await getAppAuthAccessToken()

    const response = await fetch(`https://api.box.com/2.0/sign_requests${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Box Sign API Error (${method} ${endpoint}):`, {
        status: response.status,
        statusText: response.statusText,
        responseText: errorText,
        requestData: data,
        retryCount
      })

      // レート制限エラーの場合はリトライ
      if (response.status === 429 && retryCount < 3) {
        const retryAfter = response.headers.get('Retry-After')
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000

        console.log(`⏳ レート制限によりリトライ中... ${delay}ms後に再試行 (${retryCount + 1}/3)`)
        await new Promise(resolve => setTimeout(resolve, delay))

        return this.makeBoxSignRequest(method, endpoint, data, retryCount + 1)
      }

      throw new Error(`Box Sign API failed: ${response.status} - ${errorText}`)
    }

    // レスポンスボディが空の場合はnullを返す（例：204 No Content）
    const contentLength = response.headers.get('content-length')
    if (contentLength === '0' || response.status === 204) {
      return null
    }

    // Content-Typeをチェックしてテキストとして処理すべきかどうかを確認
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      // 空のテキストまたは空白のみの場合はnullを返す
      if (!text || text.trim() === '') {
        return null
      }
      // JSONではないレスポンスの場合はテキストをそのまま返す
      return text
    }

    return response.json()
  }

  // ファイルの存在と権限を確認
  async verifyFileExists(fileId: string): Promise<void> {
    try {
      const accessToken = await getAppAuthAccessToken()

      const response = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`ファイル ${fileId} が見つかりません`)
        } else if (response.status === 403) {
          throw new Error(`ファイル ${fileId} へのアクセス権限がありません`)
        } else {
          throw new Error(`ファイル情報の取得に失敗しました: ${response.status}`)
        }
      }

      const fileInfo = await response.json()
      console.log('✅ ファイル存在確認成功:', {
        id: fileInfo.id,
        name: fileInfo.name,
        size: fileInfo.size
      })

    } catch (error: any) {
      console.error('❌ ファイル存在確認失敗:', error.message)
      throw error
    }
  }

  // Box Sign用の専用フォルダを作成または取得（キャッシュ付き）
  private static signFolderCache: { id: string; timestamp: number } | null = null
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5分

  async ensureSignFolder(): Promise<string> {
    // キャッシュが有効であればそれを使用
    if (BoxSignAPI.signFolderCache &&
        Date.now() - BoxSignAPI.signFolderCache.timestamp < BoxSignAPI.CACHE_TTL) {
      console.log('✅ キャッシュからSignフォルダIDを取得:', BoxSignAPI.signFolderCache.id)
      return BoxSignAPI.signFolderCache.id
    }

    try {
      const accessToken = await getAppAuthAccessToken()

      // まず、ルートフォルダ内でSignフォルダを検索
      const rootFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'
      const searchResponse = await fetch(`https://api.box.com/2.0/folders/${rootFolderId}/items?limit=100`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (searchResponse.ok) {
        const items = await searchResponse.json()
        const signFolder = items.entries?.find((item: any) =>
          item.type === 'folder' &&
          (item.name === 'Box Sign Documents' || item.name === 'Sign' || item.name.includes('署名'))
        )

        if (signFolder) {
          console.log('✅ 既存のSignフォルダを発見:', signFolder.id)
          // キャッシュに保存
          BoxSignAPI.signFolderCache = {
            id: signFolder.id,
            timestamp: Date.now()
          }
          return signFolder.id
        }
      }

      // Signフォルダが存在しない場合は作成
      const createFolderResponse = await fetch('https://api.box.com/2.0/folders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Box Sign Documents',
          parent: {
            id: rootFolderId
          }
        })
      })

      if (!createFolderResponse.ok) {
        const errorText = await createFolderResponse.text()
        console.error('❌ Signフォルダ作成失敗:', errorText)

        // 409 (conflict) の場合は再度検索を試行
        if (createFolderResponse.status === 409) {
          const retrySearchResponse = await fetch(`https://api.box.com/2.0/folders/${rootFolderId}/items?limit=100`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })

          if (retrySearchResponse.ok) {
            const retryItems = await retrySearchResponse.json()
            const existingFolder = retryItems.entries?.find((item: any) =>
              item.type === 'folder' && item.name === 'Box Sign Documents'
            )

            if (existingFolder) {
              console.log('✅ 競合後に既存フォルダを発見:', existingFolder.id)
              BoxSignAPI.signFolderCache = {
                id: existingFolder.id,
                timestamp: Date.now()
              }
              return existingFolder.id
            }
          }
        }

        // フォールバックとしてルートフォルダを使用
        console.warn('⚠️ Signフォルダ作成に失敗、ルートフォルダを使用します')
        return rootFolderId
      }

      const newFolder = await createFolderResponse.json()
      console.log('✅ 新しいSignフォルダを作成:', newFolder.id)

      // キャッシュに保存
      BoxSignAPI.signFolderCache = {
        id: newFolder.id,
        timestamp: Date.now()
      }

      return newFolder.id

    } catch (error: any) {
      console.error('❌ Signフォルダの作成/取得に失敗:', error)
      // フォールバックとしてルートフォルダを使用
      return process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'
    }
  }

  async createSignatureRequest(options: SignatureRequestOptions): Promise<SignatureRequestResponse> {
    try {
      // ファイルの存在確認
      if (options.boxFileId) {
        await this.verifyFileExists(options.boxFileId)
      }

      // 親フォルダIDを決定（指定がある場合はそれを使用、なければデフォルトフォルダ）
      const parentFolderId = options.parentFolderId || await this.ensureSignFolder()

      console.log('📁 署名済みドキュメント保存先フォルダ:', {
        folderId: parentFolderId,
        isCustomFolder: !!options.parentFolderId
      })

      // Box Sign API リクエスト構築
      const signRequestData = {
        source_files: options.boxFileId ? [{
          type: 'file',
          id: options.boxFileId
        }] : undefined,
        parent_folder: {
          type: 'folder',
          id: parentFolderId
        },
        name: options.documentName,
        signers: options.signers.map((signer, index) => ({
          email: signer.email,
          role: 'signer',
          order: signer.order || index + 1,
          redirect_url: options.redirectUrl,
          decline_redirect_url: options.declineRedirectUrl
        })),
        is_document_preparation_needed: options.isDocumentPreparationNeeded || false,
        days_valid: options.daysUntilExpiration || 30
      }

      if (options.message) {
        // Box Sign APIでmessageプロパティが利用可能かチェック
        (signRequestData as any).message = options.message
      }

      console.log('🔄 Box Sign リクエスト作成中...', {
        name: options.documentName,
        signers: options.signers.length,
        boxFileId: options.boxFileId,
        parentFolderId: parentFolderId,
        fullRequestData: signRequestData
      })

      const response = await this.makeBoxSignRequest('POST', '', signRequestData)

      console.log('✅ Box Sign リクエスト作成成功:', {
        id: response.id,
        status: response.status,
        fullResponse: response
      })

      // 署名URLを取得
      const signingUrls = response.signers?.map((signer: any) => ({
        email: signer.email,
        url: signer.embed_url || signer.redirect_url
      })) || []

      return {
        success: true,
        signRequestId: response.id,
        prepareUrl: response.prepare_url,
        signingUrls
      }

    } catch (error: any) {
      console.error('❌ Box Sign リクエスト作成失敗:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getSignatureStatus(signRequestId: string): Promise<SignatureStatus | null> {
    try {
      const response = await this.makeBoxSignRequest('GET', `/${signRequestId}`)

      console.log('📊 Box Sign ステータス詳細:', {
        id: response.id,
        status: response.status,
        sourceFiles: response.source_files,
        signFiles: response.sign_files,
        signers: response.signers,
        fullResponse: response
      })

      return {
        id: response.id,
        status: response.status,
        signers: response.signers || [],
        sourceFiles: response.source_files || [],
        signFiles: response.sign_files,
        createdAt: response.created_at,
        completedAt: response.completed_at,
        expiresAt: response.expires_at
      }
    } catch (error: any) {
      console.error('❌ Box Sign ステータス取得失敗:', error)
      return null
    }
  }

  // デバッグ用：詳細なBox Sign情報を取得
  async getDetailedSignatureInfo(signRequestId: string): Promise<any> {
    try {
      console.log('🔍 Box Sign 詳細情報取得開始:', signRequestId)
      const response = await this.makeBoxSignRequest('GET', `/${signRequestId}`)

      console.log('📋 Box Sign 完全レスポンス:', JSON.stringify(response, null, 2))

      return response
    } catch (error: any) {
      console.error('❌ Box Sign 詳細情報取得失敗:', error)
      throw error
    }
  }

  async cancelSignatureRequest(signRequestId: string): Promise<boolean> {
    try {
      await this.makeBoxSignRequest('POST', `/${signRequestId}/cancel`)
      console.log('✅ Box Sign リクエストキャンセル成功:', signRequestId)
      return true
    } catch (error: any) {
      console.error('❌ Box Sign リクエストキャンセル失敗:', error)
      return false
    }
  }

  async resendSignatureRequest(signRequestId: string): Promise<boolean> {
    try {
      // Box Sign APIにはresendエンドポイントがないため、
      // 代わりに署名リクエストのステータスを取得して、
      // 未署名の署名者を確認し、新しいリマインダーを送信します
      const status = await this.getSignatureStatus(signRequestId)

      if (!status) {
        throw new Error('署名リクエストが見つかりません')
      }

      // 未署名の署名者を確認
      const unsignedSigners = status.signers.filter(signer => !signer.hasSigned)

      if (unsignedSigners.length === 0) {
        console.log('ℹ️ 全ての署名者が既に署名済みです')
        return true
      }

      console.log(`📧 ${unsignedSigners.length}名の署名者にリマインダーを送信します`)

      // Box Sign APIにはPOST /sign_requests/{id}/resendがないため、
      // 実際にはBox Sign UIから手動で再送信する必要があります
      // ここでは、署名リクエストが有効であることを確認するだけです

      console.log('✅ 署名リクエストは有効です（再送信はBox Sign UIから手動で行ってください）:', signRequestId)
      return true
    } catch (error: any) {
      console.error('❌ Box Sign リクエスト再送信失敗:', error)
      return false
    }
  }

  // 署名完了したドキュメントをダウンロード
  async downloadSignedDocument(signRequestId: string): Promise<Buffer | null> {
    try {
      const status = await this.getSignatureStatus(signRequestId)

      if (!status?.signFiles?.files?.[0]) {
        throw new Error('署名完了ドキュメントが見つかりません')
      }

      const signedFileId = status.signFiles.files[0].id
      const accessToken = await getAppAuthAccessToken()

      const response = await fetch(`https://api.box.com/2.0/files/${signedFileId}/content`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error: any) {
      console.error('❌ 署名完了ドキュメントダウンロード失敗:', error)
      return null
    }
  }

  // Webhook管理機能

  /**
   * Box Sign Webhookを作成
   * @param webhookUrl Webhook受信URL
   * @param triggers イベントトリガーのリスト（例: ['SIGN_REQUEST.COMPLETED']）
   * @returns Webhook情報
   */
  async createWebhook(webhookUrl: string, triggers: string[]): Promise<any> {
    try {
      const accessToken = await getAppAuthAccessToken()

      const webhookData = {
        target: {
          type: 'sign-request'
        },
        address: webhookUrl,
        triggers: triggers
      }

      console.log('🔄 Box Webhook作成中...', webhookData)

      const response = await fetch('https://api.box.com/2.0/webhooks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Webhook作成失敗:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Webhook creation failed: ${response.status} - ${errorText}`)
      }

      const webhook = await response.json()
      console.log('✅ Box Webhook作成成功:', webhook)

      return webhook
    } catch (error: any) {
      console.error('❌ Box Webhook作成エラー:', error)
      throw error
    }
  }

  /**
   * すべてのWebhookを取得
   * @returns Webhook一覧
   */
  async listWebhooks(): Promise<any[]> {
    try {
      const accessToken = await getAppAuthAccessToken()

      const response = await fetch('https://api.box.com/2.0/webhooks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Webhook一覧取得失敗:', errorText)
        throw new Error(`Failed to list webhooks: ${response.status}`)
      }

      const result = await response.json()
      console.log('📋 Webhook一覧:', result)

      return result.entries || []
    } catch (error: any) {
      console.error('❌ Webhook一覧取得エラー:', error)
      throw error
    }
  }

  /**
   * Webhookを削除
   * @param webhookId WebhookのID
   * @returns 削除成功かどうか
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      const accessToken = await getAppAuthAccessToken()

      const response = await fetch(`https://api.box.com/2.0/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Webhook削除失敗:', errorText)
        throw new Error(`Failed to delete webhook: ${response.status}`)
      }

      console.log('✅ Webhook削除成功:', webhookId)
      return true
    } catch (error: any) {
      console.error('❌ Webhook削除エラー:', error)
      return false
    }
  }

  /**
   * Box Sign Webhookを検索（URLで検索）
   * @param webhookUrl 検索するWebhook URL
   * @returns 見つかったWebhook、なければnull
   */
  async findWebhookByUrl(webhookUrl: string): Promise<any | null> {
    try {
      const webhooks = await this.listWebhooks()
      const found = webhooks.find((webhook: any) => webhook.address === webhookUrl)
      return found || null
    } catch (error: any) {
      console.error('❌ Webhook検索エラー:', error)
      return null
    }
  }
}

// Box Sign機能の有効/無効を制御する環境変数
// 注文請書署名機能のためにBox Sign機能を有効化
const isBoxSignEnabled = process.env.BOX_SIGN_ENABLED !== 'false'

export const boxSignAPI = isBoxSignEnabled ? new BoxSignAPI() : {
  createSignatureRequest: async () => ({
    success: false,
    error: 'Box Sign機能は現在無効化されています。管理者にお問い合わせください。'
  }),
  getSignatureStatus: async () => null,
  getDetailedSignatureInfo: async () => null,
  cancelSignatureRequest: async () => false,
  resendSignatureRequest: async () => false,
  downloadSignedDocument: async () => null
}

// ヘルパー関数
export function createProjectSigners(
  contractorEmail: string,
  clientEmail: string,
  contractorName?: string,
  clientName?: string
): SignerInfo[] {
  return [
    {
      email: contractorEmail,
      role: 'contractor',
      name: contractorName,
      order: 1
    },
    {
      email: clientEmail,
      role: 'client',
      name: clientName,
      order: 2
    }
  ]
}

export function createMonthlyInvoiceSigners(
  contractorEmail: string,
  contractorName?: string
): SignerInfo[] {
  const operatorEmail = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0] || 'admin@caddon.jp'

  return [
    {
      email: contractorEmail,
      role: 'contractor',
      name: contractorName,
      order: 1
    },
    {
      email: operatorEmail,
      role: 'operator',
      name: '運営管理者',
      order: 2
    }
  ]
}