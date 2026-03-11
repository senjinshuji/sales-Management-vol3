const express = require('express');
const router = express.Router();
const dataStore = require('../models/dataStore');

// カンバンデータ取得
router.get('/', (req, res) => {
  try {
    const deals = dataStore.getAllDeals();
    
    // ステータス別にグループ化
    const statusColumns = [
      'アポ設定',
      '商談中',
      '提案済み',
      '検討中',
      '承認待ち',
      '受注済み',
      '失注'
    ];

    const kanbanData = statusColumns.map(status => {
      const statusDeals = deals.filter(deal => deal.status === status);
      
      // 各案件に紹介者情報を追加
      const enrichedDeals = statusDeals.map(deal => {
        const introducer = dataStore.getIntroducerById(deal.introducerId);
        const actionLogs = dataStore.getActionLogsByDealId(deal.id);
        
        return {
          ...deal,
          introducer: introducer ? introducer.name : '不明',
          lastActionDate: actionLogs.length > 0 
            ? Math.max(...actionLogs.map(log => new Date(log.actionDate)))
            : null,
          actionCount: actionLogs.length
        };
      });

      return {
        id: status,
        title: status,
        deals: enrichedDeals.sort((a, b) => {
          // 次回アクション日でソート（近い順）
          if (!a.nextActionDate && !b.nextActionDate) return 0;
          if (!a.nextActionDate) return 1;
          if (!b.nextActionDate) return -1;
          return new Date(a.nextActionDate) - new Date(b.nextActionDate);
        }),
        count: enrichedDeals.length
      };
    });

    res.json({
      success: true,
      data: kanbanData,
      summary: {
        totalDeals: deals.length,
        columnCounts: kanbanData.reduce((acc, column) => {
          acc[column.id] = column.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('カンバンデータ取得エラー:', error);
    res.status(500).json({
      error: 'カンバンデータの取得に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// カード移動
router.post('/move', (req, res) => {
  try {
    const { dealId, newStatus, oldStatus } = req.body;

    if (!dealId || !newStatus) {
      return res.status(400).json({
        error: '必須項目が不足しています',
        required: ['dealId', 'newStatus']
      });
    }

    const deal = dataStore.getDealById(dealId);
    if (!deal) {
      return res.status(404).json({
        error: '案件が見つかりません'
      });
    }

    // ステータス更新
    const updatedDeal = dataStore.updateDeal(dealId, { 
      status: newStatus,
      lastContactDate: new Date().toISOString().split('T')[0]
    });

    // ステータス変更ログを作成
    const changeLog = {
      dealId: parseInt(dealId),
      title: `ステータス変更: ${oldStatus || deal.status} → ${newStatus}`,
      actionDate: new Date().toISOString().split('T')[0],
      actionDetails: `カンバンボードでステータスが「${oldStatus || deal.status}」から「${newStatus}」に変更されました。`,
      status: newStatus
    };

    dataStore.createActionLog(changeLog);

    // Slack通知（非同期）
    if (process.env.SLACK_BOT_TOKEN) {
      const slackService = require('../services/slackService');
      slackService.notifyStatusChange(updatedDeal, oldStatus || deal.status, newStatus)
        .catch(error => {
          console.error('Slackステータス変更通知エラー:', error.message);
        });
    }

    res.json({
      success: true,
      message: 'カードが正常に移動されました',
      data: {
        deal: updatedDeal,
        changeLog,
        statusChange: {
          from: oldStatus || deal.status,
          to: newStatus
        }
      }
    });
  } catch (error) {
    console.error('カード移動エラー:', error);
    res.status(500).json({
      error: 'カードの移動に失敗しました',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router; 