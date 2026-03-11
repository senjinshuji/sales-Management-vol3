import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
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

const RefreshButton = styled.button`
  background: #95a5a6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: #7f8c8d;
  }
`;

const CalendarContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
  overflow-x: auto;
`;

const CalendarHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 1rem;
  background: #e9ecef;
  border: 1px solid #e9ecef;
`;

const DayHeader = styled.div`
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  color: #2c3e50;
  
  &.sunday {
    color: #e74c3c;
  }
  
  &.saturday {
    color: #3498db;
  }
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #e9ecef;
  border: 1px solid #e9ecef;
`;

const DayCell = styled.div`
  background: white;
  min-height: 100px;
  padding: 0.5rem;
  position: relative;
  
  &.other-month {
    background: #f8f9fa;
    color: #95a5a6;
  }
  
  &.today {
    background: #fff8dc;
  }
`;

const DayNumber = styled.div`
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
`;

const DealBar = styled.div`
  position: absolute;
  height: 20px;
  background: ${props => props.color};
  color: white;
  font-size: 0.75rem;
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  top: ${props => 25 + props.row * 25}px;
  left: ${props => props.isStart ? '0.5rem' : '0'};
  right: ${props => props.isEnd ? '0.5rem' : '0'};
  z-index: ${props => props.row};
  
  &:hover {
    opacity: 0.9;
    z-index: 10;
  }
`;

const Legend = styled.div`
  margin-top: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1.5rem;
`;

const LegendTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 1rem 0;
`;

const LegendGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendColor = styled.div`
  width: 20px;
  height: 20px;
  background: ${props => props.color};
  border-radius: 3px;
`;

const LegendText = styled.span`
  font-size: 0.9rem;
  color: #2c3e50;
`;

const InfoMessage = styled.div`
  background: #d1ecf1;
  color: #0c5460;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PostingCalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [dealColors, setDealColors] = useState({});
  const [loading, setLoading] = useState(true);

  // 色パレット
  const colorPalette = [
    '#e74c3c', '#f39c12', '#3498db', '#27ae60', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#16a085', '#2980b9'
  ];

  // 月の移動
  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // カレンダーの日付配列を生成
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // スケジュールデータを取得
  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const yearMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      const schedulesRef = collection(db, 'postingSchedules');
      const q = query(schedulesRef, where('yearMonth', '==', yearMonth));
      const querySnapshot = await getDocs(q);
      
      const schedulesList = [];
      const colors = {};
      let colorIndex = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        schedulesList.push({
          id: doc.id,
          ...data
        });
        
        // 案件に色を割り当て
        if (!colors[data.dealName]) {
          colors[data.dealName] = colorPalette[colorIndex % colorPalette.length];
          colorIndex++;
        }
      });
      
      setSchedules(schedulesList);
      setDealColors(colors);
    } catch (error) {
      console.error('スケジュール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 投稿期間を計算
  const calculatePostingPeriods = () => {
    const periods = [];
    
    schedules.forEach(schedule => {
      const postingDays = Object.entries(schedule.schedules || {})
        .filter(([_, count]) => count > 0)
        .map(([day]) => parseInt(day))
        .sort((a, b) => a - b);
      
      if (postingDays.length === 0) return;
      
      // 連続した日付をグループ化
      let currentPeriod = { 
        dealName: schedule.dealName, 
        start: postingDays[0], 
        end: postingDays[0] 
      };
      
      for (let i = 1; i < postingDays.length; i++) {
        if (postingDays[i] === currentPeriod.end + 1) {
          currentPeriod.end = postingDays[i];
        } else {
          periods.push({ ...currentPeriod });
          currentPeriod = { 
            dealName: schedule.dealName, 
            start: postingDays[i], 
            end: postingDays[i] 
          };
        }
      }
      periods.push(currentPeriod);
    });
    
    return periods;
  };

  // 初期データ取得
  useEffect(() => {
    fetchSchedules();
  }, [currentMonth]);

  const calendarDays = generateCalendarDays();
  const periods = calculatePostingPeriods();
  const yearMonth = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
  const today = new Date();

  // 期間の配置を計算（重なり回避）
  const assignRows = (periods) => {
    const sortedPeriods = [...periods].sort((a, b) => a.start - b.start);
    const rows = [];
    
    sortedPeriods.forEach(period => {
      let row = 0;
      while (true) {
        const canPlace = !rows[row] || rows[row].every(p => p.end < period.start);
        if (canPlace) {
          if (!rows[row]) rows[row] = [];
          rows[row].push(period);
          period.row = row;
          break;
        }
        row++;
      }
    });
    
    return sortedPeriods;
  };

  const periodsWithRows = assignRows(periods);

  return (
    <PageContainer>
      <Header>
        <Title>全体投稿スケジュールカレンダー（第一想起取れるくん）</Title>
        <Controls>
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
          <RefreshButton onClick={fetchSchedules}>
            <FiRefreshCw />
            更新
          </RefreshButton>
        </Controls>
      </Header>

      <InfoMessage>
        1日あたり30本を超えた場合は赤字で警告表示されます
      </InfoMessage>

      {loading ? (
        <div>読み込み中...</div>
      ) : (
        <>
          <CalendarContainer>
            <CalendarHeader>
              <DayHeader className="sunday">日</DayHeader>
              <DayHeader>月</DayHeader>
              <DayHeader>火</DayHeader>
              <DayHeader>水</DayHeader>
              <DayHeader>木</DayHeader>
              <DayHeader>金</DayHeader>
              <DayHeader className="saturday">土</DayHeader>
            </CalendarHeader>
            <CalendarGrid>
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = day.toDateString() === today.toDateString();
                const dayOfMonth = day.getDate();
                
                // この日に関連する期間を取得
                const dayPeriods = periodsWithRows.filter(period => {
                  if (!isCurrentMonth) return false;
                  return dayOfMonth >= period.start && dayOfMonth <= period.end;
                });
                
                return (
                  <DayCell 
                    key={index}
                    className={`${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <DayNumber>{dayOfMonth}</DayNumber>
                    {dayPeriods.map((period, idx) => {
                      // この日の投稿本数を取得
                      const schedule = schedules.find(s => s.dealName === period.dealName);
                      const postCount = schedule?.schedules?.[dayOfMonth] || 0;
                      
                      return (
                        <DealBar
                          key={`${period.dealName}-${idx}`}
                          color={dealColors[period.dealName]}
                          row={period.row}
                          isStart={dayOfMonth === period.start}
                          isEnd={dayOfMonth === period.end}
                        >
                          {postCount > 0 && `${postCount}本`}
                          {dayOfMonth === period.start && ` ${period.dealName}`}
                        </DealBar>
                      );
                    })}
                  </DayCell>
                );
              })}
            </CalendarGrid>
          </CalendarContainer>

          <Legend>
            <LegendTitle>案件一覧</LegendTitle>
            <LegendGrid>
              {Object.entries(dealColors).map(([dealName, color]) => (
                <LegendItem key={dealName}>
                  <LegendColor color={color} />
                  <LegendText>{dealName}</LegendText>
                </LegendItem>
              ))}
            </LegendGrid>
          </Legend>
        </>
      )}
    </PageContainer>
  );
};

export default PostingCalendarPage;