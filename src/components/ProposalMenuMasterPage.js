import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiList, FiPlus, FiEdit3, FiTrash2, FiSave, FiX } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { PROPOSAL_MENUS } from '../data/constants.js';

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

// 初期データを登録する関数
const ensureInitialData = async () => {
  try {
    const menusRef = collection(db, 'proposalMenus');
    const querySnapshot = await getDocs(menusRef);
    
    if (querySnapshot.empty) {
      // 既存の提案メニューを初期データとして登録
      console.log('✅ 提案メニューの初期データを登録中...');
      
      for (let i = 0; i < PROPOSAL_MENUS.length; i++) {
        await addDoc(menusRef, {
          name: PROPOSAL_MENUS[i],
          displayOrder: i + 1,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log('✅ 提案メニューの初期データ登録完了');
    }
  } catch (error) {
    console.error('初期データ登録エラー:', error);
  }
};

function ProposalMenuMasterPage() {
  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  // 提案メニューデータを取得
  const fetchMenus = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 提案メニューマスター: データ取得開始');

      // 初期データのチェックと登録
      await ensureInitialData();

      const menusRef = collection(db, 'proposalMenus');
      // 複数のorderByは複合インデックスが必要なため、クライアントサイドでソート
      const querySnapshot = await getDocs(menusRef);

      const menusData = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        menusData.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '',
          updatedAt: data.updatedAt?.toDate?.()?.toLocaleDateString('ja-JP') || ''
        });
      });
      
      // クライアントサイドでdisplayOrderとcreatedAtでソート
      menusData.sort((a, b) => {
        // まずdisplayOrderでソート
        if (a.displayOrder !== b.displayOrder) {
          return (a.displayOrder || 999) - (b.displayOrder || 999);
        }
        // displayOrderが同じ場合はcreatedAtでソート
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateA - dateB;
      });

      console.log('✅ 提案メニューマスター: データ取得成功:', menusData.length, '件');
      setMenus(menusData);
    } catch (error) {
      console.error('💥 提案メニューマスター: データ取得エラー:', error);
      setMenus([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleAdd = () => {
    setEditingMenu(null);
    setFormData({ name: '' });
    setShowModal(true);
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setFormData({ 
      name: menu.name
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMenu(null);
    setFormData({ name: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('提案メニュー名を入力してください');
      return;
    }

    try {
      // 重複チェック
      const menusRef = collection(db, 'proposalMenus');
      const q = query(menusRef, where('name', '==', formData.name.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty && (!editingMenu || querySnapshot.docs[0].id !== editingMenu.id)) {
        alert('同じ提案メニュー名が既に登録されています');
        return;
      }

      if (editingMenu) {
        // 更新
        console.log('🔄 提案メニュー更新開始:', editingMenu.id);
        await updateDoc(doc(db, 'proposalMenus', editingMenu.id), {
          name: formData.name.trim(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 提案メニュー更新成功');
      } else {
        // 新規追加
        console.log('➕ 提案メニュー新規追加開始');
        const displayOrder = menus.length + 1;
        await addDoc(collection(db, 'proposalMenus'), {
          name: formData.name.trim(),
          displayOrder: displayOrder,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 提案メニュー新規追加成功');
      }

      await fetchMenus();
      handleCloseModal();
      alert(editingMenu ? '提案メニューを更新しました' : '提案メニューを追加しました');
    } catch (error) {
      console.error('💥 提案メニュー保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    }
  };

  const handleDelete = async (menu) => {
    if (!window.confirm(`「${menu.name}」を削除しますか？\n\n※この提案メニューを使用している案件がある場合は削除できません。`)) {
      return;
    }

    try {
      // 使用中チェック
      const progressRef = collection(db, 'progressDashboard');
      const q = query(progressRef, where('proposalMenu', '==', menu.name));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert(`この提案メニューは${querySnapshot.size}件の案件で使用されているため、削除できません。`);
        return;
      }

      console.log('🗑 提案メニュー削除開始:', menu.id);
      await deleteDoc(doc(db, 'proposalMenus', menu.id));
      console.log('✅ 提案メニュー削除成功');
      
      await fetchMenus();
      alert('提案メニューを削除しました');
    } catch (error) {
      console.error('💥 提案メニュー削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const handleToggleStatus = async (menu) => {
    try {
      await updateDoc(doc(db, 'proposalMenus', menu.id), {
        isActive: !menu.isActive,
        updatedAt: serverTimestamp()
      });
      await fetchMenus();
    } catch (error) {
      console.error('ステータス変更エラー:', error);
      alert('ステータスの変更に失敗しました');
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>提案メニューマスター</Title>
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
              <TableHeaderCell>提案メニュー名</TableHeaderCell>
              <TableHeaderCell>ステータス</TableHeaderCell>
              <TableHeaderCell>作成日</TableHeaderCell>
              <TableHeaderCell>更新日</TableHeaderCell>
              <TableHeaderCell>操作</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan="5">
                  <EmptyMessage>提案メニューが登録されていません</EmptyMessage>
                </TableCell>
              </TableRow>
            ) : (
              menus.map(menu => (
                <TableRow key={menu.id}>
                  <TableCell>
                    <strong>{menu.name}</strong>
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      className={menu.isActive ? 'active' : 'inactive'}
                      onClick={() => handleToggleStatus(menu)}
                      style={{ cursor: 'pointer' }}
                    >
                      {menu.isActive ? '有効' : '無効'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{menu.createdAt}</TableCell>
                  <TableCell>{menu.updatedAt}</TableCell>
                  <TableCell>
                    <ActionButton
                      className="edit"
                      onClick={() => handleEdit(menu)}
                    >
                      <FiEdit3 />
                      編集
                    </ActionButton>
                    <ActionButton
                      className="delete"
                      onClick={() => handleDelete(menu)}
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
                {editingMenu ? '提案メニュー編集' : '提案メニュー新規追加'}
              </ModalTitle>
              <CloseButton onClick={handleCloseModal}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>
                  <FiList />
                  提案メニュー名 *
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="提案メニュー名を入力"
                  required
                />
              </FormGroup>

              <ButtonGroup>
                <Button type="button" className="secondary" onClick={handleCloseModal}>
                  キャンセル
                </Button>
                <Button type="submit" className="primary">
                  <FiSave />
                  {editingMenu ? '更新' : '追加'}
                </Button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
}

export default ProposalMenuMasterPage;