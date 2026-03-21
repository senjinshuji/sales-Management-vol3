import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiX, FiPlus, FiTrash2, FiEdit2, FiSend, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PROJECT_RANKS, STATUSES, STATUS_COLORS, CONTINUATION_STATUS_COLORS } from '../data/constants.js';
import { db } from '../firebase.js';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { fetchAllStaff } from '../services/staffService.js';
import {
  updateProject,
  fetchMonthlyData, saveMonthlyData,
  addSalesRecord, fetchSalesRecords, updateSalesRecord, deleteSalesRecord,
  addKeyPerson, fetchKeyPersons, updateKeyPerson, deleteKeyPerson,
  addOperationMemo, fetchOperationMemos, deleteOperationMemo,
  addSalesEntry, fetchSalesEntries, deleteSalesEntry, updateSalesEntry, updateSalesEntryStatus
} from '../services/projectService.js';

// ============================================
// 定数
// ============================================

const WEEKS = ['W1', 'W2', 'W3', 'W4'];
// 営業フェーズ（1〜8）
const SALES_PHASES = STATUSES.filter(s => s !== '失注');

// ============================================
// ユーティリティ関数
// ============================================

/** 金額を日本円フォーマットに変換 */
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '';
  return new Intl.NumberFormat('ja-JP').format(amount);
};

/** Firestoreタイムスタンプを文字列に変換 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

/** 現在月を中心に前後12ヶ月の選択肢を生成 */
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = -12; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
};

// ============================================
// アニメーション
// ============================================

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

// ============================================
// Styled Components - レイアウト
// ============================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
`;

const Panel = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: 50%;
  height: 100vh;
  background: #ffffff;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  animation: ${slideIn} 0.3s ease;
  overflow-y: auto;
  z-index: 1001;
  display: flex;
  flex-direction: column;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #7f8c8d;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  &:hover { color: #2c3e50; }
`;

// ============================================
// Styled Components - ヘッダー
// ============================================

const PanelHeader = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  padding-right: 3rem;
`;

const HeaderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
`;

const HeaderItem = styled.div``;

const HeaderLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 500;
  color: #95a5a6;
  margin-bottom: 0.15rem;
`;

const HeaderValue = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
`;

const HeaderSelect = styled.select`
  font-size: 0.85rem;
  font-weight: 600;
  color: #2c3e50;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: #3498db; }
`;

// ============================================
// Styled Components - タブ
// ============================================

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid #e0e0e0;
`;

const Tab = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${props => props.$active ? '#3498db' : '#95a5a6'};
  border-bottom: 2px solid ${props => props.$active ? '#3498db' : 'transparent'};
  transition: all 0.2s;
  &:hover { color: #3498db; }
`;

const TabContent = styled.div`
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
`;

// ============================================
// Styled Components - フォーム
// ============================================

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const FormGroup = styled.div`
  margin-bottom: ${props => props.$noMargin ? '0' : '1rem'};
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  color: #555;
  margin-bottom: 0.25rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #3498db; }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  box-sizing: border-box;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: #3498db; }
`;

// ============================================
// Styled Components - セクション共通
// ============================================

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 1.5rem 0 0.75rem;
`;

const ActionForm = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
`;

const DateInput = styled.input`
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  &:focus { outline: none; border-color: #3498db; }
`;

const ActionInput = styled.textarea`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  resize: none;
  overflow: hidden;
  min-height: 60px;
  font-family: inherit;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #3498db; }
`;

