import { supabase } from '@/lib/supabase'

export interface OrganizationStatus {
  id: string
  name: string
  active: boolean
  approval_status: 'pending' | 'approved' | 'rejected'
}

/**
 * 組織の稼働状態をチェックする
 */
export async function checkOrganizationStatus(orgId: string): Promise<OrganizationStatus | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, active, approval_status')
      .eq('id', orgId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch organization status:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error checking organization status:', error)
    return null
  }
}

/**
 * ユーザーの組織が稼働中かチェックする
 */
export async function isUserOrganizationActive(userId: string): Promise<boolean> {
  try {
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        org_id,
        organizations!inner(active, approval_status)
      `)
      .eq('user_id', userId)

    if (error || !memberships || memberships.length === 0) {
      return true // メンバーシップがない場合は制限しない
    }

    // すべての組織が停止または未承認の場合はfalse
    return memberships.some((membership: any) =>
      membership.organizations.active &&
      membership.organizations.approval_status === 'approved'
    )
  } catch (error) {
    console.error('Error checking user organization status:', error)
    return true // エラー時は制限しない
  }
}

/**
 * 組織が停止中または未承認の理由メッセージを取得
 */
export function getOrganizationStatusMessage(status: OrganizationStatus): string {
  if (!status.active) {
    return 'ご利用の組織は現在停止中です。詳細については管理者にお問い合わせください。'
  }

  if (status.approval_status === 'pending') {
    return 'ご利用の組織は承認待ちです。承認されるまでしばらくお待ちください。'
  }

  if (status.approval_status === 'rejected') {
    return 'ご利用の組織は承認が却下されています。詳細については管理者にお問い合わせください。'
  }

  return '組織の利用が制限されています。'
}