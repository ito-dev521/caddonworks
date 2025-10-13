const ExcelJS = require('exceljs');
const path = require('path');

async function removeExtraColumnBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 余分な列の罫線を削除中...');

  const maxRow = worksheet.rowCount;
  const maxCol = worksheet.columnCount;

  console.log(`最大行: ${maxRow}, 最大列: ${maxCol}`);

  let borderCount = 0;

  // 3列目以降（C列以降）の罫線を削除
  for (let row = 1; row <= maxRow; row++) {
    for (let col = 3; col <= maxCol; col++) {
      const cell = worksheet.getCell(row, col);

      if (cell.border) {
        console.log(`  行${row}, 列${col}: 罫線を削除`);
        cell.border = {};
        borderCount++;
      }
    }
  }

  console.log(`\n✅ 余分な列の罫線を ${borderCount} 箇所削除しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

removeExtraColumnBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
