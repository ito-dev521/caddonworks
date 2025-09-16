export type BusinessType = 'individual' | 'corporation'

export interface ContractorPayoutInput {
  businessType: BusinessType
  totalBilled: number // 合計請求金額（税抜想定）
}

export interface ContractorPayoutResult {
  grossAmount: number
  withholdingTax: number
  transferFee: number
  netAmount: number
}

// 源泉税率（簡易）：10.21% とする（実務では区分により異なる）
const WITHHOLDING_TAX_RATE = 0.1021
const TRANSFER_FEE_JPY = 550

export function calculateContractorPayout(
  input: ContractorPayoutInput
): ContractorPayoutResult {
  const gross = Math.max(0, Math.round(input.totalBilled))

  if (input.businessType === 'corporation') {
    return {
      grossAmount: gross,
      withholdingTax: 0,
      transferFee: 0,
      netAmount: gross,
    }
  }

  const withholding = Math.round(gross * WITHHOLDING_TAX_RATE)
  const net = Math.max(0, gross - withholding - TRANSFER_FEE_JPY)

  return {
    grossAmount: gross,
    withholdingTax: withholding,
    transferFee: TRANSFER_FEE_JPY,
    netAmount: net,
  }
}

export interface OrgInvoiceInput {
  contractorsTotal: number // 受注者への合計支払額（または請求合計）
}

export interface OrgInvoiceResult {
  contractorsTotal: number
  operatorFee: number
  totalAmount: number
}

const OPERATOR_FEE_RATE = 0.3

export function calculateOrgInvoice(input: OrgInvoiceInput): OrgInvoiceResult {
  const contractorsTotal = Math.max(0, Math.round(input.contractorsTotal))
  const fee = Math.round(contractorsTotal * OPERATOR_FEE_RATE)
  const total = contractorsTotal + fee
  return {
    contractorsTotal,
    operatorFee: fee,
    totalAmount: total,
  }
}