/** テキストエリアの自動リサイズハンドラー */
const autoResize = (e) => {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { opacity: 0.9; }
  &:disabled { background: #bdc3c7; cursor: not-allowed; }
`;

const ActionCard = styled.div`
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  position: relative;
`;

const ActionContent = styled.div`
  font-size: 0.9rem;
  color: #2c3e50;
  margin-bottom: 0.25rem;
  white-space: pre-wrap;
`;

const ActionMeta = styled.div`
  font-size: 0.75rem;
  color: #7f8c8d;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #e74c3c;
  opacity: 0.6;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  &:hover { opacity: 1; }
`;

const EditButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #f39c12;
  opacity: 0.6;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  &:hover { opacity: 1; }
`;

const EntryEditTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  box-sizing: border-box;
  resize: vertical;
  &:focus { outline: none; border-color: #3498db; }
`;

const EntryEditInput = styled.input`
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  flex: 1;
  &:focus { outline: none; border-color: #3498db; }
`;

// ============================================
// Styled Components - テーブル系
// ============================================

const RecordTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
`;

const RecordThead = styled.thead`
  background: #f8f9fa;
`;

const RecordTh = styled.th`
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 600;
  color: #7f8c8d;
  border-bottom: 2px solid #e9ecef;
`;

const RecordTr = styled.tr`
  border-bottom: 1px solid #eee;
  &:hover { background: #f8f9fa; }
`;

const RecordTd = styled.td`
  padding: 0.6rem 0.75rem;
  font-size: 0.875rem;
  color: #2c3e50;
  vertical-align: middle;
`;

const RecordInput = styled.input`
  width: 100%;
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #3498db; }
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  color: #7f8c8d;
  margin-right: 0.25rem;
  &:hover { background: #f8f9fa; color: ${props => props.$danger ? '#e74c3c' : '#3498db'}; border-color: ${props => props.$danger ? '#e74c3c' : '#3498db'}; }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border: 1px dashed #3498db;
  border-radius: 4px;
  background: white;
  color: #3498db;
  cursor: pointer;
  font-size: 0.85rem;
  &:hover { background: #f0f8ff; }
`;

const SaveCancelButtons = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const SmallButton = styled.button`
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${props => props.$primary ? '#3498db' : '#e9ecef'};
  color: ${props => props.$primary ? 'white' : '#495057'};
  &:hover { opacity: 0.9; }
`;

// ============================================
// Styled Components - キーパーソン
// ============================================

const PersonCard = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
`;

const PersonName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`;

const PersonTitle = styled.div`
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 0.15rem;
`;

const PersonContact = styled.div`
  font-size: 0.85rem;
  color: #3498db;
  margin-bottom: 0.15rem;
`;

const PersonNote = styled.div`
  font-size: 0.85rem;
  color: #555;
  margin-top: 0.5rem;
`;

const CardActions = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.25rem;
`;

const PersonFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const EmptyText = styled.div`
  text-align: center;
  padding: 2rem;
  color: #95a5a6;
  font-size: 0.9rem;
`;

// ============================================
// Styled Components - 営業記録展開行
// ============================================

const ExpandableRow = styled.tr`
  cursor: pointer;
  border-bottom: 1px solid #eee;
  &:hover { background: #f8f9fa; }
`;

const ExpandedSection = styled.tr`
  background: #fafbfc;
`;

const ExpandedContent = styled.td`
  padding: 1rem;
  border-bottom: 2px solid #e0e0e0;
`;

const SubSection = styled.div`
  margin-bottom: 1rem;
`;

const SubSectionTitle = styled.h4`
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PhaseBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: ${props => props.$color || '#95a5a6'};
`;

const InlineInput = styled.input`
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
  width: 100%;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #3498db; }
`;

const AssigneeSelect = styled.select`
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: #3498db; }
`;

const PhaseSelectInline = styled.select`
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  margin-left: 0.5rem;
  &:focus { outline: none; border-color: #3498db; }
`;

const ActionAssignee = styled.span`
  font-size: 0.75rem;
  color: #9b59b6;
  font-weight: 500;
`;

// ============================================
// Styled Components - 週次グラフ
// ============================================

const ChartContainer = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const WeeklyInputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const WeekLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
  text-align: center;
`;

const WeekInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  text-align: center;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #3498db; }
`;

// ============================================
// 運用メモセクション
// ============================================

const OperationMemoSection = ({ projectId }) => {
  const [memos, setMemos] = useState([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadMemos = useCallback(async () => {
    if (!projectId) return;
    try {
      setIsLoading(true);
      const data = await fetchOperationMemos(projectId);
      setMemos(data);
    } catch (error) {
      console.error('Failed to load operation memos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  const handleAddMemo = async () => {
    if (!content.trim()) return;
    try {
      await addOperationMemo(projectId, { content: content.trim() });
      setContent('');
      await loadMemos();
    } catch (error) {
      console.error('Failed to add operation memo:', error);
    }
  };

  const handleDeleteMemo = async (memoId) => {
    try {
      await deleteOperationMemo(projectId, memoId);
      await loadMemos();
    } catch (error) {
      console.error('Failed to delete operation memo:', error);
    }
  };

  return (
    <div>
      <SectionTitle>運用メモ</SectionTitle>
      <ActionForm>
        <ActionInput
          placeholder="運用メモを入力..."
          value={content}
          onChange={e => setContent(e.target.value)}
          onInput={autoResize}
          rows={1}
        />
        <SendButton onClick={handleAddMemo} disabled={!content.trim()}>
          <FiSend />
        </SendButton>
      </ActionForm>
      {isLoading ? (
        <EmptyText>読み込み中...</EmptyText>
      ) : memos.length === 0 ? (
        <EmptyText>運用メモはまだありません</EmptyText>
      ) : (
        memos.map(memo => (
          <ActionCard key={memo.id}>
            <ActionContent>{memo.content}</ActionContent>
            <ActionMeta>{formatTimestamp(memo.createdAt)}</ActionMeta>
            {memo.id === memos[memos.length - 1]?.id && (
              <DeleteButton onClick={() => handleDeleteMemo(memo.id)}>
                <FiTrash2 size={14} />
              </DeleteButton>
            )}
          </ActionCard>
        ))
      )}
    </div>
  );
};

// ============================================
// タブ1: 運用者向け
// ============================================

const OperatorTab = ({ project, onProjectUpdate }) => {
  const [formData, setFormData] = useState({
    rank: project.rank || '',
    clientGoal: project.clientGoal || ''
  });
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [weeklySales, setWeeklySales] = useState({ w1: '', w2: '', w3: '', w4: '' });

  const monthOptions = generateMonthOptions();

  // 初期表示時に現在月を選択
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  }, []);

  // 月選択変更時にデータを取得
  useEffect(() => {
    if (!selectedMonth || !project.id) return;
    const loadMonthly = async () => {
      try {
        const data = await fetchMonthlyData(project.id, selectedMonth);
        if (data) {
          setMonthlyTarget(data.target || '');
          setWeeklySales({
            w1: data.w1 || '',
            w2: data.w2 || '',
            w3: data.w3 || '',
            w4: data.w4 || ''
          });
        } else {
          setMonthlyTarget('');
          setWeeklySales({ w1: '', w2: '', w3: '', w4: '' });
        }
      } catch (error) {
        console.error('Failed to load monthly data:', error);
      }
    };
    loadMonthly();
  }, [selectedMonth, project.id]);

  /** 案件情報フィールド変更時 */
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /** onBlurで案件情報を保存 */
  const handleFieldBlur = async (field) => {
    try {
      await updateProject(project.id, { [field]: formData[field] });
      if (onProjectUpdate) {
        onProjectUpdate({ ...project, [field]: formData[field] });
      }
    } catch (error) {
      console.error('Failed to update project field:', error);
    }
  };

  /** セレクトボックス変更時（即座に保存） */
  const handleSelectChange = async (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    try {
      await updateProject(project.id, { [field]: value });
      if (onProjectUpdate) {
        onProjectUpdate({ ...project, [field]: value });
      }
    } catch (error) {
      console.error('Failed to update project field:', error);
    }
  };

  /** 月次データ保存（目標） */
  const handleTargetSave = async () => {
    if (!selectedMonth) return;
    try {
      await saveMonthlyData(project.id, selectedMonth, { target: monthlyTarget });
    } catch (error) {
      console.error('Failed to save monthly target:', error);
    }
  };

  /** 週次売上保存 */
  const handleWeeklySave = async (week) => {
    if (!selectedMonth) return;
    try {
      await saveMonthlyData(project.id, selectedMonth, { [week]: weeklySales[week] });
    } catch (error) {
      console.error('Failed to save weekly sales:', error);
    }
  };

  // グラフ用データ生成（累積 + 推測値）
  const targetValue = Number(monthlyTarget) || 0;

  // 入力済みの最後の週を特定
  let lastFilledIndex = -1;
  let lastFilledValue = 0;
  WEEKS.forEach((_, i) => {
    const val = Number(weeklySales[`w${i + 1}`]);
    if (val > 0) {
      lastFilledIndex = i;
      lastFilledValue = val;
    }
  });

  // 週あたりの平均増加ペース（推測用）
  const avgPacePerWeek = lastFilledIndex >= 0
    ? lastFilledValue / (lastFilledIndex + 1)
    : 0;

  const chartData = WEEKS.map((week, i) => {
    const weekKey = `w${i + 1}`;
    const inputValue = Number(weeklySales[weekKey]) || 0;
    const hasValue = inputValue > 0;

    // 実績値: 入力済みの週のみ
    const actual = hasValue ? inputValue : null;

    // 推測値: 入力済み最終週以降に点線で延長（小数点なし）
    let forecast = null;
    if (lastFilledIndex >= 0 && i > lastFilledIndex) {
      forecast = Math.round(lastFilledValue + avgPacePerWeek * (i - lastFilledIndex));
    }
    // 実績と推測の接続点（最後の入力週にも推測値を置く）
    if (i === lastFilledIndex && lastFilledIndex < WEEKS.length - 1) {
      forecast = lastFilledValue;
    }

    return {
      name: week,
      累積売上: actual,
      推測ペース: forecast,
      売上目標: targetValue || null,
    };
  });

  return (
    <div>
      <SectionTitle>案件情報</SectionTitle>
      <FormGrid>
        <FormGroup $noMargin>
          <Label>ランク</Label>
          <Select
            value={formData.rank}
            onChange={e => handleSelectChange('rank', e.target.value)}
          >
            <option value="">選択してください</option>
            {PROJECT_RANKS.map(rank => (
              <option key={rank} value={rank}>{rank}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup $noMargin>
          <Label>クライアント目標</Label>
          <Input
            type="text"
            value={formData.clientGoal}
            onChange={e => handleFieldChange('clientGoal', e.target.value)}
            onBlur={() => handleFieldBlur('clientGoal')}
            placeholder="自由記述"
          />
        </FormGroup>
      </FormGrid>

      {/* 月次売上管理 */}
      <SectionTitle>月次売上管理</SectionTitle>
      <FormGrid>
        <FormGroup $noMargin>
          <Label>月</Label>
          <Select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup $noMargin>
          <Label>売上目標</Label>
          <Input
            type="number"
            value={monthlyTarget}
            onChange={e => setMonthlyTarget(e.target.value)}
            onBlur={handleTargetSave}
            placeholder="円"
          />
        </FormGroup>
      </FormGrid>

      {/* 週次売上入力 */}
      <WeeklyInputGrid style={{ marginTop: '1rem' }}>
        {WEEKS.map((week, i) => {
          const weekKey = `w${i + 1}`;
          return (
            <div key={week}>
              <WeekLabel>{week}</WeekLabel>
              <WeekInput
                type="number"
                value={weeklySales[weekKey]}
                onChange={e => setWeeklySales(prev => ({ ...prev, [weekKey]: e.target.value }))}
                onBlur={() => handleWeeklySave(weekKey)}
                placeholder="円"
              />
            </div>
          );
        })}
      </WeeklyInputGrid>

      {/* グラフ */}
      <ChartContainer>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3498db" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3498db" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={v => formatCurrency(v)} />
            <Tooltip formatter={(v, name) => v != null ? [formatCurrency(v) + '円', name] : ['-', name]} />
            <Legend />
            {targetValue > 0 && (
              <Line type="monotone" dataKey="売上目標" stroke="#e74c3c" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
            )}
            <Area type="monotone" dataKey="累積売上" stroke="#3498db" strokeWidth={2} fill="url(#salesFill)" dot={{ r: 4 }} connectNulls />
            <Line type="monotone" dataKey="推測ペース" stroke="#3498db" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, strokeDasharray: '0' }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* 運用メモ */}
      <OperationMemoSection projectId={project.id} />
    </div>
  );
};

// ============================================
// 営業記録展開コンテンツ（メモ + NA統合入力）
// ============================================

const SalesRecordEntries = ({ projectId, record, onPhaseUpdate, onRecordFieldChange, operators, salesReps, subCol = 'salesRecords', onPhase8Submitted }) => {
  const [entries, setEntries] = useState([]);
  const [memoContent, setMemoContent] = useState('');
  // NA複数対応: 配列で管理
  const EMPTY_NA = { actionContent: '', actionDueDate: '', actionAssignee: '' };
  const [naItems, setNaItems] = useState([{ ...EMPTY_NA }]);
  const [currentPhase, setCurrentPhase] = useState(record.phase || 'フェーズ1');
  const [isLoading, setIsLoading] = useState(false);
  const [proposalMenuList, setProposalMenuList] = useState([]);

  /** 提案メニューマスターを取得 */
  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'proposalMenus'));
        const menus = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.isActive !== false)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map(m => m.name);
        setProposalMenuList(menus);
      } catch (error) {
        console.error('Failed to fetch proposal menus:', error);
      }
    };
    fetchMenus();
  }, []);

  /** エントリを取得（降順） */
  const loadEntries = useCallback(async () => {
    if (!projectId || !record.id) return;
    try {
      setIsLoading(true);
      const data = await fetchSalesEntries(projectId, record.id, subCol);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load sales entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, record.id, subCol]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // 最新エントリのフェーズを初期値にする
  useEffect(() => {
    if (entries.length > 0 && entries[0].phase) {
      setCurrentPhase(entries[0].phase);
    }
  }, [entries]);

  /** NA行の値を更新するヘルパー */
  const updateNaItem = (index, field, value) => {
    setNaItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  /** NA行を追加 */
  const addNaRow = () => {
    setNaItems(prev => [...prev, { ...EMPTY_NA }]);
  };

  /** NA行を削除 */
  const removeNaRow = (index) => {
    setNaItems(prev => prev.length <= 1 ? [{ ...EMPTY_NA }] : prev.filter((_, i) => i !== index));
  };

  /** まとめて送信（NA複数対応） */
  const handleSubmit = async () => {
    const hasMemo = memoContent.trim();
    // 入力済みNAを抽出
    const filledNas = naItems.filter(na => na.actionContent.trim());
    if (!hasMemo && filledNas.length === 0) return;
    try {
      const phaseChanged = currentPhase !== record.phase;
      const phaseChange = phaseChanged ? `${record.phase}→${currentPhase}` : '';

      if (filledNas.length <= 1) {
        // NA 0〜1件: 従来通り1エントリ
        const na = filledNas[0] || EMPTY_NA;
        await addSalesEntry(projectId, record.id, {
          memoContent: memoContent.trim() || '',
          actionContent: na.actionContent.trim() || '',
          actionDueDate: na.actionDueDate || '',
          actionAssignee: na.actionAssignee || '',
          phase: currentPhase,
          phaseChange
        }, subCol);
      } else {
        // NA 2件以上: 1件目にメモ付き、2件目以降はNA単体
        for (let i = 0; i < filledNas.length; i++) {
          const na = filledNas[i];
          await addSalesEntry(projectId, record.id, {
            memoContent: i === 0 ? (memoContent.trim() || '') : '',
            actionContent: na.actionContent.trim(),
            actionDueDate: na.actionDueDate || '',
            actionAssignee: na.actionAssignee || '',
            phase: currentPhase,
            phaseChange: i === 0 ? phaseChange : ''
          }, subCol);
        }
      }

      // フェーズが変更されていたら営業記録も更新
      if (phaseChanged) {
        await updateSalesRecord(projectId, record.id, { phase: currentPhase }, subCol);
        onPhaseUpdate(record.id, currentPhase);
      }
      setMemoContent('');
      setNaItems([{ ...EMPTY_NA }]);
      await loadEntries();

      // フェーズ8に変更された場合、既存案件への移行を提案
      if (phaseChanged && currentPhase === 'フェーズ8' && onPhase8Submitted) {
        onPhase8Submitted();
      }
    } catch (error) {
      console.error('Failed to add sales entry:', error);
    }
  };

  /** NAステータス切替 */
  const handleToggleNaStatus = async (entryId, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'active' : 'done';
    try {
      await updateSalesEntryStatus(projectId, record.id, entryId, newStatus, subCol);
      setEntries(prev => prev.map(e =>
        e.id === entryId ? { ...e, actionStatus: newStatus } : e
      ));
    } catch (error) {
      console.error('Failed to toggle NA status:', error);
    }
  };

  // 編集中のエントリ
  const [editingEntry, setEditingEntry] = useState(null);

  const handleEditSave = async () => {
    if (!editingEntry) return;
    try {
      // 既存エントリの更新
      const updateData = {
        memoContent: editingEntry.memoContent || '',
        actionContent: editingEntry.actionContent || '',
        actionDueDate: editingEntry.actionDueDate || '',
        actionAssignee: editingEntry.actionAssignee || ''
      };
      // createdAtが編集されている場合、Firestore Timestampに変換して含める
      if (editingEntry.createdAtEdited) {
        updateData.createdAt = Timestamp.fromDate(new Date(editingEntry.createdAtEdited));
      }
      await updateSalesEntry(projectId, record.id, editingEntry.id, updateData, subCol);

      // 追加NAを新規エントリとして保存
      const extraFilled = (editingEntry.extraNaItems || []).filter(na => na.actionContent.trim());
      for (const na of extraFilled) {
        await addSalesEntry(projectId, record.id, {
          memoContent: '',
          actionContent: na.actionContent.trim(),
          actionDueDate: na.actionDueDate || '',
          actionAssignee: na.actionAssignee || '',
          phase: editingEntry.phase || '',
          phaseChange: ''
        }, subCol);
      }

      setEditingEntry(null);
      await loadEntries();
    } catch (error) {
      console.error('Failed to update sales entry:', error);
    }
  };

  /** エントリ削除 */
  const handleDelete = async (entryId) => {
    try {
      await deleteSalesEntry(projectId, record.id, entryId, subCol);
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete sales entry:', error);
    }
  };

  // NA入力がある場合は日付・担当者も必須（全行チェック）
  const filledNas = naItems.filter(na => na.actionContent.trim());
  const naAllValid = filledNas.every(na => na.actionDueDate && na.actionAssignee);
  const hasAnyNa = filledNas.length > 0;
  const hasInput = (memoContent.trim() || hasAnyNa) && (hasAnyNa ? naAllValid : true);

  return (
    <ExpandedContent colSpan={7}>
      {/* 開始日・終了日 */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
        <FormGroup $noMargin>
          <Label>開始日</Label>
          <DateInput
            type="date"
            value={record.startDate || ''}
            onChange={e => onRecordFieldChange(record.id, 'startDate', e.target.value)}
          />
        </FormGroup>
        <FormGroup $noMargin>
          <Label>終了日</Label>
          <DateInput
            type="date"
            value={record.endDate || ''}
            onChange={e => onRecordFieldChange(record.id, 'endDate', e.target.value)}
          />
        </FormGroup>
        <FormGroup $noMargin style={{ flex: 1 }}>
          <Label>メニュー</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {proposalMenuList.map(menu => {
              const selected = (record.proposalMenus || []).includes(menu);
              return (
                <span
                  key={menu}
                  onClick={() => {
                    const current = record.proposalMenus || [];
                    const next = selected
                      ? current.filter(m => m !== menu)
                      : [...current, menu];
                    onRecordFieldChange(record.id, 'proposalMenus', next);
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selected ? '#3498db' : '#ddd',
                    background: selected ? '#3498db' : 'white',
                    color: selected ? 'white' : '#7f8c8d',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {menu}
                </span>
              );
            })}
          </div>
        </FormGroup>
      </div>

      {/* フェーズ選択 */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Label style={{ margin: 0, fontWeight: 600 }}>フェーズ:</Label>
        <PhaseSelectInline
          value={currentPhase}
          onChange={e => setCurrentPhase(e.target.value)}
          style={{ marginLeft: 0 }}
        >
          {SALES_PHASES.map(phase => (
            <option key={phase} value={phase}>{phase}</option>
          ))}
        </PhaseSelectInline>
        {currentPhase !== record.phase && (
          <span style={{ fontSize: '0.75rem', color: '#e67e22' }}>※送信時に更新</span>
        )}
      </div>

      {/* 接触メモ入力 */}
      <FormGroup style={{ marginBottom: '0.5rem' }}>
        <Label>接触メモ</Label>
        <ActionInput
          placeholder="接触メモを入力..."
          value={memoContent}
          onChange={e => setMemoContent(e.target.value)}
          onInput={autoResize}
          rows={2}
        />
      </FormGroup>

      {/* NA入力（複数対応） */}
      <FormGroup style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Label style={{ margin: 0 }}>ネクストアクション</Label>
          <button
            type="button"
            onClick={addNaRow}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '22px', height: '22px', border: '1px solid #3498db', borderRadius: '4px',
              background: 'white', color: '#3498db', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              padding: 0
            }}
            title="NAを追加"
          >
            <FiPlus size={12} />
          </button>
        </div>
        {naItems.map((na, idx) => (
          <div key={idx} style={{ marginBottom: idx < naItems.length - 1 ? '0.5rem' : 0, padding: naItems.length > 1 ? '0.5rem' : 0, border: naItems.length > 1 ? '1px solid #e0e0e0' : 'none', borderRadius: '6px', background: naItems.length > 1 ? '#fafbfc' : 'transparent' }}>
            {naItems.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#7f8c8d', fontWeight: 600 }}>NA {idx + 1}</span>
                <DeleteButton onClick={() => removeNaRow(idx)} style={{ padding: '0.1rem' }}>
                  <FiTrash2 size={12} />
                </DeleteButton>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <DateInput
                type="date"
                value={na.actionDueDate}
                onChange={e => updateNaItem(idx, 'actionDueDate', e.target.value)}
              />
              <AssigneeSelect
                value={na.actionAssignee}
                onChange={e => updateNaItem(idx, 'actionAssignee', e.target.value)}
              >
                <option value="">担当者</option>
                {[...new Set([...(salesReps || []), ...(operators || [])])].map(rep => (
                  <option key={rep} value={rep}>{rep}</option>
                ))}
              </AssigneeSelect>
            </div>
            <ActionInput
              placeholder="ネクストアクションを入力..."
              value={na.actionContent}
              onChange={e => updateNaItem(idx, 'actionContent', e.target.value)}
              onInput={autoResize}
              rows={2}
            />
          </div>
        ))}
      </FormGroup>

      {/* バリデーションメッセージ */}
      {hasAnyNa && !naAllValid && (
        <div style={{ fontSize: '0.8rem', color: '#e74c3c', marginBottom: '0.5rem' }}>
          ※ ネクストアクション入力時は日付と担当者が必須です
        </div>
      )}

      {/* 送信ボタン */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <SendButton
          onClick={handleSubmit}
          disabled={!hasInput}
          style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <FiSend size={14} /> 送信
        </SendButton>
      </div>

      {/* 履歴タイムライン（降順） */}
      {isLoading ? (
        <EmptyText style={{ padding: '0.5rem' }}>読み込み中...</EmptyText>
      ) : entries.length === 0 ? (
        <EmptyText style={{ padding: '0.5rem' }}>記録はまだありません</EmptyText>
      ) : (
        entries.map((entry, index) => (
          <ActionCard key={entry.id}>
            {editingEntry && editingEntry.id === entry.id ? (
              // 編集モード
              <>
                <SubSection style={{ marginBottom: '0.75rem' }}>
                  <SubSectionTitle style={{ margin: '0 0 0.25rem' }}>接触メモ</SubSectionTitle>
                  <EntryEditTextarea
                    value={editingEntry.memoContent || ''}
                    onChange={e => setEditingEntry(prev => ({ ...prev, memoContent: e.target.value }))}
                    rows={3}
                    placeholder="接触メモを入力..."
                  />
                </SubSection>
                <SubSection style={{ marginBottom: '0.75rem' }}>
                  <SubSectionTitle style={{ margin: '0 0 0.25rem' }}>ネクストアクション</SubSectionTitle>
                  <EntryEditTextarea
                    value={editingEntry.actionContent || ''}
                    onChange={e => setEditingEntry(prev => ({ ...prev, actionContent: e.target.value }))}
                    rows={2}
                    placeholder="ネクストアクションを入力..."
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <EntryEditInput
                      type="date"
                      value={editingEntry.actionDueDate || ''}
                      onChange={e => setEditingEntry(prev => ({ ...prev, actionDueDate: e.target.value }))}
                    />
                    <EntryEditInput
                      type="text"
                      value={editingEntry.actionAssignee || ''}
                      onChange={e => setEditingEntry(prev => ({ ...prev, actionAssignee: e.target.value }))}
                      placeholder="担当者"
                    />
                  </div>
                </SubSection>
                {/* 追加NA行 */}
                {(editingEntry.extraNaItems || []).map((na, idx) => (
                  <SubSection key={idx} style={{ marginBottom: '0.75rem', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '6px', background: '#fafbfc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <SubSectionTitle style={{ margin: 0 }}>追加NA {idx + 1}</SubSectionTitle>
                      <DeleteButton onClick={() => setEditingEntry(prev => ({
                        ...prev,
                        extraNaItems: prev.extraNaItems.filter((_, i) => i !== idx)
                      }))} style={{ padding: '0.1rem' }}>
                        <FiTrash2 size={12} />
                      </DeleteButton>
                    </div>
                    <EntryEditTextarea
                      value={na.actionContent}
                      onChange={e => setEditingEntry(prev => ({
                        ...prev,
                        extraNaItems: prev.extraNaItems.map((item, i) => i === idx ? { ...item, actionContent: e.target.value } : item)
                      }))}
                      rows={2}
                      placeholder="ネクストアクションを入力..."
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <EntryEditInput
                        type="date"
                        value={na.actionDueDate}
                        onChange={e => setEditingEntry(prev => ({
                          ...prev,
                          extraNaItems: prev.extraNaItems.map((item, i) => i === idx ? { ...item, actionDueDate: e.target.value } : item)
                        }))}
                      />
                      <EntryEditInput
                        type="text"
                        value={na.actionAssignee}
                        onChange={e => setEditingEntry(prev => ({
                          ...prev,
                          extraNaItems: prev.extraNaItems.map((item, i) => i === idx ? { ...item, actionAssignee: e.target.value } : item)
                        }))}
                        placeholder="担当者"
                      />
                    </div>
                  </SubSection>
                ))}
                {/* NA追加ボタン */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingEntry(prev => ({
                      ...prev,
                      extraNaItems: [...(prev.extraNaItems || []), { actionContent: '', actionDueDate: '', actionAssignee: '' }]
                    }))}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.25rem 0.6rem', border: '1px solid #3498db', borderRadius: '4px',
                      background: 'white', color: '#3498db', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                    }}
                    title="NAを追加"
                  >
                    <FiPlus size={12} /> NA追加
                  </button>
                </div>
                <SubSection style={{ marginBottom: '0.75rem' }}>
                  <SubSectionTitle style={{ margin: '0 0 0.25rem' }}>送信日時</SubSectionTitle>
                  <EntryEditInput
                    type="datetime-local"
                    value={editingEntry.createdAtEdited || ''}
                    onChange={e => setEditingEntry(prev => ({ ...prev, createdAtEdited: e.target.value }))}
                    style={{ flex: 'none', width: 'auto' }}
                  />
                </SubSection>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <SmallButton onClick={() => setEditingEntry(null)}>取消</SmallButton>
                  <SmallButton $primary onClick={handleEditSave}>保存</SmallButton>
                </div>
              </>
            ) : (
              // 表示モード
              <>
                {/* フェーズ変更（変化時のみ表示） */}
                {entry.phaseChange && (
                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e67e22' }}>
                      フェーズ変更: {entry.phaseChange}
                    </span>
                    <PhaseBadge $color={STATUS_COLORS[entry.phase]}>
                      {entry.phase}
                    </PhaseBadge>
                  </div>
                )}

                {/* 接触メモ */}
                {entry.memoContent && (
                  <SubSection style={{ marginBottom: entry.actionContent ? '0.75rem' : '0' }}>
                    <SubSectionTitle style={{ margin: '0 0 0.25rem' }}>接触メモ</SubSectionTitle>
                    <ActionContent>{entry.memoContent}</ActionContent>
                  </SubSection>
                )}

                {/* NA */}
                {entry.actionContent && (
                  <SubSection style={{ marginBottom: 0 }}>
                    <SubSectionTitle style={{ margin: '0 0 0.25rem' }}>
                      ネクストアクション
                      {entry.actionDueDate && (
                        <span style={{ color: '#3498db', fontWeight: 500 }}>{entry.actionDueDate}</span>
                      )}
                      {entry.actionAssignee && (
                        <ActionAssignee>{entry.actionAssignee}</ActionAssignee>
                      )}
                      <span
                        onClick={() => handleToggleNaStatus(entry.id, entry.actionStatus || 'active')}
                        style={{
                          cursor: 'pointer',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'white',
                          background: entry.actionStatus === 'done' ? '#95a5a6' : '#8b0000',
                          marginLeft: 'auto'
                        }}
                      >
                        {entry.actionStatus === 'done' ? 'Done' : 'todo'}
                      </span>
                    </SubSectionTitle>
                    <ActionContent style={{
                      textDecoration: entry.actionStatus === 'done' ? 'line-through' : 'none',
                      opacity: entry.actionStatus === 'done' ? 0.6 : 1
                    }}>
                      {entry.actionContent}
                    </ActionContent>
                  </SubSection>
                )}

                <ActionMeta style={{ marginTop: '0.5rem' }}>{formatTimestamp(entry.createdAt)}</ActionMeta>
                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                  <EditButton onClick={() => {
                    // createdAtをdatetime-local用のISO文字列に変換
                    const date = entry.createdAt?.toDate ? entry.createdAt.toDate() : (entry.createdAt ? new Date(entry.createdAt) : new Date());
                    const isoLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setEditingEntry({ ...entry, createdAtEdited: isoLocal, extraNaItems: [] });
                  }}>
                    <FiEdit2 size={14} />
                  </EditButton>
                  <DeleteButton onClick={() => handleDelete(entry.id)}>
                    <FiTrash2 size={14} />
                  </DeleteButton>
                </div>
              </>
            )}
          </ActionCard>
        ))
      )}
    </ExpandedContent>
  );
};

// ============================================
// タブ2: 営業向け
// ============================================

const SalesTab = ({ project, operators, salesReps, subCol = 'salesRecords', onPhaseChange, onPhase8Submitted, mode }) => {
  const [records, setRecords] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState({
    phase: 'フェーズ1', budget: '', date: '', salesRep: '', operatorRep: '', startDate: '', endDate: ''
  });

  /** 営業記録を取得 */
  const loadRecords = useCallback(async () => {
    if (!project.id) return;
    try {
      const data = await fetchSalesRecords(project.id, subCol);
      data.sort((a, b) => {
        const aDate = a.createdAt?.toMillis?.() || 0;
        const bDate = b.createdAt?.toMillis?.() || 0;
        return bDate - aDate;
      });
      setRecords(data);
    } catch (error) {
      console.error('Failed to load sales records:', error);
    }
  }, [project.id, subCol]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleStartAdd = () => {
    setIsAdding(true);
    const today = new Date().toISOString().split('T')[0];
    setEditForm({ phase: 'フェーズ1', budget: '', date: today, salesRep: '', operatorRep: '', startDate: '', endDate: '' });
  };

  const handleSaveNew = async () => {
    try {
      await addSalesRecord(project.id, {
        phase: editForm.phase,
        budget: editForm.budget,
        date: editForm.date,
        salesRep: editForm.salesRep,
        operatorRep: editForm.operatorRep,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        recordType: mode === 'newCase' ? '新規' : '継続',
        createdAt: new Date()
      }, subCol);
      setIsAdding(false);
      await loadRecords();
    } catch (error) {
      console.error('Failed to add sales record:', error);
    }
  };

  const handleDelete = async (e, recordId) => {
    e.stopPropagation();
    try {
      await deleteSalesRecord(project.id, recordId, subCol);
      if (expandedId === recordId) setExpandedId(null);
      await loadRecords();
    } catch (error) {
      console.error('Failed to delete sales record:', error);
    }
  };

  const handlePhaseUpdate = (recordId, newPhase) => {
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, phase: newPhase } : r
    ));
    // ヘッダーのフェーズも即座に更新
    if (onPhaseChange) onPhaseChange(newPhase);
  };

  /** 営業記録のフィールドをインラインで変更・保存（イベント経由） */
  const handleRecordSelectChange = async (e, recordId, field) => {
    e.stopPropagation();
    const value = e.target.value;
    await saveRecordField(recordId, field, value);
  };

  /** 営業記録のフィールドを変更・保存（値指定） */
  const saveRecordField = async (recordId, field, value) => {
    try {
      await updateSalesRecord(project.id, recordId, { [field]: value }, subCol);
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, [field]: value } : r
      ));
    } catch (error) {
      console.error('Failed to update sales record field:', error);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
  };

  const toggleExpand = (recordId) => {
    setExpandedId(prev => prev === recordId ? null : recordId);
  };

  return (
    <div>
      <SectionTitle>営業記録</SectionTitle>
      <RecordTable>
        <RecordThead>
          <tr>
            <RecordTh style={{ width: '30px' }}></RecordTh>
            <RecordTh>区分</RecordTh>
            <RecordTh>フェーズ</RecordTh>
            <RecordTh>予算</RecordTh>
            <RecordTh>登録日</RecordTh>
            <RecordTh>営業担当</RecordTh>
            <RecordTh>運用担当</RecordTh>
            <RecordTh>操作</RecordTh>
          </tr>
        </RecordThead>
        <tbody>
          {records.map(record => (
            <React.Fragment key={record.id}>
              <ExpandableRow onClick={() => toggleExpand(record.id)}>
                <RecordTd>
                  {expandedId === record.id
                    ? <FiChevronDown size={14} />
                    : <FiChevronRight size={14} />
                  }
                </RecordTd>
                <RecordTd>{mode === 'newCase' ? '新規' : (record.recordType || '-')}</RecordTd>
                <RecordTd>
                  <PhaseBadge $color={STATUS_COLORS[record.phase]}>
                    {record.phase || '-'}
                  </PhaseBadge>
                </RecordTd>
                <RecordTd>
                  <InlineInput
                    type="number"
                    value={record.budget || ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const val = e.target.value;
                      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, budget: val } : r));
                    }}
                    onBlur={e => saveRecordField(record.id, 'budget', e.target.value ? Number(e.target.value) : '')}
                    placeholder="予算"
                  />
                </RecordTd>
                <RecordTd>
                  <InlineInput
                    type="date"
                    value={record.date || ''}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const val = e.target.value;
                      setRecords(prev => prev.map(r => r.id === record.id ? { ...r, date: val } : r));
                    }}
                    onBlur={e => saveRecordField(record.id, 'date', e.target.value)}
                  />
                </RecordTd>
                <RecordTd>
                  <AssigneeSelect
                    value={record.salesRep || ''}
                    onChange={e => handleRecordSelectChange(e, record.id, 'salesRep')}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="">-</option>
                    {(salesReps || []).map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </AssigneeSelect>
                </RecordTd>
                <RecordTd>
                  <AssigneeSelect
                    value={record.operatorRep || ''}
                    onChange={e => handleRecordSelectChange(e, record.id, 'operatorRep')}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="">-</option>
                    {(operators || []).map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </AssigneeSelect>
                </RecordTd>
                <RecordTd>
                  <IconButton $danger onClick={(e) => handleDelete(e, record.id)}>
                    <FiTrash2 size={14} />
                  </IconButton>
                </RecordTd>
              </ExpandableRow>
              {expandedId === record.id && (
                <ExpandedSection>
                  <SalesRecordEntries
                    projectId={project.id}
                    record={record}
                    onPhaseUpdate={handlePhaseUpdate}
                    onRecordFieldChange={saveRecordField}
                    operators={operators}
                    salesReps={salesReps}
                    subCol={subCol}
                    onPhase8Submitted={onPhase8Submitted}
                  />
                </ExpandedSection>
              )}
            </React.Fragment>
          ))}
          {isAdding && (
            <RecordTr>
              <RecordTd></RecordTd>
              <RecordTd>{mode === 'newCase' ? '新規' : '継続'}</RecordTd>
              <RecordTd>
                <select
                  value={editForm.phase}
                  onChange={e => setEditForm(prev => ({ ...prev, phase: e.target.value }))}
                  style={{ padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.8rem' }}
                >
                  {SALES_PHASES.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </RecordTd>
              <RecordTd>
                <RecordInput
                  type="number"
                  value={editForm.budget}
                  onChange={e => setEditForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="予算"
                />
              </RecordTd>
              <RecordTd>
                <RecordInput
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </RecordTd>
              <RecordTd>
                <AssigneeSelect
                  value={editForm.salesRep}
                  onChange={e => setEditForm(prev => ({ ...prev, salesRep: e.target.value }))}
                >
                  <option value="">-</option>
                  {(salesReps || []).map(rep => (
                    <option key={rep} value={rep}>{rep}</option>
                  ))}
                </AssigneeSelect>
              </RecordTd>
              <RecordTd>
                <AssigneeSelect
                  value={editForm.operatorRep}
                  onChange={e => setEditForm(prev => ({ ...prev, operatorRep: e.target.value }))}
                >
                  <option value="">-</option>
                  {(operators || []).map(rep => (
                    <option key={rep} value={rep}>{rep}</option>
                  ))}
                </AssigneeSelect>
              </RecordTd>
              <RecordTd>
                <SaveCancelButtons>
                  <SmallButton $primary onClick={handleSaveNew}>保存</SmallButton>
                  <SmallButton onClick={handleCancel}>取消</SmallButton>
                </SaveCancelButtons>
              </RecordTd>
            </RecordTr>
          )}
        </tbody>
      </RecordTable>
      {!isAdding && (
        <AddButton onClick={handleStartAdd}>
          <FiPlus size={14} />
          営業記録を追加
        </AddButton>
      )}
    </div>
  );
};

// ============================================
// タブ3: キーパーソン
// ============================================

const KeyPersonTab = ({ project }) => {
  const [persons, setPersons] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', title: '', contact: '', note: ''
  });

  /** キーパーソン一覧を取得 */
  const loadPersons = useCallback(async () => {
    if (!project.id) return;
    try {
      const data = await fetchKeyPersons(project.id);
      setPersons(data);
    } catch (error) {
      console.error('Failed to load key persons:', error);
    }
  }, [project.id]);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

  /** 追加フォームを表示 */
  const handleStartAdd = () => {
    setIsAdding(true);
    setEditForm({ name: '', title: '', contact: '', note: '' });
  };

  /** 新規キーパーソンを保存 */
  const handleSaveNew = async () => {
    if (!editForm.name.trim()) return;
    try {
      await addKeyPerson(project.id, { ...editForm });
      setIsAdding(false);
      setEditForm({ name: '', title: '', contact: '', note: '' });
      await loadPersons();
    } catch (error) {
      console.error('Failed to add key person:', error);
    }
  };

  /** 編集モードに切り替え */
  const handleStartEdit = (person) => {
    setEditingId(person.id);
    setEditForm({
      name: person.name || '',
      title: person.title || '',
      contact: person.contact || '',
      note: person.note || ''
    });
  };

  /** 編集を保存 */
  const handleSaveEdit = async () => {
    try {
      await updateKeyPerson(project.id, editingId, { ...editForm });
      setEditingId(null);
      await loadPersons();
    } catch (error) {
      console.error('Failed to update key person:', error);
    }
  };

  /** 削除 */
  const handleDelete = async (personId) => {
    try {
      await deleteKeyPerson(project.id, personId);
      await loadPersons();
    } catch (error) {
      console.error('Failed to delete key person:', error);
    }
  };

  /** キャンセル */
  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  /** 編集/追加フォーム共通 */
  const renderForm = (onSave) => (
    <PersonCard>
      <PersonFormGrid>
        <FormGroup $noMargin>
          <Label>氏名</Label>
          <Input
            value={editForm.name}
            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="氏名"
          />
        </FormGroup>
        <FormGroup $noMargin>
          <Label>役職</Label>
          <Input
            value={editForm.title}
            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="役職"
          />
        </FormGroup>
        <FormGroup $noMargin>
          <Label>連絡先</Label>
          <Input
            value={editForm.contact}
            onChange={e => setEditForm(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="メール / 電話番号"
          />
        </FormGroup>
        <FormGroup $noMargin>
          <Label>備考</Label>
          <Input
            value={editForm.note}
            onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
            placeholder="備考"
          />
        </FormGroup>
      </PersonFormGrid>
      <SaveCancelButtons>
        <SmallButton $primary onClick={onSave}>保存</SmallButton>
        <SmallButton onClick={handleCancel}>取消</SmallButton>
      </SaveCancelButtons>
    </PersonCard>
  );

  return (
    <div>
      <SectionTitle>キーパーソン</SectionTitle>
      {/* 追加ボタン */}
      {!isAdding && (
        <AddButton onClick={handleStartAdd} style={{ marginBottom: '1rem' }}>
          <FiPlus size={14} />
          追加
        </AddButton>
      )}
      {/* 追加フォーム */}
      {isAdding && renderForm(handleSaveNew)}
      {/* 一覧 */}
      {persons.length === 0 && !isAdding ? (
        <EmptyText>キーパーソンはまだ登録されていません</EmptyText>
      ) : (
        persons.map(person => (
          editingId === person.id ? (
            <React.Fragment key={person.id}>
              {renderForm(handleSaveEdit)}
            </React.Fragment>
          ) : (
            <PersonCard key={person.id}>
              <PersonName>{person.name}</PersonName>
              {person.title && <PersonTitle>{person.title}</PersonTitle>}
              {person.contact && <PersonContact>{person.contact}</PersonContact>}
              {person.note && <PersonNote>{person.note}</PersonNote>}
              <CardActions>
                <IconButton onClick={() => handleStartEdit(person)}>
                  <FiEdit2 size={14} />
                </IconButton>
                <IconButton $danger onClick={() => handleDelete(person.id)}>
                  <FiTrash2 size={14} />
                </IconButton>
              </CardActions>
            </PersonCard>
          )
        ))
      )}
    </div>
  );
};

// ============================================
// メインコンポーネント
// ============================================

const ProjectDetailPanel = ({ project, onClose, onProjectUpdate, mode, onPhase8Submitted }) => {
  const [activeTab, setActiveTab] = useState(mode === 'newCase' ? 'sales' : 'operator');
  const [operators, setOperators] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [latestPhase, setLatestPhase] = useState(project.status || '');

  // モードに応じたサブコレクション名
  const salesSubCol = mode === 'newCase' ? 'newCaseSalesRecords' : 'salesRecords';

  // 営業記録の最新フェーズを取得
  useEffect(() => {
    if (!project.id) return;
    const loadLatestPhase = async () => {
      try {
        const records = await fetchSalesRecords(project.id, salesSubCol);
        if (records.length > 0) {
          records.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
            const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
            return bTime - aTime;
          });
          if (records[0].phase) {
            setLatestPhase(records[0].phase);
          }
        }
      } catch (error) {
        console.error('Failed to load latest phase:', error);
      }
    };
    loadLatestPhase();
  }, [project.id, salesSubCol]);

  // SalesTabからフェーズ更新を受け取るコールバック
  const handlePhaseChange = useCallback((newPhase) => {
    setLatestPhase(newPhase);
  }, []);

  // Firestoreからスタッフ一覧を取得
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const all = await fetchAllStaff();
        setOperators(all.filter(s => s.role === 'operator').map(s => s.name));
        setSalesReps(all.filter(s => s.role === 'sales').map(s => s.name));
      } catch (error) {
        console.error('Failed to load staff:', error);
      }
    };
    loadStaff();
  }, []);

  // ヘッダーの担当者変更
  const handleHeaderSelectChange = async (field, value) => {
    try {
      await updateProject(project.id, { [field]: value });
      if (onProjectUpdate) {
        onProjectUpdate({ ...project, [field]: value });
      }
    } catch (error) {
      console.error('Failed to update project field:', error);
    }
  };

  // ESCキーでパネルを閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onClose}><FiX /></CloseButton>

        {/* ヘッダー: 案件基本情報 + 担当者 */}
        <PanelHeader>
          <HeaderGrid>
            <HeaderItem>
              <HeaderLabel>社名</HeaderLabel>
              <HeaderValue>{project.companyName || '-'}</HeaderValue>
            </HeaderItem>
            <HeaderItem>
              <HeaderLabel>代理店名</HeaderLabel>
              <HeaderValue>{project.introducer || '-'}</HeaderValue>
            </HeaderItem>
            <HeaderItem>
              <HeaderLabel>商材名</HeaderLabel>
              <HeaderValue>{project.productName || '-'}</HeaderValue>
            </HeaderItem>
            {mode === 'newCase' && latestPhase ? (
              <HeaderItem>
                <HeaderLabel>フェーズ</HeaderLabel>
                <HeaderValue>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'white',
                    background: STATUS_COLORS[latestPhase] || '#95a5a6'
                  }}>
                    {latestPhase}
                  </span>
                </HeaderValue>
              </HeaderItem>
            ) : project.continuationStatus ? (
              <HeaderItem>
                <HeaderLabel>継続ステータス</HeaderLabel>
                <HeaderValue>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'white',
                    background: CONTINUATION_STATUS_COLORS[project.continuationStatus] || '#95a5a6'
                  }}>
                    {project.continuationStatus}
                  </span>
                </HeaderValue>
              </HeaderItem>
            ) : null}
          </HeaderGrid>
        </PanelHeader>

        {/* タブバー（newCaseモードでは非表示） */}
        {mode !== 'newCase' && (
          <TabBar>
            <Tab
              $active={activeTab === 'operator'}
              onClick={() => setActiveTab('operator')}
            >
              運用者向け
            </Tab>
            <Tab
              $active={activeTab === 'sales'}
              onClick={() => setActiveTab('sales')}
            >
              営業向け
            </Tab>
            <Tab
              $active={activeTab === 'keyPerson'}
              onClick={() => setActiveTab('keyPerson')}
            >
              キーパーソン
            </Tab>
          </TabBar>
        )}

        {/* タブコンテンツ */}
        <TabContent>
          {activeTab === 'operator' && mode !== 'newCase' && (
            <OperatorTab
              project={project}
              onProjectUpdate={onProjectUpdate}
            />
          )}
          {activeTab === 'sales' && (
            <SalesTab project={project} operators={operators} salesReps={salesReps} subCol={salesSubCol} onPhaseChange={handlePhaseChange} onPhase8Submitted={onPhase8Submitted} mode={mode} />
          )}
          {activeTab === 'keyPerson' && mode !== 'newCase' && (
            <KeyPersonTab project={project} />
          )}
        </TabContent>
      </Panel>
    </Overlay>
  );
};

export default ProjectDetailPanel;
