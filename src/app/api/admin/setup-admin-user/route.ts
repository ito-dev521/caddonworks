import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

function generateTempPassword() {
  return 'AdminDemo123!'
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: '本番環境では無効です' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdmin()

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    const tempPassword = generateTempPassword()

    const results: Array<{ email: string; status: string; message?: string; authUserId?: string }> = []

    for (const email of adminEmails) {
      try {
        // 1) try to create auth user
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: '運営者' }
        })

        let authUserId = created?.user?.id || ''

        if (createErr && !String(createErr.message || '').toLowerCase().includes('already registered')) {
          // unexpected error
          results.push({ email, status: 'auth_error', message: createErr.message })
          continue
        }

        // 2) if already exists, look up auth id and reset password
        if (!authUserId) {
          // try users table first
          const { data: profile } = await supabaseAdmin
            .from('users')
            .select('auth_user_id, id')
            .eq('email', email)
            .maybeSingle()

          if (profile?.auth_user_id) {
            authUserId = profile.auth_user_id
          } else {
            // fallback to listUsers to find by email
            const { data: list } = await supabaseAdmin.auth.admin.listUsers()
            const found = list?.users?.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
            if (found) authUserId = found.id
          }

          if (!authUserId) {
            results.push({ email, status: 'not_found', message: 'Authユーザーが見つかりません' })
            continue
          }

          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password: tempPassword,
            email_confirm: true
          })
        }

        // 3) ensure users profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (!existingProfile) {
          await supabaseAdmin
            .from('users')
            .insert({
              auth_user_id: authUserId,
              email,
              display_name: '運営者',
              specialties: [],
              qualifications: []
            })
        }

        results.push({ email, status: 'ok', authUserId })
      } catch (e: any) {
        results.push({ email, status: 'error', message: e?.message || 'unknown' })
      }
    }

    return NextResponse.json({
      message: '管理者アカウントを設定しました',
      password: tempPassword,
      results
    }, { status: 200 })
  } catch (error) {
    console.error('setup-admin-user error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


