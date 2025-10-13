const ExcelJS = require('exceljs');
const path = require('path');

async function restoreMiddleRightBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 中間の右側罫線を復元中...');

  const borderStyle = {
    style: 'thin',
    color: { argb: 'FF000000' }
  };

  let borderCount = 0;

  // 2行目から15行目までの2列目に右側罫線を追加
  for (let row = 2; row <= 15; row++) {
    const cell = worksheet.getCell(row, 2);

    const newBorder = cell.border ? { ...cell.border } : {};
    newBorder.right = borderStyle;
    cell.border = newBorder;

    console.log(`  行${row}, 列2: 右側罫線を追加`);
    borderCount++;
  }

  console.log(`\n✅ 右側罫線を ${borderCount} 箇所追加しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

restoreMiddleRightBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
