// メールアドレス検証ユーティリティ

export interface EmailValidationResult {
  isValid: boolean
  error?: string
  suggestions?: string[]
}

// 基本的なメール形式チェック
export function validateEmailFormat(email: string): EmailValidationResult {
  if (!email) {
    return { isValid: false, error: 'メールアドレスを入力してください' }
  }

  // 基本的な正規表現チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'メールアドレスの形式が正しくありません' }
  }

  // より詳細な検証
  const parts = email.split('@')
  if (parts.length !== 2) {
    return { isValid: false, error: 'メールアドレスの形式が正しくありません' }
  }

  const [localPart, domainPart] = parts

  // ローカル部の検証
  if (localPart.length === 0 || localPart.length > 64) {
    return { isValid: false, error: 'メールアドレスのユーザー名部分が無効です' }
  }

  // ドメイン部の検証
  if (domainPart.length === 0 || domainPart.length > 253) {
    return { isValid: false, error: 'メールアドレスのドメイン部分が無効です' }
  }

  // ドメインの基本チェック
  if (!domainPart.includes('.')) {
    return { isValid: false, error: 'ドメインにピリオドが含まれていません' }
  }

  const domainParts = domainPart.split('.')
  if (domainParts.some(part => part.length === 0)) {
    return { isValid: false, error: 'ドメインの形式が正しくありません' }
  }

  // 一般的なドメインの typo をチェック
  const suggestions = getSuggestions(email)
  if (suggestions.length > 0) {
    return {
      isValid: true,
      suggestions
    }
  }

  return { isValid: true }
}

// 一般的なドメインの typo を検出し、修正候補を提案
function getSuggestions(email: string): string[] {
  const [localPart, domainPart] = email.split('@')
  const suggestions: string[] = []

  const commonDomains = [
    'gmail.com',
    'yahoo.co.jp',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'docomo.ne.jp',
    'au.com',
    'softbank.ne.jp',
    'nifty.com',
    'biglobe.ne.jp'
  ]

  const similarDomains: { [key: string]: string[] } = {
    'gmial.com': ['gmail.com'],
    'gmai.com': ['gmail.com'],
    'gmail.co': ['gmail.com'],
    'yahooo.co.jp': ['yahoo.co.jp'],
    'yahoo.com': ['yahoo.co.jp'],
    'hotmial.com': ['hotmail.com'],
    'hotmai.com': ['hotmail.com'],
    'outlok.com': ['outlook.com'],
    'outlooks.com': ['outlook.com']
  }

  // 完全一致での typo チェック
  if (similarDomains[domainPart]) {
    similarDomains[domainPart].forEach(suggestion => {
      suggestions.push(`${localPart}@${suggestion}`)
    })
  }

  // レーベンシュタイン距離による類似性チェック（簡易版）
  commonDomains.forEach(commonDomain => {
    if (getLevenshteinDistance(domainPart, commonDomain) <= 2 && domainPart !== commonDomain) {
      suggestions.push(`${localPart}@${commonDomain}`)
    }
  })

  return suggestions.slice(0, 3) // 最大3つまで
}

// レーベンシュタイン距離を計算（簡易版）
function getLevenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  return matrix[str2.length][str1.length]
}

// 使い捨てメールアドレスかどうかをチェック（基本的なリスト）
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'tempmail.org',
    'yopmail.com',
    'throwaway.email'
  ]

  const domain = email.split('@')[1]?.toLowerCase()
  return disposableDomains.includes(domain)
}

// 企業ドメインかどうかをチェック
export function isBusinessEmail(email: string): boolean {
  const personalDomains = [
    'gmail.com',
    'yahoo.co.jp',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'me.com',
    'docomo.ne.jp',
    'au.com',
    'softbank.ne.jp'
  ]

  const domain = email.split('@')[1]?.toLowerCase()
  return !personalDomains.includes(domain)
}

// 包括的なメール検証
export function validateEmail(email: string, options?: {
  requireBusiness?: boolean
  allowDisposable?: boolean
}): EmailValidationResult {
  const formatResult = validateEmailFormat(email)
  if (!formatResult.isValid) {
    return formatResult
  }

  // 使い捨てメールチェック
  if (options?.allowDisposable === false && isDisposableEmail(email)) {
    return {
      isValid: false,
      error: '使い捨てメールアドレスは使用できません'
    }
  }

  // 企業メールチェック
  if (options?.requireBusiness && !isBusinessEmail(email)) {
    return {
      isValid: false,
      error: '企業・組織のメールアドレスを入力してください'
    }
  }

  return formatResult
}