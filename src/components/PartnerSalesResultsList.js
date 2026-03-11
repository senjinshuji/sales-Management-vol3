import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiEdit3, FiSave, FiX, FiCalendar, FiDollarSign } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
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

const CompanyBadge = styled.div`
  background: #8e44ad;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  display: inline-block;
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
  grid-template-columns: 1fr 180px 180px;
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
    border-color: #8e44ad;
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
    border-color: #8e44ad;
  }
`;

const Table = styled.table`
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const TableHeader = styled.thead`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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
  color: white;
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
  background-color: #27ae60;
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
  margin-right: 0.5rem;
  
  &.edit {
    background: #f39c12;
    color: white;
    
    &:hover {
      background: #e67e22;
    }
  }
  
  &.save {
    background: #27ae60;
    color: white;
    
    &:hover {
      background: #219a52;
    }
  }
  
  &.cancel {
    background: #95a5a6;
    color: white;
    
    &:hover {
      background: #7f8c8d;
    }
  }
`;

const EditInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: #8e44ad;
    box-shadow: 0 0 0 2px rgba(142, 68, 173, 0.2);
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
`;

const AmountCell = styled.div`
  text-align: right;
  font-weight: 600;
  color: #27ae60;
`;

const SummaryCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const SummaryItem = styled.div`
  text-align: center;
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.8rem;
    font-weight: bold;
  }
  
  p {
    margin: 0;
    opacity: 0.9;
    font-size: 0.9rem;
  }
`;

function PartnerSalesResultsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [representativeFilter, setRepresentativeFilter] = useState('');
  const [salesResults, setSalesResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editForm, setEditForm] = useState({ receivedOrderMonth: '', receivedOrderAmount: '', confirmedDate: '' });
  
  // パートナー会社を判定
  const getPartnerCompany = () => {
    const path = window.location.pathname;
    if (path.startsWith('/partner-entry/piala')) {
      return '株式会社ピアラ';
    }
    return null;
  };
  
  const partnerCompany = getPartnerCompany();
  
  // 成約案件データを取得（パートナー会社の案件のみ）
  const fetchSalesResults = useCallback(async () => {
    if (!partnerCompany) return;
    
    try {
      setIsLoading(true);
      console.log('📊 パートナー成約案件一覧取得開始:', partnerCompany);
      
      const progressRef = collection(db, 'progressDashboard');
      const q = query(
        progressRef, 
        where('status', '==', 'フェーズ8'),
        where('introducer', '==', partnerCompany)
      );
      const querySnapshot = await getDocs(q);
      
      const results = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({
          id: docSnap.id,
          ...data,
          lastContactDate: data.lastContactDate?.toDate?.()?.toLocaleDateString('ja-JP') || 
                          data.lastContactDate || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        });
      });
      
      // 受注月でソート（新しい順）
      results.sort((a, b) => {
        if (!a.receivedOrderMonth && !b.receivedOrderMonth) return 0;
        if (!a.receivedOrderMonth) return 1;
        if (!b.receivedOrderMonth) return -1;
        return b.receivedOrderMonth.localeCompare(a.receivedOrderMonth);
      });
      
      console.log('✅ パートナー成約案件一覧取得成功:', results.length, '件');
      setSalesResults(results);
    } catch (error) {
      console.error('💥 パートナー成約案件一覧取得エラー:', error);
      setSalesResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [partnerCompany]);
  
  useEffect(() => {
    fetchSalesResults();
  }, [fetchSalesResults]);
  
  // フィルタリング処理
  const filteredResults = salesResults.filter(deal => {
    const matchesSearch = !searchTerm || 
                         deal.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.proposalMenu?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = !monthFilter || deal.receivedOrderMonth === monthFilter;
    const matchesRepresentative = !representativeFilter || 
                                 deal.partnerRepresentative === representativeFilter;
    
    return matchesSearch && matchesMonth && matchesRepresentative;
  });
  
  // 編集開始
  const handleEdit = (deal) => {
    setEditingDeal(deal.id);
    setEditForm({
      receivedOrderMonth: deal.receivedOrderMonth || '',
      receivedOrderAmount: deal.receivedOrderAmount || '',
      confirmedDate: deal.confirmedDate || ''
    });
  };
  
  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditingDeal(null);
    setEditForm({ receivedOrderMonth: '', receivedOrderAmount: '', confirmedDate: '' });
  };
  
  // 編集保存
  const handleSaveEdit = async (dealId) => {
    try {
      console.log('💾 パートナー受注情報更新開始:', dealId, editForm);
      
      if (!editForm.receivedOrderMonth || !editForm.receivedOrderAmount) {
        alert('実施月と受注金額は必須です');
        return;
      }
      
      const dealRef = doc(db, 'progressDashboard', dealId);
      const updateData = {
        receivedOrderMonth: editForm.receivedOrderMonth,
        receivedOrderAmount: Number(editForm.receivedOrderAmount),
        updatedAt: serverTimestamp()
      };
      
      if (editForm.confirmedDate) {
        updateData.confirmedDate = editForm.confirmedDate;
      }
      
      await updateDoc(dealRef, updateData);
      
      console.log('✅ パートナー受注情報更新成功');
      
      // データを再取得
      await fetchSalesResults();
      
      // 編集モード終了
      setEditingDeal(null);
      setEditForm({ receivedOrderMonth: '', receivedOrderAmount: '', confirmedDate: '' });
      
    } catch (error) {
      console.error('💥 パートナー受注情報更新エラー:', error);
      alert('更新に失敗しました: ' + error.message);
    }
  };
  
  // ユニークな月一覧を取得
  const getUniqueMonths = () => {
    const months = [...new Set(salesResults.map(deal => deal.receivedOrderMonth).filter(Boolean))];
    return months.sort().reverse();
  };
  
  // ユニークな担当者一覧を取得
  const getUniqueRepresentatives = () => {
    const representatives = [...new Set(salesResults.map(deal => deal.partnerRepresentative).filter(Boolean))];
    return representatives.sort();
  };
  
  // 金額をフォーマット
  const formatAmount = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  };
  
  // サマリー情報を計算（フィルターに関係なく全案件から計算）
  const getSummary = () => {
    const totalAmount = salesResults.reduce((sum, deal) => sum + (deal.receivedOrderAmount || 0), 0);

    // 今月の年月を取得
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonthNum = now.getMonth() + 1;

    // 確定日ベースで今月決まった案件を集計（日付フォーマットの違いに対応）
    const thisMonthResults = salesResults.filter(deal => {
      if (!deal.confirmedDate) return false;
      // 確定日をパースして年月を比較
      const dateStr = deal.confirmedDate.replace(/\//g, '-'); // スラッシュをハイフンに統一
      const confirmedDate = new Date(dateStr);
      return confirmedDate.getFullYear() === thisYear && (confirmedDate.getMonth() + 1) === thisMonthNum;
    });
    const thisMonthAmount = thisMonthResults.reduce((sum, deal) => sum + (deal.receivedOrderAmount || 0), 0);

    return {
      totalCount: salesResults.length,
      totalAmount,
      thisMonthCount: thisMonthResults.length,
      thisMonthAmount
    };
  };
  
  const summary = getSummary();
  
  return (
    <Container>
      <Header>
        <div>
          <CompanyBadge>{partnerCompany}</CompanyBadge>
          <Title>成約案件一覧</Title>
        </div>
      </Header>

      <SummaryCard>
        <SummaryGrid>
          <SummaryItem>
            <h3>{summary.totalCount}</h3>
            <p>総成約件数</p>
          </SummaryItem>
          <SummaryItem>
            <h3>{formatAmount(summary.totalAmount)}</h3>
            <p>累計受注金額</p>
          </SummaryItem>
          <SummaryItem>
            <h3>{summary.thisMonthCount}</h3>
            <p>今月の成約件数</p>
          </SummaryItem>
          <SummaryItem>
            <h3>{formatAmount(summary.thisMonthAmount)}</h3>
            <p>今月の受注金額</p>
          </SummaryItem>
        </SummaryGrid>
      </SummaryCard>

      <FilterSection>
        <FilterGrid>
          <div>
            <label>🔍 検索</label>
            <SearchInput
              type="text"
              placeholder="商材名・提案メニューで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label>📅 実施月</label>
            <Select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              <option value="">全ての月</option>
              {getUniqueMonths().map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </Select>
          </div>
          <div>
            <label>👤 担当者</label>
            <Select
              value={representativeFilter}
              onChange={(e) => setRepresentativeFilter(e.target.value)}
            >
              <option value="">全ての担当者</option>
              {getUniqueRepresentatives().map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </Select>
          </div>
        </FilterGrid>
      </FilterSection>

      {isLoading ? (
        <LoadingMessage>データを読み込み中...</LoadingMessage>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>商材名</TableHeaderCell>
              <TableHeaderCell>提案メニュー</TableHeaderCell>
              <TableHeaderCell>担当者</TableHeaderCell>
              <TableHeaderCell>実施月</TableHeaderCell>
              <TableHeaderCell>受注金額</TableHeaderCell>
              <TableHeaderCell>確定日</TableHeaderCell>
              <TableHeaderCell>ステータス</TableHeaderCell>
              <TableHeaderCell>操作</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan="8">
                  <EmptyMessage>
                    {salesResults.length === 0 
                      ? '成約案件がありません' 
                      : '検索条件に合致する案件が見つかりませんでした'
                    }
                  </EmptyMessage>
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map(deal => (
                <TableRow key={deal.id}>
                  <TableCell>
                    <strong>{deal.productName}</strong>
                  </TableCell>
                  <TableCell>{deal.proposalMenu}</TableCell>
                  <TableCell>{deal.partnerRepresentative || deal.representative || '-'}</TableCell>
                  <TableCell>
                    {editingDeal === deal.id ? (
                      <EditInput
                        type="month"
                        value={editForm.receivedOrderMonth}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          receivedOrderMonth: e.target.value
                        }))}
                      />
                    ) : (
                      deal.receivedOrderMonth || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingDeal === deal.id ? (
                      <EditInput
                        type="number"
                        value={editForm.receivedOrderAmount}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          receivedOrderAmount: e.target.value
                        }))}
                        placeholder="受注金額"
                      />
                    ) : (
                      <AmountCell>
                        {formatAmount(deal.receivedOrderAmount)}
                      </AmountCell>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingDeal === deal.id ? (
                      <EditInput
                        type="date"
                        value={editForm.confirmedDate}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          confirmedDate: e.target.value
                        }))}
                      />
                    ) : (
                      deal.confirmedDate ? new Date(deal.confirmedDate).toLocaleDateString('ja-JP') : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge>受注</StatusBadge>
                  </TableCell>
                  <TableCell>
                    {editingDeal === deal.id ? (
                      <div style={{ display: 'flex' }}>
                        <ActionButton 
                          className="save"
                          onClick={() => handleSaveEdit(deal.id)}
                        >
                          <FiSave />
                          保存
                        </ActionButton>
                        <ActionButton 
                          className="cancel"
                          onClick={handleCancelEdit}
                        >
                          <FiX />
                          キャンセル
                        </ActionButton>
                      </div>
                    ) : (
                      <ActionButton 
                        className="edit"
                        onClick={() => handleEdit(deal)}
                      >
                        <FiEdit3 />
                        編集
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>
      )}
    </Container>
  );
}

export default PartnerSalesResultsList;