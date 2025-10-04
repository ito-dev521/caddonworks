#!/bin/bash

# 承認者をチャットルームに追加する移行スクリプト
# 使い方:
# 1. まず管理者としてログインして、ブラウザの開発者ツール（F12）を開く
# 2. Consoleタブで以下を実行してトークンを取得:
#    copy((await (await fetch('/api/auth/session')).json()).session?.access_token)
# 3. クリップボードにコピーされたトークンを以下の YOUR_TOKEN_HERE に貼り付け
# 4. このスクリプトを実行: bash scripts/run-chat-migration.sh

# トークンをここに設定（管理者トークン）
TOKEN="YOUR_TOKEN_HERE"

# APIエンドポイント
API_URL="http://localhost:3000/api/admin/migrate-chat-approvers"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "承認者をチャットルームに追加する移行処理"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$TOKEN" = "YOUR_TOKEN_HERE" ]; then
  echo "❌ エラー: トークンが設定されていません"
  echo ""
  echo "手順:"
  echo "1. ブラウザで管理者としてログイン"
  echo "2. 開発者ツール（F12）のConsoleタブで以下を実行:"
  echo "   copy((await (await fetch('/api/auth/session')).json()).session?.access_token)"
  echo "3. コピーされたトークンをこのスクリプトの TOKEN 変数に設定"
  echo "4. このスクリプトを再実行"
  echo ""
  exit 1
fi

echo "移行処理を開始します..."
echo ""

# APIを呼び出し
response=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# レスポンスを整形して表示
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "移行処理完了"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
