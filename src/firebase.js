import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase設定 - ステージング環境
const firebaseConfig = {
  projectId: "sales-management-staging",
  appId: "1:691990337458:web:a7c67e5829105029b276ab",
  storageBucket: "sales-management-staging.firebasestorage.app",
  apiKey: "AIzaSyDcacPHbsNmktEJAvlawcTxqtI5CQzqmx8",
  authDomain: "sales-management-staging.firebaseapp.com",
  messagingSenderId: "691990337458"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// Firestoreインスタンスを取得
export const db = getFirestore(app);

// 認証インスタンスを取得（将来使用予定）
export const auth = getAuth(app);

export default app;