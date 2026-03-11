import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Firestore書き込みテスト
const testFirestoreWrite = async () => {
  console.log('🧪 Firestore書き込みテスト開始...');
  
  try {
    // テストデータ
    const testData = {
      testField: 'これはテストデータです',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };
    
    // actionLogsコレクションにテスト書き込み
    console.log('📝 actionLogsコレクションへの書き込みテスト...');
    const actionLogsRef = collection(db, 'actionLogs');
    const actionLogDoc = await addDoc(actionLogsRef, testData);
    console.log('✅ actionLogs書き込み成功:', actionLogDoc.id);
    
    // progressDashboardコレクションにテスト書き込み
    console.log('📝 progressDashboardコレクションへの書き込みテスト...');
    const progressRef = collection(db, 'progressDashboard');
    const progressDoc = await addDoc(progressRef, testData);
    console.log('✅ progressDashboard書き込み成功:', progressDoc.id);
    
    console.log('🎉 すべてのテストが成功しました！');
    
  } catch (error) {
    console.error('❌ Firestore書き込みエラー:', error);
    console.error('エラー詳細:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
  }
};

// テスト実行
testFirestoreWrite();