import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiEye, FiSearch, FiCalendar, FiUser, FiFileText } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { STATUS_COLORS } from '../data/constants.js';

const PageContainer = styled.div`
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

const FilterSection = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 1rem;
  align-items: end;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Table = styled.table`
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const TableHeader = styled.thead`
  background: #f8f9fa;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #eee;
  
  &:hover {
    background: #f8f9fa;
  }
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
`;

const TableCell = styled.td`
  padding: 1rem;
  vertical-align: middle;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  background-color: ${props => STATUS_COLORS[props.status] || '#95a5a6'};
`;

const ActionButton = styled.button`
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: #3498db;
  color: white;
  transition: all 0.3s ease;
  
  &:hover {
    background: #2980b9;
  }
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
  color: #95a5a6;
  padding: 0;
  
  &:hover {
    color: #7f8c8d;
  }
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const DetailItem = styled.div`
  &.full-width {
    grid-column: 1 / -1;
  }
`;

const DetailLabel = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`;

const DetailValue = styled.div`
  color: #555;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  
  &.description {
    white-space: pre-wrap;
    min-height: 100px;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
`;

const CompanyBadge = styled.div`
  background: #8e44ad;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
  display: inline-block;
`;

function PartnerActionLogList() {
  const [actionLogs, setActionLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // パートナー会社を判定
  const getPartnerCompany = () => {
    const path = window.location.pathname;
    if (path.startsWith('/partner-entry/piala')) {
      return '株式会社ピアラ';
    }
    return null;
  };

  const partnerCompany = getPartnerCompany();

  // アクションログデータを取得（パートナー会社の案件のみ）
  const fetchActionLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 パートナーアクションログ: データ取得開始');

      const actionLogsRef = collection(db, 'actionLogs');
      // 全件取得してクライアントサイドでフィルタリング
      const q = query(actionLogsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const actionLogsData = [];
      let totalLogs = 0;
      let matchedLogs = 0;
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        totalLogs++;
        
        console.log(`📋 ログ ${totalLogs}:`, {
          id: docSnap.id,
          introducer: data.introducer,
          introducerId: data.introducerId,
          productName: data.productName
        });
        
        // 厳格にパートナー会社の案件のみを抽出（他社データ混入防止）
        const isPartnerLog = data.introducer === partnerCompany;
        
        if (isPartnerLog) {
          matchedLogs++;
          console.log(`✅ マッチしたログ ${matchedLogs}:`, docSnap.id);
          
          actionLogsData.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '',
            updatedAt: data.updatedAt?.toDate?.()?.toLocaleDateString('ja-JP') || ''
          });
        }
      });
      
      console.log(`📊 フィルタリング結果: ${matchedLogs}/${totalLogs} 件がマッチ`);

      console.log('✅ パートナーアクションログ: データ取得成功:', actionLogsData.length, '件');
      setActionLogs(actionLogsData);
      setFilteredLogs(actionLogsData);
    } catch (error) {
      console.error('💥 パートナーアクションログ: データ取得エラー:', error);
      setActionLogs([]);
      setFilteredLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [partnerCompany]);

  useEffect(() => {
    fetchActionLogs();
  }, [fetchActionLogs]);

  // フィルタリング処理
  useEffect(() => {
    let filtered = actionLogs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.proposalMenu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  }, [actionLogs, searchTerm, statusFilter]);

  const handleViewDetail = (log) => {
    setSelectedLog(log);
  };

  const handleCloseModal = () => {
    setSelectedLog(null);
  };

  // ステータス一覧を取得
  const getUniqueStatuses = () => {
    const statuses = [...new Set(actionLogs.map(log => log.status).filter(Boolean))];
    return statuses.sort();
  };

  return (
    <PageContainer>
      <Header>
        <div>
          <CompanyBadge>{partnerCompany}</CompanyBadge>
          <Title>アクションログ一覧</Title>
        </div>
      </Header>

      <FilterSection>
        <FilterGrid>
          <div>
            <label>🔍 検索</label>
            <SearchInput
              type="text"
              placeholder="商材名・提案メニュー・アクション内容で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label>📊 ステータス</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">全てのステータス</option>
              {getUniqueStatuses().map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </div>
        </FilterGrid>
      </FilterSection>

      {isLoading ? (
        <LoadingMessage>データを読み込み中...</LoadingMessage>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>商材名</TableHeaderCell>
              <TableHeaderCell>提案メニュー</TableHeaderCell>
              <TableHeaderCell>アクション</TableHeaderCell>
              <TableHeaderCell>担当者</TableHeaderCell>
              <TableHeaderCell>ステータス</TableHeaderCell>
              <TableHeaderCell>作成日</TableHeaderCell>
              <TableHeaderCell>詳細</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan="7">
                  <EmptyMessage>
                    {actionLogs.length === 0 
                      ? 'アクションログが登録されていません' 
                      : '検索条件に合致するログが見つかりませんでした'
                    }
                  </EmptyMessage>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>
                    <strong>{log.productName}</strong>
                  </TableCell>
                  <TableCell>{log.proposalMenu}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.partnerRepresentative || log.representative || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.status}>
                      {log.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{log.createdAt}</TableCell>
                  <TableCell>
                    <ActionButton onClick={() => handleViewDetail(log)}>
                      <FiEye />
                      詳細
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>
      )}

      {selectedLog && (
        <Modal onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>アクションログ詳細</ModalTitle>
              <CloseButton onClick={handleCloseModal}>
                ×
              </CloseButton>
            </ModalHeader>

            <DetailGrid>
              <DetailItem>
                <DetailLabel>
                  <FiFileText /> 商材名
                </DetailLabel>
                <DetailValue>{selectedLog.productName}</DetailValue>
              </DetailItem>

              <DetailItem>
                <DetailLabel>
                  <FiFileText /> 提案メニュー
                </DetailLabel>
                <DetailValue>{selectedLog.proposalMenu}</DetailValue>
              </DetailItem>

              <DetailItem>
                <DetailLabel>
                  <FiUser /> 担当者
                </DetailLabel>
                <DetailValue>{selectedLog.partnerRepresentative || selectedLog.representative || '-'}</DetailValue>
              </DetailItem>

              <DetailItem>
                <DetailLabel>
                  📊 ステータス
                </DetailLabel>
                <DetailValue>
                  <StatusBadge status={selectedLog.status}>
                    {selectedLog.status}
                  </StatusBadge>
                </DetailValue>
              </DetailItem>

              <DetailItem>
                <DetailLabel>
                  <FiFileText /> アクション
                </DetailLabel>
                <DetailValue>{selectedLog.action}</DetailValue>
              </DetailItem>

              <DetailItem>
                <DetailLabel>
                  <FiCalendar /> 作成日
                </DetailLabel>
                <DetailValue>{selectedLog.createdAt}</DetailValue>
              </DetailItem>

              {selectedLog.summary && (
                <DetailItem className="full-width">
                  <DetailLabel>
                    <FiFileText /> 要約
                  </DetailLabel>
                  <DetailValue className="description">
                    {selectedLog.summary}
                  </DetailValue>
                </DetailItem>
              )}

              {selectedLog.nextAction && (
                <DetailItem className="full-width">
                  <DetailLabel>
                    📅 次回アクション
                  </DetailLabel>
                  <DetailValue>
                    {selectedLog.nextAction}
                    {selectedLog.nextActionDate && (
                      <div style={{ marginTop: '0.5rem', color: '#666' }}>
                        予定日: {selectedLog.nextActionDate}
                      </div>
                    )}
                  </DetailValue>
                </DetailItem>
              )}
            </DetailGrid>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
}

export default PartnerActionLogList;