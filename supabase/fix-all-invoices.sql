-- すべての受注者請求書データを一括修正

-- ステップ1: 修正前の状態を確認（verify-all-invoice-calculations.sqlの結果を確認）

-- ステップ2: システム設定からサポート手数料率を取得して、すべての請求書データを正しい値に修正
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
  AND c.id IS NOT NULL
  AND ss.id = 'global';

-- ステップ3: 修正後の確認
SELECT
  i.invoice_number as 請求書番号,
  p.title as プロジェクト名,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.total_amount - i.system_fee as お振込金額,
  c.support_enabled as サポート有効,
  ss.support_fee_percent as システムサポート率,
  -- 検証
  CASE
    WHEN c.support_enabled THEN
      CASE
        WHEN i.fee_amount = ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
          AND i.total_amount = (i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0)))
        THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
    ELSE
      CASE
        WHEN i.fee_amount = 0 AND i.total_amount = i.base_amount
        THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
  END as データ整合性
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON c.project_id = p.id
CROSS JOIN public.system_settings ss
WHERE i.direction = 'to_operator'
  AND ss.id = 'global'
ORDER BY p.title, i.issue_date DESC;
