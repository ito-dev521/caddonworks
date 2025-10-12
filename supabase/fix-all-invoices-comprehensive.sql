-- 全ての請求書を包括的に修正（エッジケース対応版）

-- ステップ0: 修正前のデータをバックアップ（オプション）
-- CREATE TABLE invoices_backup_20250112 AS SELECT * FROM public.invoices WHERE direction = 'to_operator';

-- ステップ1: システム設定からサポート手数料率を取得
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
-- ステップ2: 全ての請求書データを正しい値に修正（エッジケース対応）
UPDATE public.invoices i
SET
  fee_amount = CASE
    WHEN c.support_enabled = true THEN ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
    ELSE 0
  END,
  total_amount = CASE
    WHEN c.support_enabled = true THEN i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
    ELSE i.base_amount
  END,
  system_fee = CASE
    WHEN c.support_enabled = true THEN
      CASE
        WHEN (i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))) <= 1000000
        THEN FLOOR((i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))) * 0.1021)
        ELSE FLOOR(((i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))) - 1000000) * 0.2042 + 102100)
      END
    ELSE
      CASE
        WHEN i.base_amount <= 1000000
        THEN FLOOR(i.base_amount * 0.1021)
        ELSE FLOOR((i.base_amount - 1000000) * 0.2042 + 102100)
      END
  END
FROM public.contracts c, support_fee_setting sfs
WHERE i.contract_id = c.id
  AND i.direction = 'to_operator';

-- ステップ3: 契約情報がない請求書を処理（サポート無効として扱う）
UPDATE public.invoices i
SET
  fee_amount = 0,
  total_amount = i.base_amount,
  system_fee = CASE
    WHEN i.base_amount <= 1000000
    THEN FLOOR(i.base_amount * 0.1021)
    ELSE FLOOR((i.base_amount - 1000000) * 0.2042 + 102100)
  END
WHERE i.direction = 'to_operator'
  AND i.contract_id IS NULL;

-- ステップ4: support_enabledがNULLの契約を持つ請求書を処理（サポート無効として扱う）
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
UPDATE public.invoices i
SET
  fee_amount = 0,
  total_amount = i.base_amount,
  system_fee = CASE
    WHEN i.base_amount <= 1000000
    THEN FLOOR(i.base_amount * 0.1021)
    ELSE FLOOR((i.base_amount - 1000000) * 0.2042 + 102100)
  END
FROM public.contracts c, support_fee_setting sfs
WHERE i.contract_id = c.id
  AND i.direction = 'to_operator'
  AND c.support_enabled IS NULL;

-- ステップ5: 修正結果の確認（サマリー）
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
SELECT
  '修正完了' as ステータス,
  COUNT(*) as 総請求書数,
  SUM(CASE WHEN c.support_enabled = true THEN 1 ELSE 0 END) as サポート有効数,
  SUM(CASE WHEN c.support_enabled = false OR c.support_enabled IS NULL OR c.id IS NULL THEN 1 ELSE 0 END) as サポート無効数
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
CROSS JOIN support_fee_setting sfs
WHERE i.direction = 'to_operator';

-- ステップ6: 修正後の詳細確認（全請求書）
WITH support_fee_setting AS (
  SELECT CAST(setting_value AS DECIMAL) as support_fee_percent
  FROM public.system_settings
  WHERE setting_key = 'support_fee_percent'
  LIMIT 1
)
SELECT
  i.invoice_number as 請求書番号,
  p.title as プロジェクト名,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.total_amount - i.system_fee as お振込金額,
  c.support_enabled as サポート有効,
  sfs.support_fee_percent as システムサポート率,
  -- 検証
  CASE
    WHEN c.support_enabled = true THEN
      CASE
        WHEN i.fee_amount = ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
          AND i.total_amount = (i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0)))
        THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
    ELSE
      CASE
        WHEN i.fee_amount = 0 AND i.total_amount = i.base_amount
        THEN '✓ 正常'
        ELSE '✗ 不一致'
      END
  END as データ整合性,
  CASE
    WHEN c.id IS NULL THEN '⚠ 契約なし'
    WHEN c.support_enabled IS NULL THEN '⚠ support_enabled NULL'
    ELSE ''
  END as 警告
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON c.project_id = p.id
CROSS JOIN support_fee_setting sfs
WHERE i.direction = 'to_operator'
ORDER BY
  CASE
    WHEN c.support_enabled = true THEN
      CASE
        WHEN i.fee_amount = ROUND(i.base_amount * (sfs.support_fee_percent / 100.0))
          AND i.total_amount = (i.base_amount - ROUND(i.base_amount * (sfs.support_fee_percent / 100.0)))
        THEN 1 ELSE 0
      END
    ELSE
      CASE
        WHEN i.fee_amount = 0 AND i.total_amount = i.base_amount
        THEN 1 ELSE 0
      END
  END,
  p.title, i.issue_date DESC;
