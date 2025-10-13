const ExcelJS = require('exceljs');
const path = require('path');

async function restoreOuterBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 外周の罫線を復元中...');

  const maxRow = worksheet.rowCount;
  const maxCol = worksheet.columnCount;

  let borderCount = 0;

  const borderStyle = {
    style: 'thin',
    color: { argb: 'FF000000' }
  };

  // すべてのセルをループ
  for (let row = 1; row <= maxRow; row++) {
    for (let col = 1; col <= maxCol; col++) {
      const cell = worksheet.getCell(row, col);

      let newBorder = cell.border ? { ...cell.border } : {};
      let modified = false;

      // 最初の行：上枠線を追加
      if (row === 1) {
        newBorder.top = borderStyle;
        modified = true;
        borderCount++;
      }

      // 最後の行：下枠線を追加
      if (row === maxRow) {
        newBorder.bottom = borderStyle;
        modified = true;
        borderCount++;
      }

      // 最初の列：左枠線を追加
      if (col === 1) {
        newBorder.left = borderStyle;
        modified = true;
        borderCount++;
      }

      // 最後の列：右枠線を追加
      if (col === maxCol) {
        newBorder.right = borderStyle;
        modified = true;
        borderCount++;
      }

      if (modified) {
        cell.border = newBorder;
        console.log(`  行${row}, 列${col}: 外周罫線を復元`);
      }
    }
  }

  console.log(`\n✅ 外周の罫線を ${borderCount} 箇所復元しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

restoreOuterBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
