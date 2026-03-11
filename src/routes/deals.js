const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// 全案件一覧取得
router.get('/', (req, res) => {
  try {
    const deals = dataStore.getAllDeals();
    
    // 紹介者情報を含めて返却
    const enrichedDeals = deals.map(deal => {
      const introducer = dataStore.getIntroducerById(deal.introducerId);
      return {
        ...deal,
        introducer: introducer ? introducer.name : '不明'
      };
    });

    res.json({
      success: true,
      data: enrichedDeals,
      total: enrichedDeals.length
    });
  } catch (error) {
    console.error('案件一覧取得エラー:', error);
    res.status(500).json({
      error: '案件一覧の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 案件統計取得
router.get('/stats', (req, res) => {
  try {
    const stats = dataStore.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('統計取得エラー:', error);
    res.status(500).json({
      error: '統計情報の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 要注意案件取得
router.get('/attention-required', (req, res) => {
  try {
    const overdueDeals = dataStore.getDealsRequiringAttention();
    
    const enrichedDeals = overdueDeals.map(deal => {
      const introducer = dataStore.getIntroducerById(deal.introducerId);
      const daysDiff = Math.ceil((new Date(deal.nextActionDate) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        ...deal,
        introducer: introducer ? introducer.name : '不明',
        daysUntilAction: daysDiff,
        urgency: daysDiff <= 0 ? '期限切れ' : daysDiff === 1 ? '明日' : `${daysDiff}日後`
      };
    });

    res.json({
      success: true,
      data: enrichedDeals,
      total: enrichedDeals.length
    });
  } catch (error) {
    console.error('要注意案件取得エラー:', error);
    res.status(500).json({
      error: '要注意案件の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 特定案件取得
router.get('/:id', (req, res) => {
  try {
    const deal = dataStore.getDealById(req.params.id);
    
    if (!deal) {
      return res.status(404).json({
        error: '案件が見つかりません'
      });
    }

    // 関連情報を追加
    const introducer = dataStore.getIntroducerById(deal.introducerId);
    const actionLogs = dataStore.getActionLogsByDealId(deal.id);

    res.json({
      success: true,
      data: {
        ...deal,
        introducer,
        actionLogs: actionLogs.sort((a, b) => 
          new Date(b.actionDate) - new Date(a.actionDate)
        )
      }
    });
  } catch (error) {
    console.error('案件取得エラー:', error);
    res.status(500).json({
      error: '案件の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 案件作成
router.post('/', (req, res) => {
  try {
    const {
      productName,
      proposalMenu,
      representative,
      introducerId,
      status = 'アポ設定',
      priority = '中',
      estimatedAmount,
      nextAction,
      nextActionDate
    } = req.body;

    // バリデーション
    if (!productName || !proposalMenu || !representative) {
      return res.status(400).json({
        error: '必須項目が不足しています',
        required: ['productName', 'proposalMenu', 'representative']
      });
    }

    // 重複チェック
    const existingDeal = dataStore.getDealByProductAndMenu(productName, proposalMenu);
    if (existingDeal) {
      return res.status(409).json({
        error: '同じ商材名と提案メニューの案件が既に存在します',
        existingDeal: {
          id: existingDeal.id,
          status: existingDeal.status
        }
      });
    }

    const dealData = {
      productName,
      proposalMenu,
      representative,
      introducerId: introducerId ? parseInt(introducerId) : null,
      status,
      priority,
      estimatedAmount: estimatedAmount ? parseInt(estimatedAmount) : null,
      nextAction,
      nextActionDate,
      progressRate: 10,
      lastContactDate: new Date().toISOString().split('T')[0]
    };

    const newDeal = dataStore.createDeal(dealData);

    res.status(201).json({
      success: true,
      message: '案件が正常に作成されました',
      data: newDeal
    });
  } catch (error) {
    console.error('案件作成エラー:', error);
    res.status(500).json({
      error: '案件の作成に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 案件更新
router.put('/:id', (req, res) => {
  try {
    const deal = dataStore.getDealById(req.params.id);
    
    if (!deal) {
      return res.status(404).json({
        error: '案件が見つかりません'
      });
    }

    const updates = { ...req.body };
    
    // IDとタイムスタンプ系フィールドは更新不可
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // 数値型フィールドの変換
    if (updates.introducerId) updates.introducerId = parseInt(updates.introducerId);
    if (updates.estimatedAmount) updates.estimatedAmount = parseInt(updates.estimatedAmount);
    if (updates.progressRate) updates.progressRate = parseInt(updates.progressRate);

    const updatedDeal = dataStore.updateDeal(req.params.id, updates);

    res.json({
      success: true,
      message: '案件が正常に更新されました',
      data: updatedDeal
    });
  } catch (error) {
    console.error('案件更新エラー:', error);
    res.status(500).json({
      error: '案件の更新に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 案件削除
router.delete('/:id', (req, res) => {
  try {
    const deal = dataStore.getDealById(req.params.id);
    
    if (!deal) {
      return res.status(404).json({
        error: '案件が見つかりません'
      });
    }

    const success = dataStore.deleteDeal(req.params.id);
    
    if (!success) {
      return res.status(500).json({
        error: '案件の削除に失敗しました'
      });
    }

    res.json({
      success: true,
      message: '案件が正常に削除されました',
      data: { id: parseInt(req.params.id) }
    });
  } catch (error) {
    console.error('案件削除エラー:', error);
    res.status(500).json({
      error: '案件の削除に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 