const ExcelJS = require('exceljs');
const path = require('path');

async function updateCompletionTemplate() {
  const templatePath = path.join(process.cwd(), 'templates', 'documents', 'completion_template.xlsx');

  console.log('📄 完了届テンプレートを更新中...');
  console.log('📂 テンプレートパス:', templatePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    console.error('❌ ワークシートが見つかりません');
    return;
  }

  // 既存の結合をすべて解除
  console.log('🔓 既存のセル結合を解除中...');
  if (worksheet.model.merges) {
    const mergesToUnmerge = [...worksheet.model.merges];
    mergesToUnmerge.forEach(merge => {
      try {
        worksheet.unMergeCells(merge);
      } catch (e) {
        // 既に解除されている場合は無視
      }
    });
  }

  // 1行目: 業務完了届ヘッダー（A1:E1を結合）
  worksheet.mergeCells('A1:E1');
  const headerCell = worksheet.getCell('A1');
  headerCell.value = '業務完了届';
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  headerCell.font = { bold: true, size: 18 };
  headerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F4FD' }
  };
  headerCell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 2行目: 作成日（右上、E2）
  worksheet.getCell('A2').value = '';
  worksheet.getCell('B2').value = '';
  worksheet.getCell('C2').value = '';
  worksheet.getCell('D2').value = '作成日:';
  worksheet.getCell('D2').alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getCell('E2').value = '2025/10/5'; // プレースホルダー
  worksheet.getCell('E2').alignment = { horizontal: 'left', vertical: 'middle' };

  // 3行目: 空行
  worksheet.getCell('A3').value = '';

  // 4行目: プロジェクト情報ヘッダー（A4:E4を結合）
  worksheet.mergeCells('A4:E4');
  const projectHeaderCell = worksheet.getCell('A4');
  projectHeaderCell.value = 'プロジェクト情報';
  projectHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  projectHeaderCell.font = { bold: true, size: 12 };
  projectHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6EAF8' }
  };
  projectHeaderCell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 5行目: プロジェクト名
  worksheet.getCell('A5').value = 'プロジェクト名:';
  worksheet.getCell('A5').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('A5').font = { bold: true };
  worksheet.getCell('A5').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B5:E5');
  worksheet.getCell('B5').value = 'サポート利用';
  worksheet.getCell('B5').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('B5').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 6行目: 受注者名
  worksheet.getCell('A6').value = '受注者名:';
  worksheet.getCell('A6').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('A6').font = { bold: true };
  worksheet.getCell('A6').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B6:E6');
  worksheet.getCell('B6').value = '海江田 誠';
  worksheet.getCell('B6').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('B6').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 7行目: 完了日
  worksheet.getCell('A7').value = '完了日:';
  worksheet.getCell('A7').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('A7').font = { bold: true };
  worksheet.getCell('A7').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B7:E7');
  worksheet.getCell('B7').value = '2025-10-04';
  worksheet.getCell('B7').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('B7').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 8行目: 契約金額（新規追加）
  worksheet.getCell('A8').value = '契約金額:';
  worksheet.getCell('A8').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('A8').font = { bold: true };
  worksheet.getCell('A8').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B8:E8');
  worksheet.getCell('B8').value = '¥1,000,000';
  worksheet.getCell('B8').alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getCell('B8').font = { bold: true, size: 12, color: { argb: 'FF2C3E50' } };
  worksheet.getCell('B8').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 9行目: 空行
  worksheet.getCell('A9').value = '';

  // 10行目: 成果物ヘッダー（A10:E10を結合）
  worksheet.mergeCells('A10:E10');
  const deliverableHeaderCell = worksheet.getCell('A10');
  deliverableHeaderCell.value = '成果物';
  deliverableHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  deliverableHeaderCell.font = { bold: true, size: 12 };
  deliverableHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD6EAF8' }
  };
  deliverableHeaderCell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 11行目: 備考（A11:E11を結合）
  worksheet.mergeCells('A11:E11');
  const remarksCell = worksheet.getCell('A11');
  remarksCell.value = '※ 本届出書は電子署名により法的効力を有します';
  remarksCell.alignment = { horizontal: 'center', vertical: 'middle' };
  remarksCell.font = { size: 9, color: { argb: 'FF7F8C8D' } };
  remarksCell.border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 12行目以降: 成果物データ（プレースホルダー）
  // これはコード側で動的に追加される

  // 列幅を設定
  worksheet.getColumn('A').width = 18;
  worksheet.getColumn('B').width = 25;
  worksheet.getColumn('C').width = 25;
  worksheet.getColumn('D').width = 18;
  worksheet.getColumn('E').width = 18;

  // 行の高さを設定
  worksheet.getRow(1).height = 30; // ヘッダー
  worksheet.getRow(4).height = 25; // プロジェクト情報ヘッダー
  worksheet.getRow(10).height = 25; // 成果物ヘッダー

  // ファイルを保存
  await workbook.xlsx.writeFile(templatePath);

  console.log('✅ 完了届テンプレートを更新しました');
  console.log('📋 変更内容:');
  console.log('  - 署名欄を削除');
  console.log('  - 契約金額を追加（A8:B8）');
  console.log('  - レイアウトを改善');
}

updateCompletionTemplate().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
