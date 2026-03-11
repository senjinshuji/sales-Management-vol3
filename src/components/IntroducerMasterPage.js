import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiMail, FiUser, FiActivity, FiFileText } from 'react-icons/fi';
import { introducers as initialIntroducers, mockDeals } from '../data/mockData.js';
import { INTRODUCER_STATUS } from '../data/constants.js';
import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const Container = styled.div`
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

const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &.primary {
    background: #3498db;
    color: white;
    
    &:hover {
      background: #2980b9;
    }
  }
  
  &.success {
    background: #27ae60;
    color: white;
    
    &:hover {
      background: #219a52;
    }
  }
  
  &.danger {
    background: #e74c3c;
    color: white;
    
    &:hover {
      background: #c0392b;
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

const Table = styled.table`
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-collapse: collapse;
  overflow: hidden;
`;

const TableHeader = styled.th`
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #dee2e6;
`;

const TableCell = styled.td`
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  
  &.active {
    background: #e8f5e8;
    color: #27ae60;
  }
  
  &.inactive {
    background: #f8f9fa;
    color: #6c757d;
  }
  
  &.attention {
    background: #fff3cd;
    color: #856404;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #2c3e50;
`;

const Form = styled.form`
  display: grid;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Input = styled.input`
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

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  
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
  margin-top: 1rem;
`;

function IntroducerMasterPage() {
  const [introducers, setIntroducers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingIntroducer, setEditingIntroducer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    memo: '',
    status: 'アクティブ'
  });

  // Firestoreから紹介者データと案件データを取得
  useEffect(() => {
    fetchIntroducers();
    fetchDeals();
  }, []);
  
  const fetchIntroducers = async () => {
    try {
      setIsLoading(true);
      console.log('📋 紹介者データをFirestoreから取得開始');
      
      const introducersRef = collection(db, 'introducers');
      const q = query(introducersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const introducersList = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        introducersList.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
        });
      });
      
      console.log('✅ 紹介者データ取得成功:', introducersList.length, '件');
      setIntroducers(introducersList);
    } catch (error) {
      console.error('💥 紹介者データ取得エラー:', error);
      // エラー時はモックデータを使用
      setIntroducers(initialIntroducers);
    } finally {
      setIsLoading(false);
    }
  };

  // Firestoreから案件データを取得
  const fetchDeals = async () => {
    try {
      console.log('📋 案件データをFirestoreから取得開始');
      
      const dealsRef = collection(db, 'progressDashboard');
      const querySnapshot = await getDocs(dealsRef);
      
      const dealsList = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        dealsList.push({
          id: docSnap.id,
          ...data
        });
      });
      
      console.log('✅ 案件データ取得成功:', dealsList.length, '件');
      setDeals(dealsList);
    } catch (error) {
      console.error('💥 案件データ取得エラー:', error);
      // エラー時はモックデータを使用
      setDeals(mockDeals);
    }
  };

  // 紹介件数を計算（Firestoreの案件データから）
  const getIntroductionCount = (introducerName) => {
    return deals.filter(deal => deal.introducer === introducerName).length;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingIntroducer) {
        // 編集
        console.log('✏️ 紹介者編集開始:', editingIntroducer.id);
        const introducerRef = doc(db, 'introducers', editingIntroducer.id);
        await updateDoc(introducerRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        console.log('✅ 紹介者編集成功');
      } else {
        // 新規追加
        console.log('➕ 紹介者新規追加開始');
        await addDoc(collection(db, 'introducers'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ 紹介者新規追加成功');
      }
      
      // データを再取得して画面を更新
      await fetchIntroducers();
      handleCloseModal();
    } catch (error) {
      console.error('💥 紹介者保存エラー:', error);
      alert('紹介者の保存に失敗しました: ' + error.message);
    }
  };

  const handleEdit = (introducer) => {
    setEditingIntroducer(introducer);
    setFormData({
      name: introducer.name,
      contactPerson: introducer.contactPerson,
      email: introducer.email,
      memo: introducer.memo,
      status: introducer.status
    });
    setShowModal(true);
  };

  const handleDelete = async (introducerId) => {
    if (window.confirm('この紹介者を削除してもよろしいですか？')) {
      try {
        console.log('🗑️ 紹介者削除開始:', introducerId);
        await deleteDoc(doc(db, 'introducers', introducerId));
        console.log('✅ 紹介者削除成功');
        
        // データを再取得して画面を更新
        await fetchIntroducers();
      } catch (error) {
        console.error('💥 紹介者削除エラー:', error);
        alert('紹介者の削除に失敗しました: ' + error.message);
      }
    }
  };

  const handleAdd = () => {
    setEditingIntroducer(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      memo: '',
      status: 'アクティブ'
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingIntroducer(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      memo: '',
      status: 'アクティブ'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'アクティブ': return 'active';
      case '非稼働': return 'inactive';
      case '要確認': return 'attention';
      default: return 'inactive';
    }
  };

  return (
    <Container>
      <Header>
        <Title>紹介者マスター</Title>
        <Button className="primary" onClick={handleAdd}>
          <FiPlus />
          新規登録
        </Button>
      </Header>

      <Table>
        <thead>
          <tr>
            <TableHeader>紹介者名</TableHeader>
            <TableHeader>担当者名</TableHeader>
            <TableHeader>メールアドレス</TableHeader>
            <TableHeader>稼働状況</TableHeader>
            <TableHeader>紹介件数</TableHeader>
            <TableHeader>備考</TableHeader>
            <TableHeader>操作</TableHeader>
          </tr>
        </thead>
        <tbody>
          {introducers.map(introducer => (
            <tr key={introducer.id}>
              <TableCell>
                <strong>{introducer.name}</strong>
              </TableCell>
              <TableCell>{introducer.contactPerson || '-'}</TableCell>
              <TableCell>{introducer.email || '-'}</TableCell>
              <TableCell>
                <StatusBadge className={getStatusBadgeClass(introducer.status)}>
                  {introducer.status}
                </StatusBadge>
              </TableCell>
              <TableCell>
                <strong>{getIntroductionCount(introducer.name)}件</strong>
              </TableCell>
              <TableCell>{introducer.memo || '-'}</TableCell>
              <TableCell>
                <ActionButtons>
                  <Button 
                    className="primary" 
                    onClick={() => handleEdit(introducer)}
                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    <FiEdit2 />
                  </Button>
                  <Button 
                    className="danger" 
                    onClick={() => handleDelete(introducer.id)}
                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                  >
                    <FiTrash2 />
                  </Button>
                </ActionButtons>
              </TableCell>
            </tr>
          ))}
        </tbody>
      </Table>

      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>
                {editingIntroducer ? '紹介者編集' : '紹介者新規登録'}
              </ModalTitle>
              <Button 
                className="secondary" 
                onClick={handleCloseModal}
                style={{ padding: '0.5rem' }}
              >
                <FiX />
              </Button>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>
                  <FiUser />
                  紹介者名 *
                </Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FiUser />
                  担当者名
                </Label>
                <Input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FiMail />
                  メールアドレス
                </Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <FormGroup>
                <Label>
                  <FiActivity />
                  稼働状況
                </Label>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  {INTRODUCER_STATUS.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>
                  <FiFileText />
                  備考
                </Label>
                <TextArea
                  name="memo"
                  value={formData.memo}
                  onChange={handleInputChange}
                />
              </FormGroup>

              <ButtonGroup>
                <Button type="button" className="secondary" onClick={handleCloseModal}>
                  キャンセル
                </Button>
                <Button type="submit" className="success">
                  <FiSave />
                  保存
                </Button>
              </ButtonGroup>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
}

export default IntroducerMasterPage; 