import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiCalendar, FiDollarSign, FiSave, FiX, FiUser, FiSend } from 'react-icons/fi';
import { fetchAllStaff } from '../services/staffService.js';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: modalSlideIn 0.3s ease-out;
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #f8f9fa;
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #27ae60;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #95a5a6;
  padding: 0;
  display: flex;
  align-items: center;
  
  &:hover {
    color: #7f8c8d;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
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
  font-size: 0.95rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #27ae60;
    box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
  }
  
  &.error {
    border-color: #e74c3c;
    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  background: white;

  &:focus {
    outline: none;
    border-color: #27ae60;
    box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &.primary {
    background: #27ae60;
    color: white;
    
    &:hover {
      background: #219a52;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(39, 174, 96, 0.3);
    }
    
    &:disabled {
      background: #95a5a6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
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

const DealInfo = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #27ae60;
`;

const DealText = styled.p`
  margin: 0;
  color: #2c3e50;
  font-weight: 500;
  
  strong {
    color: #27ae60;
  }
`;

const ErrorMessage = styled.div`
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const SuccessIcon = styled.div`
  color: #27ae60;
  font-size: 2rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const SLACK_WEBHOOK_URL = process.env.REACT_APP_SLACK_WEBHOOK_URL || '';

const sendContractRequestToSlack = async (deal, contractData) => {
  const templateHolder = contractData.contractTemplateHolder === 'ours' ? '弊社' : '先方';
  const text = `📝 *契約書締結依頼*\n\n` +
    `*会社名:* ${deal.companyName || deal.productName}\n` +
    `*商材:* ${deal.productName}\n` +
    `*連絡グループ:* ${contractData.contactGroup}\n` +
    `*契約雛形:* ${templateHolder}が保有\n` +
    `*契約内容:*\n${contractData.contractDetails}\n` +
    `*受注金額:* ¥${Number(contractData.amount).toLocaleString()}`;

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return true;
  } catch (error) {
    console.error('Slack送信エラー:', error);
    return false;
  }
};

function ReceivedOrderModal({
  isOpen,
  onClose,
  onSave,
  deal,
  isLoading = false
}) {
  // 想定予算を初期値として設定
  const getInitialAmount = () => {
    if (deal && deal.expectedBudget) {
      return deal.expectedBudget.toString();
    }
    return '';
  };

  const [formData, setFormData] = useState({
    receivedOrderMonth: new Date().toISOString().slice(0, 7),
    receivedOrderAmount: getInitialAmount(),
    startDate: '',
    endDate: '',
    salesRep: '',
    operatorRep: '',
    contactGroup: '',
    contractTemplateHolder: 'ours',
    contractDetails: '',
  });
  const [errors, setErrors] = useState({});
  const [staffList, setStaffList] = useState([]);

  // スタッフマスターを取得
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const staff = await fetchAllStaff();
        setStaffList(staff);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      }
    };
    loadStaff();
  }, []);

  // dealが変わったら金額を更新
  useEffect(() => {
    if (deal && deal.expectedBudget) {
      setFormData(prev => ({
        ...prev,
        receivedOrderAmount: deal.expectedBudget.toString()
      }));
    }
  }, [deal]);

  if (!isOpen || !deal) return null;

  // フォーム入力ハンドラー
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // バリデーション
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.receivedOrderMonth) {
      newErrors.receivedOrderMonth = '受注月は必須です';
    }
    
    if (!formData.receivedOrderAmount) {
      newErrors.receivedOrderAmount = '受注金額は必須です';
    } else if (isNaN(Number(formData.receivedOrderAmount)) || Number(formData.receivedOrderAmount) <= 0) {
      newErrors.receivedOrderAmount = '正の数値を入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSave({
        dealId: deal.id,
        receivedOrderMonth: formData.receivedOrderMonth,
        receivedOrderAmount: Number(formData.receivedOrderAmount),
        startDate: formData.startDate,
        endDate: formData.endDate,
        salesRep: formData.salesRep,
        operatorRep: formData.operatorRep
      });

      // Slack契約書締結依頼送信
      if (formData.contactGroup || formData.contractDetails) {
        await sendContractRequestToSlack(deal, {
          contactGroup: formData.contactGroup,
          contractTemplateHolder: formData.contractTemplateHolder,
          contractDetails: formData.contractDetails,
          amount: formData.receivedOrderAmount,
        });
      }
    } catch (error) {
      console.error('受注情報保存エラー:', error);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    setFormData({
      receivedOrderMonth: new Date().toISOString().slice(0, 7),
      receivedOrderAmount: '',
      startDate: '',
      endDate: '',
      salesRep: '',
      operatorRep: '',
      contactGroup: '',
      contractTemplateHolder: 'ours',
      contractDetails: '',
    });
    setErrors({});
    onClose();
  };

  // 金額をフォーマット
  const formatAmount = (amount) => {
    if (!amount) return '';
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  return (
    <ModalOverlay onClick={handleCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiDollarSign />
            受注情報の入力
          </ModalTitle>
          <CloseButton onClick={handleCancel}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        <DealInfo>
          <DealText>
            <strong>{deal.productName}</strong> - {deal.proposalMenu}
          </DealText>
          <DealText style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: '#666' }}>
            この案件を「受注」ステータスに変更します
          </DealText>
        </DealInfo>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>
              <FiCalendar />
              受注月 *
            </Label>
            <Input
              type="month"
              name="receivedOrderMonth"
              value={formData.receivedOrderMonth}
              onChange={handleInputChange}
              className={errors.receivedOrderMonth ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.receivedOrderMonth && (
              <ErrorMessage>{errors.receivedOrderMonth}</ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label>
              <FiDollarSign />
              受注金額（円）*
            </Label>
            <Input
              type="number"
              name="receivedOrderAmount"
              value={formData.receivedOrderAmount}
              onChange={handleInputChange}
              placeholder="例：1000000"
              className={errors.receivedOrderAmount ? 'error' : ''}
              disabled={isLoading}
              min="1"
            />
            {errors.receivedOrderAmount && (
              <ErrorMessage>{errors.receivedOrderAmount}</ErrorMessage>
            )}
            {formData.receivedOrderAmount && !errors.receivedOrderAmount && (
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#27ae60', 
                marginTop: '0.25rem',
                fontWeight: '500'
              }}>
                金額: {formatAmount(formData.receivedOrderAmount)}円
              </div>
            )}
          </FormGroup>

          <FormGroup>
            <Label>
              <FiCalendar />
              開始日
            </Label>
            <Input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </FormGroup>

          <FormGroup>
            <Label>
              <FiCalendar />
              終了日
            </Label>
            <Input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </FormGroup>

          <FormGroup>
            <Label>
              <FiUser />
              営業担当
            </Label>
            <Select
              name="salesRep"
              value={formData.salesRep}
              onChange={handleInputChange}
              disabled={isLoading}
            >
              <option value="">選択してください</option>
              {staffList.filter(s => s.role === 'sales').map(staff => (
                <option key={staff.id} value={staff.name}>{staff.name}</option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>
              <FiUser />
              運用担当
            </Label>
            <Select
              name="operatorRep"
              value={formData.operatorRep}
              onChange={handleInputChange}
              disabled={isLoading}
            >
              <option value="">選択してください</option>
              {staffList.filter(s => s.role === 'operator').map(staff => (
                <option key={staff.id} value={staff.name}>{staff.name}</option>
              ))}
            </Select>
          </FormGroup>

          <div style={{ borderTop: '2px solid #e9ecef', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#3498db', fontWeight: 600 }}>
              <FiSend />
              契約書締結依頼（Slack送信）
            </div>

            <FormGroup>
              <Label>連絡グループ</Label>
              <Input
                type="text"
                name="contactGroup"
                value={formData.contactGroup}
                onChange={handleInputChange}
                placeholder="例：Slackグループ名、メールグループ等"
                disabled={isLoading}
              />
            </FormGroup>

            <FormGroup>
              <Label>契約雛形</Label>
              <Select
                name="contractTemplateHolder"
                value={formData.contractTemplateHolder}
                onChange={handleInputChange}
                disabled={isLoading}
              >
                <option value="ours">弊社が保有</option>
                <option value="theirs">先方が保有</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>契約内容</Label>
              <textarea
                name="contractDetails"
                value={formData.contractDetails}
                onChange={handleInputChange}
                placeholder="契約の概要を簡単に記入..."
                disabled={isLoading}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '0.75rem',
                  border: '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </FormGroup>
          </div>

          <ButtonGroup>
            <Button
              type="button"
              className="secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <FiX />
              キャンセル
            </Button>
            <Button
              type="submit"
              className="primary"
              disabled={isLoading}
            >
              <FiSave />
              {isLoading ? '保存中...' : '受注確定'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
}

export default ReceivedOrderModal;