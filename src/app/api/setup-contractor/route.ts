import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if contractor membership already exists
    const { data: existingMembership } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'Contractor')
      .single()

    if (existingMembership) {
      return NextResponse.json({
        message: 'Contractor membership already exists',
        success: true
      })
    }

    // Create contractor organization if it doesn't exist
    let contractorOrgId = null
    const { data: contractorOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', '受注者')
      .single()

    if (contractorOrg) {
      contractorOrgId = contractorOrg.id
    } else {
      // Create contractor organization
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: '受注者',
          description: '受注者用デフォルト組織',
          contact_email: 'contractor@test.com',
          contact_phone: '000-0000-0000',
          address: '日本',
          approval_status: 'approved',
          active: true
        })
        .select('id')
        .single()

      if (orgError) {
        console.error('Organization creation error:', orgError)
        return NextResponse.json({
          error: 'Failed to create contractor organization',
          details: orgError.message
        }, { status: 500 })
      }

      contractorOrgId = newOrg.id
    }

    // Add contractor membership
    const { data: membership, error } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: userId,
        role: 'Contractor',
        org_id: contractorOrgId
      })
      .select()
      .single()

    if (error) {
      console.error('Membership creation error:', error)
      return NextResponse.json({
        error: 'Failed to create contractor membership',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Contractor membership created successfully',
      membership,
      organizationId: contractorOrgId
    })

  } catch (error) {
    console.error('Setup contractor error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}