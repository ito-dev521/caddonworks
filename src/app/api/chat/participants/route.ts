import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('room_id')
    const projectIdParam = searchParams.get('project_id')

    // room_id または project_id のいずれかが必要
    if (!roomId && !projectIdParam) {
      return NextResponse.json(
        { message: 'room_id または project_id が必要です' },
        { status: 400 }
      )
    }

    // ユーザーの認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // チャットルームとプロジェクトIDを取得
    let chatRoom = null
    let projectId = projectIdParam

    if (roomId) {
      const { data, error: chatRoomError } = await supabaseAdmin
        .from('chat_rooms')
        .select('id, project_id')
        .eq('id', roomId)
        .single()

      if (chatRoomError || !data) {
        return NextResponse.json(
          { message: 'チャットルームが見つかりません' },
          { status: 404 }
        )
      }

      chatRoom = data
      projectId = data.project_id
    } else if (projectId) {
      // project_id から room_id を取得
      const { data } = await supabaseAdmin
        .from('chat_rooms')
        .select('id, project_id')
        .eq('project_id', projectId)
        .single()

      chatRoom = data || null
    }

    if (!projectId) {
      return NextResponse.json(
        { message: 'プロジェクトIDが取得できません' },
        { status: 400 }
      )
    }

    // プロジェクトの存在確認（created_byカラムが存在しない場合に備えて段階的に取得）
    let project, projectError
    
    try {
      // まず created_by / support_enabled を含めて取得を試行
      const result = await supabaseAdmin
        .from('projects')
        .select('id, title, org_id, contractor_id, created_by, support_enabled')
        .eq('id', projectId)
        .single()
      
      project = result.data
      projectError = result.error
    } catch (error) {
      
      // created_by / support_enabled が存在しない場合の代替取得
      const result = await supabaseAdmin
        .from('projects')
        .select('id, title, org_id, contractor_id')
        .eq('id', projectId)
        .single()
      
      project = result.data
      projectError = result.error
      
      // created_byがない場合はnullを設定
      if (project) {
        (project as any).created_by = null
      }
    }

    if (projectError || !project) {
      return NextResponse.json(
        { 
          message: 'プロジェクトが見つかりません',
          debug: {
            projectId,
            error: projectError?.message,
            details: projectError?.details
          }
        },
        { status: 404 }
      )
    }
    

    // アクセス権限をチェック
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    // 複数受注者対応：プロジェクト参加者としてのアクセス権限をチェック
    const { data: projectParticipant } = await supabaseAdmin
      .from('project_participants')
      .select('id, role, status')
      .eq('project_id', projectId)
      .eq('user_id', userProfile.id)
      .single()

    // 運営者（Admin, Reviewer, Auditor）かチェック
    const isOperator = membership && ['Admin', 'Reviewer', 'Auditor'].includes(membership.role)

    const hasAccess = membership?.org_id === project.org_id ||
                     project.contractor_id === userProfile.id ||
                     (projectParticipant && projectParticipant.status === 'active') ||
                     isOperator

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'このプロジェクトへのアクセス権限がありません' },
        { status: 403 }
      )
    }

    // プロジェクトの基本参加者を取得（作成者・担当者・受注者・サポート）
    const basicParticipants: any[] = []
    

    // 1. プロジェクト作成者を追加
    if ((project as any).created_by) {
      
      const { data: creator } = await supabaseAdmin
        .from('users')
        .select(`
          id, 
          display_name, 
          email, 
          avatar_url,
          memberships!inner (
            org_id,
            role
          )
        `)
        .eq('id', (project as any).created_by)
        .eq('memberships.org_id', project.org_id)
        .single()

      if (creator) {
        basicParticipants.push({
          id: creator.id,
          display_name: creator.display_name || creator.email,
          email: creator.email,
          avatar_url: creator.avatar_url,
          role: creator.memberships[0]?.role || 'Member',
          joined_at: new Date().toISOString(),
          is_basic: true
        })
      } else {
      }
    } else {
      
      // created_byがない場合は、組織の管理者を代替として追加
      const { data: orgAdmin } = await supabaseAdmin
        .from('users')
        .select(`
          id, 
          display_name, 
          email, 
          avatar_url,
          memberships!inner (
            org_id,
            role
          )
        `)
        .eq('memberships.org_id', project.org_id)
        .eq('memberships.role', 'OrgAdmin')
        .limit(1)
        .single()

      if (orgAdmin) {
        basicParticipants.push({
          id: orgAdmin.id,
          display_name: orgAdmin.display_name || orgAdmin.email,
          email: orgAdmin.email,
          avatar_url: orgAdmin.avatar_url,
          role: orgAdmin.memberships[0]?.role || 'OrgAdmin',
          joined_at: new Date().toISOString(),
          is_basic: true
        })
      } else {
      }
    }

    // 2. 受注者を追加
    if (project.contractor_id) {
      const { data: contractor } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email, avatar_url')
        .eq('id', project.contractor_id)
        .single()

      if (contractor) {
        basicParticipants.push({
          id: contractor.id,
          display_name: contractor.display_name || contractor.email,
          email: contractor.email,
          avatar_url: contractor.avatar_url,
          role: 'Contractor',
          joined_at: new Date().toISOString(),
          is_basic: true
        })
      }
    }

    // 3. プロジェクト参加者（複数受注者対応）を追加
    const { data: projectParticipants } = await supabaseAdmin
      .from('project_participants')
      .select(`
        user_id,
        role,
        status,
        users!inner (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'active')

    if (projectParticipants) {
      projectParticipants.forEach((pp: any) => {
        // 既に追加されていない場合のみ追加
        if (!basicParticipants.some(bp => bp.id === pp.users.id)) {
          basicParticipants.push({
            id: pp.users.id,
            display_name: pp.users.display_name || pp.users.email,
            email: pp.users.email,
            avatar_url: pp.users.avatar_url,
            role: 'Contractor',
            joined_at: new Date().toISOString(),
            is_basic: true
          })
        }
      })
    }

    // 4. 組織の担当者を追加（assignee_name が設定されている場合）
    const { data: projectDetail } = await supabaseAdmin
      .from('projects')
      .select('assignee_name')
      .eq('id', projectId)
      .single()

    if (projectDetail?.assignee_name) {
      // assignee_name から該当するユーザーを検索
      const { data: assignee } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          display_name,
          email,
          avatar_url,
          memberships!inner (
            org_id,
            role
          )
        `)
        .eq('display_name', projectDetail.assignee_name)
        .eq('memberships.org_id', project.org_id)
        .single()

      if (assignee && !basicParticipants.some(bp => bp.id === assignee.id)) {
        basicParticipants.push({
          id: assignee.id,
          display_name: assignee.display_name || assignee.email,
          email: assignee.email,
          avatar_url: assignee.avatar_url,
          role: assignee.memberships[0]?.role || 'Member',
          joined_at: new Date().toISOString(),
          is_basic: true
        })
      }
    }

    // 5. 運営サポートを追加（仕様：運営が作成するサポートメンバー）
    //    - 条件: project.support_enabled=true または contract.support_enabled=true
    //    - サポートメンバーの抽出: memberships.role IN ('Reviewer','Staff') のユーザー
    let supportNeeded = false
    try {
      supportNeeded = !!(project as any).support_enabled
    } catch (_) {
      supportNeeded = false
    }

    if (!supportNeeded) {
      // 契約側のフラグも確認
      const { data: latestContract } = await supabaseAdmin
        .from('contracts')
        .select('id, support_enabled')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      supportNeeded = !!latestContract?.support_enabled
    }

    if (supportNeeded) {
      const { data: supportMembers } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          display_name,
          email,
          avatar_url,
          memberships!inner ( role )
        `)
        .in('memberships.role', ['Admin', 'Reviewer', 'Auditor'])

      if (supportMembers && supportMembers.length > 0) {
        supportMembers.forEach((u: any) => {
          if (!basicParticipants.some(bp => bp.id === u.id)) {
            basicParticipants.push({
              id: u.id,
              display_name: u.display_name || u.email,
              email: u.email,
              avatar_url: u.avatar_url,
              role: u.memberships?.[0]?.role || 'Staff',
              joined_at: new Date().toISOString(),
              is_basic: true
            })
          }
        })
      }
    }

    // 招待された参加者を取得
    let invitedParticipants: any[] = []
    if (chatRoom) {
      // chat_participants.user_id は auth.users.id を参照しているため、
      // users テーブルの auth_user_id で結合する必要がある
      const { data: chatParticipants, error: chatParticipantsError } = await supabaseAdmin
        .from('chat_participants')
        .select('user_id, role, joined_at, is_active')
        .eq('room_id', chatRoom.id)
        .eq('is_active', true)

      if (!chatParticipantsError && chatParticipants && chatParticipants.length > 0) {
        // auth.users.id のリストを取得
        const authUserIds = chatParticipants.map((cp: any) => cp.user_id)

        // auth_user_id で users テーブルを検索
        const { data: participantUsers, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id, auth_user_id, display_name, email, avatar_url')
          .in('auth_user_id', authUserIds)

        if (!usersError && participantUsers) {
          // auth_user_id をキーにしたマップを作成
          const userMap = new Map()
          participantUsers.forEach((u: any) => {
            userMap.set(u.auth_user_id, u)
          })

          // chat_participants と users を結合
          invitedParticipants = chatParticipants
            .map((cp: any) => {
              const user = userMap.get(cp.user_id)
              if (!user) return null

              // 基本参加者に既に含まれているかチェック
              if (basicParticipants.some(bp => bp.id === user.id)) {
                return null
              }

              return {
                id: user.id,
                display_name: user.display_name || user.email,
                email: user.email,
                avatar_url: user.avatar_url,
                role: cp.role === 'owner' ? 'OrgAdmin' : 'Member',
                joined_at: cp.joined_at,
                is_basic: false
              }
            })
            .filter((p: any) => p !== null)
        }
      }
    }

    // デバッグログ
    console.log('🔍 参加者デバッグ情報:', {
      projectId,
      roomId: chatRoom?.id,
      basicParticipantsCount: basicParticipants.length,
      invitedParticipantsCount: invitedParticipants.length,
      basicParticipants: basicParticipants.map(p => ({ id: p.id, email: p.email, role: p.role })),
      invitedParticipants: invitedParticipants.map(p => ({ id: p.id, email: p.email, role: p.role })),
      supportNeeded
    })

    // 基本参加者と招待参加者を結合
    const allParticipants = [...basicParticipants, ...invitedParticipants]

    console.log('✅ 最終参加者リスト:', allParticipants.map(p => ({ id: p.id, email: p.email, role: p.role })))

    // 組織メンバーの役割情報を取得して更新
    if (allParticipants.length > 0) {
      const userIds = allParticipants.map(p => p.id)
      const { data: memberships } = await supabaseAdmin
        .from('memberships')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('org_id', project.org_id)

      const membershipMap = new Map()
      memberships?.forEach((m: any) => {
        membershipMap.set(m.user_id, m.role)
      })

      // 役割情報を更新（基本参加者の組織メンバーのみ）
      allParticipants.forEach(participant => {
        const orgRole = membershipMap.get(participant.id)
        if (orgRole && participant.role !== 'Contractor') {
          participant.role = orgRole
        }
      })
    }

    

    return NextResponse.json({
      participants: allParticipants
    }, { status: 200 })

  } catch (error) {
    console.error('チャット参加者取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}