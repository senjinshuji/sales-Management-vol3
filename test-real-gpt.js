// 実際のGPT APIテスト
import { analyzeMeetingNotes } from './src/services/gptService.js';

console.log('=== 実際のGPT APIテスト ===\n');

const testNotes = `
本日、新規顧客との商談を実施しました。
顧客の要望：
- 月額予算30万円以内でのサービス導入
- 3ヶ月以内の導入希望
- 競合他社との比較資料を要求
- 技術仕様の詳細説明が必要
- 決裁者は田中部長

次回のアクション：
- 詳細見積書の作成
- 技術資料の準備
- 競合分析資料の作成
`;

async function test() {
  try {
    console.log('議事録:');
    console.log(testNotes);
    console.log('\n実行中...\n');
    
    const result = await analyzeMeetingNotes(testNotes);
    
    console.log('\n=== 最終結果 ===');
    console.log('📄 AI要約:');
    console.log(result.summary);
    console.log('\n📋 アクションプラン:');
    result.actionPlans.forEach((plan, i) => {
      console.log(`  ${i + 1}. ${plan}`);
    });
    console.log('\n🔄 ステータス:', result.status);
    
    if (result.error) {
      console.log('\n⚠️ エラー:', result.error);
    }
    
  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

test();