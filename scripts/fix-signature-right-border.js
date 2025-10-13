const ExcelJS = require('exceljs');
const path = require('path');

async function fixSignatureRightBorder() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 署名欄の右側罫線を追加中...');

  const borderStyle = {
    style: 'thin',
    color: { argb: 'FF000000' }
  };

  // 18行目の2列目に右側罫線を追加
  const cell = worksheet.getCell(18, 2);
  const newBorder = cell.border ? { ...cell.border } : {};
  newBorder.right = borderStyle;
  cell.border = newBorder;

  console.log('  行18, 列2: 右側罫線を追加');

  console.log('\n✅ 署名欄の右側罫線を追加しました');

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

fixSignatureRightBorder().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
