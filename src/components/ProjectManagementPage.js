import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { fetchProjects, fetchProjectSalesData } from '../services/projectService.js';
import { CONTINUATION_STATUS_COLORS } from '../data/constants.js';
import ProjectDetailPanel from './ProjectDetailPanel.js';

// ============================================
// 定数
// ============================================

const HOVER_COLOR = '#f0f7ff';
const NA_TRUNCATE_LENGTH = 40;

// ============================================
// ユーティリティ
// ============================================

/** 金額を日本円フォーマットに変換 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('ja-JP').format(amount) + '円';
};

/** 継続ステータスを自動計算する */
const calcContinuationStatus = (records) => {
  if (!records || records.length === 0) return '';
  const latest = records[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = latest.endDate ? new Date(latest.endDate) : null;
  const startDate = latest.startDate ? new Date(latest.startDate) : null;
  const isPhase8 = latest.phase === 'フェーズ8';
  const isPhase1to7 = latest.phase && latest.phase !== 'フェーズ8' && latest.phase !== '失注';

  // 継続成約: 最新行がフェーズ8 & startDateが未来
  if (isPhase8 && startDate && startDate > today) {
    return '継続成約';
  }

  // 終了: 最新行がフェーズ8 & endDateが過去
  if (isPhase8 && endDate && endDate < today) {
    return '終了';
  }

  // 継続提案中: 最新行がフェーズ1-7 & 2行目以降（recordsが2件以上）
  if (isPhase1to7 && records.length >= 2) {
    return '継続提案中';
  }

  // 施策実施中: 最新行のstartDateあり & (endDateが未来 or 空)
  if (startDate && (!endDate || endDate >= today)) {
    return '施策実施中';
  }

  return '';
};

/** 経過日数を計算（最新行のendDateから） */
const calcElapsedDays = (records) => {
  if (!records || records.length === 0) return null;
  const latest = records[0];
  if (!latest.endDate) return null;
  const endDate = new Date(latest.endDate);
  const today = new Date();
  const diff = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
  return diff;
};

/** 累計売上（全営業記録のbudget合計） */
const calcTotalSales = (records) => {
  if (!records || records.length === 0) return 0;
  return records.reduce((sum, r) => sum + (Number(r.budget) || 0), 0);
};

// ============================================
// Styled Components
// ============================================

const PageContainer = styled.div`
  max-width: 1800px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  flex: 0 0 280px;
  margin-bottom: 1rem;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #95a5a6;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.75rem 0.6rem 2.25rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const TableContainer = styled.div`
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
  &::-webkit-scrollbar { height: 8px; }
  &::-webkit-scrollbar-track { background: #f1f1f1; }
  &::-webkit-scrollbar-thumb { background: #bdc3c7; border-radius: 4px; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background: #f8f9fa;
`;

const TableHeaderCell = styled.th`
  padding: 0.75rem 0.75rem;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: #7f8c8d;
  white-space: nowrap;
  border-bottom: 2px solid #e9ecef;
  cursor: ${props => props.$sortable ? 'pointer' : 'default'};
  user-select: none;
  &:hover {
    ${props => props.$sortable && 'color: #2c3e50;'}
  }
`;

const SortIcon = styled.span`
  margin-left: 0.25rem;
  display: inline-flex;
  vertical-align: middle;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #eee;
  cursor: pointer;
  &:hover { background: ${HOVER_COLOR}; }
`;

const TableCell = styled.td`
  padding: 0.75rem 0.75rem;
  font-size: 0.85rem;
  color: #2c3e50;
  vertical-align: middle;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: ${props => props.$color || '#95a5a6'};
`;

const NaText = styled.div`
  font-size: 0.8rem;
  color: #2c3e50;
  max-width: 200px;
`;

const MoreLink = styled.span`
  color: #3498db;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: 0.25rem;
  &:hover { text-decoration: underline; }
`;

const NaModal = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NaModalContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 60vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

const NaModalTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 1rem;
`;

const NaModalText = styled.div`
  font-size: 0.9rem;
  color: #2c3e50;
  white-space: pre-wrap;
  line-height: 1.6;
`;

const NaModalClose = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  &:hover { opacity: 0.9; }
`;

const DueDateBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  margin-left: 0.25rem;
  background: ${props => props.$type === 'urgent' ? '#e74c3c' : '#9b59b6'};
`;

const LoadingText = styled.div`
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
  font-size: 1rem;
`;

const EmptyText = styled.div`
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
  font-size: 0.9rem;
`;

// ============================================
// コンポーネント
// ============================================

const ProjectManagementPage = () => {
  const [projects, setProjects] = useState([]);
  const [salesDataMap, setSalesDataMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [naModalText, setNaModalText] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // プロジェクト取得
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchProjects();
      setProjects(data);

      // 各プロジェクトの営業データを並列取得
      const dataEntries = await Promise.all(
        data.map(async (p) => {
          const salesData = await fetchProjectSalesData(p.id);
          return [p.id, salesData];
        })
      );
      const map = Object.fromEntries(dataEntries);
      setSalesDataMap(map);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ソートハンドラー
  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // ソートアイコン
  const renderSortIcon = (key) => {
    if (sortKey !== key) return null;
    return (
      <SortIcon>
        {sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
      </SortIcon>
    );
  };

  // 拡張データを持つプロジェクト一覧
  const enrichedProjects = useMemo(() => {
    return projects.map((p) => {
      const salesData = salesDataMap[p.id] || { records: [], latestEntry: null };
      const { records, latestEntry } = salesData;
      const latestRecord = records.length > 0 ? records[0] : null;

      return {
        ...p,
        introducer: p.introducer || '',
        proposalMenu: p.proposalMenu || '',
        totalSales: calcTotalSales(records),
        continuationStatus: calcContinuationStatus(records),
        elapsedDays: calcElapsedDays(records),
        latestNaContent: latestEntry?.actionContent || '',
        latestNaDueDate: latestEntry?.actionDueDate || '',
        recordCount: records.length,
        latestRecord,
      };
    });
  }, [projects, salesDataMap]);

  // フィルタ + ソート
  const filteredProjects = useMemo(() => {
    let result = enrichedProjects;

    // 検索
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((p) => {
        return (
          (p.companyName || '').toLowerCase().includes(term) ||
          (p.introducer || '').toLowerCase().includes(term) ||
          (p.productName || '').toLowerCase().includes(term) ||
          (p.proposalMenu || '').toLowerCase().includes(term)
        );
      });
    }

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
        const cmp = String(aVal).localeCompare(String(bVal), 'ja');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [enrichedProjects, searchTerm, sortKey, sortDir]);

  // 期日バッジ
  const renderDueDateBadge = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <DueDateBadge $type="overdue">超過</DueDateBadge>;
    if (diff <= 2) return <DueDateBadge $type="urgent">急</DueDateBadge>;
    return null;
  };

  // プロジェクト更新
  const handleProjectUpdate = useCallback((updatedProject) => {
    setProjects((prev) =>
      prev.map((p) => p.id === updatedProject.id ? updatedProject : p)
    );
    setSelectedProject((prev) =>
      prev && prev.id === updatedProject.id ? updatedProject : prev
    );
  }, []);

  return (
    <PageContainer>
      <PageHeader>
        <Title>既存案件</Title>
      </PageHeader>

      <SearchInputWrapper>
        <SearchIcon><FiSearch size={16} /></SearchIcon>
        <SearchInput
          type="text"
          placeholder="会社名・紹介者・商材名・提案メニューで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </SearchInputWrapper>

      <TableContainer>
        {isLoading ? (
          <LoadingText>読み込み中...</LoadingText>
        ) : filteredProjects.length === 0 ? (
          <EmptyText>該当する案件がありません</EmptyText>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell $sortable onClick={() => handleSort('companyName')}>
                  会社名{renderSortIcon('companyName')}
                </TableHeaderCell>
                <TableHeaderCell>代理店名</TableHeaderCell>
                <TableHeaderCell>商材名</TableHeaderCell>
                <TableHeaderCell>提案メニュー</TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('totalSales')}>
                  累計売上{renderSortIcon('totalSales')}
                </TableHeaderCell>
                <TableHeaderCell>継続ステータス</TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('elapsedDays')}>
                  経過日数{renderSortIcon('elapsedDays')}
                </TableHeaderCell>
                <TableHeaderCell>ネクストアクション</TableHeaderCell>
                <TableHeaderCell $sortable onClick={() => handleSort('latestNaDueDate')}>
                  期日{renderSortIcon('latestNaDueDate')}
                </TableHeaderCell>
              </tr>
            </TableHead>
            <tbody>
              {filteredProjects.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                >
                  <TableCell style={{ fontWeight: 500 }}>{p.companyName || '-'}</TableCell>
                  <TableCell>{p.introducer || '-'}</TableCell>
                  <TableCell>{p.productName || '-'}</TableCell>
                  <TableCell>{p.proposalMenu || '-'}</TableCell>
                  <TableCell>{p.totalSales ? formatCurrency(p.totalSales) : '-'}</TableCell>
                  <TableCell>
                    {p.continuationStatus ? (
                      <StatusBadge $color={CONTINUATION_STATUS_COLORS[p.continuationStatus]}>
                        {p.continuationStatus}
                      </StatusBadge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {p.elapsedDays != null ? (
                      <span style={{ color: p.elapsedDays > 90 ? '#e74c3c' : '#2c3e50' }}>
                        {p.elapsedDays}日
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {p.latestNaContent ? (
                      <NaText>
                        {p.latestNaContent.length > NA_TRUNCATE_LENGTH
                          ? p.latestNaContent.slice(0, NA_TRUNCATE_LENGTH) + '...'
                          : p.latestNaContent
                        }
                        {p.latestNaContent.length > NA_TRUNCATE_LENGTH && (
                          <MoreLink onClick={(e) => { e.stopPropagation(); setNaModalText(p.latestNaContent); }}>
                            続きを見る
                          </MoreLink>
                        )}
                      </NaText>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {p.latestNaDueDate || '-'}
                    {renderDueDateBadge(p.latestNaDueDate)}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </TableContainer>

      {/* NAモーダル */}
      {naModalText && (
        <NaModal onClick={() => setNaModalText(null)}>
          <NaModalContent onClick={(e) => e.stopPropagation()}>
            <NaModalTitle>ネクストアクション</NaModalTitle>
            <NaModalText>{naModalText}</NaModalText>
            <NaModalClose onClick={() => setNaModalText(null)}>閉じる</NaModalClose>
          </NaModalContent>
        </NaModal>
      )}

      {/* サイドパネル */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onProjectUpdate={handleProjectUpdate}
        />
      )}
    </PageContainer>
  );
};

export default ProjectManagementPage;
