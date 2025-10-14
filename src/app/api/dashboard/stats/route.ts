import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ [Dashboard Stats] Authorization header missing')
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ [Dashboard Stats] Auth error:', authError)
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    console.log('✅ [Dashboard Stats] User authenticated:', user.email)

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('❌ [Dashboard Stats] User profile error:', userError)
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 404 })
    }

    console.log('✅ [Dashboard Stats] User profile found:', userProfile.id)

    // ユーザーのメンバーシップを取得（2段階に分けてエラーを特定しやすくする）
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .in('role', ['OrgAdmin', 'Staff'])

    if (membershipError) {
      console.error('❌ [Dashboard Stats] Membership query error:', {
        message: membershipError.message,
        details: membershipError,
        userId: userProfile.id
      })
      return NextResponse.json({
        message: 'メンバーシップ情報の取得に失敗しました',
        error: membershipError.message,
        details: 'データベース接続を確認してください'
      }, { status: 500 })
    }

    if (!memberships || memberships.length === 0) {
      console.error('❌ [Dashboard Stats] No memberships found for user:', userProfile.id)
      return NextResponse.json({
        message: '組織が見つかりません',
        details: '発注者組織（OrgAdminまたはStaffロール）に所属している必要があります。管理者に組織への追加を依頼してください。'
      }, { status: 404 })
    }

    console.log('✅ [Dashboard Stats] Memberships found:', memberships.length)

    // 組織情報を個別に取得
    const orgId = memberships[0].org_id
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, billing_email, active')
      .eq('id', orgId)
      .single()

    if (orgError || !organization) {
      console.error('❌ [Dashboard Stats] Organization query error:', {
        error: orgError,
        orgId: orgId
      })
      return NextResponse.json({
        message: '組織情報の取得に失敗しました',
        error: orgError?.message || '組織が存在しません',
        orgId: orgId
      }, { status: 500 })
    }

    console.log('✅ [Dashboard Stats] Organization found:', organization.name)

    // 並列でデータを取得
    const [
      projectsResult,
      contractsResult,
      pendingApprovalsResult,
      notificationsResult
    ] = await Promise.all([
      // プロジェクト情報を取得
      supabaseAdmin
        .from('projects')
        .select(`
          id,
          title,
          description,
          status,
          budget,
          start_date,
          end_date,
          deadline,
          created_at,
          created_by,
          contractor_id,
          box_folder_id
        `)
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),

      // 契約情報を取得
      supabaseAdmin
        .from('contracts')
        .select(`
          id,
          project_id,
          contractor_id,
          status,
          contract_amount,
          created_at,
          org_signed_at,
          contractor_signed_at
        `)
        .eq('org_id', orgId),

      // 承認待ちプロジェクトを取得
      supabaseAdmin
        .from('projects')
        .select(`
          id,
          title,
          budget,
          deadline,
          created_at,
          created_by,
          approver_ids
        `)
        .eq('org_id', orgId)
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false }),

      // 未読通知を取得
      supabaseAdmin
        .from('notifications')
        .select('id, type, title, message, created_at, read')
        .eq('user_id', userProfile.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    // データ取得結果のエラーチェック
    if (projectsResult.error) {
      console.error('❌ [Dashboard Stats] Projects query error:', projectsResult.error)
    }
    if (contractsResult.error) {
      console.error('❌ [Dashboard Stats] Contracts query error:', contractsResult.error)
    }
    if (pendingApprovalsResult.error) {
      console.error('❌ [Dashboard Stats] Pending approvals query error:', pendingApprovalsResult.error)
    }
    if (notificationsResult.error) {
      console.error('❌ [Dashboard Stats] Notifications query error:', notificationsResult.error)
    }

    const projects = projectsResult.data || []
    const contracts = contractsResult.data || []
    const pendingApprovals = pendingApprovalsResult.data || []
    const notifications = notificationsResult.data || []

    console.log('✅ [Dashboard Stats] Data fetched:', {
      projects: projects.length,
      contracts: contracts.length,
      pendingApprovals: pendingApprovals.length,
      notifications: notifications.length
    })

    // プロジェクト統計を計算
    const projectStats = {
      total: projects.length,
      pending_approval: projects.filter(p => p.status === 'pending_approval').length,
      bidding: projects.filter(p => p.status === 'bidding').length,
      in_progress: projects.filter(p => p.status === 'in_progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      rejected: projects.filter(p => p.status === 'rejected').length
    }

    // 契約統計を計算
    const contractStats = {
      total: contracts.length,
      signed: contracts.filter(c => c.status === 'signed').length,
      pending: contracts.filter(c => c.status === 'pending').length,
      totalAmount: contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0)
    }

    // 最近のプロジェクト（上位5件）
    const recentProjects = projects.slice(0, 5).map(project => ({
      id: project.id,
      title: project.title,
      status: project.status,
      budget: project.budget,
      deadline: project.deadline,
      created_at: project.created_at
    }))

    // 承認待ちプロジェクト（承認者にユーザーが含まれている場合のみ）
    const myPendingApprovals = pendingApprovals.filter(project =>
      project.approver_ids &&
      Array.isArray(project.approver_ids) &&
      project.approver_ids.includes(userProfile.id)
    ).slice(0, 5)

    // 最近のアクティビティ（プロジェクト作成、契約締結など）
    const recentActivities: any[] = []

    // プロジェクト作成アクティビティ
    projects.slice(0, 3).forEach(project => {
      recentActivities.push({
        type: 'project_created',
        title: '新規案件が登録されました',
        description: project.title,
        timestamp: project.created_at,
        projectId: project.id
      })
    })

    // 契約締結アクティビティ
    contracts
      .filter(c => c.org_signed_at || c.contractor_signed_at)
      .sort((a, b) => {
        const aTime = a.org_signed_at || a.contractor_signed_at
        const bTime = b.org_signed_at || b.contractor_signed_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
      .slice(0, 3)
      .forEach(contract => {
        recentActivities.push({
          type: 'contract_signed',
          title: '契約が締結されました',
          description: `契約ID: ${contract.id}`,
          timestamp: contract.org_signed_at || contract.contractor_signed_at,
          contractId: contract.id
        })
      })

    // タイムスタンプでソート
    recentActivities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        billing_email: organization.billing_email,
        active: organization.active
      },
      stats: {
        projects: projectStats,
        contracts: contractStats
      },
      recentProjects,
      pendingApprovals: myPendingApprovals,
      notifications,
      recentActivities: recentActivities.slice(0, 10)
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ ダッシュボード統計取得エラー:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json({
      message: 'ダッシュボード統計の取得に失敗しました',
      error: error.message,
      errorType: error.name,
      details: '予期しないエラーが発生しました。サーバーログを確認してください。'
    }, { status: 500 })
  }
}
