import React, { useState } from 'react';
import styled from 'styled-components';
import { FiSave, FiUser, FiPackage, FiCalendar, FiActivity, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { PARTNER_PROPOSAL_MENUS, STATUSES } from '../data/constants.js';
import { db } from '../firebase.js';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const PartnerEntryContainer = styled.div`
  max-width: 600px;
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

const Subtitle = styled.p`
  color: #7f8c8d;
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
`;

const Form = styled.form`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RequiredMark = styled.span`
  color: #e74c3c;
  font-size: 0.8rem;
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
  
  &:required {
    border-left: 3px solid #e74c3c;
  }
  
  &:disabled {
    background-color: #f8f9fa;
    color: #6c757d;
    cursor: not-allowed;
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
  
  &:required {
    border-left: 3px solid #e74c3c;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: #219a52;
  }
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const Message = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  
  &.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  &.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
`;

function PartnerEntryPage() {
  const [formData, setFormData] = useState({
    productName: '',
    proposalMenu: '',
    representative: 'パートナー担当者', // 実際の実装では認証されたユーザー名を使用
    status: '',
    lastContactDate: new Date().toISOString().split('T')[0] // 今日の日付
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearMessage = () => {
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearMessage();

    try {
      // 必須項目チェック
      if (!formData.productName || !formData.proposalMenu || !formData.status || !formData.lastContactDate) {
        setMessage({ type: 'error', text: 'すべての必須項目を入力してください。' });
        setLoading(false);
        return;
      }

      // 商材名 + 提案メニューのペアで既存案件を検索
      const dealKey = `${formData.productName}_${formData.proposalMenu}`;
      const progressQuery = query(
        collection(db, 'progressDashboard'),
        where('productName', '==', formData.productName),
        where('proposalMenu', '==', formData.proposalMenu)
      );

      const existingDeals = await getDocs(progressQuery);
      let dealId = null;

      if (!existingDeals.empty) {
        // 既存案件を更新
        const existingDeal = existingDeals.docs[0];
        dealId = existingDeal.id;

        const updateData = {
          status: formData.status,
          lastContactDate: formData.lastContactDate,
          representative: formData.representative,
          updatedAt: serverTimestamp()
        };

        // フェーズ8（受注）の場合、リードタイム計算
        if (formData.status === 'フェーズ8') {
          updateData.confirmedDate = formData.lastContactDate;
          const createdAt = existingDeal.data().createdAt?.toDate?.();
          if (createdAt) {
            const confirmedDate = new Date(formData.lastContactDate);
            const leadTimeDays = Math.floor((confirmedDate - createdAt) / (1000 * 60 * 60 * 24));
            updateData.leadTimeDays = leadTimeDays;
            console.log('📊 リードタイム（成約）:', leadTimeDays, '日');
          }
        }

        // 失注の場合、失注フェーズとリードタイムを記録
        if (formData.status === '失注') {
          const previousStatus = existingDeal.data().status;
          updateData.lostAtPhase = previousStatus;
          updateData.lostDate = formData.lastContactDate;
          console.log('❌ 失注: 直前フェーズ:', previousStatus);

          const createdAt = existingDeal.data().createdAt?.toDate?.();
          if (createdAt) {
            const lostDate = new Date(formData.lastContactDate);
            const leadTimeDays = Math.floor((lostDate - createdAt) / (1000 * 60 * 60 * 24));
            updateData.leadTimeDays = leadTimeDays;
            console.log('📊 リードタイム（失注）:', leadTimeDays, '日');
          }
        }

        await updateDoc(doc(db, 'progressDashboard', dealId), updateData);

        console.log('既存案件を更新:', dealId);
      } else {
        // 新規案件を作成
        const progressData = {
          productName: formData.productName,
          proposalMenu: formData.proposalMenu,
          representative: formData.representative,
          introducer: '', // パートナー向けでは空文字
          introducerId: 0,
          status: formData.status,
          lastContactDate: formData.lastContactDate,
          nextAction: '',
          nextActionDate: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const progressDocRef = await addDoc(collection(db, 'progressDashboard'), progressData);
        dealId = progressDocRef.id;
        
        console.log('新規案件を作成:', dealId);
      }

      // アクションログに履歴を記録
      const actionLogData = {
        dealId: dealId,
        dealKey: dealKey,
        productName: formData.productName,
        proposalMenu: formData.proposalMenu,
        action: '進捗更新',
        description: `ステータスを「${formData.status}」に更新`,
        status: formData.status,
        nextAction: '',
        nextActionDate: '',
        representative: formData.representative,
        introducer: '', // パートナー向けでは空文字
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'actionLogs'), actionLogData);

      setMessage({ type: 'success', text: '案件情報を正常に保存しました。' });
      
      // フォームを初期化（商材名と提案メニューは保持）
      setFormData(prev => ({
        ...prev,
        status: '',
        lastContactDate: new Date().toISOString().split('T')[0]
      }));

    } catch (error) {
      console.error('保存エラー:', error);
      setMessage({ type: 'error', text: '保存に失敗しました。再度お試しください。' });
    }

    setLoading(false);
  };

  return (
    <PartnerEntryContainer>
      <Header>
        <div>
          <Title>案件進捗記入</Title>
          <Subtitle>営業パートナー向け</Subtitle>
        </div>
      </Header>

      <Form onSubmit={handleSubmit}>
        {message.text && (
          <Message className={message.type}>
            {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
            {message.text}
          </Message>
        )}

        <FormGroup>
          <Label>
            <FiPackage />
            商材名 <RequiredMark>*</RequiredMark>
          </Label>
          <Input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleInputChange}
            placeholder="商材名を入力してください"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>
            <FiActivity />
            提案メニュー <RequiredMark>*</RequiredMark>
          </Label>
          <Select
            name="proposalMenu"
            value={formData.proposalMenu}
            onChange={handleInputChange}
            required
          >
            <option value="">選択してください</option>
            {PARTNER_PROPOSAL_MENUS.map(menu => (
              <option key={menu} value={menu}>{menu}</option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>
            <FiUser />
            担当者（パートナー側）
          </Label>
          <Input
            type="text"
            name="representative"
            value={formData.representative}
            disabled
          />
        </FormGroup>

        <FormGroup>
          <Label>
            <FiActivity />
            ステータス <RequiredMark>*</RequiredMark>
          </Label>
          <Select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            required
          >
            <option value="">選択してください</option>
            {STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>
            <FiCalendar />
            最終接触日 <RequiredMark>*</RequiredMark>
          </Label>
          <Input
            type="date"
            name="lastContactDate"
            value={formData.lastContactDate}
            onChange={handleInputChange}
            required
          />
        </FormGroup>

        <ButtonContainer>
          <SaveButton type="submit" disabled={loading}>
            <FiSave />
            {loading ? '保存中...' : '保存'}
          </SaveButton>
        </ButtonContainer>
      </Form>
    </PartnerEntryContainer>
  );
}

export default PartnerEntryPage;