import { PROPOSAL_MENUS, SALES_REPRESENTATIVES, STATUSES, INTRODUCER_STATUS } from './constants.js';

// 紹介者マスターデータ
export const introducers = [
  {
    id: 1,
    name: '田中様',
    contactPerson: '田中 太郎',
    email: 'tanaka@example.com',
    memo: '長年お付き合いのあるパートナー企業様',
    status: 'アクティブ'
  },
  {
    id: 2,
    name: '佐藤部長',
    contactPerson: '佐藤 花子',
    email: 'sato@company.co.jp',
    memo: 'IT系案件に強い',
    status: 'アクティブ'
  },
  {
    id: 3,
    name: '山田CTO',
    contactPerson: '山田 次郎',
    email: 'yamada.cto@tech.com',
    memo: 'システム開発案件専門',
    status: '非稼働'
  },
  {
    id: 4,
    name: '直接営業',
    contactPerson: '',
    email: '',
    memo: '自社営業による直接獲得',
    status: 'アクティブ'
  }
];

// サンプル商談データ
export const mockDeals = [
  {
    id: 1,
    productName: 'A社システム導入案件',
    proposalMenu: PROPOSAL_MENUS[0], // 第一想起取れるくん
    representative: SALES_REPRESENTATIVES[0], // 増田 陽
    introducerId: 1, // 田中様
    status: '検討中',
    lastContactDate: '2024-01-15',
    nextAction: '追加資料の提出',
    nextActionDate: '2024-01-20',
    logs: [
      {
        id: 1,
        title: '初回MTG',
        actionDate: '2024-01-10',
        actionDetails: '初回打ち合わせ。システム導入の背景をヒアリング。現状の課題は業務効率化とコスト削減。',
        summary: '課題：業務効率化、コスト削減。予算感：月額50万円程度。導入時期：4月を希望。',
        nextAction: '詳細提案書の作成',
        nextActionDate: '2024-01-15',
        status: 'アポ設定'
      },
      {
        id: 2,
        title: '提案プレゼン',
        actionDate: '2024-01-15',
        actionDetails: '提案書プレゼンテーション実施。機能説明と導入効果について説明。質疑応答多数。',
        summary: '関心高い。技術部門との調整が必要。セキュリティ要件の確認が必要。',
        nextAction: '追加資料の提出',
        nextActionDate: '2024-01-20',
        status: '検討中'
      }
    ]
  },
  {
    id: 2,
    productName: 'B社マーケティング支援',
    proposalMenu: PROPOSAL_MENUS[1], // 獲得取れるくん
    representative: SALES_REPRESENTATIVES[1], // 渡邊 哲成
    introducerId: 4, // 直接営業
    status: '提案作成中',
    lastContactDate: '2024-01-12',
    nextAction: '企画書の完成',
    nextActionDate: '2024-01-18',
    logs: [
      {
        id: 1,
        title: '課題ヒアリング',
        actionDate: '2024-01-12',
        actionDetails: 'マーケティング課題のヒアリング。新規顧客獲得が最優先課題。',
        summary: '新規顧客獲得が課題。月間リード数を3倍にしたい。',
        nextAction: '企画書の作成',
        nextActionDate: '2024-01-18',
        status: '提案作成中'
      }
    ]
  },
  {
    id: 3,
    productName: 'C社研修プログラム',
    proposalMenu: PROPOSAL_MENUS[2], // インハウスキャンプ
    representative: SALES_REPRESENTATIVES[2], // 加藤 修慈
    introducerId: 2, // 佐藤部長
    status: '成約',
    lastContactDate: '2024-01-14',
    nextAction: '契約書の締結',
    nextActionDate: '2024-01-16',
    logs: [
      {
        id: 1,
        title: 'エンジニア研修相談',
        actionDate: '2024-01-08',
        actionDetails: 'エンジニア研修の企画相談。新人教育プログラムの充実が目標。',
        summary: '新人エンジニア教育が課題。実践的なスキル習得を重視。',
        nextAction: 'カリキュラム案の作成',
        nextActionDate: '2024-01-12',
        status: 'アポ設定'
      },
      {
        id: 2,
        title: 'カリキュラム提案',
        actionDate: '2024-01-12',
        actionDetails: 'カリキュラム案プレゼン。3ヶ月コースで合意。予算も承認済み。',
        summary: '3ヶ月コースで合意。予算承認済み。4月開始予定。',
        nextAction: '契約手続き',
        nextActionDate: '2024-01-16',
        status: '成約'
      }
    ]
  },
  {
    id: 4,
    productName: 'D社広告運用',
    proposalMenu: PROPOSAL_MENUS[4], // 運用コックピット
    representative: SALES_REPRESENTATIVES[0], // 増田 陽
    introducerId: 4, // 直接営業
    status: 'アポ設定',
    lastContactDate: '2024-01-16',
    nextAction: '初回打ち合わせ',
    nextActionDate: '2024-01-22',
    logs: [
      {
        id: 1,
        title: '初回接触',
        actionDate: '2024-01-16',
        actionDetails: '電話での初回接触。広告運用の課題について簡単にヒアリング。',
        summary: 'Web広告のROI改善が課題。詳細は次回打ち合わせで。',
        nextAction: '対面打ち合わせの実施',
        nextActionDate: '2024-01-22',
        status: 'アポ設定'
      }
    ]
  },
  {
    id: 5,
    productName: 'E社システム改修',
    proposalMenu: PROPOSAL_MENUS[3], // IFキャスティング
    representative: SALES_REPRESENTATIVES[1], // 渡邊 哲成
    introducerId: 3, // 山田CTO
    status: '見送り',
    lastContactDate: '2024-01-10',
    nextAction: '',
    nextActionDate: '',
    logs: [
      {
        id: 1,
        title: 'システム改修相談',
        actionDate: '2024-01-05',
        actionDetails: 'システム改修の相談。既存システムの課題整理を実施。',
        summary: 'レガシーシステムの刷新が課題。予算確保が困難。',
        nextAction: '概算見積もりの提出',
        nextActionDate: '2024-01-10',
        status: 'アポ設定'
      },
      {
        id: 2,
        title: '見積もり提出',
        actionDate: '2024-01-10',
        actionDetails: '概算見積もり提出。予算オーバーのため今期は見送りとなった。',
        summary: '予算制約により今期は見送り。来期に再検討予定。',
        nextAction: '',
        nextActionDate: '',
        status: '見送り'
      }
    ]
  }
];

export default mockDeals; 