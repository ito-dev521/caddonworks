import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import puppeteer from 'puppeteer'
import path from 'path'
import fs from 'fs'
import { PDFDocument as PDFLib, rgb, StandardFonts } from 'pdf-lib'

export interface DocumentData {
  type: 'order' | 'order_acceptance' | 'completion' | 'monthly_invoice'

  // 共通フィールド
  title?: string
  contractorName?: string
  contractorEmail?: string
  contractorAddress?: string
  contractorPhone?: string
  contractorPostalCode?: string
  clientName?: string
  clientEmail?: string
  clientAddress?: string
  clientBuilding?: string
  clientRepresentative?: string

  // プロジェクト関連
  projectTitle?: string
  projectAmount?: number
  startDate?: string
  deadline?: string
  completionDate?: string
  deliverables?: string[]
  workLocation?: string

  // 注文請書関連
  orderNumber?: string
  orderDate?: string
  acceptanceDate?: string
  supportEnabled?: boolean
  supportFeePercent?: number

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

  // メイン生成メソッド：PDFテンプレート優先、次にExcel、最後にモック
  async generateDocument(templateId: string, data: DocumentData): Promise<Buffer> {
    try {
      // PDFテンプレートファイルを探す
      const pdfTemplatePath = await this.findPDFTemplate(templateId, data.type)

      if (pdfTemplatePath && fs.existsSync(pdfTemplatePath)) {
        console.log('📄 PDF テンプレート使用:', pdfTemplatePath)
        return await this.generateFromPDFTemplate(pdfTemplatePath, data)
      }

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

  // PDFテンプレートファイルを探す
  private async findPDFTemplate(templateId: string, docType: string): Promise<string | null> {
    const possibleNames = [
      `${templateId}.pdf`,
      `${docType}_template.pdf`,
      `${docType}.pdf`,
      `template_${docType}.pdf`
    ]

    for (const name of possibleNames) {
      const fullPath = path.join(this.templatesPath, name)
      if (fs.existsSync(fullPath)) {
        return fullPath
      }
    }

    return null
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

  // PDFテンプレート → データ埋め込みPDF生成
  async generateFromPDFTemplate(templatePath: string, data: DocumentData): Promise<Buffer> {
    try {
      console.log('📋 PDFテンプレート処理開始:', templatePath)
      console.log('📊 埋め込みデータ:', data)

      // PDFテンプレートを読み込み
      const templateBytes = fs.readFileSync(templatePath)
      const pdfDoc = await PDFLib.load(templateBytes)

      // フォントを埋め込み（日本語対応）
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

      // 最初のページを取得
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]

      // データを座標指定で埋め込み
      const positions = this.getPDFFieldPositions(data.type)

      // 各フィールドをPDFに描画
      for (const [field, position] of Object.entries(positions)) {
        const value = this.getFieldValue(data, field)
        if (value !== undefined && value !== null && value !== '') {
          console.log(`✏️ PDF描画: ${field} = "${value}" at (${position.x}, ${position.y})`)

          firstPage.drawText(String(value), {
            x: position.x,
            y: position.y,
            size: position.size || 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          })
        } else {
          console.log(`⚠️ フィールド ${field} の値が空です`)
        }
      }

      // PDFを生成してBufferとして返す
      const pdfBytes = await pdfDoc.save()
      console.log('✅ PDFテンプレート処理完了')

      return Buffer.from(pdfBytes)

    } catch (error) {
      console.error('❌ PDFテンプレート処理エラー:', error)
      throw error
    }
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

    console.log('📋 セルマッピング設定:', config.cellMappings)
    console.log('📊 入力データ:', data)

    // まずテンプレートの現在の内容を確認
    console.log('📝 テンプレートの現在の内容:')
    for (let row = 1; row <= Math.min(10, worksheet.rowCount); row++) {
      for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
        const cell = worksheet.getCell(row, col)
        if (cell.value) {
          console.log(`  [${row},${col}] = "${cell.value}"`)
        }
      }
    }

    // セルマッピングに基づいてデータを埋め込み
    for (const [field, cellAddress] of Object.entries(config.cellMappings)) {
      const value = this.getFieldValue(data, field)
      console.log(`🔄 ${field} -> ${cellAddress}: "${value}"`)

      if (value !== undefined && value !== null) {
        const cell = worksheet.getCell(cellAddress)
        const originalValue = cell.value
        cell.value = value
        console.log(`✅ セル ${cellAddress}: "${originalValue}" -> "${value}"`)
      } else {
        console.log(`⚠️ フィールド ${field} の値が空です`)
      }
    }

    // セル結合の適用（完了届専用）
    if (data.type === 'completion') {
      await this.applyCellMerging(worksheet, data)
    }

    // テーブルデータの処理（プロジェクト一覧など）
    if (data.projectList && config.tableStartRow) {
      await this.fillTableData(worksheet, data.projectList, config.tableStartRow)
    }
  }

  // セル結合を適用（完了届専用）
  private async applyCellMerging(worksheet: ExcelJS.Worksheet, data: DocumentData): Promise<void> {
    try {
      console.log('🔗 セル結合を適用中...')

      // 各セル結合の前に、既存の結合をチェックして解除
      const unmergeIfNeeded = (range: string) => {
        try {
          // 既に結合されている場合は解除
          if (worksheet.model.merges && worksheet.model.merges.includes(range)) {
            worksheet.unMergeCells(range)
          }
        } catch (e) {
          // エラーは無視（既に解除されている）
        }
      }

      // 1行目：業務完了届ヘッダーを結合（A1:E1）
      unmergeIfNeeded('A1:E1')
      worksheet.mergeCells('A1:E1')
      const headerCell = worksheet.getCell('A1')
      headerCell.value = '業務完了届'
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
      headerCell.font = { bold: true, size: 14 }
      console.log('✅ ヘッダーセル結合: A1:E1 = "業務完了届"')

      // 4行目：プロジェクト情報ヘッダーを結合（A4:E4）
      unmergeIfNeeded('A4:E4')
      worksheet.mergeCells('A4:E4')
      const projectHeaderCell = worksheet.getCell('A4')
      projectHeaderCell.value = 'プロジェクト情報'
      projectHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
      projectHeaderCell.font = { bold: true }
      console.log('✅ プロジェクト情報ヘッダー結合: A4:E4 = "プロジェクト情報"')

      // プロジェクト名：B5からE5まで結合
      if (data.projectTitle) {
        unmergeIfNeeded('B5:E5')
        worksheet.mergeCells('B5:E5')
        const mergedCell = worksheet.getCell('B5')
        mergedCell.value = data.projectTitle
        mergedCell.alignment = { horizontal: 'left', vertical: 'middle' }
        console.log(`✅ プロジェクト名セル結合: B5:E5 = "${data.projectTitle}"`)
      }

      // 受注者名：B6からE6まで結合
      if (data.contractorName) {
        unmergeIfNeeded('B6:E6')
        worksheet.mergeCells('B6:E6')
        const mergedCell = worksheet.getCell('B6')
        mergedCell.value = data.contractorName
        mergedCell.alignment = { horizontal: 'left', vertical: 'middle' }
        console.log(`✅ 受注者名セル結合: B6:E6 = "${data.contractorName}"`)
      }

      // 完了日：B7からE7まで結合
      if (data.completionDate) {
        unmergeIfNeeded('B7:E7')
        worksheet.mergeCells('B7:E7')
        const mergedCell = worksheet.getCell('B7')
        mergedCell.value = data.completionDate
        mergedCell.alignment = { horizontal: 'left', vertical: 'middle' }
        console.log(`✅ 完了日セル結合: B7:E7 = "${data.completionDate}"`)
      }

      // 契約金額：B8からE8まで結合
      if (data.projectAmount) {
        unmergeIfNeeded('B8:E8')
        worksheet.mergeCells('B8:E8')
        const mergedCell = worksheet.getCell('B8')
        mergedCell.value = `¥${Number(data.projectAmount).toLocaleString('ja-JP')}`
        mergedCell.alignment = { horizontal: 'left', vertical: 'middle' }
        console.log(`✅ 契約金額セル結合: B8:E8 = "¥${Number(data.projectAmount).toLocaleString('ja-JP')}"`)
      }

      // 10行目：成果物一覧ヘッダーを結合（A10:E10）
      unmergeIfNeeded('A10:E10')
      worksheet.mergeCells('A10:E10')
      const deliverableHeaderCell = worksheet.getCell('A10')
      deliverableHeaderCell.value = '成果物'
      deliverableHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
      deliverableHeaderCell.font = { bold: true }
      console.log('✅ 成果物ヘッダー結合: A10:E10 = "成果物"')

    } catch (error) {
      console.error('❌ セル結合エラー:', error)
    }
  }

  // 重複する値のセルを結合
  private async mergeDuplicateValues(worksheet: ExcelJS.Worksheet): Promise<void> {
    try {
      // 1行目の「業務完了届」ヘッダーを結合
      const headerRow = 1
      let startCol = 1
      let currentValue = ''

      for (let col = 1; col <= 6; col++) {
        const cell = worksheet.getCell(headerRow, col)
        const cellValue = cell.value
        let value = ''
        if (cellValue !== null && cellValue !== undefined) {
          if (typeof cellValue === 'object' && 'result' in cellValue) {
            value = String(cellValue.result || '')
          } else {
            value = String(cellValue)
          }
        }

        if (value === '業務完了届' && currentValue === '') {
          currentValue = value
          startCol = col
        } else if (value !== currentValue && currentValue === '業務完了届') {
          // 同じ値の範囲を結合
          if (col - startCol > 1) {
            const range = `${this.getColumnLetter(startCol)}${headerRow}:${this.getColumnLetter(col - 1)}${headerRow}`
            worksheet.mergeCells(range)
            const mergedCell = worksheet.getCell(headerRow, startCol)
            mergedCell.value = currentValue
            mergedCell.alignment = { horizontal: 'center', vertical: 'middle' }
            console.log(`✅ ヘッダー結合: ${range} = "${currentValue}"`)
          }
          currentValue = ''
        }
      }

    } catch (error) {
      console.error('❌ 重複値結合エラー:', error)
    }
  }

  // 列番号を列文字に変換（A, B, C...）
  private getColumnLetter(columnNumber: number): string {
    let result = ''
    while (columnNumber > 0) {
      columnNumber--
      result = String.fromCharCode(65 + (columnNumber % 26)) + result
      columnNumber = Math.floor(columnNumber / 26)
    }
    return result
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
    console.log('🔄 Puppeteer起動中...')

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })

    try {
      const page = await browser.newPage()

      console.log('📄 ExcelをHTMLに変換中...')
      const htmlContent = await this.convertExcelToHTML(excelPath)

      // デバッグ用: HTMLを一時保存
      if (process.env.NODE_ENV === 'development') {
        const fs = require('fs')
        const debugHtmlPath = excelPath.replace('.xlsx', '_debug.html')
        fs.writeFileSync(debugHtmlPath, htmlContent)
        console.log(`📝 デバッグ用HTML保存: ${debugHtmlPath}`)
      }

      console.log('🌐 HTMLをブラウザにロード中...')
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      // ページサイズを取得して調整
      await page.evaluateHandle('document.fonts.ready')

      console.log('🖨️ PDFを生成中...')
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        margin: {
          top: '8mm',
          right: '16mm',
          bottom: '8mm',
          left: '30mm'
        },
        scale: 0.98
      })

      console.log(`✅ PDF生成完了: ${pdfBuffer.length} bytes`)

      return Buffer.from(pdfBuffer)

    } catch (error) {
      console.error('❌ Excel→PDF変換エラー:', error)
      throw error
    } finally {
      await browser.close()
      console.log('🔚 Puppeteer終了')
    }
  }

  // ExcelをHTMLに変換する改良実装
  private async convertExcelToHTML(excelPath: string): Promise<string> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(excelPath)
    const worksheet = workbook.getWorksheet(1)

    if (!worksheet) {
      throw new Error('ワークシートが見つかりません')
    }

    // セル結合情報を取得
    const mergedCells = new Map<string, { rowspan: number; colspan: number }>()
    const skipCells = new Set<string>()

    worksheet.model.merges?.forEach((merge: string) => {
      // 例: "A1:C1" → startCell="A1", endCell="C1"
      const [startCell, endCell] = merge.split(':')
      const startRef = this.parseCellRef(startCell)
      const endRef = this.parseCellRef(endCell)

      const rowspan = endRef.row - startRef.row + 1
      const colspan = endRef.col - startRef.col + 1

      mergedCells.set(startCell, { rowspan, colspan })

      // 結合範囲内のセルをスキップリストに追加
      for (let r = startRef.row; r <= endRef.row; r++) {
        for (let c = startRef.col; c <= endRef.col; c++) {
          if (r !== startRef.row || c !== startRef.col) {
            skipCells.add(this.getCellAddress(r, c))
          }
        }
      }
    })

    // 列幅情報を取得してCSSに変換
    const colWidths: string[] = []
    const maxCols = worksheet.columnCount || 10

    // 全列の合計幅を計算
    let totalWidth = 0
    const columnWidths: number[] = []
    for (let col = 1; col <= maxCols; col++) {
      const column = worksheet.getColumn(col)
      const width = column.width || 10
      columnWidths.push(width)
      totalWidth += width
    }

    // 各列の幅をパーセンテージに変換
    for (let col = 1; col <= maxCols; col++) {
      const widthPercent = (columnWidths[col - 1] / totalWidth * 100).toFixed(2)
      colWidths.push(`.col-${col} { width: ${widthPercent}%; }`)
    }

    // <colgroup>タグを生成（列幅を明示的に指定）
    let colgroupHtml = '<colgroup>\n'
    for (let col = 1; col <= maxCols; col++) {
      const widthPercent = (columnWidths[col - 1] / totalWidth * 100).toFixed(2)
      colgroupHtml += `    <col style="width: ${widthPercent}%;">\n`
    }
    colgroupHtml += '  </colgroup>\n'

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 10mm 20mm 10mm 30mm;
            }
            body {
              font-family: 'Noto Sans JP', 'Yu Gothic', 'MS PGothic', 'Hiragino Sans', sans-serif;
              font-size: 10pt;
              margin: 0;
              padding: 5px;
              background: white;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              max-width: 100%;
              border: none;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              max-width: 100%;
              border: none;
            }
            td {
              padding: 8px 10px;
              vertical-align: middle;
              word-wrap: break-word;
              overflow-wrap: break-word;
              line-height: 1.5;
              font-size: 9pt;
            }
            ${colWidths.join('\n            ')}
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .valign-top { vertical-align: top; }
            .valign-middle { vertical-align: middle; }
            .valign-bottom { vertical-align: bottom; }
            .font-bold { font-weight: bold; }
            .font-large { font-size: 14pt; }
            .font-xlarge { font-size: 18pt; }
            .no-border { border: none !important; }
            .border-thick { border-width: 2px; }
          </style>
        </head>
        <body>
          <table>
            ${colgroupHtml}
    `

    const maxRow = worksheet.rowCount
    const maxCol = worksheet.columnCount

    for (let rowNum = 1; rowNum <= maxRow; rowNum++) {
      // 完了届の場合は3行目（罫線）と9行目以降（日付より下）をスキップ
      const isCompletionTemplate = worksheet.getCell('A1').value?.toString().includes('業務完了届')
      if (isCompletionTemplate && (rowNum === 3 || rowNum >= 9)) {
        continue
      }

      const row = worksheet.getRow(rowNum)
      const rowHeight = row.height ? `style="height: ${row.height * 1.33}px;"` : ''

      html += `<tr ${rowHeight}>`

      for (let colNum = 1; colNum <= maxCol; colNum++) {
        const cellAddress = this.getCellAddress(rowNum, colNum)

        // スキップするセル（結合範囲内）
        if (skipCells.has(cellAddress)) {
          continue
        }

        const cell = worksheet.getCell(rowNum, colNum)

        // セル結合属性
        let colspan = 1
        let rowspan = 1
        if (mergedCells.has(cellAddress)) {
          const merge = mergedCells.get(cellAddress)!
          rowspan = merge.rowspan
          colspan = merge.colspan
        }

        // セル値の取得
        let value = ''
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object' && 'result' in cell.value) {
            value = String(cell.value.result || '')
          } else if (cell.value instanceof Date) {
            value = cell.value.toLocaleDateString('ja-JP')
          } else {
            value = String(cell.value)
          }
        }

        // HTML エスケープ
        value = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')

        // セルスタイルのクラス構築
        const classes: string[] = []

        // 列幅クラスを追加
        classes.push(`col-${colNum}`)

        // 水平方向の配置
        if (cell.alignment?.horizontal === 'center') {
          classes.push('text-center')
        } else if (cell.alignment?.horizontal === 'right') {
          classes.push('text-right')
        } else {
          classes.push('text-left')
        }

        // 完了届の場合、5〜8行目の1列目（ラベル列）を中央揃えにする
        if (isCompletionTemplate && rowNum >= 5 && rowNum <= 8 && colNum === 1) {
          // 既存のtext-leftクラスを削除して、text-centerに置き換え
          const leftIndex = classes.indexOf('text-left')
          if (leftIndex !== -1) {
            classes.splice(leftIndex, 1)
          }
          if (!classes.includes('text-center')) {
            classes.push('text-center')
          }
        }

        // 垂直方向の配置
        if (cell.alignment?.vertical === 'top') {
          classes.push('valign-top')
        } else if (cell.alignment?.vertical === 'bottom') {
          classes.push('valign-bottom')
        } else {
          classes.push('valign-middle')
        }

        // フォントスタイル
        if (cell.font?.bold) {
          classes.push('font-bold')
        }

        if (cell.font?.size && cell.font.size >= 14) {
          classes.push('font-large')
        }

        if (cell.font?.size && cell.font.size >= 18) {
          classes.push('font-xlarge')
        }

        // インラインスタイルの構築
        const styles: string[] = []

        // 背景色
        if (cell.fill && cell.fill.type === 'pattern') {
          const fillColor = (cell.fill as any).fgColor
          if (fillColor && fillColor.argb) {
            const color = this.argbToHex(fillColor.argb)
            styles.push(`background-color: ${color}`)
          }
        }

        // フォント色
        if (cell.font?.color && (cell.font.color as any).argb) {
          const color = this.argbToHex((cell.font.color as any).argb)
          styles.push(`color: ${color}`)
        }

        // フォントサイズ（クラスで対応しきれない場合）
        if (cell.font?.size && cell.font.size < 14 && cell.font.size !== 10) {
          styles.push(`font-size: ${cell.font.size}pt`)
        }

        // 罫線情報を読み取ってスタイルに適用
        if (cell.border) {
          const borderSides = ['top', 'bottom', 'left', 'right'] as const
          for (const side of borderSides) {
            const borderSide = cell.border[side]
            if (borderSide && borderSide.style) {
              // 罫線スタイルを変換（thin, medium, thick -> 1px, 2px, 3px）
              let width = '1px'
              if (borderSide.style === 'medium') {
                width = '2px'
              } else if (borderSide.style === 'thick') {
                width = '3px'
              }

              // 罫線の色を取得
              let color = '#333'
              if (borderSide.color && (borderSide.color as any).argb) {
                color = this.argbToHex((borderSide.color as any).argb)
              }

              styles.push(`border-${side}: ${width} solid ${color}`)
            }
          }
        }

        // 完了届の場合、2行目と4行目の間の境界線を非表示
        if (isCompletionTemplate && rowNum === 2) {
          // 2行目全体に上線と下線を表示
          styles.push('border-top: 1px solid #333')
          styles.push('border-bottom: 1px solid #333')
          // 2行目の1〜3列目（作成日の左側）は左右の罫線を非表示
          if (colNum >= 1 && colNum <= 3) {
            styles.push('border-left: none')
            styles.push('border-right: none')
          }
        }
        if (isCompletionTemplate && rowNum === 4) {
          // 4行目（プロジェクト情報）の上線を表示
          styles.push('border-top: 1px solid #333')
        }

        // 完了届の場合、5〜8行目の1列目（ラベル列）に背景色を追加
        // プロジェクト情報ヘッダーと同じ背景色を使用
        if (isCompletionTemplate && rowNum >= 5 && rowNum <= 8 && colNum === 1) {
          // Excelの背景色を確認して同じ色を適用
          styles.push('background-color: #D6EAF8')
        }

        const classAttr = classes.length > 0 ? `class="${classes.join(' ')}"` : ''
        const styleAttr = styles.length > 0 ? `style="${styles.join('; ')}"` : ''
        const spanAttrs = `${rowspan > 1 ? `rowspan="${rowspan}"` : ''} ${colspan > 1 ? `colspan="${colspan}"` : ''}`

        html += `<td ${classAttr} ${styleAttr} ${spanAttrs}>${value}</td>`
      }

      html += '</tr>'
    }

    html += `
          </table>
        </body>
      </html>
    `

    return html
  }

  // セル参照文字列（例: "A1"）をパース
  private parseCellRef(cellRef: string): { row: number; col: number } {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/)
    if (!match) {
      throw new Error(`Invalid cell reference: ${cellRef}`)
    }

    const colStr = match[1]
    const rowStr = match[2]

    let col = 0
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64)
    }

    const row = parseInt(rowStr, 10)

    return { row, col }
  }

  // 行列番号からセルアドレスを生成（例: 1,1 → "A1"）
  private getCellAddress(row: number, col: number): string {
    let colStr = ''
    let c = col
    while (c > 0) {
      const mod = (c - 1) % 26
      colStr = String.fromCharCode(65 + mod) + colStr
      c = Math.floor((c - 1) / 26)
    }
    return `${colStr}${row}`
  }

  // ARGB色コードをHEXに変換
  private argbToHex(argb: string): string {
    if (argb.length === 8) {
      // ARGB形式（例: "FFFF0000"）
      const r = argb.substring(2, 4)
      const g = argb.substring(4, 6)
      const b = argb.substring(6, 8)
      return `#${r}${g}${b}`
    }
    return '#000000'
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
      order_acceptance: {
        templatePath: 'order_acceptance_template.xlsx',
        cellMappings: {
          'orderNumber': 'B2',          // 注文書番号
          'orderDate': 'B3',            // 注文日
          'contractorName': 'B5',       // 発注者（請書作成者）会社名
          'contractorEmail': 'B6',      // 発注者（請書作成者）メールアドレス
          'clientName': 'B8',           // 受注者会社名
          'clientEmail': 'B9',          // 受注者メールアドレス
          'projectTitle': 'B11',        // 案件名
          'projectAmount': 'B12',       // 契約金額
          'startDate': 'B13',           // 開始日
          'deadline': 'B14'             // 納期日
        },
        calculateFormulas: true
      },
      completion: {
        templatePath: 'completion_template.xlsx',
        cellMappings: {
          'projectTitle': 'B5',      // プロジェクト名：セルB5
          'contractorName': 'B6',    // 受注者名：セルB6
          'completionDate': 'B7',    // 完了日：セルB7
          'projectAmount': 'B8',     // 契約金額：セルB8
          'createdAt': 'E2'          // 作成日（右上）：セルE2
        },
        tableStartRow: 12, // 成果物一覧の開始行（10行目がヘッダー、11行目が備考、12行目からデータ）
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

  // データからフィールド値を取得（改良版）
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

    // 空文字やnullの場合
    if (value === null || value === undefined || value === '') {
      return ''
    }

    // 数値の場合はフォーマット
    if (typeof value === 'number') {
      return value.toLocaleString('ja-JP')
    }

    // 日付の場合はフォーマット
    if (value instanceof Date) {
      return value.toLocaleDateString('ja-JP')
    }

    // 文字列の場合はそのまま
    return String(value)
  }

  // PDFテンプレートのフィールド位置設定
  private getPDFFieldPositions(docType: string): Record<string, { x: number; y: number; size?: number }> {
    const positions: Record<string, Record<string, { x: number; y: number; size?: number }>> = {
      completion: {
        'createdAt': { x: 450, y: 750, size: 10 },        // 作成日（右上）
        'projectTitle': { x: 220, y: 650, size: 11 },     // プロジェクト名
        'contractorName': { x: 220, y: 620, size: 11 },   // 受注者名
        'clientName': { x: 220, y: 590, size: 11 },       // 発注者名
        'completionDate': { x: 220, y: 560, size: 11 },   // 完了日
      },
      order: {
        'createdAt': { x: 450, y: 750, size: 10 },
        'clientName': { x: 150, y: 650, size: 11 },
        'clientEmail': { x: 150, y: 620, size: 10 },
        'contractorName': { x: 150, y: 580, size: 11 },
        'contractorEmail': { x: 150, y: 550, size: 10 },
        'projectTitle': { x: 150, y: 500, size: 11 },
        'projectAmount': { x: 150, y: 470, size: 11 },
        'deadline': { x: 150, y: 440, size: 11 },
      },
      order_acceptance: {
        'createdAt': { x: 450, y: 750, size: 10 },
        'orderNumber': { x: 200, y: 700, size: 11 },
        'orderDate': { x: 200, y: 675, size: 11 },
        'contractorName': { x: 200, y: 630, size: 12 },
        'contractorAddress': { x: 200, y: 605, size: 10 },
        'contractorPhone': { x: 200, y: 580, size: 10 },
        'contractorEmail': { x: 200, y: 555, size: 10 },
        'clientName': { x: 200, y: 510, size: 11 },
        'clientEmail': { x: 200, y: 485, size: 10 },
        'projectTitle': { x: 200, y: 440, size: 11 },
        'projectAmount': { x: 200, y: 415, size: 12 },
        'deadline': { x: 200, y: 390, size: 11 },
        'workLocation': { x: 200, y: 365, size: 11 },
        'acceptanceDate': { x: 200, y: 320, size: 11 },
      },
      monthly_invoice: {
        'createdAt': { x: 450, y: 750, size: 10 },
        'contractorName': { x: 150, y: 650, size: 11 },
        'contractorEmail': { x: 150, y: 620, size: 10 },
        'billingPeriod': { x: 150, y: 580, size: 11 },
        'systemFeeTotal': { x: 400, y: 300, size: 12 },
        'totalAmount': { x: 400, y: 270, size: 14 },
      }
    }

    return positions[docType] || {}
  }

  private generateDocumentContent(doc: PDFKit.PDFDocument, data: DocumentData): void {
    switch (data.type) {
      case 'order':
        this.generateOrderDocument(doc, data)
        break
      case 'order_acceptance':
        this.generateOrderAcceptanceDocument(doc, data)
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

  private generateOrderAcceptanceDocument(doc: PDFKit.PDFDocument, data: DocumentData): void {
    const pageWidth = doc.page.width
    const margin = 30  // マージンを小さくしてテーブルを広げる
    const contentWidth = pageWidth - (margin * 2)

    // ============================================
    // 左側: 発注者住所（請求書と同じ位置）
    // ============================================
    let leftY = 30
    doc.fontSize(9).fillColor('#000000')

    // 発注者の会社情報
    const clientAddress = data.clientAddress || '福岡県福岡市早良区西新1丁目10-13'
    const clientBuilding = data.clientBuilding || '西新新田ビル403'
    const clientCompany = data.clientName || 'イースタイルラボ株式会社'
    const clientRepresentative = data.clientRepresentative || '代表取締役　井上直樹'

    doc.text(clientAddress, margin, leftY)
    leftY += 15
    doc.text(clientBuilding, margin, leftY)
    leftY += 15
    doc.text(clientCompany, margin, leftY)
    leftY += 15
    doc.text(clientRepresentative, margin, leftY)

    // ============================================
    // 右側: 請負者情報（請求書の(請負者)と同じ位置）
    // ============================================
    let rightY = 30
    const rightX = pageWidth - margin - 220  // より広いスペースを確保

    doc.fontSize(9).fillColor('#000000')

    // 請負者ラベル
    doc.text('（請負者）', rightX + 160, rightY)
    rightY += 15

    // 請負者の会社情報
    const contractorAddress = data.contractorAddress || (data.contractorPostalCode ? `〒${data.contractorPostalCode}` : '福岡県福岡市早良区西新1丁目')
    const contractorAddressLine2 = '10-13-403'
    const contractorCompany = data.contractorName || '伊藤 昌徳'

    doc.text(contractorAddress, rightX, rightY)
    rightY += 15
    doc.text(contractorAddressLine2, rightX, rightY)
    rightY += 15
    doc.text(contractorCompany, rightX, rightY)

    // ============================================
    // ヘッダー部分（中央配置）
    // ============================================
    let centerY = 130  // 140 → 130に調整
    doc.fontSize(24).text('注文請書', margin, centerY, {
      align: 'center',
      width: contentWidth
    })

    // ============================================
    // 注文書情報テーブル
    // ============================================
    let tableY = centerY + 45  // 50 → 45に調整
    const tableStartX = margin
    const col1Width = 200  // ラベル列の幅
    const col2Width = contentWidth - col1Width

    // 注文番号
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.fontSize(10).fillColor('#000000')
    doc.text('注文番号', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.text(data.orderNumber || 'b84b9400-760b-425a-a05b-316c9dfb5433',
             tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 担当者
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('担当者', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.text(data.contractorName || '小林 育英',
             tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 業務名
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('業務名', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.text(data.projectTitle || '災害査定その２',
             tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 工期
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('工期', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    const startDate = data.startDate || '2025-10-22'
    const endDate = data.deadline || '2025-10-29'
    doc.text(`${startDate} 〜 ${endDate}`,
             tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 契約金額（税込）
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('契約金額（税込）', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.fontSize(12).fillColor('#000000')
    doc.text(`¥${(data.projectAmount || 0).toLocaleString()}`,
             tableStartX + col1Width + 10, tableY + 6, { width: col2Width - 20 })
    doc.fontSize(10)
    tableY += 25

    // 小計
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('小計', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.text(`¥${(data.projectAmount || 0).toLocaleString()}`,
             tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 源泉徴収税 (10.21%)
    const baseAmount = data.projectAmount || 0
    const withholdingTax = Math.floor(baseAmount * 0.1021)
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('源泉徴収税 (10.21%)', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.text(`-¥${withholdingTax.toLocaleString()}`,
             tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // お振込金額
    const transferAmount = baseAmount - withholdingTax
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.fontSize(11).fillColor('#000000')
    doc.text('お振込金額', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.fontSize(12)
    doc.text(`¥${transferAmount.toLocaleString()}`,
             tableStartX + col1Width + 10, tableY + 6, { width: col2Width - 20 })
    doc.fontSize(10)
    tableY += 25

    // 支払日
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('支払日', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    // 支払日は工期終了日の当月末または翌月末
    const endDateObj = new Date(endDate)
    const day = endDateObj.getDate()
    let paymentDate: Date
    if (day <= 20) {
      // 当月末
      paymentDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 0)
    } else {
      // 翌月末
      paymentDate = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 2, 0)
    }
    const paymentDateStr = paymentDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-')
    doc.text(paymentDateStr, tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 支払方法
    doc.rect(tableStartX, tableY, col1Width, 25).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, 25).stroke()
    doc.text('支払方法', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.text('口座振込', tableStartX + col1Width + 10, tableY + 8, { width: col2Width - 20 })
    tableY += 25

    // 備考（サポート手数料に関するコメント）
    const supportFeeComment = (data as any).supportEnabled
      ? `※支払金額は振込手数料等、源泉徴収を控除した金額とする\n※本プロジェクトはサポート利用有りのため、契約金額の${(data as any).supportFeePercent || 8}%のサポート手数料が別途運営者に支払われます`
      : '※支払金額は振込手数料等、源泉徴収を控除した金額とする'

    const remarkHeight = (data as any).supportEnabled ? 40 : 25
    doc.rect(tableStartX, tableY, col1Width, remarkHeight).stroke()
    doc.rect(tableStartX + col1Width, tableY, col2Width, remarkHeight).stroke()
    doc.text('備考', tableStartX + 10, tableY + 8, { width: col1Width - 20 })
    doc.fontSize(8).fillColor('#666666')
    doc.text(supportFeeComment, tableStartX + col1Width + 10, tableY + 8, {
      width: col2Width - 20,
      lineGap: 2
    })
    tableY += remarkHeight

    // ============================================
    // 下部の署名欄
    // ============================================
    tableY += 30

    doc.fontSize(10).fillColor('#000000')
    doc.text('受注者署名:', margin, tableY)
    doc.rect(margin + 100, tableY - 5, 180, 40).stroke()

    doc.text('発注者署名:', pageWidth - margin - 280, tableY)
    doc.rect(pageWidth - margin - 180, tableY - 5, 180, 40).stroke()
  }

  private generateCompletionDocument(doc: PDFKit.PDFDocument, data: DocumentData): void {
    const pageWidth = doc.page.width
    const margin = 50
    const contentWidth = pageWidth - (margin * 2)

    // ヘッダー
    doc.fontSize(24).text('業務完了届', margin, 40, {
      align: 'center',
      width: contentWidth
    })
    doc.fontSize(10).text(`作成日: ${data.createdAt || new Date().toLocaleDateString('ja-JP')}`, pageWidth - 150, 40)

    // ヘッダー下の線
    doc.moveTo(margin, 70).lineTo(pageWidth - margin, 70).stroke()

    let y = 100

    // プロジェクト情報セクション
    doc.fontSize(12).fillColor('#4A5568').text('プロジェクト情報', margin, y)
    doc.moveTo(margin, y + 18).lineTo(pageWidth - margin, y + 18).stroke()
    y += 30

    // プロジェクト名
    doc.fontSize(10).fillColor('#000000').text('プロジェクト名:', margin + 20, y)
    doc.fontSize(11).text(data.projectTitle || 'プロジェクト名', margin + 150, y)
    y += 25

    // 受注者名
    doc.fontSize(10).text('受注者名:', margin + 20, y)
    doc.fontSize(11).text(data.contractorName || '受注者名', margin + 150, y)
    y += 25

    // 完了日
    doc.fontSize(10).text('完了日:', margin + 20, y)
    doc.fontSize(11).text(data.completionDate || new Date().toLocaleDateString('ja-JP'), margin + 150, y)
    y += 25

    // 契約金額
    if (data.projectAmount) {
      doc.fontSize(10).text('契約金額:', margin + 20, y)
      doc.fontSize(12).fillColor('#2D3748').text(`¥${Number(data.projectAmount).toLocaleString('ja-JP')}`, margin + 150, y)
      y += 30
    } else {
      y += 15
    }

    // 成果物セクション
    doc.fontSize(12).fillColor('#4A5568').text('成果物', margin, y)
    doc.moveTo(margin, y + 18).lineTo(pageWidth - margin, y + 18).stroke()
    y += 30

    if (data.deliverables && data.deliverables.length > 0) {
      data.deliverables.forEach((item, index) => {
        doc.fontSize(10).fillColor('#000000').text(`${index + 1}. ${item}`, margin + 20, y)
        y += 18
      })
    } else {
      doc.fontSize(10).fillColor('#718096').text('※ 本届出書は電子的効力を有します', margin + 20, y)
      y += 18
    }

    // 備考
    if (data.notes) {
      y += 20
      doc.fontSize(12).fillColor('#4A5568').text('備考', margin, y)
      y += 20
      doc.fontSize(10).fillColor('#000000').text(data.notes, margin + 20, y, { width: contentWidth - 40 })
    }
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

export function createOrderAcceptanceDocumentData(
  project: any,
  contractor: any,
  client: any,
  orderInfo?: any
): DocumentData {
  return {
    type: 'order_acceptance',
    title: '注文請書',
    projectTitle: project.title,
    projectAmount: project.amount,
    deadline: project.deadline,
    startDate: project.start_date || project.startDate,
    workLocation: project.location,
    contractorName: contractor.name,
    contractorEmail: contractor.email,
    contractorAddress: contractor.address,
    contractorPhone: contractor.phone_number,
    contractorPostalCode: contractor.postal_code,
    clientName: client.name,
    clientEmail: client.email,
    clientAddress: client.address,
    clientBuilding: client.building,
    clientRepresentative: client.representative,
    createdAt: new Date().toLocaleDateString('ja-JP'),
    // 注文請書特有のフィールド
    ...(orderInfo && {
      orderNumber: orderInfo.orderNumber,
      orderDate: orderInfo.orderDate,
      supportEnabled: orderInfo.supportEnabled,
      supportFeePercent: orderInfo.supportFeePercent
    })
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