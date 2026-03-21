import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiClock, FiUser, FiFileText, FiTrash2, FiEdit, FiX, FiCalendar } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { STATUS_COLORS } from '../data/constants.js';

const LogListContainer = styled.div`
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

const LogCard = styled.div`
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid #3498db;
`;

const LogHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const LogInfo = styled.div`
  flex: 1;
`;

const LogTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
`;

const LogMeta = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const LogDescription = styled.p`
  color: #444;
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

const LogActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  
  &.edit {
    background: #f39c12;
    color: white;
    
    &:hover {
      background: #e67e22;
    }
  }
  
  &.delete {
    background: #e74c3c;
    color: white;
    
    &:hover {
      background: #c0392b;
    }
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background-color: ${props => STATUS_COLORS[props.status] || '#95a5a6'};
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0.5rem;
  border-radius: 4px;
  
  &:hover {
    background: #f8f9fa;
    color: #2c3e50;
  }
`;

const DetailSection = styled.div`
  margin-bottom: 1.5rem;
`;

const DetailLabel = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DetailContent = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  color: #444;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const MetaGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ModalMetaItem = styled.div`
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  
  strong {
    color: #2c3e50;
    display: block;
    margin-bottom: 0.25rem;
  }
`;

const EditFormGroup = styled.div`
  margin-bottom: 1rem;
`;

const EditLabel = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 0.3rem;
`;

const EditInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #3498db; }
`;

const EditTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  box-sizing: border-box;
  resize: vertical;
  &:focus { outline: none; border-color: #3498db; }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

function ActionLogList() {
  const [actionLogs, setActionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [editLog, setEditLog] = useState(null);
  
  // パートナー向けかどうかを判定
  const isPartnerView = window.location.pathname.startsWith('/partner') || 
                       window.location.pathname.startsWith('/partner-entry');
  
  // パートナー会社を判定
  const getPartnerCompany = () => {
    const path = window.location.pathname;
    if (path.startsWith('/partner-entry/piala')) {
      return '株式会社ピアラ';
    }
    return null;
  };
  
  const partnerCompany = getPartnerCompany();

  // Firestoreからアクションログを取得
  const fetchActionLogs = async () => {
    try {
      setLoading(true);
      console.log('📄 Firestoreからアクションログ一覧取得開始');
      
      const actionLogsRef = collection(db, 'actionLogs');
      const q = query(actionLogsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const logs = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          ...data,
          // Timestamp型をISO文字列に変換
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          actionDate: data.actionDate || data.createdAt?.toDate?.()?.toLocaleDateString('ja-JP'),
          nextActionDate: data.nextActionDate || null
        });
      });
      
      console.log('✅ アクションログ取得成功:', logs.length, '件');
      setActionLogs(logs);
      setError(null);
    } catch (err) {
      console.error('💥 アクションログ取得エラー:', err);
      setError('アクションログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Firestoreからアクションログを削除
  const deleteActionLog = async (id) => {
    if (!window.confirm('このアクションログを削除しますか？')) {
      return;
    }

    try {
      console.log('🗑 アクションログ削除開始:', id);
      
      // Firestoreからログを削除
      await deleteDoc(doc(db, 'actionLogs', id));
      
      console.log('✅ アクションログ削除成功');

      // 成功したらリストから削除
      setActionLogs(prev => prev.filter(log => log.id !== id));
      alert('アクションログが削除されました');
    } catch (err) {
      console.error('💥 削除エラー:', err);
      alert('削除に失敗しました');
    }
  };

  // 編集保存
  const handleEditSave = async () => {
    if (!editLog) return;
    try {
      await updateDoc(doc(db, 'actionLogs', editLog.id), {
        action: editLog.action,
        summary: editLog.summary || '',
        nextAction: editLog.nextAction || '',
        nextActionDate: editLog.nextActionDate || null
      });
      setActionLogs(prev => prev.map(log =>
        log.id === editLog.id ? { ...log, ...editLog } : log
      ));
      setEditLog(null);
    } catch (err) {
      console.error('Failed to update action log:', err);
      alert('更新に失敗しました');
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchActionLogs();
  }, []);

  // 日付フォーマット
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ログ詳細表示
  const showLogDetail = (log) => {
    setSelectedLog(log);
  };

  // モーダル閉じる
  const closeModal = () => {
    setSelectedLog(null);
  };

  if (loading) {
    return (
      <LogListContainer>
        <LoadingMessage>アクションログを読み込み中...</LoadingMessage>
      </LogListContainer>
    );
  }

  if (error) {
    return (
      <LogListContainer>
        <Header>
          <Title>アクションログ一覧</Title>
        </Header>
        <EmptyMessage>
          <p>{error}</p>
          <button onClick={fetchActionLogs}>再試行</button>
        </EmptyMessage>
      </LogListContainer>
    );
  }

  // パートナー会社の場合のフィルタリング
  const filteredActionLogs = isPartnerView && partnerCompany 
    ? actionLogs.filter(log => log.introducer === partnerCompany)
    : actionLogs.filter(log => {
        // 管理者画面では「他社案件」を非表示
        return log.proposalMenu !== '他社案件';
      });

  return (
    <LogListContainer>
      <Header>
        <Title>アクションログ一覧 ({filteredActionLogs.length}件)</Title>
      </Header>
      
      {filteredActionLogs.length === 0 ? (
        <EmptyMessage>
          <FiFileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>まだアクションログがありません</p>
          <p>新しいアクションを記録してみましょう！</p>
        </EmptyMessage>
      ) : (
        filteredActionLogs.map(log => (
          <LogCard key={log.id}>
            <LogHeader>
              <LogInfo>
                <LogTitle>{log.action}</LogTitle>
                <LogMeta>
                  <MetaItem>
                    <FiClock />
                    {formatDate(log.createdAt)}
                  </MetaItem>
                  <MetaItem>
                    <FiUser />
                    案件ID: {log.dealId}
                  </MetaItem>
                  <StatusBadge status={log.status}>
                    {log.status}
                  </StatusBadge>
                </LogMeta>
              </LogInfo>
            </LogHeader>
            
            {log.summary && (
              <LogDescription>
                <strong>要約:</strong> {log.summary}
              </LogDescription>
            )}
            
            {log.nextAction && (
              <LogMeta>
                <MetaItem>
                  <strong>次回アクション:</strong> {log.nextAction}
                  {log.nextActionDate && ` (${new Date(log.nextActionDate).toLocaleDateString('ja-JP')})`}
                </MetaItem>
              </LogMeta>
            )}
            
            <LogActions>
              <ActionButton
                className="edit"
                onClick={() => setEditLog({ ...log })}
              >
                <FiEdit />
                編集
              </ActionButton>
              <ActionButton
                className="edit"
                onClick={() => showLogDetail(log)}
              >
                <FiFileText />
                詳細
              </ActionButton>
              <ActionButton
                className="delete"
                onClick={() => deleteActionLog(log.id)}
              >
                <FiTrash2 />
                削除
              </ActionButton>
            </LogActions>
          </LogCard>
        ))
      )}

      {/* ログ詳細モーダル */}
      {selectedLog && (
        <Modal onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>アクションログ詳細</ModalTitle>
              <CloseButton onClick={closeModal}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <MetaGrid>
              <ModalMetaItem>
                <strong>案件ID</strong>
                {selectedLog.dealId}
              </ModalMetaItem>
              <ModalMetaItem>
                <strong>商材名</strong>
                {selectedLog.productName || '未設定'}
              </ModalMetaItem>
              <ModalMetaItem>
                <strong>提案メニュー</strong>
                {selectedLog.proposalMenu || '未設定'}
              </ModalMetaItem>
              <ModalMetaItem>
                <strong>担当者</strong>
                {/* Ver 2.2: 担当者の併記表示（社内／パートナー） */}
                {selectedLog.representative && selectedLog.partnerRepresentative ? (
                  // 両方存在する場合は併記
                  `${selectedLog.representative}（社内）／${selectedLog.partnerRepresentative}（${selectedLog.introducer?.replace('株式会社', '') || 'パートナー'}）`
                ) : selectedLog.representative ? (
                  // 社内担当者のみ
                  `${selectedLog.representative}（社内）`
                ) : selectedLog.partnerRepresentative ? (
                  // パートナー担当者のみ
                  `${selectedLog.partnerRepresentative}（${selectedLog.introducer?.replace('株式会社', '') || 'パートナー'}）`
                ) : (
                  // どちらもない場合
                  '未設定'
                )}
              </ModalMetaItem>
              <ModalMetaItem>
                <strong>紹介者</strong>
                {selectedLog.introducer || '未設定'}
              </ModalMetaItem>
              <ModalMetaItem>
                <strong>作成日時</strong>
                {formatDate(selectedLog.createdAt)}
              </ModalMetaItem>
            </MetaGrid>

            {selectedLog.summary && (
              <DetailSection>
                <DetailLabel>
                  <FiFileText />
                  要約
                </DetailLabel>
                <DetailContent>
                  {selectedLog.summary}
                </DetailContent>
              </DetailSection>
            )}

            {selectedLog.nextAction && (
              <DetailSection>
                <DetailLabel>
                  <FiCalendar />
                  次回アクション
                </DetailLabel>
                <DetailContent>
                  {selectedLog.nextAction}
                  {selectedLog.nextActionDate && (
                    <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                      実施予定日: {new Date(selectedLog.nextActionDate).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </DetailContent>
              </DetailSection>
            )}

            <DetailSection>
              <DetailLabel>
                <FiUser />
                ステータス
              </DetailLabel>
              <DetailContent>
                <StatusBadge status={selectedLog.status}>
                  {selectedLog.status}
                </StatusBadge>
              </DetailContent>
            </DetailSection>

            <ModalActions>
              <ActionButton 
                className="delete"
                onClick={() => {
                  deleteActionLog(selectedLog.id);
                  closeModal();
                }}
              >
                <FiTrash2 />
                削除
              </ActionButton>
              <ActionButton 
                className="edit"
                onClick={closeModal}
              >
                閉じる
              </ActionButton>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
      {/* 編集モーダル */}
      {editLog && (
        <Modal onClick={() => setEditLog(null)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>アクションログ編集</ModalTitle>
              <CloseButton onClick={() => setEditLog(null)}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <EditFormGroup>
              <EditLabel>アクション</EditLabel>
              <EditInput
                type="text"
                value={editLog.action || ''}
                onChange={e => setEditLog(prev => ({ ...prev, action: e.target.value }))}
              />
            </EditFormGroup>

            <EditFormGroup>
              <EditLabel>要約</EditLabel>
              <EditTextarea
                value={editLog.summary || ''}
                onChange={e => setEditLog(prev => ({ ...prev, summary: e.target.value }))}
                rows={4}
              />
            </EditFormGroup>

            <EditFormGroup>
              <EditLabel>次回アクション</EditLabel>
              <EditInput
                type="text"
                value={editLog.nextAction || ''}
                onChange={e => setEditLog(prev => ({ ...prev, nextAction: e.target.value }))}
              />
            </EditFormGroup>

            <EditFormGroup>
              <EditLabel>次回アクション予定日</EditLabel>
              <EditInput
                type="date"
                value={editLog.nextActionDate || ''}
                onChange={e => setEditLog(prev => ({ ...prev, nextActionDate: e.target.value }))}
              />
            </EditFormGroup>

            <ModalActions>
              <ActionButton className="delete" onClick={() => setEditLog(null)}>
                キャンセル
              </ActionButton>
              <ActionButton className="edit" onClick={handleEditSave}>
                保存
              </ActionButton>
            </ModalActions>
          </ModalContent>
        </Modal>
      )}
    </LogListContainer>
  );
}

export default ActionLogList; 