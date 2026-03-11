import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase.js';
import { collection, query, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { FiEdit, FiTrash2, FiPlus, FiSearch } from 'react-icons/fi';

const Container = styled.div`
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #333;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #2980b9, #21618c);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const SearchSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const SearchField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SearchLabel = styled.label`
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
`;

const SearchInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const PriceRange = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 100%;
`;

const Table = styled.table`
  width: 100%;
  background: white;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 1rem;
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  white-space: nowrap;
  
  &:hover {
    background: #e9ecef;
  }
`;

const Td = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  color: #666;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const EditButton = styled(IconButton)`
  background: #3498db;
  color: white;
  
  &:hover {
    background: #2980b9;
  }
`;

const DeleteButton = styled(IconButton)`
  background: #e74c3c;
  color: white;
  
  &:hover {
    background: #c0392b;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
`;

const SortIndicator = styled.span`
  margin-left: 0.5rem;
  font-size: 0.75rem;
`;

const InfluencerListPage = () => {
  const navigate = useNavigate();
  const [influencers, setInfluencers] = useState([]);
  const [filteredInfluencers, setFilteredInfluencers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filters, setFilters] = useState({
    name: '',
    agency: '',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    fetchInfluencers();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [influencers, filters, sortField, sortOrder]);

  const fetchInfluencers = async () => {
    try {
      const q = query(collection(db, 'influencers'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInfluencers(data);
    } catch (error) {
      console.error('Error fetching influencers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...influencers];

    // 名前フィルター
    if (filters.name) {
      filtered = filtered.filter(inf => 
        inf.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // 事務所フィルター
    if (filters.agency) {
      filtered = filtered.filter(inf => 
        inf.agency && inf.agency.toLowerCase().includes(filters.agency.toLowerCase())
      );
    }

    // 料金範囲フィルター
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter(inf => {
        const avgPrice = (
          (inf.tiktokPrice || 0) + 
          (inf.instagramPrice || 0) + 
          (inf.youtubePrice || 0)
        ) / 3;
        
        const min = filters.minPrice ? parseInt(filters.minPrice) : 0;
        const max = filters.maxPrice ? parseInt(filters.maxPrice) : Infinity;
        
        return avgPrice >= min && avgPrice <= max;
      });
    }


    // ソート
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'followerCount':
          aVal = (a.tiktokFollowerCount || 0) + (a.instagramFollowerCount || 0) + (a.youtubeFollowerCount || 0);
          bVal = (b.tiktokFollowerCount || 0) + (b.instagramFollowerCount || 0) + (b.youtubeFollowerCount || 0);
          break;
        case 'tiktokPrice':
          aVal = a.tiktokPrice || 0;
          bVal = b.tiktokPrice || 0;
          break;
        case 'instagramPrice':
          aVal = a.instagramPrice || 0;
          bVal = b.instagramPrice || 0;
          break;
        case 'youtubePrice':
          aVal = a.youtubePrice || 0;
          bVal = b.youtubePrice || 0;
          break;
        default:
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredInfluencers(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`${name}を削除してよろしいですか？`)) {
      try {
        await deleteDoc(doc(db, 'influencers', id));
        await fetchInfluencers();
        alert('削除しました');
      } catch (error) {
        console.error('Error deleting influencer:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return `¥${price.toLocaleString()}`;
  };

  const formatNumber = (num) => {
    if (!num) return '-';
    return num.toLocaleString();
  };

  if (isLoading) {
    return <Container>読み込み中...</Container>;
  }

  return (
    <Container>
      <Header>
        <Title>インフルエンサー一覧</Title>
        <AddButton onClick={() => navigate('/if/register')}>
          <FiPlus />
          新規登録
        </AddButton>
      </Header>

      <SearchSection>
        <SearchField>
          <SearchLabel>名前検索</SearchLabel>
          <SearchInput
            type="text"
            placeholder="名前で検索"
            value={filters.name}
            onChange={(e) => handleFilterChange('name', e.target.value)}
          />
        </SearchField>

        <SearchField>
          <SearchLabel>事務所検索</SearchLabel>
          <SearchInput
            type="text"
            placeholder="事務所名で検索"
            value={filters.agency}
            onChange={(e) => handleFilterChange('agency', e.target.value)}
          />
        </SearchField>

        <SearchField>
          <SearchLabel>料金範囲（平均）</SearchLabel>
          <PriceRange>
            <SearchInput
              type="number"
              placeholder="最小"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
            <span>〜</span>
            <SearchInput
              type="number"
              placeholder="最大"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </PriceRange>
        </SearchField>

      </SearchSection>

      {filteredInfluencers.length === 0 ? (
        <EmptyState>
          {influencers.length === 0 
            ? 'インフルエンサーが登録されていません' 
            : '検索条件に一致するインフルエンサーが見つかりません'}
        </EmptyState>
      ) : (
        <TableContainer>
          <Table>
            <thead>
              <tr>
                <Th onClick={() => handleSort('name')}>
                  名前
                  {sortField === 'name' && (
                    <SortIndicator>{sortOrder === 'asc' ? '▲' : '▼'}</SortIndicator>
                  )}
                </Th>
                <Th>SNSハンドル</Th>
                <Th>TikTok<br/>フォロワー</Th>
                <Th>Instagram<br/>フォロワー</Th>
                <Th>YouTube<br/>フォロワー</Th>
                <Th onClick={() => handleSort('tiktokPrice')}>
                  TikTok<br/>料金
                  {sortField === 'tiktokPrice' && (
                    <SortIndicator>{sortOrder === 'asc' ? '▲' : '▼'}</SortIndicator>
                  )}
                </Th>
                <Th onClick={() => handleSort('instagramPrice')}>
                  Instagram<br/>料金
                  {sortField === 'instagramPrice' && (
                    <SortIndicator>{sortOrder === 'asc' ? '▲' : '▼'}</SortIndicator>
                  )}
                </Th>
                <Th onClick={() => handleSort('youtubePrice')}>
                  YouTube<br/>料金
                  {sortField === 'youtubePrice' && (
                    <SortIndicator>{sortOrder === 'asc' ? '▲' : '▼'}</SortIndicator>
                  )}
                </Th>
                <Th>二次利用費<br/>(1/2/3ヶ月)</Th>
                <Th>所属事務所</Th>
                <Th>操作</Th>
              </tr>
            </thead>
            <tbody>
              {filteredInfluencers.map(influencer => (
                <tr key={influencer.id}>
                  <Td>{influencer.name}</Td>
                  <Td>{influencer.snsHandle || '-'}</Td>
                  <Td>{formatNumber(influencer.tiktokFollowerCount || influencer.followerCount)}</Td>
                  <Td>{formatNumber(influencer.instagramFollowerCount)}</Td>
                  <Td>{formatNumber(influencer.youtubeFollowerCount)}</Td>
                  <Td>{formatPrice(influencer.tiktokPrice)}</Td>
                  <Td>{formatPrice(influencer.instagramPrice)}</Td>
                  <Td>{formatPrice(influencer.youtubePrice)}</Td>
                  <Td>
                    {influencer.secondaryUsageFee1Month || influencer.secondaryUsageFee2Months || influencer.secondaryUsageFee3Months ? (
                      <span style={{ fontSize: '0.75rem' }}>
                        {formatPrice(influencer.secondaryUsageFee1Month)} /<br/>
                        {formatPrice(influencer.secondaryUsageFee2Months)} /<br/>
                        {formatPrice(influencer.secondaryUsageFee3Months)}
                      </span>
                    ) : '-'}
                  </Td>
                  <Td>{influencer.agency || '-'}</Td>
                  <Td>
                    <ActionButtons>
                      <EditButton
                        onClick={() => navigate(`/if/register/${influencer.id}`)}
                        title="編集"
                      >
                        <FiEdit />
                      </EditButton>
                      <DeleteButton
                        onClick={() => handleDelete(influencer.id, influencer.name)}
                        title="削除"
                      >
                        <FiTrash2 />
                      </DeleteButton>
                    </ActionButtons>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default InfluencerListPage;