const fs = require('fs');
const path = require('path');

const files = [
  "src/app/api/admin/box-permissions/users/route.ts",
  "src/app/api/admin/invoices/route.ts",
  "src/app/api/admin/monthly-billing/summary/route.ts",
  "src/app/api/admin/organizations/route.ts",
  "src/app/api/admin/contractors/route.ts",
  "src/app/api/billing/close-contractors/route.ts",
  "src/app/api/billing/invoice-orgs/route.ts",
  "src/app/api/billing/pdf/route.ts",
  "src/app/api/box/sign/requests/route.ts",
  "src/app/api/chat/participants/route.ts",
  "src/app/api/cron/check-expired-jobs/route.ts",
  "src/app/api/organization/registration/route.ts",
  "src/app/api/admin/org-admins/route.ts",
  "src/app/api/system-settings/route.ts",
  "src/app/api/user/box-status/route.ts",
  "src/app/api/s3/buckets/route.ts",
  "src/app/api/jobs/route.ts",
];

const dynamicExport = "export const dynamic = 'force-dynamic'\n";

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  if (content.includes("export const dynamic")) {
    console.log(`⏭️  Skipping ${filePath} (already has dynamic export)`);
    return;
  }

  // import文の最後の行を探す
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    // import文の後に空行と dynamic export を追加
    lines.splice(lastImportIndex + 1, 0, '', dynamicExport.trim());
    content = lines.join('\n');
  } else {
    // import文がない場合はファイルの先頭に追加
    content = dynamicExport + '\n' + content;
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Added dynamic export to ${filePath}`);
});

console.log('\n✨ Done!');
