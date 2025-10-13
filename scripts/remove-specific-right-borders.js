const ExcelJS = require('exceljs');
const path = require('path');

async function removeSpecificRightBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 特定の右側罫線を削除中...');

  const maxRow = worksheet.rowCount;
  let borderCount = 0;

  // 1行目の右側罫線を削除
  for (let col = 1; col <= 2; col++) {
    const cell = worksheet.getCell(1, col);
    if (cell.border && cell.border.right) {
      console.log(`  行1, 列${col}: 右側罫線を削除`);
      const newBorder = { ...cell.border };
      delete newBorder.right;
      cell.border = newBorder;
      borderCount++;
    }
  }

  // 下部5行の右側罫線を削除
  for (let row = maxRow - 4; row <= maxRow; row++) {
    for (let col = 1; col <= 2; col++) {
      const cell = worksheet.getCell(row, col);
      if (cell.border && cell.border.right) {
        console.log(`  行${row}, 列${col}: 右側罫線を削除`);
        const newBorder = { ...cell.border };
        delete newBorder.right;
        cell.border = newBorder;
        borderCount++;
      }
    }
  }

  console.log(`\n✅ 右側罫線を ${borderCount} 箇所削除しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

removeSpecificRightBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
