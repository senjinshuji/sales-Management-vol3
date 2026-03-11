/**
 * 営業管理ツール データストア
 * メモリベースのデータ管理システム
 */

// データストレージ
let deals = [];
let actionLogs = [];
let introducers = [];
let idCounters = {
  deals: 1,
  actionLogs: 1,
  introducers: 1
};

// 初期データ
const initializeData = () => {
  // 紹介者データ
  introducers = [
    {
      id: 1,
      name: '田中太郎',
      company: '株式会社ABC',
      position: '部長',
      email: 'tanaka@abc-corp.com',
      phone: '090-1234-5678',
      status: 'アクティブ',
      createdAt: '2024-01-01'
    },
    {
      id: 2,
      name: '佐藤花子',
      company: '有限会社XYZ',
      position: '取締役',
      email: 'sato@xyz-ltd.com',
      phone: '090-8765-4321',
      status: 'アクティブ',
      createdAt: '2024-01-02'
    }
  ];

  // 案件データ
  deals = [
    {
      id: 1,
      productName: 'A社システム導入案件',
      proposalMenu: '第一想起取れるくん',
      representative: '増田 陽',
      introducerId: 1,
      status: 'アポ設定',
      lastContactDate: '2024-01-10',
      nextAction: '提案書プレゼンテーション',
      nextActionDate: '2024-01-15',
      priority: '高',
      estimatedAmount: 5000000,
      progressRate: 25,
      createdAt: '2024-01-05',
      updatedAt: '2024-01-10'
    },
    {
      id: 2,
      productName: 'B社マーケティング支援',
      proposalMenu: 'ブランディング強化パック',
      representative: '田村 幸',
      introducerId: 2,
      status: '検討中',
      lastContactDate: '2024-01-12',
      nextAction: '追加資料の提出',
      nextActionDate: '2024-01-18',
      priority: '中',
      estimatedAmount: 3000000,
      progressRate: 40,
      createdAt: '2024-01-08',
      updatedAt: '2024-01-12'
    }
  ];

  // アクションログデータ
  actionLogs = [
    {
      id: 1,
      dealId: 1,
      title: '初回商談',
      actionDate: '2024-01-10',
      actionDetails: '担当者との初回面談。ニーズの確認と課題の洗い出しを実施。',
      nextAction: '提案書プレゼンテーション',
      nextActionDate: '2024-01-15',
      status: 'アポ設定',
      attachments: [],
      createdAt: '2024-01-10T10:30:00Z',
      updatedAt: '2024-01-10T10:30:00Z'
    },
    {
      id: 2,
      dealId: 2,
      title: 'フォローアップ',
      actionDate: '2024-01-12',
      actionDetails: '前回の提案に対する追加質問への回答。詳細な見積もりを要求される。',
      nextAction: '追加資料の提出',
      nextActionDate: '2024-01-18',
      status: '検討中',
      attachments: [],
      createdAt: '2024-01-12T14:20:00Z',
      updatedAt: '2024-01-12T14:20:00Z'
    }
  ];

  // IDカウンターの更新
  idCounters.deals = Math.max(...deals.map(d => d.id), 0) + 1;
  idCounters.actionLogs = Math.max(...actionLogs.map(a => a.id), 0) + 1;
  idCounters.introducers = Math.max(...introducers.map(i => i.id), 0) + 1;
};

// 案件管理関数
const getAllDeals = () => deals;

const getDealById = (id) => deals.find(deal => deal.id === parseInt(id));

const getDealByProductAndMenu = (productName, proposalMenu) => 
  deals.find(deal => 
    deal.productName === productName && deal.proposalMenu === proposalMenu
  );

const createDeal = (dealData) => {
  const newDeal = {
    id: idCounters.deals++,
    ...dealData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  deals.push(newDeal);
  return newDeal;
};

const updateDeal = (id, updates) => {
  const index = deals.findIndex(deal => deal.id === parseInt(id));
  if (index === -1) return null;
  
  deals[index] = {
    ...deals[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return deals[index];
};

const deleteDeal = (id) => {
  const index = deals.findIndex(deal => deal.id === parseInt(id));
  if (index === -1) return false;
  
  deals.splice(index, 1);
  return true;
};

// 要注意案件の取得
const getDealsRequiringAttention = () => {
  const today = new Date();
  return deals.filter(deal => {
    if (!deal.nextActionDate) return false;
    const nextActionDate = new Date(deal.nextActionDate);
    const daysDiff = (nextActionDate - today) / (1000 * 60 * 60 * 24);
    return daysDiff <= 3; // 3日以内または過ぎている
  });
};

// アクションログ管理関数
const getAllActionLogs = () => actionLogs;

const getActionLogById = (id) => actionLogs.find(log => log.id === parseInt(id));

const getActionLogsByDealId = (dealId) => 
  actionLogs.filter(log => log.dealId === parseInt(dealId));

const createActionLog = (logData) => {
  const newLog = {
    id: idCounters.actionLogs++,
    ...logData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  actionLogs.push(newLog);
  return newLog;
};

const updateActionLog = (id, updates) => {
  const index = actionLogs.findIndex(log => log.id === parseInt(id));
  if (index === -1) return null;
  
  actionLogs[index] = {
    ...actionLogs[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  return actionLogs[index];
};

// 紹介者管理関数
const getAllIntroducers = () => introducers;

const getIntroducerById = (id) => introducers.find(intro => intro.id === parseInt(id));

const createIntroducer = (introData) => {
  const newIntroducer = {
    id: idCounters.introducers++,
    ...introData,
    createdAt: new Date().toISOString()
  };
  introducers.push(newIntroducer);
  return newIntroducer;
};

// 統計関数
const getStats = () => {
  const statusCounts = {};
  deals.forEach(deal => {
    statusCounts[deal.status] = (statusCounts[deal.status] || 0) + 1;
  });

  return {
    totalDeals: deals.length,
    totalActionLogs: actionLogs.length,
    totalIntroducers: introducers.length,
    statusCounts,
    overdueDeals: getDealsRequiringAttention().length
  };
};

// 初期化実行
initializeData();

// エクスポート
module.exports = {
  // データアクセス
  deals,
  actionLogs,
  introducers,
  
  // 初期化
  initializeData,
  
  // 案件管理
  getAllDeals,
  getDealById,
  getDealByProductAndMenu,
  createDeal,
  updateDeal,
  deleteDeal,
  getDealsRequiringAttention,
  
  // アクションログ管理
  getAllActionLogs,
  getActionLogById,
  getActionLogsByDealId,
  createActionLog,
  updateActionLog,
  
  // 紹介者管理
  getAllIntroducers,
  getIntroducerById,
  createIntroducer,
  
  // 統計
  getStats
}; 