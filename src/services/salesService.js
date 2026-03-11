import { db } from '../firebase.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

/**
 * 売上目標関連のFirestore操作サービス
 * Ver 2.4で新規追加
 */

// 売上目標を取得
export const getSalesTargets = async (partnerCompany, targetMonth = null) => {
  try {
    console.log('📊 売上目標取得開始:', partnerCompany, targetMonth);
    
    const salesTargetsRef = collection(db, 'salesTargets');
    let q = query(
      salesTargetsRef,
      where('partnerCompany', '==', partnerCompany),
      orderBy('targetMonth', 'desc')
    );
    
    if (targetMonth) {
      q = query(
        salesTargetsRef,
        where('partnerCompany', '==', partnerCompany),
        where('targetMonth', '==', targetMonth)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const targets = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      targets.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      });
    });
    
    console.log('✅ 売上目標取得成功:', targets.length, '件');
    return targets;
  } catch (error) {
    console.error('💥 売上目標取得エラー:', error);
    throw error;
  }
};

// 売上目標を保存/更新
export const saveSalesTarget = async (partnerCompany, targetMonth, targetAmount) => {
  try {
    console.log('💾 売上目標保存開始:', partnerCompany, targetMonth, targetAmount);
    
    // 既存の目標があるかチェック
    const existing = await getSalesTargets(partnerCompany, targetMonth);
    
    if (existing.length > 0) {
      // 更新
      const targetRef = doc(db, 'salesTargets', existing[0].id);
      await updateDoc(targetRef, {
        targetAmount: Number(targetAmount),
        updatedAt: serverTimestamp()
      });
      console.log('✅ 売上目標更新成功');
      return { id: existing[0].id, updated: true };
    } else {
      // 新規作成
      const newTarget = {
        partnerCompany,
        targetMonth,
        targetAmount: Number(targetAmount),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'salesTargets'), newTarget);
      console.log('✅ 売上目標新規作成成功');
      return { id: docRef.id, created: true };
    }
  } catch (error) {
    console.error('💥 売上目標保存エラー:', error);
    throw error;
  }
};

// 受注実績を取得（progressDashboardから）
export const getSalesResults = async (partnerCompany, months = 3) => {
  try {
    console.log('📈 受注実績取得開始:', partnerCompany, months, 'ヶ月');
    
    const progressRef = collection(db, 'progressDashboard');
    const q = query(
      progressRef,
      where('introducer', '==', partnerCompany),
      where('status', '==', 'フェーズ8')
    );
    
    const querySnapshot = await getDocs(q);
    const results = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.receivedOrderMonth && data.receivedOrderAmount) {
        results.push({
          id: docSnap.id,
          productName: data.productName,
          proposalMenu: data.proposalMenu,
          receivedOrderMonth: data.receivedOrderMonth,
          receivedOrderAmount: Number(data.receivedOrderAmount),
          partnerRepresentative: data.partnerRepresentative || data.representative,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        });
      }
    });
    
    // 受注月でソート
    results.sort((a, b) => b.receivedOrderMonth.localeCompare(a.receivedOrderMonth));
    
    console.log('✅ 受注実績取得成功:', results.length, '件');
    return results;
  } catch (error) {
    console.error('💥 受注実績取得エラー:', error);
    throw error;
  }
};

// 月別受注実績を集計
export const getMonthlySalesResults = async (partnerCompany, months = 3) => {
  try {
    const results = await getSalesResults(partnerCompany, months);
    
    // 月別に集計
    const monthlyResults = {};
    results.forEach(result => {
      const month = result.receivedOrderMonth;
      if (!monthlyResults[month]) {
        monthlyResults[month] = {
          month,
          totalAmount: 0,
          count: 0,
          deals: []
        };
      }
      monthlyResults[month].totalAmount += result.receivedOrderAmount;
      monthlyResults[month].count += 1;
      monthlyResults[month].deals.push(result);
    });
    
    // 配列に変換してソート
    const sortedResults = Object.values(monthlyResults)
      .sort((a, b) => b.month.localeCompare(a.month));
    
    console.log('✅ 月別受注実績集計完了:', sortedResults.length, '月分');
    return sortedResults;
  } catch (error) {
    console.error('💥 月別受注実績集計エラー:', error);
    throw error;
  }
};

// 案件の受注情報を更新
export const updateDealOrderInfo = async (dealId, receivedOrderMonth, receivedOrderAmount) => {
  try {
    console.log('📝 案件受注情報更新開始:', dealId, receivedOrderMonth, receivedOrderAmount);
    
    const dealRef = doc(db, 'progressDashboard', dealId);
    await updateDoc(dealRef, {
      status: 'フェーズ8',
      receivedOrderMonth,
      receivedOrderAmount: Number(receivedOrderAmount),
      continuationStatus: '施策実施中',
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ 案件受注情報更新成功');
  } catch (error) {
    console.error('💥 案件受注情報更新エラー:', error);
    throw error;
  }
};

// ステータス別件数を取得（ホーム画面用）
export const getStatusCounts = async (partnerCompany) => {
  try {
    console.log('📊 ステータス別件数取得開始:', partnerCompany);
    
    const progressRef = collection(db, 'progressDashboard');
    const q = query(progressRef, where('introducer', '==', partnerCompany));
    
    const querySnapshot = await getDocs(q);
    const statusCounts = {};
    
    // 初期化
    const statuses = [
      'フェーズ1', 'フェーズ2', 'フェーズ3', 'フェーズ4',
      'フェーズ5', 'フェーズ6', 'フェーズ7', 'フェーズ8', '失注'
    ];
    statuses.forEach(status => {
      statusCounts[status] = 0;
    });
    
    // カウント
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status || 'その他';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });
    
    console.log('✅ ステータス別件数取得成功:', statusCounts);
    return statusCounts;
  } catch (error) {
    console.error('💥 ステータス別件数取得エラー:', error);
    throw error;
  }
};