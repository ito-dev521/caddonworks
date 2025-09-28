const ExcelJS = require('exceljs')
const path = require('path')

async function createOrderAcceptanceTemplate() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('注文請書')

  // ワークシートの設定
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }
  }

  // 列幅を設定
  worksheet.columns = [
    { width: 4 },   // A列: 狭い
    { width: 20 },  // B列: ラベル用
    { width: 25 },  // C列: データ用
    { width: 15 },  // D列: 補助
    { width: 15 },  // E列: 補助
  ]

  // 1. ヘッダー（タイトル）
  const titleCell = worksheet.getCell('A1')
  titleCell.value = '注文請書'
  titleCell.font = { name: 'MS PGothic', size: 18, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells('A1:E1')

  // 作成日（右上）
  worksheet.getCell('E2').value = '作成日: [createdAt]'
  worksheet.getCell('E2').font = { name: 'MS PGothic', size: 10 }
  worksheet.getCell('E2').alignment = { horizontal: 'right' }

  let currentRow = 4

  // 2. 注文書情報セクション
  worksheet.getCell(`A${currentRow}`).value = '■ 注文書情報'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 12, bold: true }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  // 注文書番号
  worksheet.getCell(`A${currentRow}`).value = '注文書番号:'
  worksheet.getCell(`B${currentRow}`).value = '[orderNumber]'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  worksheet.getCell(`B${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  currentRow++

  // 注文日
  worksheet.getCell(`A${currentRow}`).value = '注文日:'
  worksheet.getCell(`B${currentRow}`).value = '[orderDate]'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  worksheet.getCell(`B${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  currentRow += 2

  // 3. 受注者情報セクション
  worksheet.getCell(`A${currentRow}`).value = '■ 受注者情報（請書作成者）'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 12, bold: true }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  // 受注者の各フィールド
  const contractorFields = [
    { label: '会社名:', field: '[contractorName]' },
    { label: 'メールアドレス:', field: '[contractorEmail]' },
    { label: '住所:', field: '[contractorAddress]' },
    { label: '電話番号:', field: '[contractorPhone]' }
  ]

  contractorFields.forEach(({ label, field }) => {
    worksheet.getCell(`A${currentRow}`).value = label
    worksheet.getCell(`B${currentRow}`).value = field
    worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
    worksheet.getCell(`B${currentRow}`).font = { name: 'MS PGothic', size: 10 }
    currentRow++
  })

  currentRow++

  // 4. 発注者情報セクション
  worksheet.getCell(`A${currentRow}`).value = '■ 発注者情報'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 12, bold: true }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  // 発注者の各フィールド
  const clientFields = [
    { label: '会社名:', field: '[clientName]' },
    { label: 'メールアドレス:', field: '[clientEmail]' }
  ]

  clientFields.forEach(({ label, field }) => {
    worksheet.getCell(`A${currentRow}`).value = label
    worksheet.getCell(`B${currentRow}`).value = field
    worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
    worksheet.getCell(`B${currentRow}`).font = { name: 'MS PGothic', size: 10 }
    currentRow++
  })

  currentRow++

  // 5. 請負内容セクション
  worksheet.getCell(`A${currentRow}`).value = '■ 請負内容'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 12, bold: true }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  // 請負内容の各フィールド
  const projectFields = [
    { label: '工事名・業務名:', field: '[projectTitle]' },
    { label: '請負金額:', field: '¥[projectAmount]' },
    { label: '完成期日:', field: '[deadline]' },
    { label: '工事場所:', field: '[workLocation]' }
  ]

  projectFields.forEach(({ label, field }) => {
    worksheet.getCell(`A${currentRow}`).value = label
    worksheet.getCell(`B${currentRow}`).value = field
    worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
    worksheet.getCell(`B${currentRow}`).font = { name: 'MS PGothic', size: 10 }
    currentRow++
  })

  currentRow++

  // 6. 受諾内容セクション
  worksheet.getCell(`A${currentRow}`).value = '■ 受諾内容'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 12, bold: true }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  const acceptanceText = '上記注文書の内容を承諾し、記載された条件に従って業務を履行することをお約束いたします。'
  worksheet.getCell(`A${currentRow}`).value = acceptanceText
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  worksheet.getCell(`A${currentRow}`).alignment = { wrapText: true }
  worksheet.getRow(currentRow).height = 30
  currentRow += 2

  // 7. 受諾日
  worksheet.getCell(`A${currentRow}`).value = '受諾日:'
  worksheet.getCell(`B${currentRow}`).value = '[acceptanceDate]'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  worksheet.getCell(`B${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  currentRow += 3

  // 8. 署名欄
  worksheet.getCell(`A${currentRow}`).value = '■ 署名欄'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 12, bold: true }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  // 受注者署名欄
  worksheet.getCell(`A${currentRow}`).value = '受注者署名:'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  // 署名欄の枠線
  const contractorSignatureRange = `C${currentRow}:E${currentRow + 1}`
  worksheet.mergeCells(contractorSignatureRange)
  const contractorSignatureCell = worksheet.getCell(`C${currentRow}`)
  contractorSignatureCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  }
  currentRow += 3

  // 発注者確認署名欄
  worksheet.getCell(`A${currentRow}`).value = '発注者確認署名:'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 10 }
  // 署名欄の枠線
  const clientSignatureRange = `C${currentRow}:E${currentRow + 1}`
  worksheet.mergeCells(clientSignatureRange)
  const clientSignatureCell = worksheet.getCell(`C${currentRow}`)
  clientSignatureCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  }
  currentRow += 4

  // 9. 注意事項
  worksheet.getCell(`A${currentRow}`).value = '※ 本注文請書は電子署名により法的効力を有します'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 8 }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
  currentRow++

  worksheet.getCell(`A${currentRow}`).value = '※ 契約条件の詳細は別途契約書に記載されます'
  worksheet.getCell(`A${currentRow}`).font = { name: 'MS PGothic', size: 8 }
  worksheet.mergeCells(`A${currentRow}:E${currentRow}`)

  // ファイルを保存
  const templatePath = path.join(__dirname, '../templates/documents/order_acceptance_template.xlsx')
  await workbook.xlsx.writeFile(templatePath)

  console.log('✅ 注文請書テンプレートを作成しました:', templatePath)

  // セルマッピング情報を表示
  console.log('\n📋 セルマッピング情報:')
  console.log('orderNumber: B5')
  console.log('orderDate: B6')
  console.log('contractorName: B8')
  console.log('contractorEmail: B9')
  console.log('contractorAddress: B10')
  console.log('contractorPhone: B11')
  console.log('clientName: B13')
  console.log('clientEmail: B14')
  console.log('projectTitle: B16')
  console.log('projectAmount: B17')
  console.log('deadline: B18')
  console.log('workLocation: B19')
  console.log('acceptanceDate: B21')
  console.log('createdAt: E2')
}

// スクリプトを実行
createOrderAcceptanceTemplate()
  .then(() => {
    console.log('注文請書テンプレート作成完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('エラー:', error)
    process.exit(1)
  })