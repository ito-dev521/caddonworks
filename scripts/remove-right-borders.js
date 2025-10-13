const ExcelJS = require('exceljs');
const path = require('path');

async function removeRightBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 右側罫線を削除中...');

  const maxRow = worksheet.rowCount;
  let borderCount = 0;

  // すべての行の2列目の右側罫線を削除
  for (let row = 1; row <= maxRow; row++) {
    const cell = worksheet.getCell(row, 2);

    if (cell.border && cell.border.right) {
      console.log(`  行${row}, 列2: 右側罫線を削除`);
      const newBorder = { ...cell.border };
      delete newBorder.right;
      cell.border = newBorder;
      borderCount++;
    }
  }

  console.log(`\n✅ 右側罫線を ${borderCount} 箇所削除しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

removeRightBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
