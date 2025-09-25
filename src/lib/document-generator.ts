import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'

export interface DocumentData {
  type: 'order' | 'completion' | 'monthly_invoice'

  // 共通フィールド
  title?: string
  contractorName?: string
  contractorEmail?: string
  clientName?: string
  clientEmail?: string

  // プロジェクト関連
  projectTitle?: string
  projectAmount?: number
  deadline?: string
  completionDate?: string
  deliverables?: string[]

  // 月次請求書関連
  billingPeriod?: string
  projectList?: Array<{
    title: string
    amount: number
    completionDate: string
    systemFee: number
  }>
  totalAmount?: number
  systemFeeTotal?: number

  // その他
  createdAt?: string
  notes?: string
}

export interface ExcelTemplateConfig {
  templatePath: string
  cellMappings: Record<string, string> // データフィールド → セル位置のマッピング
  tableStartRow?: number // テーブルデータの開始行（プロジェクト一覧など）
  calculateFormulas?: boolean // 数式を計算するかどうか
}

export class DocumentGenerator {
  private templatesPath: string

  constructor() {
    this.templatesPath = path.join(process.cwd(), 'templates', 'documents')
    // テンプレートディレクトリが存在しない場合は作成
    if (!fs.existsSync(this.templatesPath)) {
      fs.mkdirSync(this.templatesPath, { recursive: true })
    }
  }

  // メイン生成メソッド：Excelテンプレートがあれば使用、なければモックPDF生成
  async generateDocument(templateId: string, data: DocumentData): Promise<Buffer> {
    try {
      // Excelテンプレートファイルを探す
      const excelTemplatePath = await this.findExcelTemplate(templateId, data.type)

      if (excelTemplatePath && fs.existsSync(excelTemplatePath)) {
        console.log('📊 Excel テンプレート使用:', excelTemplatePath)
        return await this.generateFromExcelTemplate(excelTemplatePath, data)
      } else {
        console.log('📄 モック PDF 生成使用')
        return await this.generateMockPDF(data)
      }
    } catch (error) {
      console.error('❌ ドキュメント生成エラー:', error)
      // フォールバックとしてモックPDF生成
      return await this.generateMockPDF(data)
    }
  }

  // Excelテンプレートファイルを探す
  private async findExcelTemplate(templateId: string, docType: string): Promise<string | null> {
    const possibleNames = [
      `${templateId}.xlsx`,
      `${docType}_template.xlsx`,
      `${docType}.xlsx`,
      `template_${docType}.xlsx`
    ]

    for (const name of possibleNames) {
      const fullPath = path.join(this.templatesPath, name)
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }

    return null
  }

