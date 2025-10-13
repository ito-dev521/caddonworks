const ExcelJS = require('exceljs');
const path = require('path');

async function adjustColumnWidth() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  // 現在の列幅を表示
  console.log('\n📏 現在の列幅:');
  for (let col = 1; col <= 5; col++) {
    const column = worksheet.getColumn(col);
    console.log(`  列${col} (${String.fromCharCode(64 + col)}): ${column.width || 'デフォルト'}`);
  }

  // C, D, E列を削除
  console.log('\n🗑️ C, D, E列を削除中...');

  // 最大行を取得
  const maxRow = worksheet.rowCount;

  // 各行からC, D, E列のセルを削除（後ろから削除）
  for (let row = 1; row <= maxRow; row++) {
    for (let col = 5; col >= 3; col--) {
      const cell = worksheet.getCell(row, col);
      if (cell) {
        cell.value = null;
      }
    }
  }

  // 列を削除（後ろから削除）
  worksheet.spliceColumns(3, 3); // 3列目から3つの列を削除

  console.log('✅ C, D, E列を削除しました');

  // A列（ラベル列）の幅を設定
  const columnA = worksheet.getColumn(1);
  const currentWidthA = columnA.width || 10;
  const newWidthA = 30;
  columnA.width = newWidthA;
  console.log(`\n✏️ A列の幅を設定: ${currentWidthA} → ${newWidthA}`);

  // B列（データ列）の幅を設定
  const columnB = worksheet.getColumn(2);
  const currentWidthB = columnB.width || 10;
  const newWidthB = 70;
  columnB.width = newWidthB;
  console.log(`✏️ B列の幅を設定: ${currentWidthB} → ${newWidthB}`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');

  // 変更後の列幅を表示
  console.log('\n📏 変更後の列幅:');
  for (let col = 1; col <= 5; col++) {
    const column = worksheet.getColumn(col);
    console.log(`  列${col} (${String.fromCharCode(64 + col)}): ${column.width || 'デフォルト'}`);
  }
}

adjustColumnWidth().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
