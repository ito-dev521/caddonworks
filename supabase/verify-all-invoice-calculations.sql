-- すべての受注者請求書の計算を検証（システム設定のサポート手数料率を使用）

SELECT
  i.invoice_number as 請求書番号,
  p.title as プロジェクト名,
  o.name as 組織名,

  -- データベースの値
  i.base_amount as DB契約金額,
  i.fee_amount as DBサポート料,
  i.total_amount as DB小計,
  i.system_fee as DB源泉税,

  -- システム設定
  ss.support_fee_percent as システムサポート率,

  -- 正しい計算値
  CASE
    WHEN c.support_enabled THEN ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
    ELSE 0
  END as 正しいサポート料,

  CASE
    WHEN c.support_enabled THEN i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))
    ELSE i.base_amount
  END as 正しい小計,

  CASE
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
  END as 正しい源泉税,

  -- 差分チェック
  CASE
    WHEN c.support_enabled THEN
      CASE
        WHEN i.fee_amount = ROUND(i.base_amount * (ss.support_fee_percent / 100.0)) THEN '✓'
        ELSE '✗ 不一致'
      END
    ELSE
      CASE
        WHEN i.fee_amount = 0 THEN '✓'
        ELSE '✗ 不一致'
      END
  END as サポート料チェック,

  CASE
    WHEN c.support_enabled THEN
      CASE
        WHEN i.total_amount = (i.base_amount - ROUND(i.base_amount * (ss.support_fee_percent / 100.0))) THEN '✓'
        ELSE '✗ 不一致'
      END
    ELSE
      CASE
        WHEN i.total_amount = i.base_amount THEN '✓'
        ELSE '✗ 不一致'
      END
  END as 小計チェック,

  c.support_enabled as サポート有効,
  i.status as ステータス,
  i.issue_date as 発行日

FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON c.project_id = p.id
LEFT JOIN public.organizations o ON p.org_id = o.id
CROSS JOIN public.system_settings ss
WHERE i.direction = 'to_operator'
  AND ss.id = 'global'
ORDER BY o.name, i.issue_date DESC;
