const path = require('path')

// document-generatorをインポート
async function testCompletionPDF() {
  try {
    // ESMモジュールを動的インポート
    const module = await import('../src/lib/completion-report-generator.ts')
    const generateCompletionReportPDF = module.generateCompletionReportPDF || module.default?.generateCompletionReportPDF

    if (!generateCompletionReportPDF) {
      console.error('❌ generateCompletionReportPDF関数が見つかりません')
      console.log('利用可能なエクスポート:', Object.keys(module))
      process.exit(1)
    }

    const fs = require('fs')

    // テストデータ
    const testData = {
      project: {
        id: 'test-project-id',
        title: '災害査定その１',
        client_organization: {
          id: 'client-org-id',
          name: 'ふんどし太郎'
        },
        contractor_organization: {
          id: 'contractor-org-id',
          name: 'ふんどし太郎'
        }
      },
      contract: {
        id: 'test-contract-id',
        bid_amount: 50000,
        start_date: '2025-09-01',
        end_date: '2025-10-04'
      },
      contractor: {
        id: 'test-contractor-id',
        display_name: 'ふんどし太郎',
        email: 'contractor@example.com'
      },
      completionDate: '2025-10-04',
      createdAt: '2025/10/5'
    }

    console.log('📋 テストデータ:', JSON.stringify(testData, null, 2))
    console.log('🔄 PDF生成開始...')

    // PDF生成
    const pdfBuffer = await generateCompletionReportPDF(testData)

    // PDFを保存
    const outputPath = path.join(process.cwd(), 'tmp', 'test-completion-report.pdf')
    fs.writeFileSync(outputPath, pdfBuffer)

    console.log(`✅ PDF生成成功！`)
    console.log(`📄 保存先: ${outputPath}`)
    console.log(`📊 ファイルサイズ: ${pdfBuffer.length} bytes`)

    // ファイルを開く
    const { exec } = require('child_process')
    exec(`open "${outputPath}"`, (error) => {
      if (error) {
        console.error('❌ PDFを開く際にエラーが発生:', error)
      } else {
        console.log('✅ PDFを開きました')
      }
    })

  } catch (error) {
    console.error('❌ エラー発生:', error)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

testCompletionPDF()
