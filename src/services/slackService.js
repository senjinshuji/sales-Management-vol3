const { WebClient } = require('@slack/web-api');

// Slack Web API クライアント
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;
const defaultChannel = process.env.SLACK_CHANNEL || '#営業管理';

/**
 * 基本メッセージ送信
 */
const sendMessage = async (text, channel = defaultChannel) => {
  if (!slack) {
    console.warn('Slack Bot Token が設定されていません');
    return false;
  }

  try {
    const result = await slack.chat.postMessage({
      channel,
      text,
      username: '営業管理ツール',
      icon_emoji: ':briefcase:'
    });
    
    console.log('Slack メッセージ送信成功:', result.ts);
    return true;
  } catch (error) {
    console.error('Slack メッセージ送信エラー:', error.message);
    return false;
  }
};

/**
 * 新規アクションログ通知
 */
const notifyNewActionLog = async (actionLog, deal, action = 'created', channel = defaultChannel) => {
  if (!slack) return false;

  try {
    const actionText = action === 'created' ? '新しいアクションログが記録されました' : 'アクションログが更新されました';
    
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📝 " + actionText
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*案件:* ${deal.productName}`
          },
          {
            type: "mrkdwn",
            text: `*提案メニュー:* ${deal.proposalMenu}`
          },
          {
            type: "mrkdwn",
            text: `*担当者:* ${deal.representative}`
          },
          {
            type: "mrkdwn",
            text: `*ステータス:* ${deal.status}`
          },
          {
            type: "mrkdwn",
            text: `*アクション日:* ${actionLog.actionDate}`
          },
          {
            type: "mrkdwn",
            text: `*タイトル:* ${actionLog.title}`
          }
        ]
      }
    ];

    if (actionLog.nextAction && actionLog.nextActionDate) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*次回アクション:* ${actionLog.nextAction}\n*実施予定日:* ${actionLog.nextActionDate}`
        }
      });
    }

    if (actionLog.actionDetails) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*詳細:*\n${actionLog.actionDetails.substring(0, 200)}${actionLog.actionDetails.length > 200 ? '...' : ''}`
        }
      });
    }

    const result = await slack.chat.postMessage({
      channel,
      blocks,
      username: '営業管理ツール',
      icon_emoji: ':memo:'
    });

    console.log('アクションログ通知送信成功:', result.ts);
    return true;
  } catch (error) {
    console.error('アクションログ通知送信エラー:', error.message);
    return false;
  }
};

/**
 * ステータス変更通知
 */
const notifyStatusChange = async (deal, oldStatus, newStatus, channel = defaultChannel) => {
  if (!slack) return false;

  try {
    const emoji = getStatusEmoji(newStatus);
    
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} ステータス変更通知`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*案件:* ${deal.productName}`
          },
          {
            type: "mrkdwn",
            text: `*担当者:* ${deal.representative}`
          },
          {
            type: "mrkdwn",
            text: `*変更前:* ${oldStatus}`
          },
          {
            type: "mrkdwn",
            text: `*変更後:* ${newStatus}`
          }
        ]
      }
    ];

    if (deal.nextAction && deal.nextActionDate) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*次回アクション:* ${deal.nextAction} (${deal.nextActionDate})`
        }
      });
    }

    const result = await slack.chat.postMessage({
      channel,
      blocks,
      username: '営業管理ツール',
      icon_emoji: ':arrows_counterclockwise:'
    });

    console.log('ステータス変更通知送信成功:', result.ts);
    return true;
  } catch (error) {
    console.error('ステータス変更通知送信エラー:', error.message);
    return false;
  }
};

/**
 * 要注意案件通知
 */
const notifyOverdueDeals = async (overdueDeals, channel = defaultChannel) => {
  if (!slack || overdueDeals.length === 0) return false;

  try {
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `⚠️ 要注意案件アラート (${overdueDeals.length}件)`
        }
      }
    ];

    overdueDeals.forEach(deal => {
      const daysDiff = Math.ceil((new Date(deal.nextActionDate) - new Date()) / (1000 * 60 * 60 * 24));
      const urgencyText = daysDiff <= 0 ? '期限切れ' : daysDiff === 1 ? '明日期限' : `${daysDiff}日後`;
      
      blocks.push({
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*案件:* ${deal.productName}`
          },
          {
            type: "mrkdwn",
            text: `*担当者:* ${deal.representative}`
          },
          {
            type: "mrkdwn",
            text: `*次回アクション:* ${deal.nextAction || '未設定'}`
          },
          {
            type: "mrkdwn",
            text: `*期限:* ${deal.nextActionDate} (${urgencyText})`
          }
        ]
      });
    });

    const result = await slack.chat.postMessage({
      channel,
      blocks,
      username: '営業管理ツール',
      icon_emoji: ':warning:'
    });

    console.log('要注意案件通知送信成功:', result.ts);
    return true;
  } catch (error) {
    console.error('要注意案件通知送信エラー:', error.message);
    return false;
  }
};

/**
 * 日次サマリー送信
 */
const sendDailySummary = async (deals, actionLogs, channel = defaultChannel) => {
  if (!slack) return false;

  try {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = actionLogs.filter(log => log.actionDate === today);
    
    // ステータス別統計
    const statusCounts = {};
    deals.forEach(deal => {
      statusCounts[deal.status] = (statusCounts[deal.status] || 0) + 1;
    });

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 営業管理ツール 日次サマリー (${today})`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*総案件数:* ${deals.length}件`
          },
          {
            type: "mrkdwn",
            text: `*本日のアクション:* ${todayLogs.length}件`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*ステータス別案件数:*\n" + Object.entries(statusCounts)
            .map(([status, count]) => `• ${status}: ${count}件`)
            .join('\n')
        }
      }
    ];

    // 要注意案件があれば追加
    const dataStore = require('../models/dataStore');
    const overdueDeals = dataStore.getDealsRequiringAttention();
    if (overdueDeals.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `⚠️ *要注意案件:* ${overdueDeals.length}件\n期限が近づいている案件があります。`
        }
      });
    }

    const result = await slack.chat.postMessage({
      channel,
      blocks,
      username: '営業管理ツール',
      icon_emoji: ':chart_with_upwards_trend:'
    });

    console.log('日次サマリー送信成功:', result.ts);
    return true;
  } catch (error) {
    console.error('日次サマリー送信エラー:', error.message);
    return false;
  }
};

/**
 * ステータスに応じた絵文字を取得
 */
const getStatusEmoji = (status) => {
  const emojiMap = {
    'アポ設定': '📞',
    '商談中': '💼',
    '提案済み': '📋',
    '検討中': '🤔',
    '承認待ち': '⏰',
    '受注済み': '✅',
    '失注': '❌'
  };
  return emojiMap[status] || '📝';
};

module.exports = {
  sendMessage,
  notifyNewActionLog,
  notifyStatusChange,
  notifyOverdueDeals,
  sendDailySummary
}; 