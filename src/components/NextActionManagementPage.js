import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FiX, FiEdit2, FiSend, FiTrash2, FiExternalLink, FiCheck, FiLink } from 'react-icons/fi';
import { linkifyText } from '../utils/linkify.js';
import {
  fetchAllNextActions,
  updateSalesEntryStatus,
  updateSalesEntry,
  addNaComment,
  fetchNaComments,
  updateNaComment,
  deleteNaComment,
  fetchProjectById
} from '../services/projectService.js';
import { fetchAllStaff } from '../services/staffService.js';
import ProjectDetailPanel from './ProjectDetailPanel.js';

// ============================================
// 定数
// ============================================

const STATUS_ACTIVE = 'active';
const STATUS_MUST_TODAY = 'mustToday';
const STATUS_REVIEWING = 'reviewing';
const STATUS_DONE = 'done';

const COLUMNS = [
  { id: STATUS_ACTIVE, label: 'todo', color: '#3498db' },
  { id: STATUS_MUST_TODAY, label: '本日必達', color: '#e74c3c' },
  { id: STATUS_REVIEWING, label: 'レビュー待ち', color: '#f39c12' },
  { id: STATUS_DONE, label: 'done', color: '#95a5a6' }
];

// 共通ログインID（将来的に個人ユーザー対応時に差し替え）
const CURRENT_USER = 'system';

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

/** テキストエリアの自動リサイズハンドラー */
const autoResize = (e) => {
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};

