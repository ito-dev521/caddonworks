// ブラウザの開発者コンソール（F12）で実行するデバッグスクリプト
// 小林育英さんでログインしている状態で実行してください

async function debugChatRooms() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('チャットルームAPIデバッグ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // セッション取得
  const session = await (await fetch('/api/auth/session')).json()
  const token = session.session?.access_token

  if (!token) {
    console.error('❌ セッションが見つかりません。ログインしてください。')
    return
  }

  console.log('✓ セッション取得成功')
  console.log('ユーザー:', session.session?.user?.email)
  console.log('')

  // チャットルームAPI呼び出し
  console.log('チャットルームAPIを呼び出し中...')
  const response = await fetch('/api/chat/rooms', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const data = await response.json()

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('APIレスポンス:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ステータス:', response.status)
  console.log('チャットルーム数:', data.rooms?.length || 0)
  console.log('')

  if (data.rooms && data.rooms.length > 0) {
    console.log('チャットルーム一覧:')
    data.rooms.forEach((room, index) => {
      console.log(`\n${index + 1}. ${room.name}`)
      console.log(`   Room ID: ${room.id}`)
      console.log(`   Project ID: ${room.project_id}`)
      console.log(`   Project Name: ${room.project_name}`)
      console.log(`   Project Status: ${room.project_status}`)
      console.log(`   Is Active: ${room.is_active}`)
      console.log(`   Participant Count: ${room.participant_count}`)
      console.log(`   Unread Count: ${room.unread_count}`)
    })
  } else {
    console.log('⚠️  チャットルームが見つかりません')
    console.log('レスポンス全体:', data)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('デバッグ完了')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  return data
}

// 実行
debugChatRooms()
