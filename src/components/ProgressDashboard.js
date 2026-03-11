import React, { useState, useMemo, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiFilter, FiSearch, FiEye, FiCalendar, FiUser, FiTag, FiPlus, FiTrash2, FiEdit3, FiChevronUp, FiChevronDown, FiMinus, FiCheck, FiCopy } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { mockDeals, introducers } from '../data/mockData.js';
import { STATUS_COLORS, SALES_REPRESENTATIVES, STATUSES, LEAD_SOURCES } from '../data/constants.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import ReceivedOrderModal from './ReceivedOrderModal.js';
import { updateDealOrderInfo } from '../services/salesService.js';
import { useUndoContext } from '../contexts/UndoContext.js';

const DashboardContainer = styled.div`
  width: 100%;
  padding: 0 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin: 0;
`;

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 180px 180px 180px;
  gap: 1rem;
  align-items: end;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const FilterDropdownContainer = styled.div`
  position: relative;
`;

const FilterDropdownButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const FilterDropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
`;

const FilterCheckboxContainer = styled.div`
  padding: 0.5rem;
`;

const FilterCheckboxItem = styled.label`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  cursor: pointer;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  input {
    margin-right: 0.5rem;
  }
`;

const FilterToggleAllButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    background: #e0e0e0;
  }
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  /* スクロールバーのスタイリング */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
    
    &:hover {
      background: #555;
    }
  }
`;

const Table = styled.table`
  min-width: 1800px; /* 最小幅を設定して横スクロールを発生させる（流入経路列追加） */
  width: 100%;
  background: white;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: #f8f9fa;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #eee;
  
  &:hover {
    background: #f8f9fa;
  }
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  cursor: ${props => props.sortable ? 'pointer' : 'default'};
  user-select: none;
  position: relative;
  
  &:hover {
    background-color: ${props => props.sortable ? '#f0f0f0' : 'transparent'};
  }
  
  .sort-indicator {
    margin-left: 0.5rem;
    font-size: 0.8rem;
    color: #666;
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  vertical-align: middle;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background-color: ${props => STATUS_COLORS[props.status] || '#95a5a6'};
`;

const ActionButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &.view {
    background: #3498db;
    color: white;
    
    &:hover {
      background: #2980b9;
    }
  }
  
  &.add {
    background: #27ae60;
    color: white;
    
    &:hover {
      background: #219a52;
    }
  }
  
  &.edit {
    background: #f39c12;
    color: white;

    &:hover {
      background: #e67e22;
    }
  }

  &.copy {
    background: #9b59b6;
    color: white;

    &:hover {
      background: #8e44ad;
    }
  }
`;

const UrgentBadge = styled.span`
  background: #e74c3c;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
`;

const OverdueBadge = styled.span`
  background: #8e44ad;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
`;

const DeleteButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #e74c3c;
  color: white;
  margin-left: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: #c0392b;
  }
`;


const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
`;

const ModalTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #2c3e50;
`;

const ModalText = styled.p`
  margin: 0 0 1.5rem 0;
  color: #555;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  
  &.cancel {
    background: #e0e0e0;
    color: #333;
    
    &:hover {
      background: #bdbdbd;
    }
  }
  
  &.delete {
    background: #e74c3c;
    color: white;
    
    &:hover {
      background: #c0392b;
    }
  }
`;

const ActionsCell = styled.div`
  display: flex;
  align-items: center;
`;

function ProgressDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUSES);
  const [representativeFilter, setRepresentativeFilter] = useState(SALES_REPRESENTATIVES);
  const [introducerFilter, setIntroducerFilter] = useState([]);
  const [deals, setDeals] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, deal: null });
  const [editModal, setEditModal] = useState({ show: false, deal: null });
  const [receivedOrderModal, setReceivedOrderModal] = useState({ show: false, deal: null });
  const [introducersList, setIntroducersList] = useState([]);
  const [proposalMenusList, setProposalMenusList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'none' });
  const [dropdownOpen, setDropdownOpen] = useState({
    status: false,
    representative: false,
    introducer: false
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { recordAction } = useUndoContext();
  
  // パートナー向けかどうかを判定
  const isPartnerView = window.location.pathname.startsWith('/partner') || 
                       window.location.pathname.startsWith('/partner-entry');
  
  // パートナー会社を判定
  const getPartnerCompany = () => {
    const path = window.location.pathname;
    if (path.startsWith('/partner-entry/piala')) {
      return '株式会社ピアラ';
    }
    return null;
  };
  
  const partnerCompany = getPartnerCompany();
  
  // Firestoreから進捗データを取得
  useEffect(() => {
    fetchProgressData();
    fetchIntroducers();
    fetchProposalMenus();
  }, []);

  // 提案メニューマスターを取得
  const fetchProposalMenus = async () => {
    try {
      const menusRef = collection(db, 'proposalMenus');
      const snapshot = await getDocs(menusRef);
      const menus = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // name順でソート
      menus.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProposalMenusList(menus);
    } catch (error) {
      console.error('提案メニュー取得エラー:', error);
    }
  };
  
  // ページがフォーカスされた時に自動リロード
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 ProgressDashboard: ページがアクティブになったため、データを再取得');
        fetchProgressData();
      }
    };
    
    const handleFocus = () => {
      console.log('🔄 ProgressDashboard: ウィンドウがフォーカスされたため、データを再取得');
      fetchProgressData();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // ルート変更時にもデータを再取得
  useEffect(() => {
    console.log('🔄 ProgressDashboard: ルート変更検知、データ再取得');
    fetchProgressData();
  }, [location.pathname]);
  
  const fetchProgressData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Firestoreから進捗データ取得開始');
      
      const progressRef = collection(db, 'progressDashboard');
      const q = query(progressRef, orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const progressItems = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        progressItems.push({
          id: docSnap.id,
          ...data,
          // 日付フィールドの統一処理
          lastContactDate: data.lastContactDate?.toDate?.()?.toLocaleDateString('ja-JP') || 
                          data.lastContactDate || null,
          nextActionDate: data.nextActionDate || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        });
      });
      
      console.log('✅ 進捗データ取得成功:', progressItems.length, '件');
      setDeals(progressItems);
    } catch (error) {
      console.error('💥 進捗データ取得エラー:', error);
      // エラー時はモックデータを使用
      setDeals(mockDeals);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (dealId, newStatus) => {
    try {
      console.log('🔄 ステータス更新開始:', dealId, newStatus);
      
      // 「フェーズ8」ステータスの場合は受注情報入力モーダルを表示
      if (newStatus === 'フェーズ8') {
        const targetDeal = deals.find(deal => deal.id === dealId);
        if (targetDeal) {
          setReceivedOrderModal({ show: true, deal: targetDeal });
          return; // モーダル表示して処理を一時停止
        }
      }
      
      // 通常のステータス更新処理
      const progressRef = doc(db, 'progressDashboard', dealId);
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      
      // 「フェーズ8」ステータスに変更された時は確定日・継続管理ステータスを自動記録
      if (newStatus === 'フェーズ8') {
        updateData.confirmedDate = new Date().toISOString().split('T')[0];
        updateData.continuationStatus = '施策実施中';
      }
      
      await updateDoc(progressRef, updateData);
      
      console.log('✅ ステータス更新成功');
      
      // ローカル状態を更新
      setDeals(prev => prev.map(deal => 
        deal.id === dealId ? { ...deal, status: newStatus } : deal
      ));
      
      // 成功時のフィードバック
      const statusElement = document.querySelector(`[data-deal-id="${dealId}"] select`);
      if (statusElement) {
        statusElement.style.background = '#d4edda';
        statusElement.style.borderColor = '#c3e6cb';
        setTimeout(() => {
          statusElement.style.background = '';
          statusElement.style.borderColor = '';
        }, 1000);
      }
      
    } catch (error) {
      console.error('💥 ステータス更新エラー:', error);
      alert('ステータス更新に失敗しました。もう一度お試しください。');
      // エラー時は元の状態に戻す
      await fetchProgressData();
    }
  };
  
  // 受注情報保存処理
  const handleSaveReceivedOrder = async (orderData) => {
    try {
      setIsSavingOrder(true);
      console.log('💾 受注情報保存開始:', orderData);
      
      // salesService経由で受注情報を保存
      await updateDealOrderInfo(
        orderData.dealId,
        orderData.receivedOrderMonth,
        orderData.receivedOrderAmount
      );
      
      console.log('✅ 受注情報保存成功');
      
      // データを再取得してUI更新
      await fetchProgressData();
      
      // モーダルを閉じる
      setReceivedOrderModal({ show: false, deal: null });
      
      // 成功メッセージ
      alert('受注情報が保存されました');
      
    } catch (error) {
      console.error('💥 受注情報保存エラー:', error);
      alert('受注情報の保存に失敗しました: ' + error.message);
    } finally {
      setIsSavingOrder(false);
    }
  };
  
  // 受注モーダルのキャンセル処理
  const handleCancelReceivedOrder = () => {
    // ステータスセレクトの値を元に戻す（選択前の状態）
    const deal = receivedOrderModal.deal;
    if (deal) {
      const statusElement = document.querySelector(`[data-deal-id="${deal.id}"] select`);
      if (statusElement) {
        statusElement.value = deal.status; // 元のステータスに戻す
      }
    }
    setReceivedOrderModal({ show: false, deal: null });
  };
  
  const fetchIntroducers = async () => {
    try {
      console.log('📋 紹介者データをFirestoreから取得開始');
      
      const introducersRef = collection(db, 'introducers');
      const q = query(introducersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const introducersData = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        introducersData.push({
          id: docSnap.id,
          ...data
        });
      });
      
      console.log('✅ 紹介者データ取得成功:', introducersData.length, '件');
      setIntroducersList(introducersData);
    } catch (error) {
      console.error('💥 紹介者データ取得エラー:', error);
      // エラー時はモックデータを使用
      setIntroducersList(introducers);
    }
  };

  const handleDelete = async (deal) => {
    try {
      console.log('🗑 案件削除開始:', deal.id);
      
      // 削除前に案件データをバックアップ
      const dealBackup = { ...deal };
      
      // Firestoreから案件を削除
      await deleteDoc(doc(db, 'progressDashboard', deal.id));
      
      console.log('✅ 案件削除成功');
      
      // Undo操作を記録
      recordAction({
        type: 'DELETE_DEAL',
        description: `案件「${deal.productName}」を削除`,
        undoFunction: async () => {
          // 削除された案件を復元
          const docRef = doc(db, 'progressDashboard', dealBackup.id);
          
          // createdAt, updatedAtを適切に復元
          const restoreData = {
            ...dealBackup,
            updatedAt: serverTimestamp()
          };
          
          // Timestampフィールドを除去（setDocで自動生成される）
          if (restoreData.id) delete restoreData.id;
          
          await setDoc(docRef, restoreData);
          console.log('🔄 案件復元完了:', dealBackup.productName);
          
          // データを再取得して画面を更新
          await fetchProgressData();
        }
      });
      
      // 削除成功後、データを再取得
      await fetchProgressData();
      setDeleteModal({ show: false, deal: null });
      // alert('案件が削除されました'); // 通知は不要（undo通知で代替）
    } catch (error) {
      console.error('💥 削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 案件を複製
  const handleDuplicate = async (deal) => {
    try {
      console.log('📋 案件複製開始:', deal.id);

      // 複製データを作成（IDと一部フィールドを除外）
      const duplicateData = {
        companyName: deal.companyName || '',
        productName: deal.productName || '',
        proposalMenu: deal.proposalMenu || '',
        expectedBudget: deal.expectedBudget || null,
        representative: deal.representative || '',
        partnerRepresentative: deal.partnerRepresentative || null,
        leadSource: '', // 流入経路は空にする（別案件として識別するため）
        introducer: '',
        introducerId: 0,
        status: 'フェーズ1', // ステータスはフェーズ1にリセット
        lastContactDate: new Date().toISOString().split('T')[0],
        nextAction: '',
        nextActionDate: null,
        summary: '',
        sub_department_name: deal.sub_department_name || '',
        sub_department_owner: deal.sub_department_owner || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Firestoreに新規案件として追加
      const progressRef = collection(db, 'progressDashboard');
      const newDocRef = await addDoc(progressRef, duplicateData);

      console.log('✅ 案件複製成功:', newDocRef.id);

      // データを再取得して画面を更新
      await fetchProgressData();

      alert(`「${deal.productName}」を複製しました。流入経路を設定してください。`);
    } catch (error) {
      console.error('💥 複製エラー:', error);
      alert('複製に失敗しました');
    }
  };

  // 期日のステータスをチェック
  const getDateStatus = (dateString) => {
    if (!dateString) return null;
    const nextActionDate = new Date(dateString);
    nextActionDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 過去の日付（超過）
    if (nextActionDate < today) {
      return 'overdue';
    }

    // 2日以内（急）
    const twoDaysFromToday = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    if (nextActionDate <= twoDaysFromToday) {
      return 'urgent';
    }

    return null;
  };

  // 後方互換性のため残す
  const isUrgent = (dateString) => {
    const status = getDateStatus(dateString);
    return status === 'urgent' || status === 'overdue';
  };

  // 紹介者名を取得（useCallbackで安定化）
  const getIntroducerName = useCallback((deal) => {
    if (!deal) return '';
    
    // 直接保存された紹介者名がある場合はそれを優先
    if (deal.introducer && deal.introducer.trim() !== '') {
      return deal.introducer;
    }
    
    // introducerIdがある場合はIDから検索
    if (deal.introducerId) {
      const introducer = introducersList.find(i => i.id === deal.introducerId);
      return introducer ? introducer.name : '';
    }
    
    return '';
  }, [introducersList]);

  // ソート機能
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = 'none';
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  // フィルターチェックボックスのハンドラー
  const handleFilterChange = (filterType, value, isChecked) => {
    switch (filterType) {
      case 'status':
        if (isChecked) {
          setStatusFilter(prev => [...prev, value]);
        } else {
          setStatusFilter(prev => prev.filter(item => item !== value));
        }
        break;
      case 'representative':
        if (isChecked) {
          setRepresentativeFilter(prev => [...prev, value]);
        } else {
          setRepresentativeFilter(prev => prev.filter(item => item !== value));
        }
        break;
      case 'introducer':
        if (isChecked) {
          setIntroducerFilter(prev => [...prev, value]);
        } else {
          setIntroducerFilter(prev => prev.filter(item => item !== value));
        }
        break;
    }
  };

  // 全選択/全解除のハンドラー
  const handleToggleAll = (filterType, items) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(prev => prev.length === items.length ? [] : items);
        break;
      case 'representative':
        setRepresentativeFilter(prev => prev.length === items.length ? [] : items);
        break;
      case 'introducer':
        setIntroducerFilter(prev => prev.length === items.length ? [] : items);
        break;
    }
  };

  // ドロップダウンの開閉
  const toggleDropdown = (type) => {
    setDropdownOpen(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown')) {
        setDropdownOpen({
          status: false,
          representative: false,
          introducer: false
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // フィルタリング&ソートされたデータ
  const filteredDeals = useMemo(() => {
    if (!Array.isArray(deals)) return [];
    
    try {
      // フィルタリング
      let filtered = deals.filter(deal => {
        if (!deal) return false;
        
        const companyName = deal.companyName || deal.productName || '';
        const proposalMenu = deal.proposalMenu || '';
        const status = deal.status || '';
        const representative = deal.representative || '';

        const matchesSearch = !searchTerm ||
                             companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             proposalMenu.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(status);
        const matchesRepresentative = representativeFilter.length === 0 || representativeFilter.includes(representative);
        
        let matchesIntroducer = true;
        if (introducerFilter.length > 0) {
          const introducerName = getIntroducerName(deal);
          matchesIntroducer = introducerFilter.includes(introducerName);
        }
        
        // パートナー会社の場合は、その会社の案件のみ表示
        const matchesPartnerCompany = !isPartnerView || !partnerCompany || 
                                     (deal.introducer === partnerCompany);
        
        // 管理者画面の場合は「他社案件」を非表示
        const isValidProposalMenu = isPartnerView || (proposalMenu !== '他社案件');
        
        return matchesSearch && matchesStatus && matchesRepresentative && matchesIntroducer && matchesPartnerCompany && isValidProposalMenu;
      });

      // ソート処理
      if (sortConfig.key && sortConfig.direction !== 'none') {
        filtered.sort((a, b) => {
          let aValue, bValue;
          
          switch (sortConfig.key) {
            case 'lastContactDate':
              // 日付フィールドのソート
              aValue = a.lastContactDate ? new Date(a.lastContactDate) : new Date(0);
              bValue = b.lastContactDate ? new Date(b.lastContactDate) : new Date(0);
              break;
            case 'nextActionDate':
              // フェーズ8（受注）案件は次回アクション日付でソートしない
              if (a.status === 'フェーズ8' && b.status === 'フェーズ8') {
                // 両方フェーズ8の場合は元の順序を維持
                return 0;
              } else if (a.status === 'フェーズ8') {
                // aがフェーズ8の場合は最後に（昇順時）または最初に（降順時）
                return sortConfig.direction === 'asc' ? 1 : -1;
              } else if (b.status === 'フェーズ8') {
                // bがフェーズ8の場合は最後に（昇順時）または最初に（降順時）
                return sortConfig.direction === 'asc' ? -1 : 1;
              } else {
                // どちらもフェーズ8でない場合は通常の日付ソート
                aValue = a.nextActionDate ? new Date(a.nextActionDate) : new Date(9999, 11, 31);
                bValue = b.nextActionDate ? new Date(b.nextActionDate) : new Date(9999, 11, 31);
              }
              break;
            case 'companyName':
              aValue = (a.companyName || a.productName || '').toLowerCase();
              bValue = (b.companyName || b.productName || '').toLowerCase();
              break;
            case 'proposalMenu':
              aValue = (a.proposalMenu || '').toLowerCase();
              bValue = (b.proposalMenu || '').toLowerCase();
              break;
            default:
              return 0;
          }
          
          if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      return filtered;
    } catch (error) {
      console.error('フィルタリング・ソートエラー:', error);
      return deals;
    }
  }, [deals, searchTerm, statusFilter, representativeFilter, introducerFilter, isPartnerView, partnerCompany, getIntroducerName, sortConfig]);

  const handleViewDetail = (id) => {
    navigate(`/product/${id}`);
  };

  const handleAddAction = (deal) => {
    // 案件情報を事前入力してアクションログ記録ページに遷移
    console.log('Deal data:', deal); // デバッグ用
    
    // 紹介者名から紹介者IDを取得
    const getIntroducerIdByName = (introducerName) => {
      const introducer = introducersList.find(i => i.name === introducerName) ||
                        introducers.find(i => i.name === introducerName);
      return introducer ? introducer.id.toString() : '4'; // デフォルト値は直接営業
    };
    
    // introducerIdが存在する場合はそれを使用、なければ紹介者名から検索
    let introducerId = '';
    if (deal.introducerId) {
      introducerId = deal.introducerId.toString();
    } else if (deal.introducer) {
      introducerId = getIntroducerIdByName(deal.introducer);
    } else {
      introducerId = '4'; // デフォルト値
    }
    
    const params = new URLSearchParams({
      companyName: deal.companyName || '',
      productName: deal.productName || '',
      proposalMenu: deal.proposalMenu || '',
      representative: deal.representative || '',
      leadSource: deal.leadSource || '',
      introducerId: introducerId,
      introducer: deal.introducer || ''
    });

    navigate(`/log-entry?${params.toString()}`);
  };

  const handleEdit = (deal) => {
    setEditModal({ show: true, deal: { ...deal } });
  };

  const handleEditSave = async () => {
    try {
      const updatedDeal = editModal.deal;
      console.log('✏️ 案件編集保存開始:', updatedDeal.id);
      
      const dealRef = doc(db, 'progressDashboard', updatedDeal.id);
      // 流入経路と紹介者情報の処理
      const leadSourceInfo = {
        leadSource: updatedDeal.leadSource || ''
      };

      // パートナー選択時のみ紹介者情報を更新
      if (updatedDeal.leadSource === 'パートナー') {
        if (updatedDeal.introducerId && updatedDeal.introducerId !== '') {
          const selectedIntroducer = introducersList.find(i => i.id === updatedDeal.introducerId);
          if (selectedIntroducer) {
            leadSourceInfo.introducer = selectedIntroducer.name;
            leadSourceInfo.introducerId = parseInt(updatedDeal.introducerId);
          }
        }
        leadSourceInfo.partnerRepresentative = updatedDeal.partnerRepresentative || null;
      } else {
        // パートナー以外の場合は紹介者情報をクリア
        leadSourceInfo.introducer = '';
        leadSourceInfo.introducerId = 0;
        leadSourceInfo.partnerRepresentative = null;
      }

      await updateDoc(dealRef, {
        companyName: updatedDeal.companyName || '',
        productName: updatedDeal.productName || '',
        proposalMenu: updatedDeal.proposalMenu,
        representative: updatedDeal.representative,
        expectedBudget: updatedDeal.expectedBudget || null,
        ...leadSourceInfo,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ 案件編集保存成功');
      
      // データを再取得
      await fetchProgressData();
      setEditModal({ show: false, deal: null });
      alert('案件情報が更新されました');
    } catch (error) {
      console.error('💥 編集保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  return (
    <DashboardContainer>
      <Header>
        <Title>案件一覧</Title>
      </Header>

      <FilterSection>
        <FilterGrid>
          <div>
            <label>🔍 検索</label>
            <SearchInput
              type="text"
              placeholder="会社名・提案メニューで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label>📊 ステータス</label>
            <FilterDropdownContainer className="filter-dropdown">
              <FilterDropdownButton
                type="button"
                onClick={() => toggleDropdown('status')}
              >
                <span>
                  {statusFilter.length === 0 
                    ? '選択してください' 
                    : statusFilter.length === STATUSES.length 
                    ? '全て選択中' 
                    : `${statusFilter.length}件選択中`
                  }
                </span>
                <FiChevronDown />
              </FilterDropdownButton>
              {dropdownOpen.status && (
                <FilterDropdownList>
                  <FilterToggleAllButton
                    type="button"
                    onClick={() => handleToggleAll('status', STATUSES)}
                  >
                    {statusFilter.length === STATUSES.length ? '全て解除' : '全て選択'}
                  </FilterToggleAllButton>
                  <FilterCheckboxContainer>
                    {STATUSES.map(status => (
                      <FilterCheckboxItem key={status}>
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status)}
                          onChange={(e) => handleFilterChange('status', status, e.target.checked)}
                        />
                        <span>{status}</span>
                      </FilterCheckboxItem>
                    ))}
                  </FilterCheckboxContainer>
                </FilterDropdownList>
              )}
            </FilterDropdownContainer>
          </div>
          <div>
            <label>👤 担当者</label>
            <FilterDropdownContainer className="filter-dropdown">
              <FilterDropdownButton
                type="button"
                onClick={() => toggleDropdown('representative')}
              >
                <span>
                  {representativeFilter.length === 0 
                    ? '選択してください' 
                    : representativeFilter.length === SALES_REPRESENTATIVES.length 
                    ? '全て選択中' 
                    : `${representativeFilter.length}件選択中`
                  }
                </span>
                <FiChevronDown />
              </FilterDropdownButton>
              {dropdownOpen.representative && (
                <FilterDropdownList>
                  <FilterToggleAllButton
                    type="button"
                    onClick={() => handleToggleAll('representative', SALES_REPRESENTATIVES)}
                  >
                    {representativeFilter.length === SALES_REPRESENTATIVES.length ? '全て解除' : '全て選択'}
                  </FilterToggleAllButton>
                  <FilterCheckboxContainer>
                    {SALES_REPRESENTATIVES.map(rep => (
                      <FilterCheckboxItem key={rep}>
                        <input
                          type="checkbox"
                          checked={representativeFilter.includes(rep)}
                          onChange={(e) => handleFilterChange('representative', rep, e.target.checked)}
                        />
                        <span>{rep}</span>
                      </FilterCheckboxItem>
                    ))}
                  </FilterCheckboxContainer>
                </FilterDropdownList>
              )}
            </FilterDropdownContainer>
          </div>
          <div>
            <label>🏢 紹介者</label>
            <FilterDropdownContainer className="filter-dropdown">
              <FilterDropdownButton
                type="button"
                onClick={() => toggleDropdown('introducer')}
              >
                <span>
                  {introducerFilter.length === 0 
                    ? '全て選択' 
                    : `${introducerFilter.length}件選択中`
                  }
                </span>
                <FiChevronDown />
              </FilterDropdownButton>
              {dropdownOpen.introducer && (
                <FilterDropdownList>
                  {(() => {
                    const uniqueIntroducers = [...new Set(deals.map(deal => getIntroducerName(deal)).filter(name => name && name.trim() !== ''))].sort();
                    return (
                      <>
                        <FilterToggleAllButton
                          type="button"
                          onClick={() => handleToggleAll('introducer', uniqueIntroducers)}
                        >
                          {introducerFilter.length === uniqueIntroducers.length ? '全て解除' : '全て選択'}
                        </FilterToggleAllButton>
                        <FilterCheckboxContainer>
                          {uniqueIntroducers.map(introducerName => (
                            <FilterCheckboxItem key={introducerName}>
                              <input
                                type="checkbox"
                                checked={introducerFilter.includes(introducerName)}
                                onChange={(e) => handleFilterChange('introducer', introducerName, e.target.checked)}
                              />
                              <span>{introducerName}</span>
                            </FilterCheckboxItem>
                          ))}
                        </FilterCheckboxContainer>
                      </>
                    );
                  })()}
                </FilterDropdownList>
              )}
            </FilterDropdownContainer>
          </div>
        </FilterGrid>
      </FilterSection>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
          データを読み込み中...
        </div>
      ) : (
      <TableContainer>
        <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell
              sortable
              onClick={() => handleSort('companyName')}
              style={{ width: '120px' }}
            >
              会社名
              <span className="sort-indicator">
                {sortConfig.key === 'companyName' && sortConfig.direction === 'asc' && <FiChevronUp />}
                {sortConfig.key === 'companyName' && sortConfig.direction === 'desc' && <FiChevronDown />}
                {sortConfig.key === 'companyName' && sortConfig.direction === 'none' && <FiMinus />}
                {sortConfig.key !== 'companyName' && <FiMinus />}
              </span>
            </TableHeaderCell>
            <TableHeaderCell style={{ width: '120px' }}>商材名</TableHeaderCell>
            <TableHeaderCell
              sortable
              onClick={() => handleSort('proposalMenu')}
              style={{ width: '120px' }}
            >
              提案メニュー
              <span className="sort-indicator">
                {sortConfig.key === 'proposalMenu' && sortConfig.direction === 'asc' && <FiChevronUp />}
                {sortConfig.key === 'proposalMenu' && sortConfig.direction === 'desc' && <FiChevronDown />}
                {sortConfig.key === 'proposalMenu' && sortConfig.direction === 'none' && <FiMinus />}
                {sortConfig.key !== 'proposalMenu' && <FiMinus />}
              </span>
            </TableHeaderCell>
            <TableHeaderCell style={{ minWidth: '100px' }}>想定予算</TableHeaderCell>
            <TableHeaderCell style={{ minWidth: '100px' }}>流入経路</TableHeaderCell>
            <TableHeaderCell style={{ minWidth: '140px' }}>担当者（社内／パートナー）</TableHeaderCell>
            <TableHeaderCell style={{ minWidth: '80px' }}>ステータス</TableHeaderCell>
            <TableHeaderCell 
              sortable 
              onClick={() => handleSort('lastContactDate')}
              style={{ minWidth: '80px' }}
            >
              最終接触日
              <span className="sort-indicator">
                {sortConfig.key === 'lastContactDate' && sortConfig.direction === 'asc' && <FiChevronUp />}
                {sortConfig.key === 'lastContactDate' && sortConfig.direction === 'desc' && <FiChevronDown />}
                {sortConfig.key === 'lastContactDate' && sortConfig.direction === 'none' && <FiMinus />}
                {sortConfig.key !== 'lastContactDate' && <FiMinus />}
              </span>
            </TableHeaderCell>
            <TableHeaderCell 
              sortable 
              onClick={() => handleSort('nextActionDate')}
              style={{ minWidth: '150px' }}
            >
              次回アクション
              <span className="sort-indicator">
                {sortConfig.key === 'nextActionDate' && sortConfig.direction === 'asc' && <FiChevronUp />}
                {sortConfig.key === 'nextActionDate' && sortConfig.direction === 'desc' && <FiChevronDown />}
                {sortConfig.key === 'nextActionDate' && sortConfig.direction === 'none' && <FiMinus />}
                {sortConfig.key !== 'nextActionDate' && <FiMinus />}
              </span>
            </TableHeaderCell>
            <TableHeaderCell style={{ minWidth: '50px' }}>ログ</TableHeaderCell>
            <TableHeaderCell style={{ minWidth: '140px' }}>アクション</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {filteredDeals.map(deal => (
            <TableRow key={deal.id}>
              <TableCell style={{ minWidth: '160px' }}>
                <strong>{deal.companyName || '-'}</strong>
              </TableCell>
              <TableCell style={{ minWidth: '160px' }}>
                {deal.productName || '-'}
              </TableCell>
              <TableCell style={{ minWidth: '160px' }}>
                {deal.proposalMenu}
              </TableCell>
              <TableCell style={{ minWidth: '100px' }}>
                {deal.expectedBudget ? `¥${deal.expectedBudget.toLocaleString()}` : '-'}
              </TableCell>
              <TableCell style={{ minWidth: '100px' }}>
                {deal.leadSource || '-'}
              </TableCell>
              <TableCell style={{ minWidth: '200px' }}>
                {/* Ver 2.2: 担当者の併記表示（社内／パートナー） */}
                {deal.representative && deal.partnerRepresentative ? (
                  // 両方存在する場合は併記
                  `${deal.representative}（社内）／${deal.partnerRepresentative}（${deal.introducer?.replace('株式会社', '') || 'パートナー'}）`
                ) : deal.representative ? (
                  // 社内担当者のみ
                  `${deal.representative}（社内）`
                ) : deal.partnerRepresentative ? (
                  // パートナー担当者のみ
                  `${deal.partnerRepresentative}（${deal.introducer?.replace('株式会社', '') || 'パートナー'}）`
                ) : (
                  // どちらもない場合
                  '-'
                )}
              </TableCell>
              <TableCell data-deal-id={deal.id} style={{ minWidth: '120px', padding: '0.5rem' }}>
                <select
                  value={deal.status}
                  onChange={(e) => handleStatusChange(deal.id, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: STATUS_COLORS[deal.status] || '#f8f9fa',
                    color: ['失注'].includes(deal.status) ? '#fff' : '#000',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell style={{ minWidth: '100px' }}>{deal.lastContactDate}</TableCell>
              <TableCell style={{ minWidth: '250px' }}>
                {deal.status === 'フェーズ8' ? (
                  <span style={{ color: '#999' }}>-</span>
                ) : (
                  <>
                    {deal.nextAction}
                    {deal.nextActionDate && getDateStatus(deal.nextActionDate) === 'overdue' && (
                      <OverdueBadge>超過</OverdueBadge>
                    )}
                    {deal.nextActionDate && getDateStatus(deal.nextActionDate) === 'urgent' && (
                      <UrgentBadge>急</UrgentBadge>
                    )}
                    {deal.nextActionDate && (
                      <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                        {deal.nextActionDate}
                      </div>
                    )}
                  </>
                )}
              </TableCell>
              <TableCell>
                <ActionButton 
                  className="view"
                  onClick={() => handleViewDetail(deal.id)}
                >
                  <FiEye />
                  詳細
                </ActionButton>
              </TableCell>
              <TableCell>
                <ActionsCell>
                  <ActionButton 
                    className="edit"
                    onClick={() => handleEdit(deal)}
                  >
                    <FiEdit3 />
                    編集
                  </ActionButton>
                  <ActionButton
                    className="add"
                    onClick={() => handleAddAction(deal)}
                  >
                    <FiPlus />
                    追加
                  </ActionButton>
                  <ActionButton
                    className="copy"
                    onClick={() => handleDuplicate(deal)}
                    title="案件を複製"
                  >
                    <FiCopy />
                    複製
                  </ActionButton>
                  <DeleteButton
                    onClick={() => setDeleteModal({ show: true, deal })}
                  >
                    <FiTrash2 />
                    削除
                  </DeleteButton>
                </ActionsCell>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      </TableContainer>
      )}

      {!isLoading && filteredDeals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#7f8c8d' }}>
          条件に合致する案件が見つかりませんでした。
        </div>
      )}
      
      {deleteModal.show && (
        <Modal onClick={() => setDeleteModal({ show: false, deal: null })}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>案件削除の確認</ModalTitle>
            <ModalText>
              本当に「{deleteModal.deal?.productName}（{deleteModal.deal?.proposalMenu}）」を削除しますか？
              <br />
              この操作は元に戻せません。
            </ModalText>
            <ModalButtons>
              <ModalButton
                className="cancel"
                onClick={() => setDeleteModal({ show: false, deal: null })}
              >
                キャンセル
              </ModalButton>
              <ModalButton
                className="delete"
                onClick={() => handleDelete(deleteModal.deal)}
              >
                削除する
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
      
      {/* 編集モーダル */}
      {editModal.show && (
        <Modal onClick={() => setEditModal({ show: false, deal: null })}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>案件情報編集</ModalTitle>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>会社名</label>
              <input
                type="text"
                value={editModal.deal?.companyName || ''}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  deal: { ...prev.deal, companyName: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>商材名</label>
              <input
                type="text"
                value={editModal.deal?.productName || ''}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  deal: { ...prev.deal, productName: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>提案メニュー</label>
              <select
                value={editModal.deal?.proposalMenu || ''}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  deal: { ...prev.deal, proposalMenu: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">選択してください</option>
                {proposalMenusList.length > 0 ? (
                  proposalMenusList.map(menu => (
                    <option key={menu.id} value={menu.name}>{menu.name}</option>
                  ))
                ) : (
                  <>
                    <option value="第一想起取れるくん">第一想起取れるくん</option>
                    <option value="獲得取れるくん">獲得取れるくん</option>
                    <option value="インハウスキャンプ">インハウスキャンプ</option>
                    <option value="IFキャスティング">IFキャスティング</option>
                    <option value="運用コックピット">運用コックピット</option>
                  </>
                )}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>社内担当者</label>
              <select
                value={editModal.deal?.representative || ''}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  deal: { ...prev.deal, representative: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">選択してください</option>
                {SALES_REPRESENTATIVES.map(rep => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>流入経路</label>
              <select
                value={editModal.deal?.leadSource || ''}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  deal: { ...prev.deal, leadSource: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">選択してください</option>
                {LEAD_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
            {/* パートナー選択時のみ紹介者とパートナー担当者を表示 */}
            {editModal.deal?.leadSource === 'パートナー' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>紹介者（パートナー企業）</label>
                  <select
                    value={editModal.deal?.introducerId || ''}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      deal: { ...prev.deal, introducerId: e.target.value }
                    }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">選択してください</option>
                    {introducersList.filter(i => i.status === 'アクティブ').map(introducer => (
                      <option key={introducer.id} value={introducer.id}>{introducer.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>パートナー担当者</label>
                  <input
                    type="text"
                    value={editModal.deal?.partnerRepresentative || ''}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      deal: { ...prev.deal, partnerRepresentative: e.target.value }
                    }))}
                    placeholder="パートナー担当者名"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>想定予算（円）</label>
              <input
                type="number"
                value={editModal.deal?.expectedBudget || ''}
                onChange={(e) => setEditModal(prev => ({
                  ...prev,
                  deal: { ...prev.deal, expectedBudget: e.target.value ? Number(e.target.value) : null }
                }))}
                placeholder="例：1000000"
                min="0"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <ModalButtons>
              <ModalButton
                className="cancel"
                onClick={() => setEditModal({ show: false, deal: null })}
              >
                キャンセル
              </ModalButton>
              <ModalButton
                className="delete"
                onClick={handleEditSave}
                style={{ background: '#27ae60' }}
              >
                保存
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
      
      {/* 受注情報入力モーダル */}
      <ReceivedOrderModal
        isOpen={receivedOrderModal.show}
        onClose={handleCancelReceivedOrder}
        onSave={handleSaveReceivedOrder}
        deal={receivedOrderModal.deal}
        isLoading={isSavingOrder}
      />
    </DashboardContainer>
  );
}

export default ProgressDashboard; 