/** Firestoreタイムスタンプを文字列に変換 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

// ============================================
// アニメーション
// ============================================

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

// ============================================
// Styled Components
// ============================================

const PageContainer = styled.div`
  max-width: 1600px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 1rem;
`;

// --- 担当者タブ ---

const TabBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`;

const Tab = styled.button`
  padding: 0.4rem 1rem;
  border: 1px solid ${p => p.$active ? '#3498db' : '#ddd'};
  border-radius: 20px;
  background: ${p => p.$active ? '#3498db' : 'white'};
  color: ${p => p.$active ? 'white' : '#555'};
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: #3498db; }
`;

// --- 看板ボード ---

const BoardContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 1rem;
`;

const Column = styled.div`
  flex: 1;
  min-width: 280px;
  max-width: 400px;
  background: #f7f8fa;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
`;

const ColumnHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 3px solid ${p => p.$color};
`;

const ColumnTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
`;

const ColumnCount = styled.span`
  font-size: 0.75rem;
  color: #7f8c8d;
  background: #e8e8e8;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
`;

const ColumnBody = styled.div`
  padding: 0.5rem;
  min-height: 120px;
  flex: 1;
  transition: background 0.15s;
  border-radius: 0 0 8px 8px;
  &.drag-over {
    background: #ebf5fb;
  }
`;

// --- カード ---

const Card = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid ${p =>
    p.$done ? '#95a5a6' :
    p.$overdue ? '#e74c3c' :
    p.$urgent ? '#f39c12' :
    p.$reviewing ? '#f39c12' :
    '#3498db'
  };
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.5rem;
  cursor: grab;
  opacity: ${p => p.$done ? 0.6 : 1};
  transition: box-shadow 0.15s, transform 0.15s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  &.dragging { opacity: 0.5; transform: rotate(2deg); }
`;

const CardContent = styled.div`
  font-size: 0.825rem;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: ${p => p.$done ? 'line-through' : 'none'};
  margin-bottom: 0.35rem;
`;

const CardMeta = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.7rem;
  color: #7f8c8d;
`;

const DueBadge = styled.span`
  display: inline-block;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
  background: ${p => p.$type === 'overdue' ? '#9b59b6' : p.$type === 'urgent' ? '#e74c3c' : '#3498db'};
`;

const ReviewBadge = styled.span`
  display: inline-block;
  padding: 0.05rem 0.4rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  color: white;
  background: #f39c12;
`;

const CardAssignee = styled.span`
  font-weight: 500;
  color: #8e44ad;
`;

const CardActions = styled.div`
  display: flex;
  gap: 0.25rem;
  margin-left: auto;
`;

const CardActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #bdc3c7;
  cursor: pointer;
  &:hover { background: #eee; color: #2c3e50; }
`;

// --- インライン編集 ---

const InlineInput = styled.input`
  width: 100%;
  padding: 0.3rem 0.4rem;
  border: 1px solid #3498db;
  border-radius: 4px;
  font-size: 0.825rem;
  margin-bottom: 0.3rem;
  outline: none;
`;

const InlineRow = styled.div`
  display: flex;
  gap: 0.3rem;
  align-items: center;
`;

const InlineBtn = styled.button`
  padding: 0.2rem 0.5rem;
  border: 1px solid ${p => p.$primary ? '#3498db' : '#ddd'};
  border-radius: 4px;
  background: ${p => p.$primary ? '#3498db' : 'white'};
  color: ${p => p.$primary ? 'white' : '#555'};
  font-size: 0.7rem;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

// --- 詳細パネル ---

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 1000;
`;

const DetailPanel = styled.div`
  position: fixed;
  top: 0; right: 0;
  width: 40%;
  min-width: 380px;
  height: 100vh;
  background: #fff;
  box-shadow: -4px 0 12px rgba(0,0,0,0.15);
  animation: ${slideIn} 0.3s ease;
  overflow-y: auto;
  z-index: 1001;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #eee;
`;

const PanelTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: #7f8c8d;
  &:hover { background: #f0f0f0; }
`;

const CopyUrlButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 0.75rem;
  color: #7f8c8d;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: #f0f4f8; border-color: #3498db; color: #3498db; }
`;

const PanelBody = styled.div`
  flex: 1;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DetailField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DetailLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: #95a5a6;
  text-transform: uppercase;
`;

const DetailValue = styled.div`
  font-size: 0.9rem;
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
`;

// クリックで編集可能なフィールド
const EditableValue = styled.div`
  font-size: 0.9rem;
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  &:hover {
    background: #f0f4f8;
    border-color: #ddd;
  }
`;

const DetailInput = styled.input`
  padding: 0.4rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
  &:focus { border-color: #3498db; }
`;

const DetailTextarea = styled.textarea`
  padding: 0.4rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  outline: none;
  resize: vertical;
  min-height: 60px;
  &:focus { border-color: #3498db; }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  background: ${p => p.$color};
  width: fit-content;
`;

const NavigateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid #3498db;
  border-radius: 6px;
  background: white;
  color: #3498db;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  width: fit-content;
  &:hover { background: #ebf5fb; }
`;

const SaveButton = styled.button`
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  width: fit-content;
  &:hover { background: #2980b9; }
  &:disabled { background: #bdc3c7; cursor: not-allowed; }
`;

// --- コメント欄 ---

const CommentsSection = styled.div`
  border-top: 1px solid #eee;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CommentItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.6rem;
  background: #f9f9f9;
  border-radius: 6px;
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #95a5a6;
`;

const CommentText = styled.div`
  font-size: 0.85rem;
  color: #2c3e50;
  white-space: pre-wrap;
`;

const CommentActions = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const CommentActionBtn = styled.button`
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  color: #bdc3c7;
  cursor: pointer;
  padding: 0.1rem;
  &:hover { color: #e74c3c; }
`;

const CommentForm = styled.div`
  display: flex;
  gap: 0.4rem;
  align-items: flex-end;
`;

const CommentInput = styled.textarea`
  flex: 1;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.85rem;
  resize: none;
  overflow: hidden;
  min-height: 40px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
  &:focus { border-color: #3498db; }
`;

const SendBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px; height: 36px;
  border: none;
  border-radius: 50%;
  background: #3498db;
  color: white;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: #2980b9; }
  &:disabled { background: #bdc3c7; cursor: not-allowed; }
`;

// --- レビュー上長選択モーダル ---

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalBox = styled.div`
  background: white;
  border-radius: 10px;
  padding: 1.5rem;
  width: 360px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
`;

const ModalTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 1rem;
`;

const StaffOption = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.75rem;
  border: 1px solid #eee;
  border-radius: 6px;
  background: white;
  font-size: 0.85rem;
  color: #2c3e50;
  cursor: pointer;
  margin-bottom: 0.4rem;
  &:hover { background: #ebf5fb; border-color: #3498db; }
`;

const ModalCancelBtn = styled.button`
  margin-top: 0.75rem;
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #7f8c8d;
  font-size: 0.8rem;
  cursor: pointer;
  &:hover { background: #f8f8f8; }
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
  color: #bdc3c7;
  font-size: 0.85rem;
`;

// ============================================
// コンポーネント
// ============================================

const NextActionManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State ---
  const [allNas, setAllNas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssignee, setSelectedAssignee] = useState(null); // null = 全員
  const [selectedNa, setSelectedNa] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // 詳細パネル編集（フィールド単位）
  const [editingField, setEditingField] = useState(null); // 'content' | 'dueDate' | null
  const [detailContent, setDetailContent] = useState('');
  const [detailDueDate, setDetailDueDate] = useState('');

  // コメント
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  // レビュー上長選択モーダル
  const [reviewModal, setReviewModal] = useState(null); // { na, targetColumnId }
  const [staffList, setStaffList] = useState([]);

  // URLコピー済みフラグ
  const [copiedUrl, setCopiedUrl] = useState(false);

  // 営業メモパネル（2層目）: { project, mode }
  const [salesPanel, setSalesPanel] = useState(null);
  // 営業メモパネル再マウント用カウンター
  const [salesPanelKey, setSalesPanelKey] = useState(0);

  // ドラッグ中のカードID
  const dragItem = useRef(null);

  // --- データ読み込み ---

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

  const loadStaff = useCallback(async () => {
    try {
      const staff = await fetchAllStaff();
      setStaffList(staff);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, []);

  useEffect(() => {
    loadNas();
    loadStaff();
  }, [loadNas, loadStaff]);

  // --- ユニークキー ---
  const naKey = (na) => `${na.projectId}-${na.recordId}-${na.id}`;

  // URLパラメータからNA詳細を自動オープン（初回ロード時のみ）
  const initialNaParam = useRef(searchParams.get('na'));
  useEffect(() => {
    if (!initialNaParam.current || allNas.length === 0) return;
    const target = allNas.find(na => naKey(na) === initialNaParam.current);
    if (target) openDetail(target);
    initialNaParam.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNas]);

  // --- 担当者リスト（レビュー依頼先も含む） ---

  const assignees = useMemo(() => {
    const set = new Set();
    allNas.forEach(na => {
      if (na.actionAssignee) set.add(na.actionAssignee);
      if (na.reviewAssignee) set.add(na.reviewAssignee);
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'ja'));
  }, [allNas]);

  // --- フィルタリング（レビュー依頼先でもマッチ） ---

  const filteredNas = useMemo(() => {
    if (!selectedAssignee) return allNas;
    return allNas.filter(na =>
      na.actionAssignee === selectedAssignee || na.reviewAssignee === selectedAssignee
    );
  }, [allNas, selectedAssignee]);

  // --- カラム振り分け ---

  const columnNas = useMemo(() => {
    const result = {};
    COLUMNS.forEach(col => { result[col.id] = []; });
    filteredNas.forEach(na => {
      const status = na.actionStatus || STATUS_ACTIVE;
      if (result[status]) {
        result[status].push(na);
      } else {
        // 不明ステータスはtodo列に
        result[STATUS_ACTIVE].push(na);
      }
    });
    return result;
  }, [filteredNas]);

  // --- ドラッグ&ドロップ ---

  const handleDragStart = (e, na) => {
    dragItem.current = na;
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    dragItem.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const na = dragItem.current;
    if (!na) return;

    const currentStatus = na.actionStatus || STATUS_ACTIVE;
    if (currentStatus === targetColumnId) return;

    // レビュー待ちカラムへの移動は上長選択モーダルを表示
    if (targetColumnId === STATUS_REVIEWING) {
      setReviewModal({ na, targetColumnId });
      return;
    }

    // レビュー待ちから別カラムへ移動時、reviewAssigneeをクリア
    const extraFields = (currentStatus === STATUS_REVIEWING && targetColumnId !== STATUS_REVIEWING)
      ? { reviewAssignee: '' }
      : {};
    await updateNaStatus(na, targetColumnId, extraFields);
  };

  const updateNaStatus = async (na, newStatus, extraFields = {}) => {
    try {
      await updateSalesEntryStatus(na.projectId, na.recordId, na.id, newStatus, na.subCol || 'salesRecords');
      // 追加フィールドがあればupdateSalesEntryで更新
      if (Object.keys(extraFields).length > 0) {
        await updateSalesEntry(na.projectId, na.recordId, na.id, extraFields, na.subCol || 'salesRecords');
      }
      setAllNas(prev => prev.map(item =>
        (item.id === na.id && item.projectId === na.projectId && item.recordId === na.recordId)
          ? { ...item, actionStatus: newStatus, ...extraFields }
          : item
      ));
      // 営業メモパネルが開いていたら再マウントしてステータスを同期
      if (salesPanel) setSalesPanelKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update NA status:', error);
    }
  };

  // --- レビュー上長選択 ---

  const handleSelectReviewer = async (staffName) => {
    if (!reviewModal) return;
    const { na } = reviewModal;
    await updateNaStatus(na, STATUS_REVIEWING, { reviewAssignee: staffName });
    setReviewModal(null);
  };

  // --- インライン編集 ---

  const startInlineEdit = (na, e) => {
    e.stopPropagation();
    setEditingCardId(naKey(na));
    setEditContent(na.actionContent || '');
    setEditDueDate(na.actionDueDate || '');
  };

  const saveInlineEdit = async (na, e) => {
    e.stopPropagation();
    try {
      const updates = { actionContent: editContent, actionDueDate: editDueDate };
      await updateSalesEntry(na.projectId, na.recordId, na.id, updates, na.subCol || 'salesRecords');
      setAllNas(prev => prev.map(item =>
        (item.id === na.id && item.projectId === na.projectId && item.recordId === na.recordId)
          ? { ...item, ...updates }
          : item
      ));
      setEditingCardId(null);
      if (salesPanel) setSalesPanelKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update NA:', error);
    }
  };

  const cancelInlineEdit = (e) => {
    e.stopPropagation();
    setEditingCardId(null);
  };

  // --- 詳細パネル ---

  // NAの共有URLをクリップボードにコピー
  const copyNaUrl = (na) => {
    const url = `${window.location.origin}/next-action-management?na=${naKey(na)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  const openDetail = (na) => {
    if (editingCardId) return; // インライン編集中はスキップ
    setSelectedNa(na);
    setEditingField(null);
    setDetailContent(na.actionContent || '');
    setDetailDueDate(na.actionDueDate || '');
    loadComments(na);
    // URLにNAパラメータを反映
    setSearchParams({ na: naKey(na) }, { replace: true });
  };

  const closeDetail = () => {
    setSelectedNa(null);
    setComments([]);
    setCommentText('');
    setEditingCommentId(null);
    // URLからNAパラメータを除去
    setSearchParams({}, { replace: true });
  };

  // フィールド単位の保存（blurまたはEnterで発火）
  const saveDetailField = async (field) => {
    if (!selectedNa) return;
    const updates = field === 'content'
      ? { actionContent: detailContent }
      : { actionDueDate: detailDueDate };
    // 変更がなければ保存スキップ
    const currentVal = field === 'content' ? selectedNa.actionContent || '' : selectedNa.actionDueDate || '';
    const newVal = field === 'content' ? detailContent : detailDueDate;
    if (currentVal === newVal) {
      setEditingField(null);
      return;
    }
    try {
      await updateSalesEntry(selectedNa.projectId, selectedNa.recordId, selectedNa.id, updates, selectedNa.subCol || 'salesRecords');
      const updatedNa = { ...selectedNa, ...updates };
      setAllNas(prev => prev.map(item =>
        (item.id === selectedNa.id && item.projectId === selectedNa.projectId && item.recordId === selectedNa.recordId)
          ? updatedNa
          : item
      ));
      setSelectedNa(updatedNa);
      setEditingField(null);
      if (salesPanel) setSalesPanelKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save detail edit:', error);
    }
  };

  // 営業メモパネルを2層目として開く（subColでモード判定）
  const openSalesPanel = async () => {
    if (!selectedNa) return;
    try {
      const project = await fetchProjectById(selectedNa.projectId);
      if (project) {
        const mode = selectedNa.subCol === 'newCaseSalesRecords' ? 'newCase' : undefined;
        setSalesPanel({ project, mode });
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  // --- コメント ---

  const loadComments = async (na) => {
    try {
      const data = await fetchNaComments(na.projectId, na.recordId, na.id, na.subCol || 'salesRecords');
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedNa) return;
    try {
      await addNaComment(selectedNa.projectId, selectedNa.recordId, selectedNa.id, {
        content: commentText.trim(),
        author: CURRENT_USER
      }, selectedNa.subCol || 'salesRecords');
      setCommentText('');
      await loadComments(selectedNa);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim() || !selectedNa) return;
    try {
      await updateNaComment(selectedNa.projectId, selectedNa.recordId, selectedNa.id, commentId, {
        content: editCommentText.trim()
      }, selectedNa.subCol || 'salesRecords');
      setEditingCommentId(null);
      await loadComments(selectedNa);
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedNa) return;
    try {
      await deleteNaComment(selectedNa.projectId, selectedNa.recordId, selectedNa.id, commentId, selectedNa.subCol || 'salesRecords');
      await loadComments(selectedNa);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // --- ステータスラベルと色の取得 ---

  const getStatusInfo = (status) => {
    const col = COLUMNS.find(c => c.id === status);
    return col || COLUMNS[0];
  };

  // --- レンダリング ---

  return (
    <PageContainer>
      <Title>ネクストアクション管理</Title>

      {/* 担当者タブ */}
      <TabBar>
        <Tab $active={!selectedAssignee} onClick={() => setSelectedAssignee(null)}>
          全員 ({allNas.length})
        </Tab>
        {assignees.map(name => {
          const count = allNas.filter(na => na.actionAssignee === name || na.reviewAssignee === name).length;
          return (
            <Tab key={name} $active={selectedAssignee === name} onClick={() => setSelectedAssignee(name)}>
              {name} ({count})
            </Tab>
          );
        })}
      </TabBar>

      {/* 看板ボード */}
      {isLoading ? (
        <LoadingText>読み込み中...</LoadingText>
      ) : (
        <BoardContainer>
          {COLUMNS.map(col => {
            const cards = columnNas[col.id] || [];
            return (
              <Column key={col.id}>
                <ColumnHeader $color={col.color}>
                  <ColumnTitle>{col.label}</ColumnTitle>
                  <ColumnCount>{cards.length}</ColumnCount>
                </ColumnHeader>
                <ColumnBody
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {cards.length === 0 ? (
                    <EmptyText>カードなし</EmptyText>
                  ) : (
                    cards.map(na => {
                      const key = naKey(na);
                      const dueStatus = getDueStatus(na.actionDueDate);
                      const isDone = na.actionStatus === STATUS_DONE;
                      const isEditing = editingCardId === key;
                      const isReviewing = na.actionStatus === STATUS_REVIEWING;

                      if (isEditing) {
                        return (
                          <Card key={key} $done={isDone} onClick={(e) => e.stopPropagation()}>
                            <InlineInput
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              placeholder="NA内容"
                              autoFocus
                            />
                            <InlineRow>
                              <InlineInput
                                type="date"
                                value={editDueDate}
                                onChange={e => setEditDueDate(e.target.value)}
                                style={{ flex: 1 }}
                              />
                              <InlineBtn $primary onClick={(e) => saveInlineEdit(na, e)}>保存</InlineBtn>
                              <InlineBtn onClick={cancelInlineEdit}>×</InlineBtn>
                            </InlineRow>
                          </Card>
                        );
                      }

                      return (
                        <Card
                          key={key}
                          $done={isDone}
                          $overdue={!isDone && dueStatus === 'overdue'}
                          $urgent={!isDone && dueStatus === 'urgent'}
                          $reviewing={isReviewing}
                          draggable
                          onDragStart={(e) => handleDragStart(e, na)}
                          onDragEnd={handleDragEnd}
                          onClick={() => openDetail(na)}
                        >
                          <CardContent $done={isDone}>
                            {linkifyText(na.actionContent)}
                          </CardContent>
                          <CardMeta>
                            {na.actionDueDate && (
                              <DueBadge $type={dueStatus}>
                                {na.actionDueDate}
                                {dueStatus === 'overdue' && ' 超過'}
                                {dueStatus === 'urgent' && ' 急'}
                              </DueBadge>
                            )}
                            <span>{na.companyName}{na.productName ? ` / ${na.productName}` : ''}</span>
                            {isReviewing && na.reviewAssignee && (
                              <ReviewBadge>レビュー: {na.reviewAssignee}</ReviewBadge>
                            )}
                            {/* 全員表示時のみ担当者表示 */}
                            {!selectedAssignee && na.actionAssignee && (
                              <CardAssignee>{na.actionAssignee}</CardAssignee>
                            )}
                          </CardMeta>
                        </Card>
                      );
                    })
                  )}
                </ColumnBody>
              </Column>
            );
          })}
        </BoardContainer>
      )}

      {/* レビュー上長選択モーダル */}
      {reviewModal && (
        <ModalOverlay onClick={() => setReviewModal(null)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>レビュー依頼先を選択</ModalTitle>
            {staffList.filter(s => s.role === 'sales').map(staff => (
              <StaffOption key={staff.id} onClick={() => handleSelectReviewer(staff.name)}>
                {staff.name}
              </StaffOption>
            ))}
            {staffList.filter(s => s.role === 'sales').length === 0 && (
              <EmptyText>営業スタッフが登録されていません</EmptyText>
            )}
            <ModalCancelBtn onClick={() => setReviewModal(null)}>キャンセル</ModalCancelBtn>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* NA詳細パネル（1層目） */}
      {selectedNa && (
        <>
          <Overlay onClick={closeDetail} />
          <DetailPanel style={{ zIndex: 1001 }}>
            <PanelHeader>
              <PanelTitle>ネクストアクション詳細</PanelTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CopyUrlButton onClick={() => copyNaUrl(selectedNa)} title="URLをコピー">
                  {copiedUrl ? <FiCheck size={14} /> : <FiLink size={14} />}
                  {copiedUrl ? 'コピー済み' : 'URLをコピー'}
                </CopyUrlButton>
                <CloseButton onClick={closeDetail}><FiX size={18} /></CloseButton>
              </div>
            </PanelHeader>
            <PanelBody>
              {/* NA内容（クリックで編集） */}
              <DetailField>
                <DetailLabel>NA内容</DetailLabel>
                {editingField === 'content' ? (
                  <DetailTextarea
                    value={detailContent}
                    onChange={e => setDetailContent(e.target.value)}
                    onBlur={() => saveDetailField('content')}
                    onKeyDown={e => { if (e.key === 'Escape') { setDetailContent(selectedNa.actionContent || ''); setEditingField(null); } }}
                    autoFocus
                  />
                ) : (
                  <EditableValue onClick={() => { setDetailContent(selectedNa.actionContent || ''); setEditingField('content'); }}>
                    {selectedNa.actionContent ? linkifyText(selectedNa.actionContent) : '（未入力）'}
                  </EditableValue>
                )}
              </DetailField>

              {/* 期日（クリックで編集） */}
              <DetailField>
                <DetailLabel>期日</DetailLabel>
                {editingField === 'dueDate' ? (
                  <DetailInput
                    type="date"
                    value={detailDueDate}
                    onChange={e => { setDetailDueDate(e.target.value); }}
                    onBlur={() => saveDetailField('dueDate')}
                    onKeyDown={e => { if (e.key === 'Escape') { setDetailDueDate(selectedNa.actionDueDate || ''); setEditingField(null); } }}
                    autoFocus
                  />
                ) : (
                  <EditableValue onClick={() => { setDetailDueDate(selectedNa.actionDueDate || ''); setEditingField('dueDate'); }}>
                    {selectedNa.actionDueDate || '未設定'}
                  </EditableValue>
                )}
              </DetailField>

              {/* ステータス */}
              <DetailField>
                <DetailLabel>ステータス</DetailLabel>
                <StatusBadge $color={getStatusInfo(selectedNa.actionStatus || STATUS_ACTIVE).color}>
                  {getStatusInfo(selectedNa.actionStatus || STATUS_ACTIVE).label}
                </StatusBadge>
              </DetailField>

              {/* レビュー依頼先 */}
              {selectedNa.actionStatus === STATUS_REVIEWING && selectedNa.reviewAssignee && (
                <DetailField>
                  <DetailLabel>レビュー依頼先</DetailLabel>
                  <DetailValue>{selectedNa.reviewAssignee}</DetailValue>
                </DetailField>
              )}

              {/* 案件情報 */}
              <DetailField>
                <DetailLabel>案件情報</DetailLabel>
                <DetailValue>
                  {selectedNa.companyName}{selectedNa.productName ? ` / ${selectedNa.productName}` : ''}
                </DetailValue>
              </DetailField>

              {/* 担当者 */}
              {selectedNa.actionAssignee && (
                <DetailField>
                  <DetailLabel>担当者</DetailLabel>
                  <DetailValue>{selectedNa.actionAssignee}</DetailValue>
                </DetailField>
              )}

              {/* 営業メモを開く */}
              <NavigateButton onClick={openSalesPanel}>
                <FiExternalLink size={14} />
                営業メモを開く
              </NavigateButton>

              {/* コメント欄 */}
              <CommentsSection>
                <DetailLabel>メモ / コメント</DetailLabel>

                {comments.map(comment => (
                  <CommentItem key={comment.id}>
                    <CommentHeader>
                      <span>{comment.author || 'system'} — {formatTimestamp(comment.createdAt)}</span>
                      {comment.author === CURRENT_USER && (
                        <CommentActions>
                          <CommentActionBtn onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditCommentText(comment.content);
                          }}>
                            <FiEdit2 size={11} />
                          </CommentActionBtn>
                          <CommentActionBtn onClick={() => handleDeleteComment(comment.id)}>
                            <FiTrash2 size={11} />
                          </CommentActionBtn>
                        </CommentActions>
                      )}
                    </CommentHeader>
                    {editingCommentId === comment.id ? (
                      <InlineRow>
                        <CommentInput
                          value={editCommentText}
                          onChange={e => setEditCommentText(e.target.value)}
                          onInput={autoResize}
                          rows={2}
                        />
                        <CardActionBtn onClick={() => handleUpdateComment(comment.id)}>
                          <FiCheck size={14} />
                        </CardActionBtn>
                        <CardActionBtn onClick={() => setEditingCommentId(null)}>
                          <FiX size={14} />
                        </CardActionBtn>
                      </InlineRow>
                    ) : (
                      <CommentText>{comment.content}</CommentText>
                    )}
                  </CommentItem>
                ))}

                {comments.length === 0 && (
                  <EmptyText>コメントはまだありません</EmptyText>
                )}

                <CommentForm>
                  <CommentInput
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onInput={autoResize}
                    onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && commentText.trim()) { e.preventDefault(); handleAddComment(); } }}
                    placeholder="コメントを入力..."
                    rows={2}
                  />
                  <SendBtn onClick={handleAddComment} disabled={!commentText.trim()}>
                    <FiSend size={14} />
                  </SendBtn>
                </CommentForm>
              </CommentsSection>
            </PanelBody>
          </DetailPanel>
        </>
      )}

      {/* 営業メモパネル（2層目：NA詳細の上に重ねる） */}
      {salesPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }}>
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.2)', zIndex: 2000
            }}
            onClick={() => setSalesPanel(null)}
          />
          {/* ProjectDetailPanelのOverlay/Panelを上書きするためラッパーでz-index制御 */}
          <div style={{ position: 'relative', zIndex: 2001 }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              .na-sales-panel-layer > div:first-child { background: transparent !important; pointer-events: none; }
              .na-sales-panel-layer > div:last-child { right: 3rem !important; z-index: 2002 !important; pointer-events: auto; }
            `}</style>
            <div className="na-sales-panel-layer">
              <ProjectDetailPanel
                key={salesPanelKey}
                project={salesPanel.project}
                onClose={() => {
                  setSalesPanel(null);
                  // パネル閉じた時にNAリストを再読込（ステータス同期）
                  loadNas();
                }}
                onProjectUpdate={(updated) => setSalesPanel(prev => ({ ...prev, project: updated }))}
                mode={salesPanel.mode}
              />
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default NextActionManagementPage;
