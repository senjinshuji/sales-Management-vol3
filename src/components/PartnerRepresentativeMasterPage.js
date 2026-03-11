import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FiUser, FiPlus, FiEdit3, FiTrash2, FiSave, FiX, FiTarget } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, setDoc } from 'firebase/firestore';

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
  
  &.target {
    background: #9b59b6;
    color: white;
    
    &:hover {
      background: #8e44ad;
    }
  }
`;

const TargetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

const TargetSection = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
`;

const TargetTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1rem;
`;

const TargetInputGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const SmallLabel = styled.label`
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
`;

const SmallInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
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

function PartnerRepresentativeMasterPage() {
  const [representatives, setRepresentatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRepresentative, setEditingRepresentative] = useState(null);
  const [formData, setFormData] = useState({ name: '', department: '' });
  
  // 目標設定関連のstate
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetRepresentative, setTargetRepresentative] = useState(null);
  const [targetFormData, setTargetFormData] = useState({
    targets: {
      'アポ打診中': { count: '', transitionRate: '' },
      '初回アポ予定': { count: '', transitionRate: '' },
      '与件化_提案中': { count: '', transitionRate: '' },
      '検討中': { count: '', transitionRate: '' }
    }
  });

  // パートナー会社を判定
  const getPartnerCompany = () => {
    const path = window.location.pathname;
    if (path.startsWith('/partner-entry/piala')) {
      return '株式会社ピアラ';
    }
    return null;
  };

  const partnerCompany = getPartnerCompany();

  // 担当者データを取得
  const fetchRepresentatives = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 担当者マスター: データ取得開始');
      console.log('🏢 対象会社:', partnerCompany);

      const representativesRef = collection(db, 'representatives');
      
      // まず全件取得してデバッグ
      console.log('📋 全担当者データを取得中...');
      const allQuery = query(representativesRef);
      const allSnapshot = await getDocs(allQuery);
      
      console.log('📊 全担当者データ:', allSnapshot.size, '件');
      allSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('👤 担当者:', {
          id: docSnap.id,
          name: data.name,
          companyName: data.companyName,
          status: data.status
        });
      });
      
      // 会社名でフィルタリング
      const q = query(
        representativesRef,
        where('companyName', '==', partnerCompany)
      );
      const querySnapshot = await getDocs(q);

      const representativesData = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log('✅ マッチした担当者:', docSnap.id, data.name);
        representativesData.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '',
          updatedAt: data.updatedAt?.toDate?.()?.toLocaleDateString('ja-JP') || ''
        });
      });

      // クライアントサイドで日付順ソート
      representativesData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });

      console.log('✅ 担当者マスター: データ取得成功:', representativesData.length, '件');
      setRepresentatives(representativesData);
    } catch (error) {
      console.error('💥 担当者マスター: データ取得エラー:', error);
      console.error('エラー詳細:', {
        code: error.code,
        message: error.message
      });
      setRepresentatives([]);
    } finally {
      setIsLoading(false);
    }
  }, [partnerCompany]);

  useEffect(() => {
    fetchRepresentatives();
  }, [fetchRepresentatives]);

  const handleAdd = () => {
    setEditingRepresentative(null);
    setFormData({ name: '', department: '' });
    setShowModal(true);
  };

  const handleEdit = (representative) => {
    setEditingRepresentative(representative);
    setFormData({ 
      name: representative.name,
      department: representative.department || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRepresentative(null);
    setFormData({ name: '', department: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('担当者名を入力してください');
      return;
    }

    try {
      if (editingRepresentative) {
        // 更新
        console.log('🔄 担当者更新開始:', editingRepresentative.id);
        await updateDoc(doc(db, 'representatives', editingRepresentative.id), {
          name: formData.name.trim(),
          department: formData.department.trim(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 担当者更新成功');
      } else {
        // 新規追加
        console.log('➕ 担当者新規追加開始');
        await addDoc(collection(db, 'representatives'), {
          name: formData.name.trim(),
          department: formData.department.trim(),
          companyName: partnerCompany,
          status: 'アクティブ',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 担当者新規追加成功');
      }

      await fetchRepresentatives();
      handleCloseModal();
      alert(editingRepresentative ? '担当者を更新しました' : '担当者を追加しました');
    } catch (error) {
      console.error('💥 担当者保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    }
  };

  const handleDelete = async (representative) => {
    if (!window.confirm(`「${representative.name}」を削除しますか？`)) {
      return;
    }

    try {
      console.log('🗑 担当者削除開始:', representative.id);
      await deleteDoc(doc(db, 'representatives', representative.id));
      console.log('✅ 担当者削除成功');
      
      await fetchRepresentatives();
      alert('担当者を削除しました');
    } catch (error) {
      console.error('💥 担当者削除エラー:', error);
      alert('削除に失敗しました: ' + error.message);
    }
  };

  // 目標設定モーダルを開く
  const handleOpenTargetModal = async (representative) => {
    setTargetRepresentative(representative);
    
    // 既存の目標データを取得
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM形式
      const targetDoc = doc(db, 'representativeTargets', `${representative.id}_${currentMonth}`);
      const targetSnapshot = await getDocs(query(collection(db, 'representativeTargets'), where('representativeId', '==', representative.id), where('yearMonth', '==', currentMonth)));
      
      if (!targetSnapshot.empty) {
        const data = targetSnapshot.docs[0].data();
        setTargetFormData({ targets: data.targets || targetFormData.targets });
      } else {
        // 初期値のまま
        setTargetFormData({
          targets: {
            'アポ打診中': { count: '', transitionRate: '' },
            '初回アポ予定': { count: '', transitionRate: '' },
            '与件化_提案中': { count: '', transitionRate: '' },
            '検討中': { count: '', transitionRate: '' }
          }
        });
      }
    } catch (error) {
      console.error('目標データ取得エラー:', error);
    }
    
    setShowTargetModal(true);
  };

  // 目標設定の入力値変更
  const handleTargetInputChange = (status, field, value) => {
    // 数値のみ許可
    if (value && !/^\d*$/.test(value)) return;
    
    setTargetFormData(prev => ({
      ...prev,
      targets: {
        ...prev.targets,
        [status]: {
          ...prev.targets[status],
          [field]: value
        }
      }
    }));
  };

  // 目標設定の保存
  const handleSaveTarget = async () => {
    if (!targetRepresentative) return;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM形式
      const targetId = `${targetRepresentative.id}_${currentMonth}`;
      
      const targetData = {
        representativeId: targetRepresentative.id,
        representativeName: targetRepresentative.name,
        yearMonth: currentMonth,
        targets: targetFormData.targets,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'representativeTargets', targetId), targetData, { merge: true });
      
      alert('目標設定を保存しました');
      setShowTargetModal(false);
    } catch (error) {
      console.error('目標設定保存エラー:', error);
      alert('保存に失敗しました: ' + error.message);
    }
  };

  return (
    <PageContainer>
      <Header>
        <Title>担当者マスター - {partnerCompany}</Title>
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
              <TableHeaderCell>担当者名</TableHeaderCell>
              <TableHeaderCell>部署</TableHeaderCell>
              <TableHeaderCell>ステータス</TableHeaderCell>
              <TableHeaderCell>作成日</TableHeaderCell>
              <TableHeaderCell>更新日</TableHeaderCell>
              <TableHeaderCell>操作</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {representatives.length === 0 ? (
              <TableRow>
                <TableCell colSpan="6">
                  <EmptyMessage>担当者が登録されていません</EmptyMessage>
                </TableCell>
              </TableRow>
            ) : (
              representatives.map(representative => (
                <TableRow key={representative.id}>
                  <TableCell>
                    <strong>{representative.name}</strong>
                  </TableCell>
                  <TableCell>{representative.department || '-'}</TableCell>
                  <TableCell>{representative.status}</TableCell>
                  <TableCell>{representative.createdAt}</TableCell>
                  <TableCell>{representative.updatedAt}</TableCell>
                  <TableCell>
                    <ActionButton
                      className="target"
                      onClick={() => handleOpenTargetModal(representative)}
                    >
                      <FiTarget />
                      目標設定
                    </ActionButton>
                    <ActionButton
                      className="edit"
                      onClick={() => handleEdit(representative)}
                    >
                      <FiEdit3 />
                      編集
                    </ActionButton>
                    <ActionButton
                      className="delete"
                      onClick={() => handleDelete(representative)}
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
                {editingRepresentative ? '担当者編集' : '担当者新規追加'}
              </ModalTitle>
              <CloseButton onClick={handleCloseModal}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>
                  <FiUser />
                  担当者名 *
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="担当者名を入力"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FiUser />
                  部署
                </Label>
                <Input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="部署名を入力（例：営業部、マーケティング部）"
                />
              </FormGroup>

              <ButtonGroup>
                <Button type="button" className="secondary" onClick={handleCloseModal}>
                  キャンセル
                </Button>
                <Button type="submit" className="primary">
                  <FiSave />
                  {editingRepresentative ? '更新' : '追加'}
                </Button>
              </ButtonGroup>
            </form>
          </ModalContent>
        </Modal>
      )}

      {showTargetModal && targetRepresentative && (
        <Modal onClick={(e) => e.target === e.currentTarget && setShowTargetModal(false)}>
          <ModalContent style={{ maxWidth: '800px', width: '90%' }}>
            <ModalHeader>
              <ModalTitle>
                目標設定 - {targetRepresentative.name}（{new Date().toISOString().slice(0, 7)}）
              </ModalTitle>
              <CloseButton onClick={() => setShowTargetModal(false)}>
                <FiX />
              </CloseButton>
            </ModalHeader>

            <TargetGrid>
              <TargetSection>
                <TargetTitle>アポ打診中</TargetTitle>
                <TargetInputGroup>
                  <div>
                    <SmallLabel>月内目標件数</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['アポ打診中'].count}
                      onChange={(e) => handleTargetInputChange('アポ打診中', 'count', e.target.value)}
                      placeholder="件数"
                    />
                  </div>
                  <div>
                    <SmallLabel>想定遷移率（%）</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['アポ打診中'].transitionRate}
                      onChange={(e) => handleTargetInputChange('アポ打診中', 'transitionRate', e.target.value)}
                      placeholder="%"
                    />
                  </div>
                </TargetInputGroup>
              </TargetSection>

              <TargetSection>
                <TargetTitle>初回アポ予定</TargetTitle>
                <TargetInputGroup>
                  <div>
                    <SmallLabel>月内目標件数</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['初回アポ予定'].count}
                      onChange={(e) => handleTargetInputChange('初回アポ予定', 'count', e.target.value)}
                      placeholder="件数"
                    />
                  </div>
                  <div>
                    <SmallLabel>想定遷移率（%）</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['初回アポ予定'].transitionRate}
                      onChange={(e) => handleTargetInputChange('初回アポ予定', 'transitionRate', e.target.value)}
                      placeholder="%"
                    />
                  </div>
                </TargetInputGroup>
              </TargetSection>

              <TargetSection>
                <TargetTitle>与件化_提案中</TargetTitle>
                <TargetInputGroup>
                  <div>
                    <SmallLabel>月内目標件数</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['与件化_提案中'].count}
                      onChange={(e) => handleTargetInputChange('与件化_提案中', 'count', e.target.value)}
                      placeholder="件数"
                    />
                  </div>
                  <div>
                    <SmallLabel>想定遷移率（%）</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['与件化_提案中'].transitionRate}
                      onChange={(e) => handleTargetInputChange('与件化_提案中', 'transitionRate', e.target.value)}
                      placeholder="%"
                    />
                  </div>
                </TargetInputGroup>
              </TargetSection>

              <TargetSection>
                <TargetTitle>検討中</TargetTitle>
                <TargetInputGroup>
                  <div>
                    <SmallLabel>月内目標件数</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['検討中'].count}
                      onChange={(e) => handleTargetInputChange('検討中', 'count', e.target.value)}
                      placeholder="件数"
                    />
                  </div>
                  <div>
                    <SmallLabel>想定遷移率（%）</SmallLabel>
                    <SmallInput
                      type="text"
                      value={targetFormData.targets['検討中'].transitionRate}
                      onChange={(e) => handleTargetInputChange('検討中', 'transitionRate', e.target.value)}
                      placeholder="%"
                    />
                  </div>
                </TargetInputGroup>
              </TargetSection>
            </TargetGrid>

            <ButtonGroup>
              <Button type="button" className="secondary" onClick={() => setShowTargetModal(false)}>
                キャンセル
              </Button>
              <Button type="button" className="primary" onClick={handleSaveTarget}>
                <FiSave />
                保存
              </Button>
            </ButtonGroup>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
}

export default PartnerRepresentativeMasterPage;