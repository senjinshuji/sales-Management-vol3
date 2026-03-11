# 営業管理ツール vol3 - 仕様書

## プロジェクト概要
React.js + Firebase で構築された営業進捗管理システム。管理者用とパートナー用の2つの独立したアプリケーションを提供。

## 技術スタック
- **フロントエンド**: React 19.1.0, styled-components, react-router-dom
- **バックエンド**: Firebase (Firestore, Hosting)
- **AI機能**: OpenAI GPT-4o-mini（議事録分析）
- **認証**: SHA256暗号化、セッション管理
- **デプロイ**: Firebase Hosting

## アクセス情報
- **管理者用**: https://sales-management-staging.web.app (ID: salessenjin / PW: salessenjin1234)
- **パートナー用**: https://sales-management-staging.web.app/partner/ (ID: salessenjinpiala / PW: salessenjinpiala1234)

## 主要機能

### 1. 営業管理機能
- **ホームダッシュボード**:
  - チーム全体四半期売上実績（目標達成率メーター）
  - 四半期内月別売上実績（棒グラフ）
  - チーム全体売上見込み（担当者別円グラフ）
  - 個人四半期/月間売上
  - **担当者別案件サマリー（フェーズ2〜7）**: 担当者選択式、逆ピラミッド型ファネルチャート（案件数・予算）、案件一覧
  - 滞留商談リスト（90日以上経過）
  - メニュー別/会社別実績サマリー
- **アクションログ記録**: 商談履歴の記録、AI議事録分析
- **案件一覧**: 進捗状況の管理、フィルター機能（複数選択対応）、受注案件の次回アクション日付非表示
  - 次回アクション日付バッジ: 2日以内は「急」（赤）、超過は「超過」（紫）
- **カンバンボード**: ステータス別の案件管理（ドラッグ&ドロップ機能は削除）
- **成約案件管理**: 確定日ベースの売上管理

### 2. 案件管理機能（第一想起取れるくん専用）
- **投稿本数管理**: 月別・日別の投稿数記録、受注案件のみ表示、実施月ベース自動登録
- **投稿カレンダー**: 全体スケジュールの可視化
- **ToDo管理**: 営業日ベースのタスク自動生成、期限切れアラート表示、完了済みタスクの「タスクDone」セクション
- **週報**: 四半期KGI/KPI設定と週次進捗入力、サービス別実績の自動集計

### 3. マスター管理
- **紹介者マスター**: 紹介者情報の管理
- **提案メニューマスター**: 提案メニューのカスタマイズ
- **インフルエンサー管理**: CSV一括登録対応
- **キャスティング管理**: IFキャスティング案件の進捗管理

### 4. パートナー専用機能
- 部署別管理（Buzz、コンサル、デジコン、マーケD）
- 担当者別目標管理（月別目標件数・想定遷移率）
- 紫系デザインの独立したUI

## Firestore データ構造

