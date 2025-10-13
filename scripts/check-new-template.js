const ExcelJS = require('exceljs');
const path = require('path');

async function checkExcelStructure() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template_new.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n📏 列幅:');
  for (let col = 1; col <= worksheet.columnCount; col++) {
    const column = worksheet.getColumn(col);
    console.log(`  列${col} (${String.fromCharCode(64 + col)}): ${column.width || 'デフォルト'}`);
  }

  console.log('\n📝 最初の15行のデータ:');
  for (let row = 1; row <= Math.min(15, worksheet.rowCount); row++) {
    const rowData = [];
    for (let col = 1; col <= Math.min(5, worksheet.columnCount); col++) {
      const cell = worksheet.getCell(row, col);
      rowData.push(cell.value || '(空)');
    }
    console.log(`  行${row}: ${rowData.join(' | ')}`);
  }

  console.log('\n📊 結合セル:');
  if (worksheet.model.merges && worksheet.model.merges.length > 0) {
    worksheet.model.merges.forEach((merge) => {
      console.log(`  ${merge}`);
    });
  } else {
    console.log('  なし');
  }
}

checkExcelStructure().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
