/**
 * 請求書計算ロジックの一元化
 *
 * このファイルは請求書の金額計算を一元管理します。
 * フロントエンド、バックエンド、どこからでも同じロジックを使用してください。
 */

/**
 * 源泉徴収税を計算
 *
 * @param subtotal 小計（サポート料を引いた後の金額）
 * @returns 源泉徴収税額（切り捨て）
 */
export function calculateWithholding(subtotal: number): number {
  if (subtotal <= 1000000) {
    return Math.floor(subtotal * 0.1021)
  } else {
    return Math.floor((subtotal - 1000000) * 0.2042 + 102100)
  }
}

/**
 * 請求書の全金額を計算
 *
 * @param contractAmount 契約金額（base_amount）
 * @param supportFeePercent サポート手数料率（%）
 * @param supportEnabled サポート機能が有効かどうか
 * @returns 請求書の全金額データ
 */
export function calculateInvoiceAmounts(
  contractAmount: number,
  supportFeePercent: number,
  supportEnabled: boolean
): {
  base_amount: number
  fee_amount: number
  total_amount: number
  system_fee: number
  final_amount: number
} {
  // 契約金額
  const base_amount = contractAmount

  // サポート料
  const fee_amount = supportEnabled
    ? Math.round(base_amount * (supportFeePercent / 100))
    : 0

  // 小計（サポート料を引いた後）
  const total_amount = base_amount - fee_amount

  // 源泉徴収税
  const system_fee = calculateWithholding(total_amount)

  // 最終振込金額
  const final_amount = total_amount - system_fee

  return {
    base_amount,
    fee_amount,
    total_amount,
    system_fee,
    final_amount
  }
}

/**
 * 請求書データの整合性を検証
 *
 * @param invoiceData 検証する請求書データ
 * @param supportFeePercent サポート手数料率（%）
 * @param supportEnabled サポート機能が有効かどうか
 * @returns 検証結果（エラーがある場合はエラーメッセージの配列）
 */
export function validateInvoiceAmounts(
  invoiceData: {
    base_amount: number
    fee_amount: number
    total_amount: number
    system_fee: number
  },
  supportFeePercent: number,
  supportEnabled: boolean
): string[] {
  const errors: string[] = []

  // 正しい値を計算
  const expected = calculateInvoiceAmounts(
    invoiceData.base_amount,
    supportFeePercent,
    supportEnabled
  )

  // 各フィールドを検証
  if (invoiceData.base_amount <= 0) {
    errors.push('契約金額（base_amount）は正の値でなければなりません')
  }

  if (invoiceData.fee_amount !== expected.fee_amount) {
    errors.push(
      `サポート料（fee_amount）が正しくありません。期待値: ${expected.fee_amount}, 実際: ${invoiceData.fee_amount}`
    )
  }

  if (invoiceData.total_amount !== expected.total_amount) {
    errors.push(
      `小計（total_amount）が正しくありません。期待値: ${expected.total_amount}, 実際: ${invoiceData.total_amount}`
    )
  }

  if (invoiceData.system_fee !== expected.system_fee) {
    errors.push(
      `源泉徴収税（system_fee）が正しくありません。期待値: ${expected.system_fee}, 実際: ${invoiceData.system_fee}`
    )
  }

  // 基本的な整合性チェック
  if (invoiceData.fee_amount < 0 || invoiceData.fee_amount > invoiceData.base_amount) {
    errors.push('サポート料は0以上、契約金額以下でなければなりません')
  }

  if (invoiceData.total_amount <= 0 || invoiceData.total_amount > invoiceData.base_amount) {
    errors.push('小計は正の値で、契約金額以下でなければなりません')
  }

  if (invoiceData.system_fee < 0 || invoiceData.system_fee >= invoiceData.total_amount) {
    errors.push('源泉徴収税は0以上、小計未満でなければなりません')
  }

  return errors
}

/**
 * 複数の契約から請求書金額を計算
 *
 * @param contracts 契約の配列
 * @param supportFeePercent サポート手数料率（%）
 * @returns 合計請求書金額データ
 */
export function calculateInvoiceAmountsFromContracts(
  contracts: Array<{ bid_amount: number; support_enabled: boolean }>,
  supportFeePercent: number
): {
  totalContractAmount: number
  totalSupportFee: number
  totalSubtotal: number
  totalWithholding: number
  totalFinalAmount: number
} {
  let totalContractAmount = 0
  let totalSupportFee = 0
  let totalSubtotal = 0

  // 各契約の金額を計算して合計
  for (const contract of contracts) {
    const amounts = calculateInvoiceAmounts(
      contract.bid_amount,
      supportFeePercent,
      contract.support_enabled
    )

    totalContractAmount += amounts.base_amount
    totalSupportFee += amounts.fee_amount
    totalSubtotal += amounts.total_amount
  }

  // 合計小計に対して源泉徴収税を計算
  const totalWithholding = calculateWithholding(totalSubtotal)
  const totalFinalAmount = totalSubtotal - totalWithholding

  return {
    totalContractAmount,
    totalSupportFee,
    totalSubtotal,
    totalWithholding,
    totalFinalAmount
  }
}
