const axios = require('axios');

// OpenAI API設定
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * アクションログのAI分析
 */
const analyzeActionLog = async (actionLog, deal) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API キーが設定されていません');
  }

  try {
    const prompt = createAnalysisPrompt(actionLog, deal);
    
    const response = await axios.post(OPENAI_API_URL, {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '営業管理のエキスパートとして、アクションログを分析し、案件の進捗状況と次のアクションを提案してください。回答は日本語で、具体的で実践的な内容にしてください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    
    // レスポンスを構造化
    const analysis = parseAiResponse(aiResponse);
    
    console.log('AI分析完了:', analysis);
    return analysis;
    
  } catch (error) {
    console.error('AI分析エラー:', error.message);
    
    if (error.response) {
      console.error('OpenAI API エラー:', error.response.data);
      throw new Error(`OpenAI API エラー: ${error.response.data.error?.message || 'Unknown error'}`);
    }
    
    throw new Error('AI分析に失敗しました');
  }
};

/**
 * 分析用プロンプト作成
 */
const createAnalysisPrompt = (actionLog, deal) => {
  return `
営業案件の分析をお願いします。

【案件情報】
- 商材名: ${deal.productName}
- 提案メニュー: ${deal.proposalMenu}
- 担当者: ${deal.representative}
- 現在のステータス: ${deal.status}
- 推定金額: ${deal.estimatedAmount ? deal.estimatedAmount.toLocaleString() + '円' : '未設定'}
- 優先度: ${deal.priority || '中'}

【アクションログ】
- タイトル: ${actionLog.title}
- アクション日: ${actionLog.actionDate}
- 詳細: ${actionLog.actionDetails || '詳細なし'}
- 次回アクション: ${actionLog.nextAction || '未設定'}
- 次回実施日: ${actionLog.nextActionDate || '未設定'}

以下の観点で分析してください：

1. 【ステータス妥当性】現在のステータスが適切か
2. 【進捗評価】案件の進捗状況（5段階評価）
3. 【リスク分析】懸念点や注意すべき要素
4. 【次回提案】具体的な次のアクション提案
5. 【優先度】案件の優先度見直し提案

回答は以下の形式でお願いします：
ステータス: [適切/要見直し]
進捗評価: [1-5]/5
リスク: [リスク要因]
次回提案: [具体的なアクション]
優先度: [高/中/低]
コメント: [総合的な所見]
`;
};

/**
 * AI回答の構造化
 */
const parseAiResponse = (response) => {
  const lines = response.split('\n').filter(line => line.trim());
  const analysis = {
    statusRecommendation: '',
    progressScore: 3,
    riskFactors: [],
    nextActionSuggestion: '',
    priorityRecommendation: '中',
    summary: '',
    rawResponse: response,
    timestamp: new Date().toISOString()
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed.includes('ステータス:')) {
      analysis.statusRecommendation = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.includes('進捗評価:')) {
      const match = trimmed.match(/(\d+)/);
      if (match) {
        analysis.progressScore = parseInt(match[1]);
      }
    } else if (trimmed.includes('リスク:')) {
      const risk = trimmed.split(':')[1]?.trim();
      if (risk && risk !== '特になし') {
        analysis.riskFactors.push(risk);
      }
    } else if (trimmed.includes('次回提案:')) {
      analysis.nextActionSuggestion = trimmed.split(':')[1]?.trim() || '';
    } else if (trimmed.includes('優先度:')) {
      analysis.priorityRecommendation = trimmed.split(':')[1]?.trim() || '中';
    } else if (trimmed.includes('コメント:')) {
      analysis.summary = trimmed.split(':')[1]?.trim() || '';
    }
  });

  return analysis;
};

/**
 * ステータス予測
 */
const predictNextStatus = async (deal, actionHistory) => {
  if (!OPENAI_API_KEY) {
    return { prediction: deal.status, confidence: 0 };
  }

  try {
    const prompt = `
営業案件のステータス予測をお願いします。

【現在の案件】
商材: ${deal.productName}
現在ステータス: ${deal.status}
最終接触: ${deal.lastContactDate}
次回アクション: ${deal.nextAction}

【アクション履歴】
${actionHistory.slice(-3).map(log => 
  `${log.actionDate}: ${log.title} (${log.status})`
).join('\n')}

次に移行する可能性が高いステータスと確率（0-100%）を予測してください。
選択肢: アポ設定, 商談中, 提案済み, 検討中, 承認待ち, 受注済み, 失注

形式: ステータス名:確率%
`;

    const response = await axios.post(OPENAI_API_URL, {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '営業データアナリストとして、案件の進捗パターンを分析し、次のステータスを予測してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const prediction = response.data.choices[0].message.content;
    const match = prediction.match(/([^:]+):(\d+)%/);
    
    if (match) {
      return {
        prediction: match[1].trim(),
        confidence: parseInt(match[2]),
        reasoning: prediction
      };
    }

    return { prediction: deal.status, confidence: 0, reasoning: prediction };
    
  } catch (error) {
    console.error('ステータス予測エラー:', error.message);
    return { prediction: deal.status, confidence: 0 };
  }
};

/**
 * 成約確率計算
 */
const calculateWinProbability = async (deal, actionHistory) => {
  if (!OPENAI_API_KEY) {
    return { probability: 50, factors: [] };
  }

  try {
    const prompt = `
営業案件の成約確率を分析してください。

【案件詳細】
商材: ${deal.productName}
ステータス: ${deal.status}
推定金額: ${deal.estimatedAmount || '未設定'}
優先度: ${deal.priority}
営業期間: ${calculateDaysSinceCreation(deal)}日

【活動履歴】
アクション回数: ${actionHistory.length}回
最近の活動: ${actionHistory.slice(-2).map(log => log.title).join(', ')}

0-100%の成約確率と主要な判断要因を教えてください。

形式:
確率: X%
要因: [ポジティブ要因とネガティブ要因のリスト]
`;

    const response = await axios.post(OPENAI_API_URL, {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '営業成果予測の専門家として、客観的に成約確率を評価してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.5
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const analysis = response.data.choices[0].message.content;
    const probabilityMatch = analysis.match(/確率:\s*(\d+)%/);
    
    return {
      probability: probabilityMatch ? parseInt(probabilityMatch[1]) : 50,
      analysis: analysis,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('成約確率計算エラー:', error.message);
    return { probability: 50, factors: [] };
  }
};

/**
 * 案件作成からの日数計算
 */
const calculateDaysSinceCreation = (deal) => {
  const createdDate = new Date(deal.createdAt);
  const today = new Date();
  return Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));
};

module.exports = {
  analyzeActionLog,
  predictNextStatus,
  calculateWinProbability
}; 