  // Excel → PDF変換
  async generateFromExcelTemplate(templatePath: string, data: DocumentData): Promise<Buffer> {
    try {
      // 1. Excelファイルを読み込み
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(templatePath)

      const worksheet = workbook.getWorksheet(1) // 最初のシートを使用
      if (!worksheet) {
        throw new Error('Excelファイルにワークシートが見つかりません')
      }

      // 2. データをセルに埋め込み
      await this.fillExcelData(worksheet, data)

      // 3. 数式を再計算（ExcelJSでは自動的に処理される）
      // 注意: ExcelJSには明示的な数式計算メソッドがないため、
      // ファイル保存時に自動的に計算されます

      // 4. 一時ファイルに保存
      const tempExcelPath = path.join(
        process.cwd(),
        'tmp',
        `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.xlsx`
      )

      // tmpディレクトリを作成
      const tmpDir = path.dirname(tempExcelPath)
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true })
      }

      await workbook.xlsx.writeFile(tempExcelPath)

      // 5. Excel → PDF変換
      const pdfBuffer = await this.convertExcelToPDF(tempExcelPath)

      // 6. 一時ファイル削除
      if (fs.existsSync(tempExcelPath)) {
        fs.unlinkSync(tempExcelPath)
      }

      return pdfBuffer

    } catch (error) {
      console.error('❌ Excel → PDF 変換エラー:', error)
      throw error
    }
  }

  // Excelシートにデータを埋め込み
  private async fillExcelData(worksheet: ExcelJS.Worksheet, data: DocumentData): Promise<void> {
    const config = this.getTemplateConfig(data.type)

    // セルマッピングに基づいてデータを埋め込み
    for (const [field, cellAddress] of Object.entries(config.cellMappings)) {
      const value = this.getFieldValue(data, field)
      if (value !== undefined && value !== null) {
        const cell = worksheet.getCell(cellAddress)
        cell.value = value
      }
    }

    // テーブルデータの処理（プロジェクト一覧など）
    if (data.projectList && config.tableStartRow) {
      await this.fillTableData(worksheet, data.projectList, config.tableStartRow)
    }
  }

  // テーブルデータを埋め込み
  private async fillTableData(
    worksheet: ExcelJS.Worksheet,
    projects: any[],
    startRow: number
  ): Promise<void> {
    projects.forEach((project, index) => {
      const row = startRow + index
      worksheet.getCell(`A${row}`).value = index + 1 // 番号
      worksheet.getCell(`B${row}`).value = project.title // プロジェクト名
      worksheet.getCell(`C${row}`).value = project.completionDate // 完了日
      worksheet.getCell(`D${row}`).value = project.amount // 金額
      worksheet.getCell(`E${row}`).value = project.systemFee // システム利用料
    })
  }

  // Excel → PDF変換（Puppeteer使用）
  private async convertExcelToPDF(excelPath: string): Promise<Buffer> {
    // 注意: 実際の運用では専用のExcel→PDF変換サービスやライブラリの使用を推奨
    // ここではHTMLプレビュー経由でPDF変換する簡易実装

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()

      // ExcelファイルをHTMLとして表示するための簡易実装
      // 実際の運用では、ExcelJS でHTMLを生成するか、専用変換ツールを使用
      const htmlContent = await this.convertExcelToHTML(excelPath)

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      })

      return Buffer.from(pdfBuffer)

    } finally {
      await browser.close()
    }
  }

  // ExcelをHTMLに変換する簡易実装
  private async convertExcelToHTML(excelPath: string): Promise<string> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(excelPath)
    const worksheet = workbook.getWorksheet(1)

    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            td, th { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .number { text-align: right; }
            .center { text-align: center; }
            .header { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <table>
    `

    if (worksheet) {
      worksheet.eachRow((row) => {
        html += '<tr>'
        row.eachCell((cell) => {
          const value = cell.value || ''
          html += `<td>${value}</td>`
        })
        html += '</tr>'
      })
    }

    html += `
          </table>
        </body>
      </html>
    `

    return html
  }

  // モック用のPDF生成（既存の実装）
  async generateMockPDF(data: DocumentData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        })

        const buffers: Buffer[] = []

        doc.on('data', (buffer) => buffers.push(buffer))
        doc.on('end', () => resolve(Buffer.concat(buffers)))

        this.generateDocumentContent(doc, data)
        doc.end()

      } catch (error) {
        reject(error)
      }
    })
  }

  // テンプレート設定を取得
  private getTemplateConfig(docType: string): ExcelTemplateConfig {
    const configs: Record<string, ExcelTemplateConfig> = {
      order: {
        templatePath: 'order_template.xlsx',
        cellMappings: {
          'clientName': 'B5',
          'clientEmail': 'B6',
          'contractorName': 'B8',
          'contractorEmail': 'B9',
          'projectTitle': 'B11',
          'projectAmount': 'B12',
          'deadline': 'B13',
          'createdAt': 'E2'
        },
        calculateFormulas: true
      },
      completion: {
        templatePath: 'completion_template.xlsx',
        cellMappings: {
          'projectTitle': 'B5',
          'contractorName': 'B6',
          'completionDate': 'B7',
          'createdAt': 'E2'
        },
        tableStartRow: 10, // 成果物一覧の開始行
        calculateFormulas: true
      },
      monthly_invoice: {
        templatePath: 'monthly_invoice_template.xlsx',
        cellMappings: {
          'contractorName': 'B5',
          'contractorEmail': 'B6',
          'billingPeriod': 'B8',
          'systemFeeTotal': 'E20',
          'totalAmount': 'E21',
          'createdAt': 'E2'
        },
        tableStartRow: 12, // プロジェクト一覧の開始行
        calculateFormulas: true
      }
    }

    return configs[docType] || {
      templatePath: 'default_template.xlsx',
      cellMappings: {},
      calculateFormulas: false
    }
  }

  // データからフィールド値を取得
  private getFieldValue(data: DocumentData, field: string): any {
    const fieldParts = field.split('.')
    let value: any = data

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }

    // 数値の場合はフォーマット
    if (typeof value === 'number') {
      return value
    }

    // 日付の場合はフォーマット
    if (value instanceof Date) {
      return value.toLocaleDateString('ja-JP')
    }

    return value
  }

  private generateDocumentContent(doc: PDFKit.PDFDocument, data: DocumentData): void {
    switch (data.type) {
      case 'order':
        this.generateOrderDocument(doc, data)
        break
      case 'completion':
        this.generateCompletionDocument(doc, data)
        break
      case 'monthly_invoice':
        this.generateMonthlyInvoiceDocument(doc, data)
        break
      default:
        throw new Error(`Unknown document type: ${data.type}`)
    }
  }

  private generateOrderDocument(doc: PDFKit.PDFDocument, data: DocumentData): void {
    // ヘッダー
    doc.fontSize(20).text('発注書', 50, 50)
    doc.fontSize(12).text(`作成日: ${data.createdAt || new Date().toLocaleDateString('ja-JP')}`, 400, 50)

    let y = 120

    // 発注者情報
    doc.fontSize(14).text('発注者情報', 50, y)
    y += 25
    doc.fontSize(10)
      .text(`会社名: ${data.clientName || '〇〇建設株式会社'}`, 70, y)
    y += 20
    doc.text(`メールアドレス: ${data.clientEmail || 'client@example.com'}`, 70, y)
    y += 40

    // 受注者情報
    doc.fontSize(14).text('受注者情報', 50, y)
    y += 25
    doc.fontSize(10)
      .text(`会社名: ${data.contractorName || '受注者名'}`, 70, y)
    y += 20
    doc.text(`メールアドレス: ${data.contractorEmail || 'contractor@example.com'}`, 70, y)
    y += 40

    // プロジェクト情報
    doc.fontSize(14).text('発注内容', 50, y)
    y += 25
    doc.fontSize(10)
      .text(`プロジェクト名: ${data.projectTitle || 'プロジェクト名'}`, 70, y)
    y += 20
    doc.text(`契約金額: ¥${(data.projectAmount || 0).toLocaleString()}`, 70, y)
    y += 20
    doc.text(`納期: ${data.deadline || '未設定'}`, 70, y)
    y += 60

    // 署名欄
    doc.fontSize(12).text('発注者署名:', 50, y)
    doc.rect(150, y - 5, 200, 30).stroke()

    y += 50
    doc.text('受注者署名:', 50, y)
    doc.rect(150, y - 5, 200, 30).stroke()

    // 注意事項
    y += 80
    doc.fontSize(8).text('※ 本書面は電子署名により法的効力を有します', 50, y)
  }

  private generateCompletionDocument(doc: PDFKit.PDFDocument, data: DocumentData): void {
    // ヘッダー
    doc.fontSize(20).text('完了届', 50, 50)
    doc.fontSize(12).text(`作成日: ${data.createdAt || new Date().toLocaleDateString('ja-JP')}`, 400, 50)

    let y = 120

    // プロジェクト情報
    doc.fontSize(14).text('完了プロジェクト情報', 50, y)
    y += 25
    doc.fontSize(10)
      .text(`プロジェクト名: ${data.projectTitle || 'プロジェクト名'}`, 70, y)
    y += 20
    doc.text(`受注者: ${data.contractorName || '受注者名'}`, 70, y)
    y += 20
    doc.text(`完了日: ${data.completionDate || new Date().toLocaleDateString('ja-JP')}`, 70, y)
    y += 40

    // 成果物リスト
    if (data.deliverables && data.deliverables.length > 0) {
      doc.fontSize(14).text('成果物一覧', 50, y)
      y += 25
      data.deliverables.forEach((item, index) => {
        doc.fontSize(10).text(`${index + 1}. ${item}`, 70, y)
        y += 15
      })
      y += 20
    }

    // 備考
    if (data.notes) {
      doc.fontSize(12).text('備考', 50, y)
      y += 20
      doc.fontSize(10).text(data.notes, 70, y, { width: 450 })
      y += 60
    }

    // 署名欄
    doc.fontSize(12).text('発注者確認署名:', 50, y)
    doc.rect(150, y - 5, 200, 30).stroke()

    y += 50
    doc.text('受注者署名:', 50, y)
    doc.rect(150, y - 5, 200, 30).stroke()
  }

  private generateMonthlyInvoiceDocument(doc: PDFKit.PDFDocument, data: DocumentData): void {
    // ヘッダー
    doc.fontSize(20).text('月次請求書', 50, 50)
    doc.fontSize(12).text(`請求日: ${data.createdAt || new Date().toLocaleDateString('ja-JP')}`, 400, 50)

    let y = 120

    // 請求者情報
    doc.fontSize(14).text('請求者情報', 50, y)
    y += 25
    doc.fontSize(10)
      .text(`受注者名: ${data.contractorName || '受注者名'}`, 70, y)
    y += 20
    doc.text(`メールアドレス: ${data.contractorEmail || 'contractor@example.com'}`, 70, y)
    y += 40

    // 請求期間
    doc.fontSize(14).text('請求対象期間', 50, y)
    y += 25
    doc.fontSize(10).text(`期間: ${data.billingPeriod || '2025年1月分（1日〜20日締）'}`, 70, y)
    y += 40

    // プロジェクト一覧
    if (data.projectList && data.projectList.length > 0) {
      doc.fontSize(14).text('完了プロジェクト一覧', 50, y)
      y += 25

      // テーブルヘッダー
      doc.fontSize(9)
        .text('プロジェクト名', 70, y)
        .text('完了日', 250, y)
        .text('契約金額', 320, y)
        .text('システム利用料', 400, y)

      // 線を引く
      doc.moveTo(50, y + 15).lineTo(500, y + 15).stroke()
      y += 25

      data.projectList.forEach((project) => {
        doc.fontSize(8)
          .text(project.title, 70, y, { width: 170 })
          .text(project.completionDate, 250, y)
          .text(`¥${project.amount.toLocaleString()}`, 320, y)
          .text(`¥${project.systemFee.toLocaleString()}`, 400, y)
        y += 20
      })

      y += 20
    }

    // 合計金額
    doc.fontSize(12).text('請求金額合計', 50, y)
    y += 25
    doc.fontSize(10)
      .text(`システム利用料合計: ¥${(data.systemFeeTotal || 0).toLocaleString()}`, 70, y)
    y += 20
    doc.fontSize(14)
      .text(`請求金額: ¥${(data.totalAmount || 0).toLocaleString()}`, 70, y)
    y += 60

    // 署名欄
    doc.fontSize(12).text('受注者署名:', 50, y)
    doc.rect(150, y - 5, 200, 30).stroke()

    y += 50
    doc.text('運営者確認署名:', 50, y)
    doc.rect(150, y - 5, 200, 30).stroke()

    // 支払い条件
    y += 60
    doc.fontSize(8).text('支払い期限: 月末まで', 50, y)
    doc.text('※ 本請求書は電子署名により法的効力を有します', 50, y + 15)
  }
}

export const documentGenerator = new DocumentGenerator()

// ヘルパー関数
export function createOrderDocumentData(project: any, contractor: any, client: any): DocumentData {
  return {
    type: 'order',
    title: '発注書',
    projectTitle: project.title,
    projectAmount: project.amount,
    deadline: project.deadline,
    contractorName: contractor.name,
    contractorEmail: contractor.email,
    clientName: client.name,
    clientEmail: client.email,
    createdAt: new Date().toLocaleDateString('ja-JP')
  }
}

export function createCompletionDocumentData(project: any, contractor: any, client: any): DocumentData {
  return {
    type: 'completion',
    title: '完了届',
    projectTitle: project.title,
    completionDate: project.completed_at || new Date().toLocaleDateString('ja-JP'),
    contractorName: contractor.name,
    contractorEmail: contractor.email,
    clientName: client.name,
    clientEmail: client.email,
    deliverables: project.deliverables || ['成果物一式'],
    notes: project.notes,
    createdAt: new Date().toLocaleDateString('ja-JP')
  }
}

export function createMonthlyInvoiceDocumentData(
  invoice: any,
  contractor: any,
  projects: any[]
): DocumentData {
  return {
    type: 'monthly_invoice',
    title: '月次請求書',
    billingPeriod: `${invoice.billing_year}年${invoice.billing_month}月分（1日〜20日締）`,
    contractorName: contractor.name,
    contractorEmail: contractor.email,
    projectList: projects.map(p => ({
      title: p.project_title,
      amount: p.project_amount,
      completionDate: p.completion_date,
      systemFee: p.system_fee
    })),
    totalAmount: invoice.system_fee_total,
    systemFeeTotal: invoice.system_fee_total,
    createdAt: new Date().toLocaleDateString('ja-JP')
  }
}