const ExcelJS = require('exceljs');
const path = require('path');

async function removeAllBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔍 全ての罫線を削除中...');

  let borderCount = 0;
  for (let row = 1; row <= worksheet.rowCount; row++) {
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = worksheet.getCell(row, col);

      if (cell.border && Object.keys(cell.border).length > 0) {
        console.log(`  行${row}, 列${col}: 罫線を削除`);
        cell.border = {};
        borderCount++;
      }
    }
  }

  console.log(`\n✅ 罫線を ${borderCount} 箇所削除しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

removeAllBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
