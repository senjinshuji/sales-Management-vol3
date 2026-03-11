// 実施月ベースのデータ取得テスト
import { db } from './firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

const testImplementationDates = async () => {
  try {
    console.log('🔍 実施月ベースのデータ取得テスト開始');
    
    // 受注案件を取得
    const progressRef = collection(db, 'progressDashboard');
    const progressQuery = query(progressRef, where('status', '==', '受注'));
    const progressSnapshot = await getDocs(progressQuery);
    
    console.log(`📊 受注案件数: ${progressSnapshot.size}`);
    
    // 今月から3ヶ月分の月リストを生成
    const months = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      months.push(date.toISOString().slice(0, 7));
    }
    console.log('📅 対象月:', months);
    
    // 月ごとの集計
    const monthlyData = {};
    months.forEach(month => {
      monthlyData[month] = {
        deals: [],
        totalAmount: 0,
        dealCount: 0
      };
    });
    
    // nextActionDateがnullの案件をカウント
    let nullDateCount = 0;
    
    progressSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      
      // デバッグ情報出力
      console.log(`\n案件ID: ${id}`);
      console.log(`商材名: ${data.productName}`);
      console.log(`nextActionDate: ${data.nextActionDate}`);
      console.log(`implementationDate: ${data.implementationDate}`);
      console.log(`受注金額: ${data.receivedOrderAmount}`);
      
      if (!data.nextActionDate) {
        nullDateCount++;
        console.log('⚠️ nextActionDateがnullです');
      }
      
      // 実施月の判定
      const implementationDate = data.nextActionDate || data.implementationDate;
      
      if (implementationDate) {
        months.forEach(month => {
          if (implementationDate.startsWith(month)) {
            monthlyData[month].deals.push({
              id,
              productName: data.productName,
              implementationDate,
              amount: data.receivedOrderAmount || 0
            });
            monthlyData[month].totalAmount += data.receivedOrderAmount || 0;
            monthlyData[month].dealCount++;
          }
        });
      }
    });
    
    // 結果出力
    console.log('\n📊 月別集計結果:');
    Object.entries(monthlyData).forEach(([month, data]) => {
      console.log(`\n${month}:`);
      console.log(`  件数: ${data.dealCount}`);
      console.log(`  金額: ¥${data.totalAmount.toLocaleString()}`);
      if (data.deals.length > 0) {
        console.log('  案件詳細:');
        data.deals.forEach(deal => {
          console.log(`    - ${deal.productName} (${deal.implementationDate}): ¥${deal.amount.toLocaleString()}`);
        });
      }
    });
    
  } catch (error) {
    console.error('💥 エラー:', error);
  }
};

// 実行
testImplementationDates();