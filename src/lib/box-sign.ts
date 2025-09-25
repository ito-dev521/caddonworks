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
    data?: any
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
      console.error(`Box Sign API Error (${method} ${endpoint}):`, errorText)
      throw new Error(`Box Sign API failed: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  async createSignatureRequest(options: SignatureRequestOptions): Promise<SignatureRequestResponse> {
    try {
      // Box Sign API リクエスト構築
      const signRequestData = {
        source_files: options.boxFileId ? [{ id: options.boxFileId }] : undefined,
        parent_folder: {
          id: process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'
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
        signRequestData.message = options.message
      }

      console.log('🔄 Box Sign リクエスト作成中...', {
        name: options.documentName,
        signers: options.signers.length
      })

      const response = await this.makeBoxSignRequest('POST', '', signRequestData)

      console.log('✅ Box Sign リクエスト作成成功:', {
        id: response.id,
        status: response.status
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
      await this.makeBoxSignRequest('POST', `/${signRequestId}/resend`)
      console.log('✅ Box Sign リクエスト再送信成功:', signRequestId)
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
}

export const boxSignAPI = new BoxSignAPI()

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