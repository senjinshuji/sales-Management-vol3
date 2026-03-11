// GPTレスポンス解析テスト

// ステータス定義
const STATUS_DEFINITIONS = {
  '与件化_提案中': 'MTGが終わっていて提案をこちらが作成するステータス',
  '受注': 'このMTGを持って、実際にサービスが受注されたステータス', 
  '失注': 'MTGの結果、サービスが導入されなかったステータス',
  '保留': '一旦サービス導入が見送られているが、長期的にはサービス導入の可能性があるステータス',
  '検討中': 'MTGが終わっていて提案を先方が検討しているステータス',
  '稼働終了': '追いかけもしない、完全に稼働が終了したステータス'
};

// GPTレスポンス解析関数（gptService.jsから同じ実装）
const parseGPTResponseTest = (response) => {
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

// テストケース
const testCases = [
  {
    name: 'テスト1: 標準的なGPTレスポンス',
    response: `■ AI要約
顧客は来月のサービス導入を検討中で、予算は月額30万円。
技術部門との打ち合わせが必要で、導入時期は4月を希望している。
担当者は田中さんで、決裁者は部長の佐藤さん。
競合他社の見積もりとの比較を求められている。
次週までに詳細提案書の作成が必要。

■ アクションプラン
・競合他社との比較表を含む詳細提案書の作成
・技術部門向けの技術仕様書の準備
・佐藤部長向けのエグゼクティブサマリーの作成
・価格調整の可能性について社内で検討
・来週中に再度ミーティングの設定

■ ステータス
与件化_提案中`
  },
  {
    name: 'テスト2: 箇条書き形式',
    response: `■ AI要約
1. 顧客は新システム導入に前向き
2. 予算は確保済み（月額50万円）
3. 3社競合の状況
4. 決定は来月末
5. デモ実施を希望

■ アクションプラン
- デモ環境の準備
- 競合分析資料の作成
- ROI試算書の作成

■ ステータス
検討中`
  },
  {
    name: 'テスト3: シンプルな形式',
    response: `AI要約：
本日の商談で受注が確定しました。契約書は来週締結予定です。

アクションプラン：
契約書の準備

ステータス：受注`
  }
];

// テスト実行
console.log('=== GPTレスポンス解析テスト ===\n');

testCases.forEach((testCase, index) => {
  console.log(`--- ${testCase.name} ---`);
  console.log('入力:');
  console.log(testCase.response);
  console.log('\n解析結果:');
  
  const parsed = parseGPTResponseTest(testCase.response);
  
  console.log('📄 AI要約:');
  console.log(parsed.summary);
  
  console.log('\n📋 アクションプラン:');
  parsed.actionPlans.forEach((plan, i) => {
    console.log(`  ${i + 1}. ${plan}`);
  });
  
  console.log('\n🔄 ステータス:', parsed.status);
  console.log('\n' + '='.repeat(50) + '\n');
});

console.log('テスト完了！');