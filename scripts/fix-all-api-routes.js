const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 全てのAPI routeファイルを取得
const output = execSync('find src/app/api -name "route.ts" -type f', { encoding: 'utf8' });
const files = output.trim().split('\n').filter(Boolean);

const dynamicExport = "export const dynamic = 'force-dynamic'";

let updated = 0;
let skipped = 0;
let errors = 0;

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes("export const dynamic")) {
      console.log(`⏭️  ${filePath}`);
      skipped++;
      return;
    }

    // import文の最後の行を探す
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      // import文の後に空行と dynamic export を追加
      lines.splice(lastImportIndex + 1, 0, '', dynamicExport);
      content = lines.join('\n');
    } else {
      // import文がない場合はファイルの先頭に追加
      content = dynamicExport + '\n\n' + content;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath}`);
    updated++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    errors++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  ✅ Updated: ${updated}`);
console.log(`  ⏭️  Skipped: ${skipped}`);
console.log(`  ❌ Errors: ${errors}`);
console.log(`  📁 Total: ${files.length}`);
