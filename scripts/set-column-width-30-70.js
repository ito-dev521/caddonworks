const ExcelJS = require('exceljs');
const path = require('path');

async function setColumnWidth() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  // 現在の列幅を表示
  console.log('\n📏 現在の列幅:');
  const columnA = worksheet.getColumn(1);
  const columnB = worksheet.getColumn(2);
  console.log(`  A列: ${columnA.width || 'デフォルト'}`);
  console.log(`  B列: ${columnB.width || 'デフォルト'}`);

  // A列を30、B列を70に設定（比率 30:70 = 30%:70%）
  columnA.width = 30;
  columnB.width = 70;

  console.log('\n✏️ 列幅を調整:');
  console.log(`  A列: ${columnA.width} (30%)`);
  console.log(`  B列: ${columnB.width} (70%)`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');

  // 変更後の列幅を表示
  console.log('\n📏 変更後の列幅:');
  console.log(`  A列: ${columnA.width}`);
  console.log(`  B列: ${columnB.width}`);
  console.log(`\n📊 比率: A:B = 30:70 = 30%:70%`);
}

setColumnWidth().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
