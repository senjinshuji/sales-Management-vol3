import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { STATUS_COLORS } from '../data/constants.js';

// 提案対象フェーズ
const PROPOSAL_PHASES = ['フェーズ2', 'フェーズ3', 'フェーズ4', 'フェーズ5', 'フェーズ6', 'フェーズ7'];
// NAデータ取得時のサブコレクション名
const NEW_CASE_SUB_COL = 'newCaseSalesRecords';

// ============================================
// Styled Components
// ============================================

const Container = styled.div`
  max-width: 1400px;
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
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
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

const PhaseBadge = styled.span`
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  background: ${props => props.$color || '#95a5a6'};
`;

const DueBadge = styled.span`
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  margin-left: 0.25rem;
  background: ${props => props.$type === '超過' ? '#8e44ad' : '#e74c3c'};
`;

const NaContent = styled.div`
  font-size: 0.85rem;
  color: #555;
  max-width: 300px;
`;

const NaDate = styled.span`
  color: #8e44ad;
  font-weight: 500;
  font-size: 0.8rem;
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

// ============================================
// ヘルパー関数
// ============================================

// 金額フォーマット
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return `¥${Number(value).toLocaleString()}`;
};

// 期日バッジ判定
const getDueBadge = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '超過';
  if (diffDays <= 2) return '急';
  return null;
};

// NAデータ取得（ProgressDashboard.jsのfetchSalesInfoと同じロジック）
const fetchNaForDeal = async (dealId) => {
  const collectEntries = async (subColName) => {
    const recordsRef = collection(db, 'progressDashboard', dealId, subColName);
    const recordsSnap = await getDocs(recordsRef);
    if (recordsSnap.empty) return [];
    const entries = [];
    await Promise.all(
      recordsSnap.docs.map(async (recDoc) => {
        const entriesRef = collection(db, 'progressDashboard', dealId, subColName, recDoc.id, 'entries');
        const entriesSnap = await getDocs(entriesRef);
        entriesSnap.docs.forEach((entDoc) => {
          entries.push({ id: entDoc.id, ...entDoc.data() });
        });
      })
    );
    return entries;
  };

  try {
    // newCaseSalesRecords優先、なければsalesRecordsにフォールバック
    let entries = await collectEntries(NEW_CASE_SUB_COL);
    if (entries.length === 0) {
      entries = await collectEntries('salesRecords');
    }

    if (entries.length === 0) return null;

    // createdAt降順ソート
    entries.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    // アクティブNAの最新を返す
    const activeNa = entries.find(e => e.actionContent && e.actionStatus !== 'done');
    return activeNa || null;
  } catch (error) {
    console.error('Failed to fetch NA for deal:', error);
    return null;
  }
};

// ============================================
// メインコンポーネント
// ============================================

