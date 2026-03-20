import { db } from '../firebase.js';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  setDoc,
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';

/**
 * 案件管理のFirestore操作サービス
 */

/**
 * 案件を全件取得する（progressDashboardのフェーズ8 = 受注案件）
 * @returns {Promise<Array<{id: string, data: object}>>} 案件一覧
 */
export const fetchProjects = async () => {
  try {
    const progressRef = collection(db, 'progressDashboard');
    const q = query(progressRef, where('status', '==', 'フェーズ8'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    throw error;
  }
};

/**
 * プロジェクトごとに営業記録+最新エントリを一括取得する
 * @param {string} projectId - 案件ID
 * @returns {Promise<{records: Array, latestEntry: object|null}>}
 */
export const fetchProjectSalesData = async (projectId) => {
  try {
    // 営業記録を全件取得
    const recordsRef = collection(db, 'progressDashboard', projectId, 'salesRecords');
    const recordsSnap = await getDocs(recordsRef);
    const records = recordsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    // 最新の営業記録のエントリを取得
    let latestEntry = null;
    if (records.length > 0) {
      const latestRecord = records[0];
      const entriesRef = collection(db, 'progressDashboard', projectId, 'salesRecords', latestRecord.id, 'entries');
      const entriesSnap = await getDocs(entriesRef);
      const entries = entriesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
      // actionContentがありかつdoneでない最新エントリを取得
      const activeNaEntry = entries.find(e => e.actionContent && e.actionStatus !== 'done');
      if (activeNaEntry) {
        latestEntry = activeNaEntry;
      }
    }

    return { records, latestEntry };
  } catch (error) {
    console.error('Failed to fetch project sales data:', error);
    return { records: [], latestEntry: null };
  }
};

/**
 * 案件ドキュメントを更新する
 * @param {string} projectId - 案件ID
 * @param {object} data - 更新データ
 */
export const updateProject = async (projectId, data) => {
  try {
    const projectRef = doc(db, 'progressDashboard', projectId);
    await updateDoc(projectRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to update project:', error);
    throw error;
  }
};

/**
 * ネクストアクションを追加する
 * @param {string} projectId - 案件ID
 * @param {string} tab - タブ種別 ("operator" or "sales")
 * @param {object} actionData - アクションデータ
 */
export const addNextAction = async (projectId, tab, actionData) => {
  try {
    const actionsRef = collection(db, 'progressDashboard', projectId, 'nextActions');
    await addDoc(actionsRef, {
      ...actionData,
      tab,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to add next action:', error);
    throw error;
  }
};

/**
 * タブ別にネクストアクションを取得する（createdAt昇順）
 * @param {string} projectId - 案件ID
 * @param {string} tab - タブ種別 ("operator" or "sales")
 * @returns {Promise<Array>} アクション一覧
 */
export const fetchNextActions = async (projectId, tab) => {
  try {
    // 複合インデックス不要: 全件取得→クライアントサイドでフィルタ&ソート
    const actionsRef = collection(db, 'progressDashboard', projectId, 'nextActions');
    const snapshot = await getDocs(actionsRef);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((action) => action.tab === tab)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
  } catch (error) {
    console.error('Failed to fetch next actions:', error);
    throw error;
  }
};

/**
 * ネクストアクションを削除する
 * @param {string} projectId - 案件ID
 * @param {string} actionId - アクションID
 */
export const deleteNextAction = async (projectId, actionId) => {
  try {
    const actionRef = doc(db, 'progressDashboard', projectId, 'nextActions', actionId);
    await deleteDoc(actionRef);
  } catch (error) {
    console.error('Failed to delete next action:', error);
    throw error;
  }
};

/**
 * 月次データを取得する（なければnull）
 * @param {string} projectId - 案件ID
 * @param {string} month - 月（YYYY-MM形式）
 * @returns {Promise<object|null>} 月次データ
 */
export const fetchMonthlyData = async (projectId, month) => {
  try {
    const monthRef = doc(db, 'progressDashboard', projectId, 'monthlyData', month);
    const snapshot = await getDoc(monthRef);
    if (!snapshot.exists()) {
      return null;
    }
    return { id: snapshot.id, ...snapshot.data() };
  } catch (error) {
    console.error('Failed to fetch monthly data:', error);
    throw error;
  }
};

/**
 * 月次データを保存する（マージモード）
 * @param {string} projectId - 案件ID
 * @param {string} month - 月（YYYY-MM形式）
 * @param {object} data - 保存データ
 */
export const saveMonthlyData = async (projectId, month, data) => {
  try {
    const monthRef = doc(db, 'progressDashboard', projectId, 'monthlyData', month);
    await setDoc(monthRef, data, { merge: true });
  } catch (error) {
    console.error('Failed to save monthly data:', error);
    throw error;
  }
};

/**
 * 営業記録を追加する
 * @param {string} projectId - 案件ID
 * @param {object} data - 営業記録データ
 */
export const addSalesRecord = async (projectId, data) => {
  try {
    const recordsRef = collection(db, 'progressDashboard', projectId, 'salesRecords');
    await addDoc(recordsRef, data);
  } catch (error) {
    console.error('Failed to add sales record:', error);
    throw error;
  }
};

/**
 * 営業記録を全件取得する
 * @param {string} projectId - 案件ID
 * @returns {Promise<Array>} 営業記録一覧
 */
export const fetchSalesRecords = async (projectId) => {
  try {
    const recordsRef = collection(db, 'progressDashboard', projectId, 'salesRecords');
    const snapshot = await getDocs(recordsRef);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Failed to fetch sales records:', error);
    throw error;
  }
};

/**
 * 営業記録を更新する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 記録ID
 * @param {object} data - 更新データ
 */
export const updateSalesRecord = async (projectId, recordId, data) => {
  try {
    const recordRef = doc(db, 'progressDashboard', projectId, 'salesRecords', recordId);
    await updateDoc(recordRef, data);
  } catch (error) {
    console.error('Failed to update sales record:', error);
    throw error;
  }
};

/**
 * 営業記録を削除する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 記録ID
 */
export const deleteSalesRecord = async (projectId, recordId) => {
  try {
    const recordRef = doc(db, 'progressDashboard', projectId, 'salesRecords', recordId);
    await deleteDoc(recordRef);
  } catch (error) {
    console.error('Failed to delete sales record:', error);
    throw error;
  }
};

/**
 * キーパーソンを追加する
 * @param {string} projectId - 案件ID
 * @param {object} data - キーパーソンデータ
 */
export const addKeyPerson = async (projectId, data) => {
  try {
    const personsRef = collection(db, 'progressDashboard', projectId, 'keyPersons');
    await addDoc(personsRef, data);
  } catch (error) {
    console.error('Failed to add key person:', error);
    throw error;
  }
};

/**
 * キーパーソンを全件取得する
 * @param {string} projectId - 案件ID
 * @returns {Promise<Array>} キーパーソン一覧
 */
export const fetchKeyPersons = async (projectId) => {
  try {
    const personsRef = collection(db, 'progressDashboard', projectId, 'keyPersons');
    const snapshot = await getDocs(personsRef);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('Failed to fetch key persons:', error);
    throw error;
  }
};

/**
 * キーパーソンを更新する
 * @param {string} projectId - 案件ID
 * @param {string} personId - キーパーソンID
 * @param {object} data - 更新データ
 */
export const updateKeyPerson = async (projectId, personId, data) => {
  try {
    const personRef = doc(db, 'progressDashboard', projectId, 'keyPersons', personId);
    await updateDoc(personRef, data);
  } catch (error) {
    console.error('Failed to update key person:', error);
    throw error;
  }
};

/**
 * キーパーソンを削除する
 * @param {string} projectId - 案件ID
 * @param {string} personId - キーパーソンID
 */
export const deleteKeyPerson = async (projectId, personId) => {
  try {
    const personRef = doc(db, 'progressDashboard', projectId, 'keyPersons', personId);
    await deleteDoc(personRef);
  } catch (error) {
    console.error('Failed to delete key person:', error);
    throw error;
  }
};

// ============================================
// 運用メモ（週次メモ）
// ============================================

/**
 * 運用メモを追加する
 * @param {string} projectId - 案件ID
 * @param {object} memoData - メモデータ { content: string }
 */
export const addOperationMemo = async (projectId, memoData) => {
  try {
    const memosRef = collection(db, 'progressDashboard', projectId, 'operationMemos');
    await addDoc(memosRef, {
      ...memoData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to add operation memo:', error);
    throw error;
  }
};

/**
 * 運用メモを全件取得する（作成日時昇順）
 * @param {string} projectId - 案件ID
 * @returns {Promise<Array>} メモ一覧
 */
export const fetchOperationMemos = async (projectId) => {
  try {
    const memosRef = collection(db, 'progressDashboard', projectId, 'operationMemos');
    const snapshot = await getDocs(memosRef);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
  } catch (error) {
    console.error('Failed to fetch operation memos:', error);
    throw error;
  }
};

/**
 * 運用メモを削除する
 * @param {string} projectId - 案件ID
 * @param {string} memoId - メモID
 */
export const deleteOperationMemo = async (projectId, memoId) => {
  try {
    const memoRef = doc(db, 'progressDashboard', projectId, 'operationMemos', memoId);
    await deleteDoc(memoRef);
  } catch (error) {
    console.error('Failed to delete operation memo:', error);
    throw error;
  }
};

// ============================================
// 営業記録メモ（接触履歴）
// ============================================

/**
 * 営業記録にメモを追加する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {object} memoData - メモデータ { content: string }
 */
export const addSalesRecordMemo = async (projectId, recordId, memoData) => {
  try {
    const memosRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'memos');
    await addDoc(memosRef, {
      ...memoData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to add sales record memo:', error);
    throw error;
  }
};

/**
 * 営業記録のメモを全件取得する（作成日時昇順）
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @returns {Promise<Array>} メモ一覧
 */
export const fetchSalesRecordMemos = async (projectId, recordId) => {
  try {
    const memosRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'memos');
    const snapshot = await getDocs(memosRef);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
  } catch (error) {
    console.error('Failed to fetch sales record memos:', error);
    throw error;
  }
};

/**
 * 営業記録のメモを削除する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {string} memoId - メモID
 */
export const deleteSalesRecordMemo = async (projectId, recordId, memoId) => {
  try {
    const memoRef = doc(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'memos', memoId);
    await deleteDoc(memoRef);
  } catch (error) {
    console.error('Failed to delete sales record memo:', error);
    throw error;
  }
};

// ============================================
// 営業記録ネクストアクション
// ============================================

/**
 * 営業記録にネクストアクションを追加する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {object} actionData - { content, dueDate, assignee }
 */
export const addSalesRecordAction = async (projectId, recordId, actionData) => {
  try {
    const actionsRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'actions');
    await addDoc(actionsRef, {
      ...actionData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to add sales record action:', error);
    throw error;
  }
};

/**
 * 営業記録のネクストアクションを全件取得する（作成日時昇順）
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @returns {Promise<Array>} アクション一覧
 */
export const fetchSalesRecordActions = async (projectId, recordId) => {
  try {
    const actionsRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'actions');
    const snapshot = await getDocs(actionsRef);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });
  } catch (error) {
    console.error('Failed to fetch sales record actions:', error);
    throw error;
  }
};

/**
 * 営業記録のネクストアクションを削除する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {string} actionId - アクションID
 */
export const deleteSalesRecordAction = async (projectId, recordId, actionId) => {
  try {
    const actionRef = doc(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'actions', actionId);
    await deleteDoc(actionRef);
  } catch (error) {
    console.error('Failed to delete sales record action:', error);
    throw error;
  }
};

// ============================================
// 営業エントリ（接触メモ + NA統合）
// ============================================

/**
 * 営業記録配下にエントリを追加する（メモ+NA統合）
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {object} entryData - { memoContent, actionContent, actionDueDate, actionAssignee, phase }
 */
export const addSalesEntry = async (projectId, recordId, entryData) => {
  try {
    const entriesRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'entries');
    await addDoc(entriesRef, {
      ...entryData,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to add sales entry:', error);
    throw error;
  }
};

/**
 * 営業記録配下のエントリを全件取得する（作成日時降順）
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @returns {Promise<Array>} エントリ一覧
 */
export const fetchSalesEntries = async (projectId, recordId) => {
  try {
    const entriesRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'entries');
    const snapshot = await getDocs(entriesRef);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
  } catch (error) {
    console.error('Failed to fetch sales entries:', error);
    throw error;
  }
};

/**
 * 営業記録配下のエントリを削除する
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {string} entryId - エントリID
 */
export const deleteSalesEntry = async (projectId, recordId, entryId) => {
  try {
    const entryRef = doc(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'entries', entryId);
    await deleteDoc(entryRef);
  } catch (error) {
    console.error('Failed to delete sales entry:', error);
    throw error;
  }
};

/**
 * 営業エントリのステータスを更新する（active/done）
 * @param {string} projectId - 案件ID
 * @param {string} recordId - 営業記録ID
 * @param {string} entryId - エントリID
 * @param {string} status - "active" or "done"
 */
export const updateSalesEntryStatus = async (projectId, recordId, entryId, status) => {
  try {
    const entryRef = doc(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'entries', entryId);
    await updateDoc(entryRef, { actionStatus: status });
  } catch (error) {
    console.error('Failed to update sales entry status:', error);
    throw error;
  }
};

/**
 * 全プロジェクトのNA付きエントリを一括取得する
 * @returns {Promise<Array>} NA一覧（projectId, recordId, entryデータ, 案件情報付き）
 */
export const fetchAllNextActions = async () => {
  try {
    // フェーズ8の案件を取得
    const progressRef = collection(db, 'progressDashboard');
    const q = query(progressRef, where('status', '==', 'フェーズ8'));
    const projectsSnap = await getDocs(q);

    const allNas = [];

    for (const projectDoc of projectsSnap.docs) {
      const projectId = projectDoc.id;
      const projectData = projectDoc.data();

      // 営業記録を取得
      const recordsRef = collection(db, 'progressDashboard', projectId, 'salesRecords');
      const recordsSnap = await getDocs(recordsRef);

      for (const recordDoc of recordsSnap.docs) {
        const recordId = recordDoc.id;

        // エントリを取得
        const entriesRef = collection(db, 'progressDashboard', projectId, 'salesRecords', recordId, 'entries');
        const entriesSnap = await getDocs(entriesRef);

        entriesSnap.docs.forEach((entryDoc) => {
          const entry = entryDoc.data();
          // actionContentがあるものだけ
          if (entry.actionContent) {
            allNas.push({
              id: entryDoc.id,
              projectId,
              recordId,
              companyName: projectData.companyName || '',
              productName: projectData.productName || '',
              ...entry
            });
          }
        });
      }
    }

    // 作成日時降順
    allNas.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return allNas;
  } catch (error) {
    console.error('Failed to fetch all next actions:', error);
    throw error;
  }
};
