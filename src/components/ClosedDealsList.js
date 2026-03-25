import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FiCalendar, FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, getDocs } from 'firebase/firestore';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin: 0;
`;

const FilterSection = styled.div`
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FilterLabel = styled.span`
  font-size: 0.85rem;
  color: #666;
`;

const DateInput = styled.input`
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
`;

const SearchInput = styled.input`
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  flex: 1;
  min-width: 200px;
`;

const SelectInput = styled.select`
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
`;

const ResetButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f8f9fa;
  cursor: pointer;
  font-size: 0.85rem;
  &:hover { background: #e9ecef; }
`;

const SummaryRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SummaryCard = styled.div`
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex: 1;
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: 0.8rem;
  color: #999;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: #2c3e50;
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #f8f9fa;
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.85rem;
  color: #666;
  border-bottom: 2px solid #e9ecef;
  white-space: nowrap;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  &:hover {
    ${props => props.$sortable && 'background: #e9ecef;'}
  }
`;

const SortIcon = styled.span`
  margin-left: 0.25rem;
  display: inline-flex;
  vertical-align: middle;
`;

const Td = styled.td`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
  color: #2c3e50;
`;

const TypeBadge = styled.span`
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  background: ${props => props.$type === '新規' ? '#3498db' : '#27ae60'};
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #999;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #999;
`;

// 金額フォーマット
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return `¥${Number(value).toLocaleString()}`;
};

// 今四半期の範囲を取得
const getQuarterRange = () => {
  const now = new Date();
  const month = now.getMonth();
  const qStartMonth = month - (month % 3);
  const start = new Date(now.getFullYear(), qStartMonth, 1);
  const end = new Date(now.getFullYear(), qStartMonth + 3, 0, 23, 59, 59);
  return { start, end };
};

function ClosedDealsList() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const progressRef = collection(db, 'progressDashboard');
      const querySnapshot = await getDocs(progressRef);

      const dealsList = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.isExistingProject === true) {
          dealsList.push({ id: docSnap.id, ...d });
        }
      });

      // 各既存案件のsalesRecordsからフェーズ8のレコードを取得
      const allRecords = [];
      await Promise.all(dealsList.map(async (deal) => {
        try {
          const salesSnap = await getDocs(
            collection(db, 'progressDashboard', deal.id, 'salesRecords')
          );
          salesSnap.forEach(rec => {
            const rd = rec.data();
            if (rd.phase !== 'フェーズ8') return;
            allRecords.push({
              id: `${deal.id}_${rec.id}`,
              date: rd.date || '',
              recordType: rd.recordType || '新規',
              companyName: deal.companyName || '',
              productName: deal.productName || '',
              budget: typeof rd.budget === 'string' ? Number(rd.budget) || 0 : rd.budget || 0,
              salesRep: rd.salesRep || deal.representative || '未設定',
            });
          });
        } catch (err) {
          // スキップ
        }
      }));

      // date降順でデフォルトソート
      allRecords.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRecords(allRecords);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 担当者リスト（データから自動生成）
  const repList = useMemo(() => {
    const reps = new Set();
    records.forEach(r => { if (r.salesRep) reps.add(r.salesRep); });
    return [...reps].sort();
  }, [records]);

  // ソートハンドラ
  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ソートアイコン表示
  const renderSortIcon = (key) => {
    if (sortKey !== key) return null;
    return (
      <SortIcon>
        {sortDir === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
      </SortIcon>
    );
  };

  // フィルタ + ソート
  const filteredRecords = useMemo(() => {
    const quarter = getQuarterRange();
    const rangeStart = dateFrom ? new Date(dateFrom + 'T00:00:00') : quarter.start;
    const rangeEnd = dateTo ? new Date(dateTo + 'T23:59:59') : quarter.end;
    const term = searchTerm.toLowerCase();

    let result = records.filter(rec => {
      // 日付フィルタ
      if (!rec.date) return false;
      const recDate = new Date(rec.date);
      if (recDate < rangeStart || recDate > rangeEnd) return false;

      // 検索フィルタ（会社名・商材名）
      if (term) {
        const haystack = `${rec.companyName} ${rec.productName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      // 担当者フィルタ
      if (repFilter && rec.salesRep !== repFilter) return false;

      return true;
    });

    // ソート
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        if (typeof aVal === 'string') aVal = aVal || '';
        if (typeof bVal === 'string') bVal = bVal || '';
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [records, dateFrom, dateTo, searchTerm, repFilter, sortKey, sortDir]);

  // サマリー計算
  const summary = useMemo(() => {
    const total = filteredRecords.reduce((sum, r) => sum + r.budget, 0);
    const newCount = filteredRecords.filter(r => r.recordType === '新規').length;
    const existCount = filteredRecords.filter(r => r.recordType === '継続').length;
    return { count: filteredRecords.length, total, newCount, existCount };
  }, [filteredRecords]);

  const quarter = getQuarterRange();
  const hasFilters = dateFrom || dateTo || searchTerm || repFilter;

  if (isLoading) {
    return (
      <Container>
        <LoadingMessage>データを読み込み中...</LoadingMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>成約案件一覧</Title>
      </Header>

      <FilterSection>
        <FilterRow>
          <FiSearch size={16} color="#666" />
          <SearchInput
            type="text"
            placeholder="会社名・商材名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SelectInput
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
          >
            <option value="">全担当者</option>
            {repList.map(rep => (
              <option key={rep} value={rep}>{rep}</option>
            ))}
          </SelectInput>
        </FilterRow>
        <FilterRow>
          <FiCalendar size={16} color="#666" />
          <FilterLabel>期間:</FilterLabel>
          <DateInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <FilterLabel>〜</FilterLabel>
          <DateInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {hasFilters ? (
            <ResetButton onClick={() => { setDateFrom(''); setDateTo(''); setSearchTerm(''); setRepFilter(''); }}>
              全リセット
            </ResetButton>
          ) : (
            <FilterLabel style={{ color: '#999', fontSize: '0.8rem' }}>
              未指定時は今四半期（{quarter.start.getMonth() + 1}月〜{quarter.end.getMonth() + 1}月）
            </FilterLabel>
          )}
        </FilterRow>
      </FilterSection>

      <SummaryRow>
        <SummaryCard>
          <SummaryLabel>成約件数</SummaryLabel>
          <SummaryValue>{summary.count}件</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>合計予算</SummaryLabel>
          <SummaryValue>{formatCurrency(summary.total)}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>新規</SummaryLabel>
          <SummaryValue>{summary.newCount}件</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>継続</SummaryLabel>
          <SummaryValue>{summary.existCount}件</SummaryValue>
        </SummaryCard>
      </SummaryRow>

      <TableContainer>
        {filteredRecords.length === 0 ? (
          <EmptyMessage>該当する成約案件がありません</EmptyMessage>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th $sortable onClick={() => handleSort('date')}>成約日{renderSortIcon('date')}</Th>
                <Th $sortable onClick={() => handleSort('recordType')}>新規/既存{renderSortIcon('recordType')}</Th>
                <Th $sortable onClick={() => handleSort('companyName')}>会社名{renderSortIcon('companyName')}</Th>
                <Th $sortable onClick={() => handleSort('productName')}>商材名{renderSortIcon('productName')}</Th>
                <Th $sortable onClick={() => handleSort('budget')} style={{ textAlign: 'right' }}>予算{renderSortIcon('budget')}</Th>
                <Th $sortable onClick={() => handleSort('salesRep')}>営業担当者{renderSortIcon('salesRep')}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(rec => (
                <tr key={rec.id}>
                  <Td>{rec.date}</Td>
                  <Td><TypeBadge $type={rec.recordType}>{rec.recordType}</TypeBadge></Td>
                  <Td>{rec.companyName}</Td>
                  <Td>{rec.productName}</Td>
                  <Td style={{ textAlign: 'right' }}>{formatCurrency(rec.budget)}</Td>
                  <Td>{rec.salesRep}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableContainer>
    </Container>
  );
}

export default ClosedDealsList;
