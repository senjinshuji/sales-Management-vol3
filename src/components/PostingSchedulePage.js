import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiChevronLeft, FiChevronRight, FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const PageContainer = styled.div`
  width: 100%;
  padding: 0 2rem;
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

const MonthSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const MonthButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #2980b9;
  }
`;

const CurrentMonth = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
  min-width: 120px;
  text-align: center;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  background: ${props => props.primary ? '#27ae60' : '#3498db'};
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  
  &:hover {
    background: ${props => props.primary ? '#219a52' : '#2980b9'};
  }
`;

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-x: auto;
  margin-bottom: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
`;

const Th = styled.th`
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  color: #2c3e50;
  border: 1px solid #e9ecef;
  
  &:first-child {
    text-align: left;
    min-width: 200px;
  }
`;

const Td = styled.td`
  padding: 0.5rem;
  text-align: center;
  border: 1px solid #e9ecef;
  
  &:first-child {
    text-align: left;
    font-weight: 500;
    background: #f8f9fa;
  }
`;

const DealNameCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  
  &:hover {
    color: #c0392b;
  }
`;

const NumberInput = styled.input`
  width: 50px;
  padding: 0.25rem;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const SummarySection = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  margin-top: 2rem;
`;

const SummaryTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 1rem 0;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`;

const SummaryCard = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
`;

const SummaryLabel = styled.div`
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const SummaryValue = styled.div`
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
`;

const TotalCell = styled(Td)`
  background: #e3f2fd;
  font-weight: 600;
  color: #1976d2;
`;

const GrandTotalCell = styled(TotalCell)`
  background: #bbdefb;
  font-size: 1.1rem;
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

const ModalHeader = styled.h3`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
`;

const DealList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
`;

const DealItem = styled.label`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #e9ecef;
  }
`;

const Checkbox = styled.input`
  margin-right: 0.75rem;
`;

