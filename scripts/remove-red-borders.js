const ExcelJS = require('exceljs');
const path = require('path');

async function removeRedBorders() {
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx');

  console.log('📊 Excelテンプレートを読み込み中:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  console.log('\n🔍 セルの罫線を確認中...');

  // 全セルの罫線を確認して、赤い罫線を削除
  let redBorderCount = 0;
  for (let row = 1; row <= worksheet.rowCount; row++) {
    for (let col = 1; col <= worksheet.columnCount; col++) {
      const cell = worksheet.getCell(row, col);

      if (cell.border) {
        let hasRedBorder = false;
        let newBorder = {};

        // 各辺の罫線をチェック
        ['top', 'left', 'bottom', 'right'].forEach(side => {
          if (cell.border[side]) {
            const borderSide = cell.border[side];
            // 赤い罫線（color.argb が FF0000系）を削除
            if (borderSide.color && borderSide.color.argb) {
              const color = borderSide.color.argb.toLowerCase();
              // 赤系の色を検出（FF0000, FFFF0000など）
              if (color.includes('ff0000') || color.includes('ff00') || color.endsWith('ff0000')) {
                hasRedBorder = true;
                console.log(`  ❌ 赤い罫線を発見: 行${row}, 列${col}, ${side}側`);
              } else {
                // 赤色でない罫線は保持
                newBorder[side] = borderSide;
              }
            } else {
              // 色指定がない罫線は保持
              newBorder[side] = borderSide;
            }
          }
        });

        if (hasRedBorder) {
          // 赤い罫線を削除して、他の罫線のみ設定
          cell.border = Object.keys(newBorder).length > 0 ? newBorder : {};
          redBorderCount++;
        }
      }
    }
  }

  console.log(`\n✅ 赤い罫線を ${redBorderCount} 箇所削除しました`);

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('\n✅ Excelテンプレートを保存しました');
}

removeRedBorders().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
