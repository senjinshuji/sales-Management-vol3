import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { FiUser, FiCalendar, FiCheck } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import { fetchStaffByRole } from '../services/staffService.js';
import { updateSalesRecord } from '../services/projectService.js';
import { STATUS_COLORS } from '../data/constants.js';
import ProjectDetailPanel from './ProjectDetailPanel.js';

// --- styled-components ---
const PageContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 1.5rem;
`;

const PageTitle = styled.h2`
  color: #2c3e50;
  margin: 0 0 1.5rem 0;
`;

const MainLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.5rem;
  align-items: start;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const CardTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const Select = styled.select`
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
`;

const DateInput = styled.input`
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
`;

const FilterLabel = styled.span`
  font-size: 0.8rem;
  color: #666;
`;

const SummaryBar = styled.div`
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
`;

const SummaryItem = styled.div`
  text-align: center;
`;

const SummaryLabel = styled.div`
  font-size: 0.7rem;
  color: #999;
`;

const SummaryValue = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: ${props => props.color || '#2c3e50'};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #f8f9fa;
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-size: 0.8rem;
  color: #666;
  border-bottom: 2px solid #e9ecef;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.85rem;
  color: #2c3e50;
`;

const ClickableRow = styled.tr`
  cursor: pointer;
  &:hover { background: #f8f9fa; }
`;

const PhaseBadge = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  background: ${props => props.color || '#95a5a6'};
`;

const InlineSelect = styled.select`
  padding: 0.3rem 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
`;

const InlineInput = styled.input`
  padding: 0.3rem 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  width: 130px;
