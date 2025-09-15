/**
 * パスワード自動生成ユーティリティ
 */

export interface PasswordOptions {
  length?: number
  includeUppercase?: boolean
  includeLowercase?: boolean
  includeNumbers?: boolean
  includeSymbols?: boolean
  excludeSimilar?: boolean
}

export const defaultPasswordOptions: PasswordOptions = {
  length: 12,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeSimilar: true
}

/**
 * セキュアなパスワードを生成する
 */
export function generatePassword(options: PasswordOptions = {}): string {
  const opts = { ...defaultPasswordOptions, ...options }
  
  let charset = ''
  
  // 大文字
  if (opts.includeUppercase) {
    charset += opts.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  }
  
  // 小文字
  if (opts.includeLowercase) {
    charset += opts.excludeSimilar ? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
  }
  
  // 数字
  if (opts.includeNumbers) {
    charset += opts.excludeSimilar ? '23456789' : '0123456789'
  }
  
  // 記号
  if (opts.includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  }
  
  if (charset === '') {
    throw new Error('少なくとも1つの文字セットを選択してください')
  }
  
  let password = ''
  const array = new Uint8Array(opts.length || 12)
  crypto.getRandomValues(array)
  
  for (let i = 0; i < (opts.length || 12); i++) {
    password += charset[array[i] % charset.length]
  }
  
  return password
}

/**
 * パスワードの強度を評価する
 */
export function evaluatePasswordStrength(password: string): {
  score: number
  feedback: string[]
  strength: 'weak' | 'medium' | 'strong' | 'very-strong'
} {
  const feedback: string[] = []
  let score = 0
  
  // 長さチェック
  if (password.length >= 8) score += 1
  else feedback.push('8文字以上にしてください')
  
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  
  // 文字種チェック
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('小文字を含めてください')
  
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('大文字を含めてください')
  
  if (/[0-9]/.test(password)) score += 1
  else feedback.push('数字を含めてください')
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('記号を含めてください')
  
  // 連続文字チェック
  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    feedback.push('同じ文字の連続を避けてください')
  }
  
  // 一般的なパターンチェック
  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    score -= 1
    feedback.push('連続する文字を避けてください')
  }
  
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong'
  if (score <= 2) strength = 'weak'
  else if (score <= 4) strength = 'medium'
  else if (score <= 6) strength = 'strong'
  else strength = 'very-strong'
  
  return { score, feedback, strength }
}

/**
 * パスワード強度の色を取得
 */
export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'weak': return 'text-red-500'
    case 'medium': return 'text-yellow-500'
    case 'strong': return 'text-blue-500'
    case 'very-strong': return 'text-green-500'
    default: return 'text-gray-500'
  }
}

/**
 * パスワード強度のラベルを取得
 */
export function getPasswordStrengthLabel(strength: string): string {
  switch (strength) {
    case 'weak': return '弱い'
    case 'medium': return '普通'
    case 'strong': return '強い'
    case 'very-strong': return '非常に強い'
    default: return '不明'
  }
}
