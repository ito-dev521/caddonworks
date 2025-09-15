-- サンプル案件データの挿入（入札可能な案件）
-- 注意: 実際のorg_idは既存のデータに合わせて調整してください

-- まず、organizationsテーブルが存在し、データがあることを確認
DO $$
DECLARE
    org_count INTEGER;
    sample_org_id UUID;
BEGIN
    -- organizationsテーブルの存在確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        SELECT COUNT(*) INTO org_count FROM organizations;
        
        IF org_count = 0 THEN
            -- サンプル組織を作成
            INSERT INTO organizations (name, email, corporate_number) 
            VALUES ('サンプル建設会社', 'sample@example.com', '1234567890123')
            RETURNING id INTO sample_org_id;
        ELSE
            -- 既存の組織IDを取得
            SELECT id INTO sample_org_id FROM organizations LIMIT 1;
        END IF;
        
        -- 入札可能な案件を追加
        INSERT INTO projects (
          title,
          description,
          status,
          budget,
          start_date,
          end_date,
          category,
          org_id,
          assignee_name,
          bidding_deadline,
          requirements,
          location
        ) VALUES 
(
          '都市部道路拡張工事設計',
          '都心部の主要道路の拡張工事に関する詳細設計を行います。交通量調査、環境影響評価、住民説明会の実施も含まれます。',
          'bidding',
          5000000,
          '2024-02-01',
          '2024-06-30',
          '道路設計',
          sample_org_id,
          '田中太郎',
          '2024-01-25 23:59:59',
          '・土木施工管理技士の資格が必要\n・過去3年間の類似案件経験\n・CADソフトウェア（AutoCAD）の使用経験\n・週1回の進捗報告',
          '東京都渋谷区'
        ),
        (
          '河川護岸工事設計・監理',
          '中小河川の護岸工事に関する設計と施工監理を行います。環境配慮型の工法を採用し、生態系への影響を最小限に抑える設計が求められます。',
          'bidding',
          3500000,
          '2024-03-01',
          '2024-08-31',
          '河川工事',
          sample_org_id,
          '佐藤花子',
          '2024-02-20 23:59:59',
          '・河川工学の専門知識\n・環境アセスメントの経験\n・施工監理の実務経験3年以上',
          '神奈川県横浜市'
        ),
        (
          '橋梁点検・補修設計',
          '既存橋梁の定期点検と補修工事の設計を行います。非破壊検査技術を活用した詳細な劣化診断と、適切な補修工法の選定が重要です。',
          'bidding',
          2800000,
          '2024-02-15',
          '2024-05-31',
          '構造物点検',
          sample_org_id,
          '山田次郎',
          '2024-02-10 23:59:59',
          '・橋梁工学の専門知識\n・非破壊検査技術の経験\n・構造計算の実務経験',
          '埼玉県さいたま市'
        ),
        (
          '地下構造物設計',
          '地下駐車場と地下通路の設計を行います。地盤調査データに基づく構造設計と、防水・排水計画の策定が主な業務です。',
          'bidding',
          4200000,
          '2024-03-15',
          '2024-07-31',
          '地下構造',
          sample_org_id,
          '鈴木一郎',
          '2024-03-01 23:59:59',
          '・地下構造物の設計経験\n・地盤工学の知識\n・防水工法の専門知識',
          '千葉県千葉市'
        ),
        (
          '公園整備基本設計',
          '新設公園の基本設計を行います。利用者のニーズ調査、景観設計、維持管理計画の策定も含まれます。',
          'bidding',
          1800000,
          '2024-04-01',
          '2024-06-30',
          '道路設計',
          sample_org_id,
          '高橋美咲',
          '2024-03-20 23:59:59',
          '・造園設計の経験\n・景観設計の知識\n・住民参加型設計の経験',
          '茨城県水戸市'
        );
        
        RAISE NOTICE 'サンプル案件データを正常に挿入しました';
    ELSE
        RAISE NOTICE 'organizationsテーブルが存在しません。先にテーブルを作成してください。';
    END IF;
END
$$;

-- コメント
-- これらのサンプルデータは受注者が案件一覧ページで閲覧・入札できる案件として表示されます
