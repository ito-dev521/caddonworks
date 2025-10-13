const ExcelJS = require('exceljs');
const path = require('path');

async function checkColumnC() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔍 C列の内容を確認中...');
  console.log(`列数: ${worksheet.columnCount}`);
  console.log(`行数: ${worksheet.rowCount}`);

  // C列（3列目）の4, 7, 10, 15, 17行を確認
  const targetRows = [4, 7, 10, 15, 17];

  for (const row of targetRows) {
    const cell = worksheet.getCell(row, 3);
    console.log(`\n行${row}, 列3:`);
    console.log(`  値: "${cell.value}"`);
    console.log(`  罫線: ${JSON.stringify(cell.border)}`);
  }
}

checkColumnC().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
