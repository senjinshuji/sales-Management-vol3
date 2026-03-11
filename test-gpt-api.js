// GPT API 単体テスト
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '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';

console.log('=== GPT API 単体テスト開始 ===');

// 1. APIキーの確認
console.log('1. APIキー確認');
console.log('API_KEY:', API_KEY ? `設定済み (${API_KEY.substring(0, 10)}...)` : '未設定');

// 2. OpenAIクライアント初期化
console.log('\n2. OpenAIクライアント初期化');
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
`;

// 4. プロンプト作成
const createPrompt = (meetingNotes) => {
  return `下記の議事録を読み取って、
・アクションプラン
・ステータス
を表示してください。上記2つ以外の項目はすべて排除して出力してください。
アクションプランは複数表示していいのですが、ステータスは1つにしてください。
ステータスは全部で6個です。
与件化_提案中
受注
失注
保留
検討中
稼働終了

になります。
これらのステータスの意味を書くのでこれに該当するものを表示してください。

与件化_提案中：MTGが終わっていて提案をこちらが作成するステータス
受注：このMTGを持って、実際にサービスが受注されたステータス
失注：MTGの結果、サービスが導入されなかったステータス
保留：一旦サービス導入が見送られているが、長期的にはサービス導入の可能性があるステータス
検討中；MTGが終わっていて提案を先方が検討しているステータス
稼働終了：追いかけもしない、完全に稼働が終了したステータス

議事録：
${meetingNotes}`;
};

// 5. API実行テスト
const testGPTAPI = async () => {
  try {
    console.log('\n3. GPT API 実行テスト');
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

    console.log('\n4. レスポンス確認');
    console.log('status:', response.choices[0]?.finish_reason);
    console.log('content:', response.choices[0]?.message?.content);
    
    const analysisResult = response.choices[0]?.message?.content;
    
    if (analysisResult) {
      console.log('\n✅ API実行成功！');
      console.log('生の分析結果:', analysisResult);
      
      // 結果の解析もテスト
      const parsed = parseGPTResponse(analysisResult);
      console.log('\n📋 解析後の結果:');
      console.log('AI要約:', parsed.summary);
      console.log('アクションプラン:', parsed.actionPlans);
      console.log('ステータス:', parsed.status);
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
  console.log('\n=== GPT API 単体テスト終了 ===');
}).catch((error) => {
  console.error('テスト実行エラー:', error);
});