const ExcelJS = require('exceljs');
const path = require('path');

async function fixRightBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔧 右側罫線を修正中...');

  const borderStyle = {
    style: 'thin',
    color: { argb: 'FF000000' }
  };

  // 1行目の2列目に右側罫線を追加
  const cell_b1 = worksheet.getCell('B1');
  if (!cell_b1.border) {
    cell_b1.border = {};
  }
  cell_b1.border = {
    ...cell_b1.border,
    right: borderStyle
  };
  console.log('  行1, 列2: 右側罫線を追加');

  // 19行目と20行目の2列目に右側罫線を追加
  for (let row = 19; row <= 20; row++) {
    const cell = worksheet.getCell(row, 2);
    if (!cell.border) {
      cell.border = {};
    }
    cell.border = {
      ...cell.border,
      right: borderStyle
    };
    console.log(`  行${row}, 列2: 右側罫線を追加`);
  }

  console.log('\n✅ 右側罫線を修正しました');

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

fixRightBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
