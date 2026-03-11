import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiActivity, FiCalendar, FiPackage, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { STATUS_COLORS } from '../data/constants.js';
import { db } from '../firebase.js';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const DashboardContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #2d3748;
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: #5a67d8;
  }
`;

const FilterContainer = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterLabel = styled.span`
  font-weight: 600;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterSelect = styled.select`
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  min-width: 150px;
`;

const DealsGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;

const DealCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => STATUS_COLORS[props.status] || '#94a3b8'};
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const DealHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const ProductName = styled.h3`
  margin: 0;
  color: #2d3748;
  font-size: 1.2rem;
  font-weight: 600;
`;

const StatusBadge = styled.span`
  background-color: ${props => STATUS_COLORS[props.status] || '#94a3b8'};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const DealInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #718096;
  font-size: 0.9rem;
`;

const ProposalMenu = styled.span`
  background-color: #e2e8f0;
  color: #4a5568;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #718096;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #718096;
`;

function PartnerDashboard() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    representative: 'パートナー担当者' // パートナー専用なので固定
  });

  const fetchDeals = async () => {
    setLoading(true);
    try {
      let dealsQuery = collection(db, 'progressDashboard');
      
      // パートナー担当者の案件のみを取得
      if (filters.representative) {
        dealsQuery = query(dealsQuery, where('representative', '==', filters.representative));
      }

      const snapshot = await getDocs(dealsQuery);
      let fetchedDeals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ステータスフィルター（クライアントサイド）
      if (filters.status) {
        fetchedDeals = fetchedDeals.filter(deal => deal.status === filters.status);
      }

      // 更新日時順でソート
      fetchedDeals.sort((a, b) => {
        const dateA = a.updatedAt?.toDate() || new Date(0);
        const dateB = b.updatedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

      setDeals(fetchedDeals);
    } catch (error) {
      console.error('案件取得エラー:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeals();
  }, [filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('ja-JP');
    }
    return new Date(timestamp).toLocaleDateString('ja-JP');
  };

  const uniqueStatuses = [...new Set(deals.map(deal => deal.status))].filter(Boolean);

  return (
    <DashboardContainer>
      <Header>
        <Title>自分の案件一覧</Title>
        <RefreshButton onClick={fetchDeals}>
          <FiRefreshCw />
          更新
        </RefreshButton>
      </Header>

      <FilterContainer>
        <FilterRow>
          <FilterLabel>
            <FiFilter />
            フィルター:
          </FilterLabel>
          <FilterSelect
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">全ステータス</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </FilterSelect>
        </FilterRow>
      </FilterContainer>

      {loading ? (
        <LoadingContainer>
          <FiRefreshCw size={24} className="spinning" />
          案件を読み込み中...
        </LoadingContainer>
      ) : deals.length === 0 ? (
        <EmptyState>
          <h3>案件が見つかりません</h3>
          <p>まだ案件が登録されていないか、フィルター条件に一致する案件がありません。</p>
        </EmptyState>
      ) : (
        <DealsGrid>
          {deals.map(deal => (
            <DealCard key={deal.id} status={deal.status}>
              <DealHeader>
                <ProductName>{deal.productName}</ProductName>
                <StatusBadge status={deal.status}>{deal.status}</StatusBadge>
              </DealHeader>
              
              <DealInfo>
                <InfoRow>
                  <FiActivity />
                  <ProposalMenu>{deal.proposalMenu}</ProposalMenu>
                </InfoRow>
                
                <InfoRow>
                  <FiCalendar />
                  最終接触: {deal.lastContactDate || '-'}
                </InfoRow>
                
                <InfoRow>
                  <FiPackage />
                  更新日: {formatDate(deal.updatedAt)}
                </InfoRow>
              </DealInfo>
            </DealCard>
          ))}
        </DealsGrid>
      )}
    </DashboardContainer>
  );
}

export default PartnerDashboard;