// GPT API 更新版テスト
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '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';

console.log('=== GPT API 更新版テスト開始 ===');

// 1. APIキーの確認
console.log('1. APIキー確認');
console.log('API_KEY:', API_KEY ? `設定済み (${API_KEY.substring(0, 10)}...)` : '未設定');

// 2. OpenAIクライアント初期化
const openai = new OpenAI({
  apiKey: API_KEY,
});

// 3. テストデータ
const testData = `
営業会議の内容：
- 顧客は来月のサービス導入を検討中
- 予算は月額30万円で調整可能
- 技術部門との打ち合わせが必要
- 次週までに詳細提案書を作成予定
- 導入時期は4月を希望
- 担当者は田中さんで決裁者は部長の佐藤さん
- 競合他社の見積もりとの比較を求められた
`;

// 4. 新しいプロンプト作成
const createPrompt = (meetingNotes) => {
  return `下記の議事録を読み取って、以下の3つの項目を出力してください：

■ AI要約
この議事録を5行で要約してください。

■ アクションプラン  
この議事録の内容に基づいて、次に取るべき具体的なアクションを提案してください。
議事録の内容から適切な行動を推測し、実行可能で具体的なアクションを複数提案してください。
例：「提案書作成」「価格調整」「社内稟議」「デモ実施」「追加ヒアリング」「契約書準備」など

■ ステータス
以下の6つのステータスから最も適切なものを1つ選択してください：
- 与件化_提案中：MTGが終わっていて提案をこちらが作成するステータス
- 受注：このMTGを持って、実際にサービスが受注されたステータス
- 失注：MTGの結果、サービスが導入されなかったステータス
- 保留：一旦サービス導入が見送られているが、長期的にはサービス導入の可能性があるステータス
- 検討中：MTGが終わっていて提案を先方が検討しているステータス
- 稼働終了：追いかけもしない、完全に稼働が終了したステータス

議事録：
${meetingNotes}

※回答は上記の■で示した3つの項目のみを含めてください。他の情報は不要です。`;
};

// 5. ステータス定義
const STATUS_DEFINITIONS = {
  '与件化_提案中': 'MTGが終わっていて提案をこちらが作成するステータス',
  '受注': 'このMTGを持って、実際にサービスが受注されたステータス', 
  '失注': 'MTGの結果、サービスが導入されなかったステータス',
  '保留': '一旦サービス導入が見送られているが、長期的にはサービス導入の可能性があるステータス',
  '検討中': 'MTGが終わっていて提案を先方が検討しているステータス',
  '稼働終了': '追いかけもしない、完全に稼働が終了したステータス'
};

// 6. レスポンス解析関数
const parseGPTResponse = (response) => {
  let summary = '';
  const actionPlans = [];
  let status = '';
  
  try {
    const lines = response.split('\n').filter(line => line.trim());
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // セクション判定
      if (trimmedLine.includes('AI要約') || trimmedLine.includes('要約')) {
        currentSection = 'summary';
        continue;
      } else if (trimmedLine.includes('アクションプラン') || trimmedLine.includes('アクション')) {
        currentSection = 'action';
        continue;
      } else if (trimmedLine.includes('ステータス')) {
        currentSection = 'status';
        continue;
      }
      
      // 内容抽出
      if (currentSection === 'summary' && trimmedLine) {
        // 要約セクションの内容を蓄積
        if (!trimmedLine.includes('■') && !trimmedLine.includes('要約')) {
          summary += (summary ? '\n' : '') + trimmedLine;
        }
      } else if (currentSection === 'action' && trimmedLine) {
        // リストマーカーを除去
        const cleanAction = trimmedLine
          .replace(/^[・•\-\*\d+\.]\s*/, '')
          .replace(/^[\-\*]\s*/, '')
          .trim();
        
        if (cleanAction && !cleanAction.includes('アクションプラン') && !cleanAction.includes('■')) {
          actionPlans.push(cleanAction);
        }
      } else if (currentSection === 'status' && trimmedLine) {
        // ステータスを抽出（定義済みステータスのいずれかを探す）
        const validStatuses = Object.keys(STATUS_DEFINITIONS);
        for (const validStatus of validStatuses) {
          if (trimmedLine.includes(validStatus)) {
            status = validStatus;
            break;
          }
        }
      }
    }
    
    // フォールバック：正規表現でより柔軟に抽出
    if (!summary) {
      const summaryMatch = response.match(/■\s*AI要約[：:\s]*(.*?)(?=■|$)/s);
      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }
    }
    
    if (actionPlans.length === 0) {
      const actionMatch = response.match(/■\s*アクションプラン[：:\s]*(.*?)(?=■|$)/s);
      if (actionMatch) {
        const actionText = actionMatch[1].trim();
        // 複数のアクションを分割
        const actions = actionText.split(/\n|、|。/).filter(action => 
          action.trim() && !action.includes('例：')
        );
        actionPlans.push(...actions.map(action => action.trim()));
      }
    }
    
    if (!status) {
      const validStatuses = Object.keys(STATUS_DEFINITIONS);
      for (const validStatus of validStatuses) {
        if (response.includes(validStatus)) {
          status = validStatus;
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('レスポンス解析エラー:', error);
  }
  
  return {
    summary: summary || '要約を抽出できませんでした',
    actionPlans: actionPlans.length > 0 ? actionPlans : ['分析結果から具体的なアクションを抽出できませんでした'],
    status: status || '検討中' // デフォルトステータス
  };
};

// 7. API実行テスト
const testGPTAPI = async () => {
  try {
    console.log('\n2. GPT API 実行テスト');
    console.log('送信データ:', testData);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは営業支援AIです。議事録を分析して、次のアクションプランと適切なステータスを提案してください。回答は簡潔で実行可能な内容にしてください。'
        },
        {
          role: 'user',
          content: createPrompt(testData)
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    console.log('\n3. レスポンス確認');
    console.log('status:', response.choices[0]?.finish_reason);
    
    const analysisResult = response.choices[0]?.message?.content;
    
    if (analysisResult) {
      console.log('\n✅ API実行成功！');
      console.log('=== 生の分析結果 ===');
      console.log(analysisResult);
      
      // 結果の解析もテスト
      const parsed = parseGPTResponse(analysisResult);
      console.log('\n=== 解析後の結果 ===');
      console.log('📄 AI要約:');
      console.log(parsed.summary);
      console.log('\n📋 アクションプラン:');
      parsed.actionPlans.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan}`);
      });
      console.log('\n🔄 ステータス:', parsed.status);
      
    } else {
      console.log('\n❌ レスポンスが空でした');
    }

  } catch (error) {
    console.error('\n💥 API実行エラー:', error.message);
    
    if (error.status) {
      console.error('HTTP Status:', error.status);
    }
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.type) {
      console.error('Error Type:', error.type);
    }
  }
};

// テスト実行
testGPTAPI().then(() => {
  console.log('\n=== GPT API 更新版テスト終了 ===');
}).catch((error) => {
  console.error('テスト実行エラー:', error);
});