const PostingSchedulePage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // 日別の合計を計算
  const calculateDailyTotals = (day) => {
    let total = 0;
    schedules.forEach(schedule => {
      total += parseInt(schedule.schedules?.[day] || 0);
    });
    return total;
  };

  // 案件ごとの合計を計算
  const calculateDealTotal = (schedule) => {
    let total = 0;
    Object.values(schedule.schedules || {}).forEach(count => {
      total += parseInt(count) || 0;
    });
    return total;
  };

  // 全体の合計を計算
  const calculateGrandTotal = () => {
    let total = 0;
    schedules.forEach(schedule => {
      Object.values(schedule.schedules || {}).forEach(count => {
        total += parseInt(count) || 0;
      });
    });
    return total;
  };

  // 月の日数を取得
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // 月の移動
  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // 「第一想起取れるくん」の受注案件を取得
  const fetchFirstRecallDeals = async () => {
    try {
      const dealsRef = collection(db, 'progressDashboard');
      const q = query(
        dealsRef, 
        where('proposalMenu', '==', '第一想起取れるくん'),
        where('status', '==', 'フェーズ8')
      );
      const querySnapshot = await getDocs(q);
      
      const dealsList = [];
      querySnapshot.forEach((doc) => {
        dealsList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setDeals(dealsList);
    } catch (error) {
      console.error('案件取得エラー:', error);
    }
  };

  // スケジュールデータを取得し、実施月に基づいて自動登録
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const yearMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const schedulesRef = collection(db, 'postingSchedules');
      const q = query(schedulesRef, where('yearMonth', '==', yearMonth));
      const querySnapshot = await getDocs(q);
      
      const schedulesList = [];
      const existingDealIds = new Set();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        schedulesList.push({
          id: doc.id,
          ...data
        });
        if (data.dealId) {
          existingDealIds.add(data.dealId);
        }
      });
      
      // 実施月が現在の月と一致する案件を自動登録
      const dealsToAutoRegister = deals.filter(deal => 
        deal.receivedOrderMonth === yearMonth && !existingDealIds.has(deal.id)
      );
      
      for (const deal of dealsToAutoRegister) {
        const scheduleData = {
          dealId: deal.id,
          dealName: deal.productName,
          yearMonth: yearMonth,
          schedules: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        try {
          const docRef = doc(collection(db, 'postingSchedules'));
          await setDoc(docRef, scheduleData);
          console.log(`✅ 案件「${deal.productName}」を自動登録しました`);
        } catch (error) {
          console.error('自動登録エラー:', error);
        }
      }
      
      // 自動登録後に再度データを取得
      if (dealsToAutoRegister.length > 0) {
        const updatedQuerySnapshot = await getDocs(q);
        const updatedSchedulesList = [];
        updatedQuerySnapshot.forEach((doc) => {
          updatedSchedulesList.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setSchedules(updatedSchedulesList);
      } else {
        setSchedules(schedulesList);
      }
    } catch (error) {
      console.error('スケジュール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 投稿本数を更新
  const updatePostingCount = async (scheduleId, day, count) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) return;

      const updatedSchedules = {
        ...schedule.schedules,
        [day]: parseInt(count) || 0
      };

      const docRef = doc(db, 'postingSchedules', scheduleId);
      await setDoc(docRef, {
        ...schedule,
        schedules: updatedSchedules,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // ローカル状態を更新
      setSchedules(prev => prev.map(s => 
        s.id === scheduleId 
          ? { ...s, schedules: updatedSchedules }
          : s
      ));
    } catch (error) {
      console.error('投稿本数更新エラー:', error);
    }
  };

  // 案件を追加
  const addDeals = async () => {
    if (selectedDeals.length === 0) return;

    const yearMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    for (const dealId of selectedDeals) {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) continue;

      const existingSchedule = schedules.find(s => s.dealId === dealId);
      if (existingSchedule) continue;

      const scheduleData = {
        dealId: deal.id,
        dealName: deal.productName,
        yearMonth: yearMonth,
        schedules: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        const docRef = doc(collection(db, 'postingSchedules'));
        await setDoc(docRef, scheduleData);
      } catch (error) {
        console.error('案件追加エラー:', error);
      }
    }

    setShowAddModal(false);
    setSelectedDeals([]);
    fetchSchedules();
  };

  // 案件を削除
  const deleteDeal = async (scheduleId) => {
    if (!window.confirm('この案件を削除してもよろしいですか？')) return;

    try {
      await deleteDoc(doc(db, 'postingSchedules', scheduleId));
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('案件削除エラー:', error);
    }
  };

  // 初期データ取得
  useEffect(() => {
    fetchFirstRecallDeals();
  }, []);

  useEffect(() => {
    if (deals.length > 0) {
      fetchSchedules();
    }
  }, [currentMonth, deals]);

  // 月間投稿本数集計
  const calculateMonthlyStats = () => {
    let totalPosts = 0;
    const dealTotals = {};

    schedules.forEach(schedule => {
      dealTotals[schedule.dealName] = 0;
      Object.values(schedule.schedules || {}).forEach(count => {
        const num = parseInt(count) || 0;
        totalPosts += num;
        dealTotals[schedule.dealName] += num;
      });
    });

    return { totalPosts, dealTotals };
  };

  const stats = calculateMonthlyStats();
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const yearMonth = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

  return (
    <PageContainer>
      <Header>
        <Title>案件別投稿本数記録・管理（第一想起取れるくん）</Title>
        <MonthSelector>
          <MonthButton onClick={() => changeMonth(-1)}>
            <FiChevronLeft />
            前月
          </MonthButton>
          <CurrentMonth>{yearMonth}</CurrentMonth>
          <MonthButton onClick={() => changeMonth(1)}>
            次月
            <FiChevronRight />
          </MonthButton>
        </MonthSelector>
      </Header>

      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <>
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <Th>案件名</Th>
                  <Th style={{ minWidth: '80px' }}>合計</Th>
                  {days.map(day => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                    return (
                      <Th key={day}>
                        {currentMonth.getMonth() + 1}/{day}<br />
                        ({dayOfWeek})
                      </Th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* 合計行 */}
                <tr>
                  <TotalCell>合計</TotalCell>
                  <GrandTotalCell>{calculateGrandTotal()}</GrandTotalCell>
                  {days.map(day => (
                    <TotalCell key={day}>
                      {calculateDailyTotals(day)}
                    </TotalCell>
                  ))}
                </tr>
                {/* 各案件の行 */}
                {schedules.map(schedule => (
                  <tr key={schedule.id}>
                    <Td>
                      <DealNameCell>
                        {schedule.dealName}
                        <DeleteButton onClick={() => deleteDeal(schedule.id)}>
                          <FiTrash2 size={16} />
                        </DeleteButton>
                      </DealNameCell>
                    </Td>
                    <TotalCell>
                      {calculateDealTotal(schedule)}
                    </TotalCell>
                    {days.map(day => (
                      <Td key={day}>
                        <NumberInput
                          type="number"
                          min="0"
                          value={schedule.schedules?.[day] || 0}
                          onChange={(e) => updatePostingCount(schedule.id, day, e.target.value)}
                        />
                      </Td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>

          <ActionButtons>
            <Button onClick={() => setShowAddModal(true)}>
              <FiPlus />
              案件追加
            </Button>
            <Button primary>
              <FiSave />
              保存
            </Button>
          </ActionButtons>

          <SummarySection>
            <SummaryTitle>月間投稿本数集計</SummaryTitle>
            <SummaryGrid>
              {Object.entries(stats.dealTotals).map(([dealName, total]) => (
                <SummaryCard key={dealName}>
                  <SummaryLabel>{dealName}</SummaryLabel>
                  <SummaryValue>{total}本</SummaryValue>
                </SummaryCard>
              ))}
            </SummaryGrid>
          </SummarySection>
        </>
      )}

      {showAddModal && (
        <Modal onClick={() => setShowAddModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>案件を追加</ModalHeader>
            <DealList>
              {deals.filter(deal => !schedules.some(s => s.dealId === deal.id)).map(deal => (
                <DealItem key={deal.id}>
                  <Checkbox
                    type="checkbox"
                    checked={selectedDeals.includes(deal.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDeals([...selectedDeals, deal.id]);
                      } else {
                        setSelectedDeals(selectedDeals.filter(id => id !== deal.id));
                      }
                    }}
                  />
                  {deal.productName}
                </DealItem>
              ))}
            </DealList>
            <ActionButtons style={{ marginTop: '1.5rem' }}>
              <Button onClick={addDeals} primary>
                追加
              </Button>
              <Button onClick={() => {
                setShowAddModal(false);
                setSelectedDeals([]);
              }}>
                キャンセル
              </Button>
            </ActionButtons>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
};

export default PostingSchedulePage;