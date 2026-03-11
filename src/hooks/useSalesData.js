import { useState, useEffect, useCallback } from 'react';
import { 
  getSalesTargets, 
  getSalesResults, 
  getMonthlySalesResults, 
  getStatusCounts,
  saveSalesTarget 
} from '../services/salesService.js';

/**
 * 売上データ管理用カスタムフック
 * Ver 2.4で新規追加
 */

export const useSalesData = (partnerCompany) => {
  const [salesTargets, setSalesTargets] = useState([]);
  const [salesResults, setSalesResults] = useState([]);
  const [monthlySalesResults, setMonthlySalesResults] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 売上目標を取得
  const fetchSalesTargets = useCallback(async () => {
    if (!partnerCompany) return;
    
    try {
      setLoading(true);
      const targets = await getSalesTargets(partnerCompany);
      setSalesTargets(targets);
    } catch (err) {
      console.error('売上目標取得エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partnerCompany]);

  // 受注実績を取得
  const fetchSalesResults = useCallback(async () => {
    if (!partnerCompany) return;
    
    try {
      setLoading(true);
      const results = await getSalesResults(partnerCompany);
      setSalesResults(results);
    } catch (err) {
      console.error('受注実績取得エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partnerCompany]);

  // 月別受注実績を取得
  const fetchMonthlySalesResults = useCallback(async () => {
    if (!partnerCompany) return;
    
    try {
      setLoading(true);
      const monthlyResults = await getMonthlySalesResults(partnerCompany);
      setMonthlySalesResults(monthlyResults);
    } catch (err) {
      console.error('月別受注実績取得エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partnerCompany]);

  // ステータス別件数を取得
  const fetchStatusCounts = useCallback(async () => {
    if (!partnerCompany) return;
    
    try {
      setLoading(true);
      const counts = await getStatusCounts(partnerCompany);
      setStatusCounts(counts);
    } catch (err) {
      console.error('ステータス別件数取得エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [partnerCompany]);

  // 売上目標を保存
  const updateSalesTarget = useCallback(async (targetMonth, targetAmount) => {
    if (!partnerCompany) return;
    
    try {
      setLoading(true);
      const result = await saveSalesTarget(partnerCompany, targetMonth, targetAmount);
      
      // 売上目標を再取得
      await fetchSalesTargets();
      
      return result;
    } catch (err) {
      console.error('売上目標保存エラー:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [partnerCompany, fetchSalesTargets]);

  // 全データを再取得
  const refreshAllData = useCallback(async () => {
    if (!partnerCompany) return;
    
    await Promise.all([
      fetchSalesTargets(),
      fetchSalesResults(), 
      fetchMonthlySalesResults(),
      fetchStatusCounts()
    ]);
  }, [partnerCompany, fetchSalesTargets, fetchSalesResults, fetchMonthlySalesResults, fetchStatusCounts]);

  // 初期データ取得
  useEffect(() => {
    if (partnerCompany) {
      refreshAllData();
    }
  }, [partnerCompany, refreshAllData]);

  // 特定月の売上目標を取得
  const getTargetForMonth = useCallback((targetMonth) => {
    return salesTargets.find(target => target.targetMonth === targetMonth);
  }, [salesTargets]);

  // 特定月の受注実績を取得
  const getResultsForMonth = useCallback((targetMonth) => {
    return monthlySalesResults.find(result => result.month === targetMonth);
  }, [monthlySalesResults]);

  return {
    // データ
    salesTargets,
    salesResults,
    monthlySalesResults,
    statusCounts,
    
    // 状態
    loading,
    error,
    
    // 関数
    fetchSalesTargets,
    fetchSalesResults,
    fetchMonthlySalesResults,
    fetchStatusCounts,
    updateSalesTarget,
    refreshAllData,
    getTargetForMonth,
    getResultsForMonth,
    
    // エラークリア
    clearError: () => setError(null)
  };
};