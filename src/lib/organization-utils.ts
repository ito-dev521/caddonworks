import { UserRole } from '@/contexts/auth-context'

/**
 * ユーザーの組織表示名を取得する
 * 受注者で組織名が未設定の場合は「個人事業主」を返す
 */
export function getOrganizationDisplayName(
  organization: string | null | undefined,
  userRole: UserRole | null
): string {
  if (organization && organization.trim() !== '') {
    return organization
  }

  if (userRole === 'Contractor') {
    return '個人事業主'
  }

  return '未設定'
}

/**
 * プロフィール表示用の組織名を取得する
 * 編集モードかどうかによって表示を切り替える
 */
export function getProfileOrganizationDisplay(
  organization: string | null | undefined,
  userRole: UserRole | null,
  isEditing: boolean = false
): string {
  if (isEditing) {
    // 編集モードでは実際の値を返す（空文字でも）
    return organization || ''
  }

  return getOrganizationDisplayName(organization, userRole)
}