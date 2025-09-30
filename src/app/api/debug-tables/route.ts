import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(request: NextRequest) {
  try {
    // Chat tables
    const { error: chatRoomsError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id')
      .limit(1)

    const { error: chatParticipantsError } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .limit(1)

    const { error: chatMessagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('id')
      .limit(1)

    // Check if completion_reports table exists
    const { data: completionReportsTest, error: completionError } = await supabaseAdmin
      .from('completion_reports')
      .select('id')
      .limit(1)

    // Check if deliverables table exists
    const { data: deliverablesTest, error: deliverablesError } = await supabaseAdmin
      .from('deliverables')
      .select('id')
      .limit(1)

    // Check if favorite_members table exists
    const { data: favoriteMembersTest, error: favoriteMembersError } = await supabaseAdmin
      .from('favorite_members')
      .select('id')
      .limit(1)

    // Check users and memberships
    const { data: usersTest, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1)

    const { data: membershipsTest, error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .limit(1)

    return NextResponse.json({
      tables: {
        chat_rooms: {
          exists: !chatRoomsError,
          error: chatRoomsError?.message || null
        },
        chat_participants: {
          exists: !chatParticipantsError,
          error: chatParticipantsError?.message || null
        },
        chat_messages: {
          exists: !chatMessagesError,
          error: chatMessagesError?.message || null
        },
        completion_reports: {
          exists: !completionError,
          error: completionError?.message || null
        },
        deliverables: {
          exists: !deliverablesError,
          error: deliverablesError?.message || null
        },
        users: {
          exists: !usersError,
          error: usersError?.message || null
        },
        memberships: {
          exists: !membershipsError,
          error: membershipsError?.message || null
        },
        favorite_members: {
          exists: !favoriteMembersError,
          error: favoriteMembersError?.message || null
        }
      }
    })

  } catch (error) {
    console.error('Debug tables error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}