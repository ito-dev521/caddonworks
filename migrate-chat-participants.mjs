import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function migrateChatParticipants() {
  console.log('=== Chat Participants Migration ===\n')

  try {
    // チャットルームで参加者がいないものを取得
    const { data: chatRooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        project_id,
        name,
        created_by,
        projects (
          id,
          title,
          org_id,
          created_by,
          contractor_id
        )
      `)

    if (roomsError) {
      console.error('Error fetching chat rooms:', roomsError)
      return
    }

    console.log(`Found ${chatRooms?.length || 0} chat rooms\n`)

    let added = 0
    let skipped = 0
    let errors = 0

    for (const room of chatRooms || []) {
      const project = room.projects

      if (!project) {
        console.log(`⚠️  Room ${room.name} has no project, skipping`)
        skipped++
        continue
      }

      console.log(`Processing room: ${room.name} (${room.id})`)

      // 既存の参加者を確認
      const { data: existingParticipants, error: existingError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('room_id', room.id)

      if (existingError) {
        console.error(`  ❌ Error checking existing participants:`, existingError)
        errors++
        continue
      }

      const existingUserIds = new Set(existingParticipants?.map(p => p.user_id) || [])
      console.log(`  Existing participants: ${existingUserIds.size}`)

      const chatParticipants = []

      // 1. プロジェクト作成者を追加（users.idをauth_user_idに変換）
      if (project.created_by) {
        const { data: creatorUser, error: creatorError } = await supabase
          .from('users')
          .select('id, auth_user_id')
          .eq('id', project.created_by)
          .single()

        if (!creatorError && creatorUser?.auth_user_id) {
          if (!existingUserIds.has(creatorUser.auth_user_id)) {
            chatParticipants.push({
              room_id: room.id,
              user_id: creatorUser.auth_user_id,
              role: 'admin',
              participant_type: 'owner',
              is_active: true
            })
            console.log(`  ✅ Adding project creator: ${creatorUser.auth_user_id}`)
          }
        } else {
          console.log(`  ⚠️  Could not find creator user for id: ${project.created_by}`)
        }
      }

      // 2. 組織のメンバーを追加
      const { data: orgMembers, error: orgMembersError } = await supabase
        .from('memberships')
        .select(`
          user_id,
          role,
          users (
            id,
            auth_user_id,
            email
          )
        `)
        .eq('org_id', project.org_id)

      if (!orgMembersError && orgMembers) {
        console.log(`  Found ${orgMembers.length} org members`)
        for (const member of orgMembers) {
          const authUserId = member.users?.auth_user_id
          if (authUserId && !existingUserIds.has(authUserId)) {
            // 既にchatParticipantsに追加されていないか確認
            if (!chatParticipants.find(p => p.user_id === authUserId)) {
              chatParticipants.push({
                room_id: room.id,
                user_id: authUserId,
                role: member.role === 'OrgAdmin' ? 'admin' : 'member',
                participant_type: 'member',
                is_active: true
              })
              console.log(`  ✅ Adding org member: ${member.users.email} (${authUserId})`)
            }
          }
        }
      } else if (orgMembersError) {
        console.error(`  ⚠️  Error fetching org members:`, orgMembersError)
      }

      // 3. 受注者（contractor）の組織メンバーを追加
      if (project.contractor_id) {
        const { data: contractorMembers, error: contractorError } = await supabase
          .from('memberships')
          .select(`
            user_id,
            role,
            users (
              id,
              auth_user_id,
              email
            )
          `)
          .eq('org_id', project.contractor_id)

        if (!contractorError && contractorMembers) {
          console.log(`  Found ${contractorMembers.length} contractor members`)
          for (const member of contractorMembers) {
            const authUserId = member.users?.auth_user_id
            if (authUserId && !existingUserIds.has(authUserId)) {
              if (!chatParticipants.find(p => p.user_id === authUserId)) {
                chatParticipants.push({
                  room_id: room.id,
                  user_id: authUserId,
                  role: 'member',
                  participant_type: 'member',
                  is_active: true
                })
                console.log(`  ✅ Adding contractor member: ${member.users.email} (${authUserId})`)
              }
            }
          }
        }
      }

      // 参加者を一括追加
      if (chatParticipants.length > 0) {
        const { error: insertError } = await supabase
          .from('chat_participants')
          .insert(chatParticipants)

        if (insertError) {
          console.error(`  ❌ Error adding participants to room ${room.id}:`, insertError)
          errors++
        } else {
          console.log(`  ✅ Added ${chatParticipants.length} participants to chat room`)
          added += chatParticipants.length
        }
      } else {
        console.log(`  ⏭️  No new participants to add`)
        skipped++
      }

      console.log()
    }

    console.log('\n=== Migration Summary ===')
    console.log(`✅ Added: ${added} participants`)
    console.log(`⏭️  Skipped: ${skipped} rooms`)
    console.log(`❌ Errors: ${errors}`)

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateChatParticipants().catch(console.error)
