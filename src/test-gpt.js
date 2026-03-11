// GPT API テスト用スクリプト
import { analyzeMeetingNotes, isGPTServiceAvailable } from './services/gptService.js';

const testGPTAPI = async () => {
  console.log('=== GPT API テスト開始 ===');
  
  // 1. API キーの確認
  console.log('1. API キー確認');
  console.log('REACT_APP_OPENAI_API_KEY:', process.env.REACT_APP_OPENAI_API_KEY ? '設定済み' : '未設定');
  console.log('isGPTServiceAvailable():', isGPTServiceAvailable());
  
  // 2. 簡単なテストデータで分析
  console.log('\n2. 簡単なテストデータで分析');
  const testData = `
  営業会議の内容：
  - 顧客は来月のサービス導入を検討中
  - 予算は月額30万円で調整可能
  - 技術部門との打ち合わせが必要
  - 次週までに詳細提案書を作成予定
  - 導入時期は4月を希望
  `;
  
  try {
    const result = await analyzeMeetingNotes(testData);
    console.log('分析結果:', result);
    
    if (result.error) {
      console.error('エラーあり:', result.error);
    } else {
      console.log('✅ 成功');
      console.log('アクションプラン:', result.actionPlans);
      console.log('ステータス:', result.status);
    }
  } catch (error) {
    console.error('💥 テスト失敗:', error);
  }
  
  console.log('=== GPT API テスト終了 ===');
};

export default testGPTAPI;