const ExcelJS = require('exceljs');
const path = require('path');

async function removeOuterBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔍 外周の罫線を削除中...');

  const maxRow = worksheet.rowCount;
  const maxCol = worksheet.columnCount;

  let borderCount = 0;

  // すべてのセルをループ
  for (let row = 1; row <= maxRow; row++) {
    for (let col = 1; col <= maxCol; col++) {
      const cell = worksheet.getCell(row, col);

      if (cell.border) {
        const newBorder = { ...cell.border };
        let modified = false;

        // 最初の行：上枠線を削除
        if (row === 1 && newBorder.top) {
          console.log(`  行${row}, 列${col}: 上枠線を削除`);
          delete newBorder.top;
          modified = true;
          borderCount++;
        }

        // 最後の行：下枠線を削除
        if (row === maxRow && newBorder.bottom) {
          console.log(`  行${row}, 列${col}: 下枠線を削除`);
          delete newBorder.bottom;
          modified = true;
          borderCount++;
        }

        // 最初の列：左枠線を削除
        if (col === 1 && newBorder.left) {
          console.log(`  行${row}, 列${col}: 左枠線を削除`);
          delete newBorder.left;
          modified = true;
          borderCount++;
        }

        // 最後の列：右枠線を削除
        if (col === maxCol && newBorder.right) {
          console.log(`  行${row}, 列${col}: 右枠線を削除`);
          delete newBorder.right;
          modified = true;
          borderCount++;
        }

        if (modified) {
          cell.border = newBorder;
        }
      }
    }
  }

  console.log(`\n✅ 外周の罫線を ${borderCount} 箇所削除しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

removeOuterBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
