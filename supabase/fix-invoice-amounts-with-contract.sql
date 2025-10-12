-- 請求書データの完全修正
-- 契約テーブルのsupport_enabledフラグとシステム設定のサポート手数料率を参照して再計算

-- ステップ1: 現在のデータを確認
SELECT
  i.id,
  i.invoice_number,
  i.base_amount as 現在の契約金額,
  i.fee_amount as 現在のサポート料,
  i.total_amount as 現在の小計,
  i.system_fee as 現在の源泉税,
  c.support_enabled as サポート有効,
  ss.support_fee_percent as システムサポート率,
  CASE
    WHEN c.support_enabled THEN ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
    ELSE 0
  END as 正しいサポート料,
  CASE
    WHEN c.support_enabled THEN i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
    ELSE i.base_amount
  END as 正しい小計
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
CROSS JOIN public.system_settings ss
WHERE i.direction = 'to_operator'
  AND ss.id = 'global'
ORDER BY i.updated_at DESC;

-- ステップ2: fee_amount, total_amount, system_feeを修正
UPDATE public.invoices i
SET
  fee_amount = CASE
    WHEN c.support_enabled THEN ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
    ELSE 0
  END,
  total_amount = CASE
    WHEN c.support_enabled THEN i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
    ELSE i.base_amount
  END,
  system_fee = CASE
    WHEN c.support_enabled THEN
      CASE
        WHEN (i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))) <= 1000000
        THEN FLOOR((i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))) * 0.1021)
        ELSE FLOOR(((i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))) - 1000000) * 0.2042 + 102100)
      END
    ELSE
      CASE
        WHEN i.base_amount <= 1000000
        THEN FLOOR(i.base_amount * 0.1021)
        ELSE FLOOR((i.base_amount - 1000000) * 0.2042 + 102100)
      END
  END
FROM public.contracts c, public.system_settings ss
WHERE i.contract_id = c.id
  AND i.direction = 'to_operator'
  AND ss.id = 'global';

-- ステップ3: 修正後のデータを確認
SELECT
  i.id,
  i.invoice_number,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.total_amount - i.system_fee as 最終請求額,
  c.support_enabled as サポート有効,
  ss.support_fee_percent as システムサポート率,
  CASE
    WHEN c.support_enabled
      THEN CASE
        WHEN (i.base_amount - i.fee_amount) = i.total_amount THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
    ELSE CASE
        WHEN i.base_amount = i.total_amount THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
  END as データ整合性
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
CROSS JOIN public.system_settings ss
WHERE i.direction = 'to_operator'
  AND ss.id = 'global'
ORDER BY i.updated_at DESC
LIMIT 20;
