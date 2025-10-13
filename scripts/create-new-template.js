const ExcelJS = require('exceljs');
const path = require('path');

async function createNewTemplate() {
  const oldTemplatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');
  const newTemplatePath = path.join(__dirname, '../templates/documents/order_acceptance_template_new.xlsx');

  console.log('📊 既存テンプレートを読み込み中:', oldTemplatePath);

  // 既存のテンプレートを読み込み
  const oldWorkbook = new ExcelJS.Workbook();
  await oldWorkbook.xlsx.readFile(oldTemplatePath);
  const oldWorksheet = oldWorkbook.getWorksheet(1);

  // 新しいワークブックを作成
  const newWorkbook = new ExcelJS.Workbook();
  const newWorksheet = newWorkbook.addWorksheet('注文請書');

  // A列とB列のみをコピー
  console.log('\n📋 A列とB列のデータをコピー中...');

  for (let row = 1; row <= oldWorksheet.rowCount; row++) {
    for (let col = 1; col <= 2; col++) {
      const oldCell = oldWorksheet.getCell(row, col);
      const newCell = newWorksheet.getCell(row, col);

      // セルの値をコピー
      newCell.value = oldCell.value;

      // セルのスタイルをコピー
      if (oldCell.font) newCell.font = oldCell.font;
      if (oldCell.alignment) newCell.alignment = oldCell.alignment;
      if (oldCell.fill) newCell.fill = oldCell.fill;
      if (oldCell.border) newCell.border = oldCell.border;
    }
  }

  // 行の高さをコピー
  for (let row = 1; row <= oldWorksheet.rowCount; row++) {
    const oldRow = oldWorksheet.getRow(row);
    const newRow = newWorksheet.getRow(row);
    if (oldRow.height) {
      newRow.height = oldRow.height;
    }
  }

  // A列とB列に該当する結合セルをコピー
  console.log('\n🔗 結合セルをコピー中...');
  if (oldWorksheet.model.merges) {
    oldWorksheet.model.merges.forEach((merge) => {
      // A1:B1のような結合のみをコピー
      if (merge.match(/^[AB]\d+:[AB]\d+$/)) {
        newWorksheet.mergeCells(merge);
        console.log(`  結合: ${merge}`);
      }
    });
  }

  // 列幅を設定
  const columnA = newWorksheet.getColumn(1);
  columnA.width = 30;

  const columnB = newWorksheet.getColumn(2);
  columnB.width = 70;

  console.log('\n📏 列幅を設定:');
  console.log(`  A列: 30`);
  console.log(`  B列: 70`);

  // 新しいテンプレートを保存
  await newWorkbook.xlsx.writeFile(newTemplatePath);

  console.log('\n✅ 新しいテンプレートを保存しました:', newTemplatePath);
  console.log('\n📝 確認後、以下のコマンドで置き換えてください:');
  console.log(`   mv "${newTemplatePath}" "${oldTemplatePath}"`);
}

createNewTemplate().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
