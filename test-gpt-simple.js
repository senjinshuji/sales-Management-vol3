// GPT API シンプルテスト
import OpenAI from 'openai';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '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';

console.log('=== GPT API シンプルテスト ===');
console.log('APIキー:', API_KEY.substring(0, 20) + '...');

const openai = new OpenAI({
  apiKey: API_KEY,
});

// シンプルなテスト
async function testGPT() {
  try {
    console.log('\n1. シンプルなテストを実行...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // より安価なモデルでテスト
      messages: [
        {
          role: 'user',
          content: 'こんにちは。これはテストです。返信してください。'
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    console.log('✅ 成功！');
    console.log('レスポンス:', response.choices[0]?.message?.content);
    
    // 営業支援のテスト
    console.log('\n2. 営業支援機能のテスト...');
    
    const salesResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは営業支援AIです。簡潔に回答してください。'
        },
        {
          role: 'user',
          content: `以下の情報から次のアクションを1つ提案してください：
          
顧客が予算30万円でサービス導入を検討中。来月決定予定。

アクション：`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });

    console.log('✅ 営業支援テスト成功！');
    console.log('提案されたアクション:', salesResponse.choices[0]?.message?.content);
    
    return true;
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.code) {
      console.error('Code:', error.code);
    }
    return false;
  }
}

// テスト実行
testGPT().then(result => {
  console.log('\n=== テスト終了 ===');
  console.log('結果:', result ? '成功' : '失敗');
});