`;

const SaveBtn = styled.button`
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: #27ae60;
  color: white;
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  &:hover { background: #219a52; }
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #999;
  font-size: 0.9rem;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #999;
`;

const RightCard = styled(Card)`
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  position: sticky;
  top: 80px;
`;

// 金額フォーマット
const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return `¥${Number(value).toLocaleString()}`;
};

function OperatorDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [operators, setOperators] = useState([]);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 既存案件データ（最新salesRecordの情報付き）
  const [existingDeals, setExistingDeals] = useState([]);
  // 新規案件（Phase 2-7、右パネル用）
  const [pipelineDeals, setPipelineDeals] = useState([]);

  // 未確定案件のインライン編集state
  const [editingId, setEditingId] = useState(null);
  const [editOperator, setEditOperator] = useState('');
  const [editStartDate, setEditStartDate] = useState('');

  // 詳細パネル
  const [selectedProject, setSelectedProject] = useState(null);

  // データ取得
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const progressRef = collection(db, 'progressDashboard');
      const querySnapshot = await getDocs(progressRef);

      const allDeals = [];
      querySnapshot.forEach((docSnap) => {
        allDeals.push({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate?.() || new Date(docSnap.data().createdAt)
        });
      });

      // 既存案件（フェーズ8のみ）: salesRecordsの最新レコードから運用者情報を取得
      const existing = allDeals.filter(d => d.isExistingProject === true && d.status === 'フェーズ8');
      const enrichedDeals = [];
      await Promise.all(existing.map(async (deal) => {
        try {
          const salesSnap = await getDocs(
            collection(db, 'progressDashboard', deal.id, 'salesRecords')
          );
          const recs = [];
          salesSnap.forEach(rec => recs.push({ id: rec.id, ...rec.data() }));
          // 登録日降順でソート
          recs.sort((a, b) => {
            const aDate = a.date || '';
            const bDate = b.date || '';
            if (aDate !== bDate) return bDate.localeCompare(aDate);
            const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
            const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
            return bTime - aTime;
          });
          const latest = recs.length > 0 ? recs[0] : null;
          enrichedDeals.push({
            ...deal,
            latestRecordId: latest?.id || null,
            operatorRep: latest?.operatorRep || '',
            startDate: latest?.startDate || '',
            endDate: latest?.endDate || '',
            budget: latest ? (typeof latest.budget === 'string' ? Number(latest.budget) || 0 : latest.budget || 0) : 0,
            latestPhase: latest?.phase || deal.status || '',
          });
        } catch (err) {
          enrichedDeals.push({ ...deal, operatorRep: '', startDate: '', endDate: '', budget: 0, latestPhase: deal.status || '' });
        }
      }));
      setExistingDeals(enrichedDeals);

      // 新規案件（Phase 2-7）: 右パネル用
      const pipeline = allDeals.filter(d =>
        d.isExistingProject !== true &&
        ['フェーズ2', 'フェーズ3', 'フェーズ4', 'フェーズ5', 'フェーズ6', 'フェーズ7'].includes(d.status)
      );
      setPipelineDeals(pipeline);
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStaffByRole('operator').then(staff => {
      setOperators(staff.map(s => s.name));
    }).catch(err => console.error('運用者リスト取得エラー:', err));
  }, [fetchData]);

  // パート1: 選択中の運用者の案件
  const operatorDeals = useMemo(() => {
    if (!selectedOperator) return [];
    let deals = existingDeals.filter(d => d.operatorRep === selectedOperator);

    // 日付フィルタ（開始日ベース）— 開始日未入力は常に表示
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      deals = deals.filter(d => {
        if (!d.startDate) return true; // 開始日未入力は常に表示
        const sd = new Date(d.startDate);
        if (from && sd < from) return false;
        if (to && sd > to) return false;
        return true;
      });
    }

    // ソート: 開始日あり（開始日降順）→ 開始日なし（下部）
    deals.sort((a, b) => {
      if (a.startDate && !b.startDate) return -1;
      if (!a.startDate && b.startDate) return 1;
      if (a.startDate && b.startDate) return b.startDate.localeCompare(a.startDate);
      return 0;
    });
    return deals;
  }, [existingDeals, selectedOperator, dateFrom, dateTo]);

  // パート1サマリー: 今月予算合計
  const operatorSummary = useMemo(() => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

    const monthlyBudget = operatorDeals
      .filter(d => d.startDate && d.startDate >= monthStart && d.startDate <= monthEndStr)
      .reduce((sum, d) => sum + d.budget, 0);

    return { monthlyBudget, target: 0, count: operatorDeals.length };
  }, [operatorDeals]);

  // パート2: 担当者未確定の案件
  const unassignedDeals = useMemo(() => {
    return existingDeals.filter(d => !d.operatorRep);
  }, [existingDeals]);

  // インライン編集の保存
  const handleSaveAssignment = async (deal) => {
    if (!editOperator && !editStartDate) return;
    try {
      const updates = {};
      if (editOperator) updates.operatorRep = editOperator;
      if (editStartDate) updates.startDate = editStartDate;
      await updateSalesRecord(deal.id, deal.latestRecordId, updates, 'salesRecords');

      // ローカルstate更新
      setExistingDeals(prev => prev.map(d =>
        d.id === deal.id ? {
          ...d,
          operatorRep: editOperator || d.operatorRep,
          startDate: editStartDate || d.startDate,
        } : d
      ));
      setEditingId(null);
      setEditOperator('');
      setEditStartDate('');
    } catch (error) {
      console.error('保存失敗:', error);
      alert('保存に失敗しました');
    }
  };

  // 詳細パネルの操作
  const handleRowClick = (deal) => {
    setSelectedProject(deal);
  };

  const handlePanelClose = () => {
    setSelectedProject(null);
    fetchData(); // データ再取得で変更を反映
  };

  // テーブル行のレンダリング（共通）
  const renderDealRow = (deal, editable = false) => (
    <ClickableRow key={deal.id} onClick={() => !editable && handleRowClick(deal)}>
      <Td>{deal.companyName || ''}</Td>
      <Td>{deal.productName || ''}</Td>
      <Td style={{ textAlign: 'right' }}>{formatCurrency(deal.budget)}</Td>
      <Td>
        {editable && editingId === deal.id ? (
          <InlineInput
            type="date"
            value={editStartDate}
            onChange={(e) => setEditStartDate(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          deal.startDate || '-'
        )}
      </Td>
      <Td>{deal.endDate || '-'}</Td>
      <Td>
        <PhaseBadge color={STATUS_COLORS[deal.latestPhase]}>
          {deal.latestPhase || '-'}
        </PhaseBadge>
      </Td>
      <Td>
        {editable && editingId === deal.id ? (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            <InlineSelect
              value={editOperator}
              onChange={(e) => setEditOperator(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">選択</option>
              {operators.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </InlineSelect>
            <SaveBtn onClick={(e) => { e.stopPropagation(); handleSaveAssignment(deal); }}>
              <FiCheck size={12} />
            </SaveBtn>
          </div>
        ) : editable ? (
          <span
            style={{ color: '#3498db', cursor: 'pointer', fontSize: '0.8rem' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(deal.id);
              setEditOperator(deal.operatorRep);
              setEditStartDate(deal.startDate);
            }}
          >
            {deal.operatorRep || '+ 割当'}
          </span>
        ) : (
          deal.operatorRep || '-'
        )}
      </Td>
    </ClickableRow>
  );

  if (isLoading) {
    return <PageContainer><LoadingMessage>データを読み込み中...</LoadingMessage></PageContainer>;
  }

  return (
    <PageContainer>
      <PageTitle>運用管理</PageTitle>

      <MainLayout>
        {/* 左カラム */}
        <LeftColumn>
          {/* パート1: 運用者の案件一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>
                <FiUser />
                運用者の案件一覧
              </CardTitle>
              <FilterRow>
                <Select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                >
                  <option value="">運用者を選択</option>
                  {operators.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </Select>
                <FiCalendar size={14} color="#666" />
                <FilterLabel>開始日:</FilterLabel>
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
              </FilterRow>
            </CardHeader>

            {selectedOperator && (
              <SummaryBar>
                <SummaryItem>
                  <SummaryLabel>案件数</SummaryLabel>
                  <SummaryValue>{operatorSummary.count}件</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>今月予算合計</SummaryLabel>
                  <SummaryValue color="#3498db">{formatCurrency(operatorSummary.monthlyBudget)}</SummaryValue>
                </SummaryItem>
              </SummaryBar>
            )}

            {!selectedOperator ? (
              <EmptyMessage>運用者を選択してください</EmptyMessage>
            ) : operatorDeals.length === 0 ? (
              <EmptyMessage>該当する案件がありません</EmptyMessage>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>会社名</Th>
                    <Th>商材名</Th>
                    <Th style={{ textAlign: 'right' }}>予算</Th>
                    <Th>開始日</Th>
                    <Th>終了日</Th>
                    <Th>ステータス</Th>
                    <Th>運用者</Th>
                  </tr>
                </thead>
                <tbody>
                  {operatorDeals.map(deal => renderDealRow(deal))}
                </tbody>
              </Table>
            )}
          </Card>

          {/* パート2: 担当者未確定の案件 */}
          <Card>
            <CardHeader>
              <CardTitle>
                <FiUser />
                担当者未確定の案件
              </CardTitle>
              <FilterLabel style={{ color: '#e74c3c' }}>{unassignedDeals.length}件</FilterLabel>
            </CardHeader>

            {unassignedDeals.length === 0 ? (
              <EmptyMessage>未確定の案件はありません</EmptyMessage>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>会社名</Th>
                    <Th>商材名</Th>
                    <Th style={{ textAlign: 'right' }}>予算</Th>
                    <Th>開始日</Th>
                    <Th>終了日</Th>
                    <Th>ステータス</Th>
                    <Th>運用者</Th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedDeals.map(deal => renderDealRow(deal, true))}
                </tbody>
              </Table>
            )}
          </Card>
        </LeftColumn>

        {/* 右カラム: 追加予定の予算 */}
        <RightCard>
          <CardHeader>
            <CardTitle>追加予定の予算（フェーズ2-7）</CardTitle>
            <FilterLabel>{pipelineDeals.length}件</FilterLabel>
          </CardHeader>
          {pipelineDeals.length === 0 ? (
            <EmptyMessage>フェーズ2-7の案件がありません</EmptyMessage>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>会社名</Th>
                  <Th>商材名</Th>
                  <Th>フェーズ</Th>
                  <Th style={{ textAlign: 'right' }}>想定予算</Th>
                </tr>
              </thead>
              <tbody>
                {pipelineDeals.map(deal => (
                  <ClickableRow key={deal.id} onClick={() => handleRowClick(deal)}>
                    <Td>{deal.companyName || deal.productName || ''}</Td>
                    <Td>{deal.productName || ''}</Td>
                    <Td>
                      <PhaseBadge color={STATUS_COLORS[deal.status]}>
                        {deal.status}
                      </PhaseBadge>
                    </Td>
                    <Td style={{ textAlign: 'right' }}>{formatCurrency(deal.expectedBudget)}</Td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          )}
        </RightCard>
      </MainLayout>

      {/* 詳細パネル */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={handlePanelClose}
          onProjectUpdate={(updated) => {
            setExistingDeals(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
          }}
          mode={selectedProject.isExistingProject ? undefined : 'newCase'}
        />
      )}
    </PageContainer>
  );
}

export default OperatorDashboard;
