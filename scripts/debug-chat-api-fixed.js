// ブラウザの開発者コンソール（F12）で実行するデバッグスクリプト（修正版）
// 小林育英さんでログインしている状態で実行してください

async function debugChatRooms() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('チャットルームAPIデバッグ（修正版）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Supabaseクライアントからセッション取得
  const { createClient } = window.supabase || {};

  if (!createClient) {
    console.error('❌ Supabaseクライアントが見つかりません');
    console.log('💡 代わりに以下のコードを実行してください：');
    console.log(`
// localStorageから直接トークンを取得する方法
const authData = JSON.parse(localStorage.getItem('sb-${window.location.hostname.replace(/\\./g, '-')}-auth-token') || '{}')
const token = authData?.access_token

if (!token) {
  console.error('トークンが見つかりません。ログインしてください。')
} else {
  const response = await fetch('/api/chat/rooms', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  const data = await response.json()
  console.log('チャットルーム数:', data.rooms?.length || 0)
  console.log('チャットルーム:', data.rooms)
}
    `);
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ セッション取得エラー:', sessionError);
    console.log('ログインしてください');
    return;
  }

  const token = session.access_token;
  console.log('✓ セッション取得成功');
  console.log('ユーザー:', session.user.email);
  console.log('');

  // チャットルームAPI呼び出し
  console.log('チャットルームAPIを呼び出し中...');
  const response = await fetch('/api/chat/rooms', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('APIレスポンス:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ステータス:', response.status);
  console.log('チャットルーム数:', data.rooms?.length || 0);
  console.log('');

  if (response.status !== 200) {
    console.error('❌ APIエラー:', data);
    return data;
  }

  if (data.rooms && data.rooms.length > 0) {
    console.log('チャットルーム一覧:');
    data.rooms.forEach((room, index) => {
      console.log(`\n${index + 1}. ${room.name}`);
      console.log(`   Room ID: ${room.id}`);
      console.log(`   Project ID: ${room.project_id}`);
      console.log(`   Project Name: ${room.project_name}`);
      console.log(`   Project Status: ${room.project_status}`);
      console.log(`   Is Active: ${room.is_active}`);
      console.log(`   Participant Count: ${room.participant_count}`);
      console.log(`   Unread Count: ${room.unread_count}`);
    });
  } else {
    console.log('⚠️  チャットルームが見つかりません');
    console.log('レスポンス全体:', data);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('デバッグ完了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return data;
}

// 実行
debugChatRooms();
