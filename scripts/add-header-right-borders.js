const ExcelJS = require('exceljs');
const path = require('path');

async function addHeaderRightBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 見出し行の右側罫線を追加中...');

  const borderStyle = {
    style: 'thin',
    color: { argb: 'FF000000' }
  };

  // 4, 7, 10, 15, 17行目の2列目に右側罫線を追加
  const targetRows = [4, 7, 10, 15, 17];

  for (const row of targetRows) {
    const cell = worksheet.getCell(row, 2);
    const newBorder = cell.border ? { ...cell.border } : {};
    newBorder.right = borderStyle;
    cell.border = newBorder;
    console.log(`  行${row}, 列2: 右側罫線を追加`);
  }

  console.log(`\n✅ 見出し行の右側罫線を ${targetRows.length} 箇所追加しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

addHeaderRightBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
