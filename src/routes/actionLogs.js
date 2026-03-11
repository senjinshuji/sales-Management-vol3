const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');
const aiService = require('../services/aiService');
const slackService = require('../services/slackService');

// アクションログ一覧取得
router.get('/', (req, res) => {
  try {
    const actionLogs = dataStore.getAllActionLogs();
    
    // 案件情報を含めてレスポンス
    const enrichedLogs = actionLogs.map(log => {
      const deal = dataStore.getDealById(log.dealId);
      return {
        ...log,
        deal: deal ? {
          id: deal.id,
          productName: deal.productName,
          proposalMenu: deal.proposalMenu,
          representative: deal.representative
        } : null
      };
    });

    res.json({
      success: true,
      data: enrichedLogs,
      total: enrichedLogs.length
    });
  } catch (error) {
    console.error('アクションログ取得エラー:', error);
    res.status(500).json({
      error: 'アクションログの取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 特定アクションログ取得
router.get('/:id', (req, res) => {
  try {
    const actionLog = dataStore.getActionLogById(req.params.id);
    
    if (!actionLog) {
      return res.status(404).json({
        error: 'アクションログが見つかりません'
      });
    }

    // 関連する案件情報を追加
    const deal = dataStore.getDealById(actionLog.dealId);
    
    res.json({
      success: true,
      data: {
        ...actionLog,
        deal
      }
    });
  } catch (error) {
    console.error('アクションログ取得エラー:', error);
    res.status(500).json({
      error: 'アクションログの取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// アクションログ保存（メイン機能）
router.post('/', async (req, res) => {
  try {
    const {
      title,
      productName,
      proposalMenu,
      representative,
      introducerId,
      actionDate,
      actionDetails,
      nextAction,
      nextActionDate,
      status,
      attachments = []
    } = req.body;

    // バリデーション
    if (!productName || !proposalMenu || !representative || !actionDate) {
      return res.status(400).json({
        error: '必須項目が不足しています',
        required: ['productName', 'proposalMenu', 'representative', 'actionDate']
      });
    }

    // 1. 案件の検索または作成
    let deal = dataStore.getDealByProductAndMenu(productName, proposalMenu);
    let dealUpdated = false;
    let statusChanged = false;
    const oldStatus = deal ? deal.status : null;

    if (!deal) {
      // 新規案件作成
      deal = dataStore.createDeal({
        productName,
        proposalMenu,
        representative,
        introducerId: parseInt(introducerId),
        status: status || 'アポ設定',
        lastContactDate: actionDate,
        nextAction,
        nextActionDate,
        priority: '中',
        progressRate: 10
      });
      dealUpdated = true;
    } else {
      // 既存案件更新
      const updates = {
        lastContactDate: actionDate,
        representative,
        introducerId: parseInt(introducerId)
      };

      if (nextAction) updates.nextAction = nextAction;
      if (nextActionDate) updates.nextActionDate = nextActionDate;
      if (status && status !== deal.status) {
        updates.status = status;
        statusChanged = true;
      }

      deal = dataStore.updateDeal(deal.id, updates);
      dealUpdated = true;
    }

    // 2. アクションログ作成
    const actionLog = dataStore.createActionLog({
      dealId: deal.id,
      title: title || `${productName} - アクション記録`,
      actionDate,
      actionDetails,
      nextAction,
      nextActionDate,
      status: deal.status,
      attachments
    });

    // 3. AI分析（非同期）
    if (process.env.OPENAI_API_KEY) {
      aiService.analyzeActionLog(actionLog, deal).then(analysis => {
        console.log('AI分析完了:', analysis);
      }).catch(error => {
        console.error('AI分析エラー:', error.message);
      });
    }

    // 4. Slack通知（非同期）
    if (process.env.SLACK_BOT_TOKEN) {
      // 新規アクションログ通知
      slackService.notifyNewActionLog(actionLog, deal, 'created').catch(error => {
        console.error('Slack通知エラー:', error.message);
      });

      // ステータス変更通知
      if (statusChanged) {
        slackService.notifyStatusChange(deal, oldStatus, deal.status).catch(error => {
          console.error('Slackステータス変更通知エラー:', error.message);
        });
      }
    }

    // 5. レスポンス返却
    res.status(201).json({
      success: true,
      message: 'アクションログが正常に保存されました',
      data: {
        actionLog,
        deal,
        updates: {
          dealUpdated,
          statusChanged,
          oldStatus,
          newStatus: deal.status
        }
      }
    });

  } catch (error) {
    console.error('アクションログ保存エラー:', error);
    res.status(500).json({
      error: 'アクションログの保存に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI分析実行
router.post('/ai-analysis', async (req, res) => {
  try {
    const { actionLogId } = req.body;

    if (!actionLogId) {
      return res.status(400).json({
        error: 'アクションログIDが必要です'
      });
    }

    const actionLog = dataStore.getActionLogById(actionLogId);
    if (!actionLog) {
      return res.status(404).json({
        error: 'アクションログが見つかりません'
      });
    }

    const deal = dataStore.getDealById(actionLog.dealId);
    if (!deal) {
      return res.status(404).json({
        error: '関連する案件が見つかりません'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'AI分析機能が利用できません',
        message: 'OpenAI APIキーが設定されていません'
      });
    }

    const analysis = await aiService.analyzeActionLog(actionLog, deal);
    
    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('AI分析エラー:', error);
    res.status(500).json({
      error: 'AI分析に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 