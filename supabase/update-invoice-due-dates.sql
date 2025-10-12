-- 既存の請求書の支払期限(due_date)を完了日(issue_date)から再計算して更新
-- 完了日が20日以前 → 当月末
-- 完了日が21日以降 → 翌月末

UPDATE public.invoices
SET due_date = CASE
  -- issue_dateが存在する場合
  WHEN issue_date IS NOT NULL THEN
    CASE
      -- 完了日が1日〜20日の場合: 当月末
      WHEN EXTRACT(DAY FROM issue_date::date) <= 20 THEN
        (DATE_TRUNC('month', issue_date::date) + INTERVAL '1 month - 1 day')::date
      -- 完了日が21日〜末日の場合: 翌月末
      ELSE
        (DATE_TRUNC('month', issue_date::date) + INTERVAL '2 months - 1 day')::date
    END
  -- issue_dateがNULLの場合: 既存のdue_dateをそのまま維持
  ELSE due_date
END
WHERE issue_date IS NOT NULL;

-- 更新結果を確認
SELECT
  id,
  invoice_number,
  issue_date,
  due_date,
  EXTRACT(DAY FROM issue_date::date) as completion_day,
  status
FROM public.invoices
WHERE issue_date IS NOT NULL
ORDER BY issue_date DESC
LIMIT 10;
