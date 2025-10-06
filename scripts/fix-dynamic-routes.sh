#!/bin/bash

# API routesに動的レンダリング設定を追加するスクリプト

FILES=(
  "src/app/api/admin/box-permissions/users/route.ts"
  "src/app/api/admin/invoices/route.ts"
  "src/app/api/admin/monthly-billing/summary/route.ts"
  "src/app/api/admin/organizations/route.ts"
  "src/app/api/admin/contractors/route.ts"
  "src/app/api/billing/close-contractors/route.ts"
  "src/app/api/billing/invoice-orgs/route.ts"
  "src/app/api/billing/pdf/route.ts"
  "src/app/api/box/sign/requests/route.ts"
  "src/app/api/chat/participants/route.ts"
  "src/app/api/cron/check-expired-jobs/route.ts"
  "src/app/api/organization/registration/route.ts"
  "src/app/api/admin/org-admins/route.ts"
  "src/app/api/system-settings/route.ts"
  "src/app/api/user/box-status/route.ts"
  "src/app/api/s3/buckets/route.ts"
  "src/app/api/jobs/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # ファイルの先頭に dynamic 設定があるかチェック
    if ! grep -q "export const dynamic" "$file"; then
      echo "Adding dynamic export to $file"
      # import文の後に追加
      sed -i '' "/^import/a\\
export const dynamic = 'force-dynamic'\\
" "$file"
    else
      echo "Skipping $file (already has dynamic export)"
    fi
  else
    echo "File not found: $file"
  fi
done

echo "Done!"