function ProposalDealsList() {
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [naMap, setNaMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const progressRef = collection(db, 'progressDashboard');
      const querySnapshot = await getDocs(progressRef);

      // 全案件取得（新規+既存）
      const dealsList = [];
      querySnapshot.forEach((docSnap) => {
        dealsList.push({ id: docSnap.id, ...docSnap.data() });
      });

      // 各案件のsalesRecordsからフェーズ2-7のレコードを取得
      const allRecords = [];
      const dealIdsForNa = new Set();

      await Promise.all(dealsList.map(async (deal) => {
        try {
          // newCaseSalesRecords と salesRecords の両方をチェック
          const subCols = [NEW_CASE_SUB_COL, 'salesRecords'];
          for (const subCol of subCols) {
            const salesSnap = await getDocs(
              collection(db, 'progressDashboard', deal.id, subCol)
            );
            salesSnap.forEach(rec => {
              const rd = rec.data();
              if (!PROPOSAL_PHASES.includes(rd.phase)) return;
              const recordId = `${deal.id}_${subCol}_${rec.id}`;
              allRecords.push({
                id: recordId,
                dealId: deal.id,
                phase: rd.phase || '',
                recordType: rd.recordType || (deal.isExistingProject ? '継続' : '新規'),
                companyName: deal.companyName || '',
                productName: deal.productName || '',
                budget: typeof rd.budget === 'string' ? Number(rd.budget) || 0 : rd.budget || 0,
                salesRep: rd.salesRep || deal.representative || '未設定',
              });
              dealIdsForNa.add(deal.id);
            });
          }
        } catch (err) {
          // スキップ
        }
      }));

      // フェーズ順 → 会社名順でデフォルトソート
      allRecords.sort((a, b) => a.phase.localeCompare(b.phase) || a.companyName.localeCompare(b.companyName));
      setRecords(allRecords);

      // NAデータを非同期で取得
      const naEntries = await Promise.all(
        [...dealIdsForNa].map(async (dealId) => {
          const na = await fetchNaForDeal(dealId);
          return [dealId, na];
        })
      );
      setNaMap(Object.fromEntries(naEntries));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 担当者リスト
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
    const term = searchTerm.toLowerCase();

    let result = records.filter(rec => {
      // 検索フィルタ（会社名・商材名）
      if (term) {
        const haystack = `${rec.companyName} ${rec.productName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      // 担当者フィルタ
      if (repFilter && rec.salesRep !== repFilter) return false;
      // フェーズフィルタ
      if (phaseFilter && rec.phase !== phaseFilter) return false;
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
  }, [records, searchTerm, repFilter, phaseFilter, sortKey, sortDir]);

  // サマリー
  const summary = useMemo(() => {
    const total = filteredRecords.reduce((sum, r) => sum + r.budget, 0);
    return { count: filteredRecords.length, total };
  }, [filteredRecords]);

  const hasFilters = searchTerm || repFilter || phaseFilter;

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
        <Title>提案案件一覧</Title>
      </Header>

      <FilterSection>
        <FiSearch size={16} color="#666" />
        <SearchInput
          type="text"
          placeholder="会社名・商材名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <SelectInput
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
        >
          <option value="">全フェーズ</option>
          {PROPOSAL_PHASES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </SelectInput>
        <SelectInput
          value={repFilter}
          onChange={(e) => setRepFilter(e.target.value)}
        >
          <option value="">全担当者</option>
          {repList.map(rep => (
            <option key={rep} value={rep}>{rep}</option>
          ))}
        </SelectInput>
        {hasFilters && (
          <ResetButton onClick={() => { setSearchTerm(''); setRepFilter(''); setPhaseFilter(''); }}>
            リセット
          </ResetButton>
        )}
      </FilterSection>

      <SummaryRow>
        <SummaryCard>
          <SummaryLabel>提案件数</SummaryLabel>
          <SummaryValue>{summary.count}件</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>合計予算</SummaryLabel>
          <SummaryValue>{formatCurrency(summary.total)}</SummaryValue>
        </SummaryCard>
      </SummaryRow>

      <TableContainer>
        {filteredRecords.length === 0 ? (
          <EmptyMessage>該当する提案案件がありません</EmptyMessage>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th $sortable onClick={() => handleSort('phase')}>フェーズ{renderSortIcon('phase')}</Th>
                <Th $sortable onClick={() => handleSort('recordType')}>新規/既存{renderSortIcon('recordType')}</Th>
                <Th $sortable onClick={() => handleSort('companyName')}>会社名{renderSortIcon('companyName')}</Th>
                <Th $sortable onClick={() => handleSort('productName')}>商材名{renderSortIcon('productName')}</Th>
                <Th $sortable onClick={() => handleSort('budget')} style={{ textAlign: 'right' }}>予算{renderSortIcon('budget')}</Th>
                <Th $sortable onClick={() => handleSort('salesRep')}>営業担当者{renderSortIcon('salesRep')}</Th>
                <Th>ネクストアクション</Th>
                <Th>期日</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(rec => {
                const na = naMap[rec.dealId];
                const dueBadgeType = na?.actionDueDate ? getDueBadge(na.actionDueDate) : null;
                return (
                  <tr key={rec.id}>
                    <Td>
                      <PhaseBadge $color={STATUS_COLORS[rec.phase]}>
                        {rec.phase}
                      </PhaseBadge>
                    </Td>
                    <Td><TypeBadge $type={rec.recordType}>{rec.recordType}</TypeBadge></Td>
                    <Td>{rec.companyName}</Td>
                    <Td>{rec.productName}</Td>
                    <Td style={{ textAlign: 'right' }}>{formatCurrency(rec.budget)}</Td>
                    <Td>{rec.salesRep}</Td>
                    <Td>
                      {na ? (
                        <NaContent>
                          {na.actionDueDate && <NaDate>[{na.actionDueDate}] </NaDate>}
                          {(na.actionContent || '').length > 40
                            ? na.actionContent.slice(0, 40) + '...'
                            : na.actionContent}
                        </NaContent>
                      ) : '-'}
                    </Td>
                    <Td>
                      {na?.actionDueDate ? (
                        <>
                          {na.actionDueDate}
                          {dueBadgeType && <DueBadge $type={dueBadgeType}>{dueBadgeType}</DueBadge>}
                        </>
                      ) : '-'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </TableContainer>
    </Container>
  );
}

export default ProposalDealsList;
