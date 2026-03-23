import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiList, FiPlus, FiEdit3, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { LEAD_SOURCES } from '../data/constants.js';

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

const AddButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;

  &:hover {
    background: #219a52;
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
  margin-right: 0.5rem;
  transition: all 0.3s ease;

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
  max-width: 500px;
  width: 90%;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;

  &.primary {
    background: #3498db;
    color: white;

    &:hover {
      background: #2980b9;
    }
  }

  &.secondary {
    background: #95a5a6;
    color: white;

    &:hover {
      background: #7f8c8d;
    }
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

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;

  &.active {
    background: #d4edda;
    color: #155724;
  }

  &.inactive {
    background: #f8d7da;
    color: #721c24;
  }
`;

// 初期データ登録のレースコンディション防止用
let initialDataPromise = null;

// 初期データを登録する関数（二重実行防止付き）
const ensureInitialData = async () => {
  if (initialDataPromise) return initialDataPromise;
  initialDataPromise = (async () => {
    try {
      const sourcesRef = collection(db, 'leadSources');
      const querySnapshot = await getDocs(sourcesRef);

      if (querySnapshot.empty) {
        // 既存の流入経路を初期データとして登録
        console.log('✅ 流入経路の初期データを登録中...');

        for (let i = 0; i < LEAD_SOURCES.length; i++) {
          await addDoc(sourcesRef, {
            name: LEAD_SOURCES[i],
            displayOrder: i + 1,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        console.log('✅ 流入経路の初期データ登録完了');
      }
    } catch (error) {
      console.error('初期データ登録エラー:', error);
      // エラー時はリトライ可能にするためフラグをリセット
      initialDataPromise = null;
    }
  })();
  return initialDataPromise;
};

function LeadSourceMasterPage() {
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  // 流入経路データを取得
  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 流入経路マスター: データ取得開始');

      // 初期データのチェックと登録
      await ensureInitialData();

      const sourcesRef = collection(db, 'leadSources');
      const querySnapshot = await getDocs(sourcesRef);

      const rawData = [];
      querySnapshot.forEach((docSnap) => {
        rawData.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // 同名の重複データを自動クリーンアップ（displayOrderが大きい方を削除）
      const nameMap = new Map();
      for (const item of rawData) {
        const name = item.name;
        if (nameMap.has(name)) {
          const existing = nameMap.get(name);
          // displayOrderが小さい方を残す（同じならIDの辞書順で先の方を残す）
          const existingOrder = existing.displayOrder ?? 999;
          const currentOrder = item.displayOrder ?? 999;
          if (currentOrder < existingOrder || (currentOrder === existingOrder && item.id < existing.id)) {
            // 現在のアイテムを残し、既存を削除
            console.log('🗑 重複データ削除:', existing.name, existing.id);
            await deleteDoc(doc(db, 'leadSources', existing.id));
            nameMap.set(name, item);
          } else {
            // 既存を残し、現在のアイテムを削除
            console.log('🗑 重複データ削除:', item.name, item.id);
            await deleteDoc(doc(db, 'leadSources', item.id));
          }
        } else {
          nameMap.set(name, item);
        }
      }

      // 重複除去後のデータを整形
      const sourcesData = Array.from(nameMap.values()).map(item => ({
        ...item,
        createdAt: item.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '',
        updatedAt: item.updatedAt?.toDate?.()?.toLocaleDateString('ja-JP') || ''
      }));

      // クライアントサイドでdisplayOrderとcreatedAtでソート
      sourcesData.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return (a.displayOrder || 999) - (b.displayOrder || 999);
        }
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateA - dateB;
      });

      console.log('✅ 流入経路マスター: データ取得成功:', sourcesData.length, '件');
      setSources(sourcesData);
    } catch (error) {
      console.error('💥 流入経路マスター: データ取得エラー:', error);
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleAdd = () => {
    setEditingSource(null);
    setFormData({ name: '' });
    setShowModal(true);
  };

  const handleEdit = (source) => {
    setEditingSource(source);
    setFormData({
      name: source.name
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSource(null);
    setFormData({ name: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('流入経路名を入力してください');
      return;
    }

    try {
      // 重複チェック
      const sourcesRef = collection(db, 'leadSources');
      const q = query(sourcesRef, where('name', '==', formData.name.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty && (!editingSource || querySnapshot.docs[0].id !== editingSource.id)) {
        alert('同じ流入経路名が既に登録されています');
        return;
      }

      if (editingSource) {
        // 更新
        const newName = formData.name.trim();
        const oldName = editingSource.name;
        console.log('🔄 流入経路更新開始:', editingSource.id);
        await updateDoc(doc(db, 'leadSources', editingSource.id), {
          name: newName,
          updatedAt: serverTimestamp()
        });

        // 名前変更時は過去データのleadSourceも一括更新
        if (newName !== oldName) {
          console.log('🔄 過去データのleadSource一括更新:', oldName, '→', newName);

          // progressDashboardの更新
          const progressQ = query(collection(db, 'progressDashboard'), where('leadSource', '==', oldName));
          const progressSnap = await getDocs(progressQ);
          for (const d of progressSnap.docs) {
            await updateDoc(doc(db, 'progressDashboard', d.id), { leadSource: newName });
          }
          console.log(`✅ progressDashboard ${progressSnap.size}件更新`);

          // actionLogsの更新
          const logsQ = query(collection(db, 'actionLogs'), where('leadSource', '==', oldName));
          const logsSnap = await getDocs(logsQ);
          for (const d of logsSnap.docs) {
            await updateDoc(doc(db, 'actionLogs', d.id), { leadSource: newName });
          }
          console.log(`✅ actionLogs ${logsSnap.size}件更新`);
        }
        console.log('✅ 流入経路更新成功');
      } else {
        // 新規追加
        console.log('➕ 流入経路新規追加開始');
        const displayOrder = sources.length + 1;
        await addDoc(collection(db, 'leadSources'), {
          name: formData.name.trim(),
          displayOrder: displayOrder,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 流入経路新規追加成功');
      }

      await fetchSources();
      handleCloseModal();
      alert(editingSource ? '流入経路を更新しました' : '流入経路を追加しました');
    } catch (error) {
      console.error('💥 流入経路保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    }
  };

  const handleDelete = async (source) => {
    if (!window.confirm(`「${source.name}」を削除しますか？\n\n※この流入経路を使用している案件がある場合は削除できません。`)) {
      return;
    }

    try {
      // 使用中チェック
      const progressRef = collection(db, 'progressDashboard');
      const q = query(progressRef, where('leadSource', '==', source.name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        alert(`この流入経路は${querySnapshot.size}件の案件で使用されているため、削除できません。`);
        return;
      }

      console.log('🗑 流入経路削除開始:', source.id);
      await deleteDoc(doc(db, 'leadSources', source.id));
      console.log('✅ 流入経路削除成功');

      await fetchSources();
      alert('流入経路を削除しました');
    } catch (error) {
      console.error('💥 流入経路削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const handleToggleStatus = async (source) => {
    try {
      await updateDoc(doc(db, 'leadSources', source.id), {
        isActive: !source.isActive,
        updatedAt: serverTimestamp()
      });
      await fetchSources();
    } catch (error) {
      console.error('ステータス変更エラー:', error);
      alert('ステータスの変更に失敗しました');
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>流入経路マスター</Title>
        <AddButton onClick={handleAdd}>
          <FiPlus />
          新規追加
        </AddButton>
      </Header>

      {isLoading ? (
        <LoadingMessage>データを読み込み中...</LoadingMessage>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>流入経路名</TableHeaderCell>
              <TableHeaderCell>ステータス</TableHeaderCell>
              <TableHeaderCell>作成日</TableHeaderCell>
              <TableHeaderCell>更新日</TableHeaderCell>
              <TableHeaderCell>操作</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5">
                  <EmptyMessage>流入経路が登録されていません</EmptyMessage>
                </TableCell>
              </TableRow>
            ) : (
              sources.map(source => (
                <TableRow key={source.id}>
                  <TableCell>
                    <strong>{source.name}</strong>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      className={source.isActive ? 'active' : 'inactive'}
                      onClick={() => handleToggleStatus(source)}
                      style={{ cursor: 'pointer' }}
                    >
                      {source.isActive ? '有効' : '無効'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{source.createdAt}</TableCell>
                  <TableCell>{source.updatedAt}</TableCell>
                  <TableCell>
                    <ActionButton
                      className="edit"
                      onClick={() => handleEdit(source)}
                    >
                      <FiEdit3 />
                      編集
                    </ActionButton>
                    <ActionButton
                      className="delete"
                      onClick={() => handleDelete(source)}
                    >
                      <FiTrash2 />
                      削除
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>
      )}

      {showModal && (
        <Modal onClick={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                {editingSource ? '流入経路編集' : '流入経路新規追加'}
              </ModalTitle>
              <CloseButton onClick={handleCloseModal}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>
                  <FiList />
                  流入経路名 *
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="流入経路名を入力"
                  required
                />
              </FormGroup>

              <ButtonGroup>
                <Button type="button" className="secondary" onClick={handleCloseModal}>
                  キャンセル
                </Button>
                <Button type="submit" className="primary">
                  <FiSave />
                  {editingSource ? '更新' : '追加'}
                </Button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
}

export default LeadSourceMasterPage;
