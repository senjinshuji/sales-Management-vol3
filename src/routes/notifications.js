const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');
const slackService = require('../services/slackService');

// 手動Slack通知送信
router.post('/slack/send', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'メッセージが必要です'
      });
    }

    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(503).json({
        error: 'Slack通知機能が利用できません',
        message: 'Slack Bot Tokenが設定されていません'
      });
    }

    const result = await slackService.sendMessage(message);
    
    res.json({
      success: result,
      message: result ? 'Slack通知を送信しました' : 'Slack通知の送信に失敗しました'
    });
  } catch (error) {
    console.error('Slack通知送信エラー:', error);
    res.status(500).json({
      error: 'Slack通知の送信に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 要注意案件通知
router.post('/slack/overdue-alerts', async (req, res) => {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(503).json({
        error: 'Slack通知機能が利用できません',
        message: 'Slack Bot Tokenが設定されていません'
      });
    }

    const overdueDeals = dataStore.getDealsRequiringAttention();
    
    if (overdueDeals.length === 0) {
      return res.json({
        success: true,
        message: '要注意案件はありません',
        data: { count: 0 }
      });
    }

    const result = await slackService.notifyOverdueDeals(overdueDeals);
    
    res.json({
      success: result,
      message: result 
        ? `${overdueDeals.length}件の要注意案件を通知しました` 
        : '要注意案件通知の送信に失敗しました',
      data: { count: overdueDeals.length }
    });
  } catch (error) {
    console.error('要注意案件通知エラー:', error);
    res.status(500).json({
      error: '要注意案件通知の送信に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 日次サマリー送信
router.post('/slack/daily-summary', async (req, res) => {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(503).json({
        error: 'Slack通知機能が利用できません',
        message: 'Slack Bot Tokenが設定されていません'
      });
    }

    const deals = dataStore.getAllDeals();
    const actionLogs = dataStore.getAllActionLogs();
    
    const result = await slackService.sendDailySummary(deals, actionLogs);
    
    res.json({
      success: result,
      message: result 
        ? '日次サマリーを送信しました' 
        : '日次サマリーの送信に失敗しました',
      data: {
        totalDeals: deals.length,
        totalActionLogs: actionLogs.length
      }
    });
  } catch (error) {
    console.error('日次サマリー送信エラー:', error);
    res.status(500).json({
      error: '日次サマリーの送信に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 通知設定取得
router.get('/settings', (req, res) => {
  try {
    const settings = {
      slack: {
        enabled: !!process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL || '#営業管理',
        notifications: {
          newActionLog: true,
          statusChange: true,
          overdueAlerts: true,
          dailySummary: true
        }
      },
      ai: {
        enabled: !!process.env.OPENAI_API_KEY,
        features: {
          actionAnalysis: true,
          statusPrediction: true,
          nextActionSuggestion: true
        }
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('通知設定取得エラー:', error);
    res.status(500).json({
      error: '通知設定の取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 通知テスト
router.post('/test', async (req, res) => {
  try {
    const { type = 'basic' } = req.body;
    
    if (!process.env.SLACK_BOT_TOKEN) {
      return res.status(503).json({
        error: 'Slack通知機能が利用できません',
        message: 'Slack Bot Tokenが設定されていません'
      });
    }

    let result = false;
    let message = '';

    switch (type) {
      case 'basic':
        result = await slackService.sendMessage('🧪 営業管理ツール - 通知テスト');
        message = '基本通知テスト';
        break;

      case 'actionlog':
        const testDeal = dataStore.getAllDeals()[0];
        if (testDeal) {
          const testLog = {
            id: 999,
            title: 'テスト用アクション',
            actionDate: new Date().toISOString().split('T')[0],
            status: 'テスト中'
          };
          result = await slackService.notifyNewActionLog(testLog, testDeal, 'created');
          message = 'アクションログ通知テスト';
        } else {
          return res.status(400).json({ error: 'テスト用案件データがありません' });
        }
        break;

      case 'overdue':
        const overdueDeals = dataStore.getDealsRequiringAttention();
        if (overdueDeals.length > 0) {
          result = await slackService.notifyOverdueDeals(overdueDeals);
          message = '要注意案件通知テスト';
        } else {
          result = await slackService.sendMessage('🧪 要注意案件通知テスト - 現在、要注意案件はありません');
          message = '要注意案件通知テスト（対象なし）';
        }
        break;

      default:
        return res.status(400).json({
          error: '不正なテストタイプです',
          validTypes: ['basic', 'actionlog', 'overdue']
        });
    }

    res.json({
      success: result,
      message: result 
        ? `${message}が正常に送信されました` 
        : `${message}の送信に失敗しました`,
      type
    });
  } catch (error) {
    console.error('通知テストエラー:', error);
    res.status(500).json({
      error: '通知テストに失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 