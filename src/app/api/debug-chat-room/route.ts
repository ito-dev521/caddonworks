import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectTitle = searchParams.get('title')

    if (!projectTitle) {
      return NextResponse.json({ message: 'project title required' }, { status: 400 })
    }

    // 1. プロジェクトを検索
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('*')
      .ilike('title', `%${projectTitle}%`)

    console.log('🔍 Projects found:', projects)

    if (!projects || projects.length === 0) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 })
    }

    const project = projects[0]

    // 2. 契約情報を取得
    const { data: contracts } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('project_id', project.id)

    console.log('📄 Contracts:', contracts)

    // 3. チャットルームを検索
    const { data: chatRooms } = await supabaseAdmin
      .from('chat_rooms')
      .select('*')
      .eq('project_id', project.id)

    console.log('💬 Chat rooms:', chatRooms)

    // 4. チャット参加者を取得
    let participants = []
    if (chatRooms && chatRooms.length > 0) {
      const { data: chatParticipants } = await supabaseAdmin
        .from('chat_participants')
        .select(`
          *,
          users:user_id (
            email,
            display_name
          )
        `)
        .eq('room_id', chatRooms[0].id)

      participants = chatParticipants || []
      console.log('👥 Chat participants:', participants)
    }

    // 5. 受注者情報を取得
    let contractor = null
    if (contracts && contracts.length > 0 && contracts[0].contractor_id) {
      const { data: contractorData } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', contracts[0].contractor_id)
        .single()

      contractor = contractorData
      console.log('👤 Contractor:', contractor)
    }

    // 6. 運営者を取得
    const { data: operators } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_user_id,
        email,
        display_name,
        memberships!inner (
          role
        )
      `)
      .in('memberships.role', ['Admin', 'Reviewer', 'Auditor'])

    console.log('🔧 Operators:', operators)

    return NextResponse.json({
      project,
      contracts,
      chatRooms,
      participants,
      contractor,
      operators,
      analysis: {
        hasProject: !!project,
        hasContract: contracts && contracts.length > 0,
        hasChatRoom: chatRooms && chatRooms.length > 0,
        participantCount: participants.length,
        contractorInChat: contractor ? participants.some((p: any) => p.user_id === contractor.auth_user_id) : false,
        operatorsInChat: operators ? operators.map((op: any) => ({
          email: op.email,
          inChat: participants.some((p: any) => p.user_id === op.auth_user_id)
        })) : []
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json({
      message: 'Error',
      error: error.message
    }, { status: 500 })
  }
}
