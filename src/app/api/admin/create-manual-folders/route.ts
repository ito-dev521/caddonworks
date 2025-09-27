import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Creating manual folder setup instructions...')

    const instructions = {
      message: "無料Boxアカウント用の手動フォルダ作成ガイド",

      setup_steps: [
        {
          step: 1,
          title: "メインフォルダの作成",
          action: "Boxの「すべてのファイル」で右クリック → 「新しいフォルダ」",
          folder_name: "Projects",
          description: "プロジェクト管理用のメインフォルダ"
        },
        {
          step: 2,
          title: "会社フォルダの作成",
          action: "「Projects」フォルダ内で以下のフォルダを作成:",
          folders: [
            "イースタイルラボ株式会社",
            "テスト株式会社",
            "受注者"
          ],
          description: "各組織専用のフォルダ"
        },
        {
          step: 3,
          title: "プロジェクトフォルダの作成",
          action: "各会社フォルダ内でプロジェクトフォルダを作成:",
          projects: {
            "イースタイルラボ株式会社": [
              "[PRJ-0805df3f] ブロック積み展開図作成",
              "[PRJ-bdb20739] テスト案件",
              "[PRJ-02452f6e] tesuto2",
              "[PRJ-0ce69fe4] 横断図作成"
            ]
          },
          description: "プロジェクト別の作業フォルダ"
        },
        {
          step: 4,
          title: "サブフォルダの作成",
          action: "各プロジェクトフォルダ内に以下を作成:",
          subfolders: [
            "01_受取データ",
            "02_作業データ",
            "03_納品データ",
            "04_契約データ"
          ],
          description: "作業段階別のフォルダ"
        }
      ],

      alternative_solution: {
        title: "🚀 簡易統合システム",
        description: "システム側でフォルダIDを手動設定する方法",
        steps: [
          "1. 上記の手動でフォルダを作成",
          "2. 各フォルダのBox IDをコピー",
          "3. システムのデータベースに手動でIDを設定",
          "4. ファイルアップロード機能が利用可能になる"
        ]
      },

      folder_id_guide: {
        title: "📋 フォルダIDの取得方法",
        steps: [
          "1. Boxでフォルダを右クリック",
          "2. 「リンクをコピー」を選択",
          "3. URLの最後の数字がフォルダID",
          "例: https://app.box.com/folder/123456789 → ID: 123456789"
        ]
      },

      database_update: {
        title: "💾 データベース更新SQL",
        note: "フォルダ作成後、以下のSQLで手動設定:",
        sql_template: `
-- 組織フォルダIDの設定
UPDATE organizations SET box_folder_id = 'FOLDER_ID_HERE' WHERE name = '組織名';

-- プロジェクトフォルダIDの設定
UPDATE projects SET box_folder_id = 'FOLDER_ID_HERE' WHERE title = 'プロジェクト名';
        `
      },

      current_status: {
        message: "現在のシステム状態",
        note: "JWT App Authで作成されたフォルダは無料アカウントからアクセスできません",
        recommendation: "手動作成 + 手動設定で同等の機能を実現可能"
      }
    }

    return NextResponse.json(instructions)

  } catch (error) {
    console.error('❌ Manual folder instructions error:', error)
    return NextResponse.json({
      error: 'Failed to generate instructions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}