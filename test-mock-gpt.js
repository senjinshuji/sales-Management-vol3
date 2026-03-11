// モックGPTテスト
import { analyzeMeetingNotes } from './src/services/gptService.js';

console.log('=== モックGPTテスト ===\n');

// テストケース
const testCases = [
  {
    name: 'テスト1: 提案関連',
    notes: `本日は新規顧客との商談を実施しました。
顧客は来月からのサービス導入を検討中で、予算は月額30万円程度を想定しています。
競合他社との比較も行っているため、詳細な提案書が必要です。
技術仕様についても質問があったため、技術部門との打ち合わせが必要です。
次回MTGは来週金曜日の予定です。`
  },
  {
    name: 'テスト2: 受注関連',
    notes: `本日の商談で正式に受注が確定しました！
契約書は来週月曜日に締結予定です。
導入開始は来月1日からとなります。
キックオフミーティングの日程調整が必要です。`
  },
  {
    name: 'テスト3: 保留関連',
    notes: `予算の関係で一旦保留となりました。
来期（4月）以降に再度検討したいとのことです。
ペンディング案件として管理し、定期的にフォローアップします。`
  }
];

// 各テストケースを実行
async function runTests() {
  for (const testCase of testCases) {
    console.log(`--- ${testCase.name} ---`);
    console.log('議事録:');
    console.log(testCase.notes);
    console.log('');
    
    try {
      const result = await analyzeMeetingNotes(testCase.notes);
      
      console.log('分析結果:');
      console.log('📄 AI要約:');
      console.log(result.summary);
      console.log('\n📋 アクションプラン:');
      result.actionPlans.forEach((plan, i) => {
        console.log(`  ${i + 1}. ${plan}`);
      });
      console.log('\n🔄 ステータス:', result.status);
      
      if (result.error) {
        console.log('⚠️ エラー:', result.error);
      }
      
    } catch (error) {
      console.error('❌ エラー:', error.message);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// テスト実行
runTests().then(() => {
  console.log('テスト完了！');
}).catch(error => {
  console.error('テスト実行エラー:', error);
});