import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FiCheck, FiRotateCcw, FiFilter } from 'react-icons/fi';
import { fetchAllNextActions, updateSalesEntryStatus } from '../services/projectService.js';

// ============================================
// 定数
// ============================================

const STATUS_ACTIVE = 'active';
const STATUS_DONE = 'done';

// ============================================
// Styled Components
// ============================================

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 1.5rem;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
`;

const FilterLabel = styled.span`
  font-size: 0.85rem;
  color: #7f8c8d;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const FilterButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: 1px solid ${props => props.$active ? '#3498db' : '#ddd'};
  border-radius: 4px;
  background: ${props => props.$active ? '#ebf5fb' : 'white'};
  color: ${props => props.$active ? '#3498db' : '#7f8c8d'};
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  &:hover { border-color: #3498db; color: #3498db; }
`;

const AssigneeSection = styled.div`
  margin-bottom: 2rem;
`;

const AssigneeHeader = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #3498db;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const NaCount = styled.span`
  font-size: 0.8rem;
  font-weight: 400;
  color: #7f8c8d;
`;

const NaCard = styled.div`
  background: ${props => props.$done ? '#f8f8f8' : 'white'};
  border: 1px solid ${props => props.$done ? '#e0e0e0' : '#e0e0e0'};
  border-left: 3px solid ${props => props.$done ? '#95a5a6' : props.$overdue ? '#e74c3c' : props.$urgent ? '#f39c12' : '#3498db'};
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  opacity: ${props => props.$done ? 0.6 : 1};
`;

const NaContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const NaText = styled.div`
  font-size: 0.875rem;
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
  text-decoration: ${props => props.$done ? 'line-through' : 'none'};
`;

const NaMeta = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #7f8c8d;
`;

const NaCompany = styled.span`
  font-weight: 500;
  color: #555;
`;

const NaDueDate = styled.span`
  font-weight: 500;
  color: ${props => props.$overdue ? '#e74c3c' : props.$urgent ? '#f39c12' : '#3498db'};
`;

const DueBadge = styled.span`
  display: inline-block;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 600;
  color: white;
  margin-left: 0.25rem;
  background: ${props => props.$type === 'overdue' ? '#9b59b6' : '#e74c3c'};
`;

const StatusButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 2px solid ${props => props.$done ? '#95a5a6' : '#ddd'};
  border-radius: 50%;
  background: ${props => props.$done ? '#95a5a6' : 'white'};
  color: ${props => props.$done ? 'white' : '#bdc3c7'};
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 0.1rem;
  transition: all 0.2s;
  &:hover {
    border-color: ${props => props.$done ? '#e74c3c' : '#8b0000'};
    color: ${props => props.$done ? 'white' : '#8b0000'};
    background: ${props => props.$done ? '#e74c3c' : '#fff5f5'};
  }
`;

const LoadingText = styled.div`
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
  font-size: 1rem;
`;

const EmptyText = styled.div`
  text-align: center;
  padding: 2rem;
  color: #95a5a6;
  font-size: 0.9rem;
`;

// ============================================
// ユーティリティ
// ============================================

/** 期日の状態を判定 */
const getDueStatus = (dueDate) => {
  if (!dueDate) return 'none';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'overdue';
  if (diff <= 2) return 'urgent';
  return 'normal';
};

// ============================================
// コンポーネント
// ============================================

const NextActionManagementPage = () => {
  const [allNas, setAllNas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDone, setShowDone] = useState(false);

  const loadNas = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllNextActions();
      setAllNas(data);
    } catch (error) {
      console.error('Failed to fetch NAs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNas();
  }, [loadNas]);

  /** ステータス切替 */
  const handleToggleStatus = async (na) => {
    const newStatus = (na.actionStatus === STATUS_DONE) ? STATUS_ACTIVE : STATUS_DONE;
    try {
      await updateSalesEntryStatus(na.projectId, na.recordId, na.id, newStatus, na.subCol || 'salesRecords');
      setAllNas(prev => prev.map(item =>
        (item.id === na.id && item.projectId === na.projectId && item.recordId === na.recordId)
          ? { ...item, actionStatus: newStatus }
          : item
      ));
    } catch (error) {
      console.error('Failed to toggle NA status:', error);
    }
  };

  // フィルタリング
  const filteredNas = useMemo(() => {
    if (showDone) return allNas;
    return allNas.filter(na => na.actionStatus !== STATUS_DONE);
  }, [allNas, showDone]);

  // 担当者別にグループ化
  const groupedByAssignee = useMemo(() => {
    const groups = {};
    filteredNas.forEach(na => {
      const assignee = na.actionAssignee || '未割当';
      if (!groups[assignee]) groups[assignee] = [];
      groups[assignee].push(na);
    });
    // 担当者名でソート（未割当は最後）
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      if (a === '未割当') return 1;
      if (b === '未割当') return -1;
      return a.localeCompare(b, 'ja');
    });
    return sorted;
  }, [filteredNas]);

  const activeCount = allNas.filter(na => na.actionStatus !== STATUS_DONE).length;
  const doneCount = allNas.filter(na => na.actionStatus === STATUS_DONE).length;

  return (
    <PageContainer>
      <Title>ネクストアクション管理</Title>

      <FilterBar>
        <FilterLabel><FiFilter size={14} /> 表示:</FilterLabel>
        <FilterButton $active={!showDone} onClick={() => setShowDone(false)}>
          todoのみ ({activeCount})
        </FilterButton>
        <FilterButton $active={showDone} onClick={() => setShowDone(true)}>
          すべて表示 ({activeCount + doneCount})
        </FilterButton>
      </FilterBar>

      {isLoading ? (
        <LoadingText>読み込み中...</LoadingText>
      ) : groupedByAssignee.length === 0 ? (
        <EmptyText>ネクストアクションがありません</EmptyText>
      ) : (
        groupedByAssignee.map(([assignee, nas]) => (
          <AssigneeSection key={assignee}>
            <AssigneeHeader>
              {assignee}
              <NaCount>{nas.filter(n => n.actionStatus !== STATUS_DONE).length}件</NaCount>
            </AssigneeHeader>
            {nas.map(na => {
              const dueStatus = getDueStatus(na.actionDueDate);
              const isDone = na.actionStatus === STATUS_DONE;
              return (
                <NaCard
                  key={`${na.projectId}-${na.recordId}-${na.id}`}
                  $done={isDone}
                  $overdue={!isDone && dueStatus === 'overdue'}
                  $urgent={!isDone && dueStatus === 'urgent'}
                >
                  <StatusButton
                    $done={isDone}
                    onClick={() => handleToggleStatus(na)}
                    title={isDone ? 'todoに戻す' : '完了にする'}
                  >
                    {isDone ? <FiCheck size={16} /> : <FiCheck size={14} />}
                  </StatusButton>
                  <NaContent>
                    <NaText $done={isDone}>{na.actionContent}</NaText>
                    <NaMeta>
                      <NaCompany>{na.companyName}{na.productName ? ` / ${na.productName}` : ''}</NaCompany>
                      {na.actionDueDate && (
                        <NaDueDate $overdue={dueStatus === 'overdue'} $urgent={dueStatus === 'urgent'}>
                          期日: {na.actionDueDate}
                          {dueStatus === 'overdue' && <DueBadge $type="overdue">超過</DueBadge>}
                          {dueStatus === 'urgent' && <DueBadge $type="urgent">急</DueBadge>}
                        </NaDueDate>
                      )}
                    </NaMeta>
                  </NaContent>
                </NaCard>
              );
            })}
          </AssigneeSection>
        ))
      )}
    </PageContainer>
  );
};

export default NextActionManagementPage;