### コレクション一覧
```javascript
// 案件進捗
progressDashboard: {
  productName: string,          // 商材名
  proposalMenu: string,         // 提案メニュー
  representative: string,       // 社内担当者
  partnerRepresentative: string,// パートナー担当者
  introducer: string,          // 紹介者
  status: string,              // ステータス
  confirmedDate: string,       // 確定日（成約日）
  sub_department_name: string, // 部署名
  sub_department_owner: string,// 他部署担当者
  createdAt: timestamp,        // 案件登録日
  leadTimeDays: number,        // リードタイム（登録〜成約/失注までの日数）
  lostAtPhase: string,         // 失注時の直前フェーズ（失注案件のみ）
  lostDate: string,            // 失注日（失注案件のみ）
  // ...
}

// アクションログ
actionLogs: {
  dealId: string,              // 案件ID
  productName: string,         // 商材名
  action: string,              // アクション内容
  description: string,         // 議事録
  summary: string,             // AI要約
  // ...
}

// 投稿スケジュール（第一想起取れるくん専用）
postingSchedules: {
  dealId: string,              // 案件ID
  dealName: string,            // 案件名
  yearMonth: string,           // "2025-07"形式
  schedules: { [day]: number } // 日別投稿数
}

// タスクテンプレート（第一想起取れるくん専用）
taskTemplates: {
  dealId: string,              // 案件ID
  receivedOrderDate: string,   // 受注日（確定日）
  startDate: string,           // 開始予定日
  tasks: [{                    // タスクリスト（7個の固定タスク）
    name: string,              // タスク名
    taskDate: string,          // 実施予定日
    completed: boolean,        // 完了フラグ
    completedDate: string      // 完了日時
  }]
}

// 週報設定（四半期KGI/KPI）
weeklyReportSettings: {
  quarterId: string,           // "2025-Q4"形式
  kgis: [{
    id: string,
    name: string,              // KGI名
    target: number,            // 四半期目標値
    unit: string,              // 単位（円、件など）
    autoAggregate: boolean,    // 自動集計フラグ
    aggregateService: string,  // 集計対象サービス
    aggregateMetric: string,   // 集計指標（sales, closedCount等）
    kpis: [{                   // 紐付くKPI
      id: string,
      name: string,
      target: number,
      unit: string
    }]
  }]
}

// 週報データ
weeklyReports: {
  weekId: string,              // "2025-11-18"形式（火曜日の日付）
  weekStart: string,           // 週の開始日時
  weekEnd: string,             // 週の終了日時
  kgiValues: { [kgiId]: number }, // KGI今週実績
  kpiValues: { [kpiId]: number }, // KPI今週実績
  kgiCumulatives: { [kgiId]: number }, // KGI四半期累計（先週累計+今週実績）
  kpiCumulatives: { [kpiId]: number }, // KPI四半期累計（先週累計+今週実績）
  actions: [{                  // 今週の定量アクション（目標値なし）
    id: string,
    content: string            // アクション内容のみ
  }],
  previousActionResults: [{    // 先週アクションの結果（先週のactionsから自動引き継ぎ）
    id: string,
    content: string,           // 先週のアクション内容
    result: string,            // ◯、△、×
    resultNote: string         // 備考
  }],
  review: string,              // 振り返り（文字数制限なし）
  updatedAt: string
}
```

## ビルド・デプロイ

```bash
# 両アプリ同時ビルド
./build-all.sh

# デプロイ
firebase deploy --only hosting --project sales-management-staging

# 個別ビルド
npm run build                    # 管理者用
REACT_APP_ENTRY_POINT=partner npm run build  # パートナー用
```

## 最新バージョン情報
- **現在バージョン**: v2.32.0
- **最終更新**: 2025年12月2日
- **直近の更新内容**:
  - 週報機能: KGI/KPI累計を四半期通算で正しく計算するよう修正
    - 先週の累計 + 今週の実績 = 今週の累計
    - `kgiCumulatives`、`kpiCumulatives`フィールドを週報データに保存
    - 自動集計KGIは従来通り四半期データから自動計算
  - リードタイム・失注分析機能: 案件の成約/失注時にリードタイム（日数）を自動記録
    - 成約時: 登録日から成約日までの日数を`leadTimeDays`に記録
    - 失注時: 登録日から失注日までの日数を`leadTimeDays`に記録、直前フェーズを`lostAtPhase`に記録、失注日を`lostDate`に記録
  - ホーム画面: 担当者別案件サマリー（フェーズ2〜7）セクションを追加
    - 担当者プルダウン選択（増田 陽、荒幡 輝）
    - フェーズ別案件数を逆ピラミッド型ファネルチャートで表示
    - フェーズ別想定予算合計を逆ピラミッド型ファネルチャートで表示
    - 選択した担当者の案件一覧（会社名、フェーズバッジ、想定予算）
    - 各フェーズの色はSTATUS_COLORSと一致
  - 週報機能: 今週の定量アクションから目標値入力欄を削除
  - 週報機能: 先週の定量アクション結果を前週から自動引き継ぎ（◯△×評価と備考のみ入力）
  - 週報機能: 振り返り欄の拡大（600px）、文字数制限撤廃
  - 週報機能: 週切り替え時のデータ再読み込み修正
  - 案件一覧: 次回アクション日付のバッジ表示（2日以内「急」、超過「超過」）

## 開発時の注意事項
- Firestoreクエリは複合インデックスを避け、クライアントサイドでフィルタリング
- 管理者/パートナー画面の判定は `pathname.includes('/partner')` で行う
- AI分析は50文字以上の議事録で利用可能（APIキーは環境変数から取得）
- 営業日計算は土日を除外（祝日対応なし）
- 受注案件は次回アクションが存在しないビジネスルール
