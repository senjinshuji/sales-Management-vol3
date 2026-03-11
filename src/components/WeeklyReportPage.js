import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { FiPlus, FiTrash2, FiSave, FiSettings, FiChevronDown, FiChevronUp, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';
import { db } from '../firebase.js';
import { collection, doc, getDocs, getDoc, setDoc, query, where, orderBy } from 'firebase/firestore';
import { PROPOSAL_MENUS } from '../data/constants.js';

const Container = styled.div`
  max-width: 1400px;
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

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const WeekSelector = styled.select`
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  min-width: 280px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &.primary {
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
    }
  }

  &.secondary {
    background: #95a5a6;
    color: white;

    &:hover {
      background: #7f8c8d;
    }
  }

  &.success {
    background: linear-gradient(135deg, #27ae60 0%, #219a52 100%);
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
    }
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  overflow: hidden;
`;

const CardHeader = styled.div`
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;

  &.settings {
    background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  }

  &.auto {
    background: linear-gradient(135deg, #27ae60 0%, #219a52 100%);
  }

  &.action {
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
  }

  &.review {
    background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
  }
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const QuarterInfo = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;
`;

const KGISection = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const KGIHeader = styled.div`
  background: #f8f9fa;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
`;

const KGIContent = styled.div`
  padding: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #3498db;
  }

  &.name {
    flex: 1;
    min-width: 200px;
  }

  &.number {
    width: 120px;
    text-align: right;
  }
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const Label = styled.label`
  font-size: 0.85rem;
  color: #666;
  min-width: 60px;
`;

const SmallButton = styled.button`
  padding: 0.4rem 0.6rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;

  &.add {
    background: #3498db;
    color: white;

    &:hover {
      background: #2980b9;
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  color: #333;

  &.number {
    text-align: right;
  }
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;

  &.number {
    text-align: right;
    font-weight: 500;
  }

  &.progress {
    width: 200px;
  }
`;

const ProgressBar = styled.div`
  background: #e0e0e0;
  border-radius: 10px;
  height: 20px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
  background: ${props => {
    if (props.percent >= 100) return 'linear-gradient(135deg, #27ae60 0%, #219a52 100%)';
    if (props.percent >= 70) return 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    if (props.percent >= 40) return 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
    return 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)';
  }};
`;

const ProgressText = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.75rem;
  font-weight: bold;
  color: ${props => props.percent > 40 ? 'white' : '#333'};
`;

const ActionResultSelect = styled.select`
  padding: 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: ${props => {
    if (props.value === '◯') return '#e8f5e9';
    if (props.value === '×') return '#ffebee';
    if (props.value === '△') return '#fff3e0';
    return 'white';
  }};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 600px;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  line-height: 1.6;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const CharCount = styled.div`
  text-align: right;
  font-size: 0.8rem;
  color: ${props => props.over ? '#e74c3c' : '#999'};
  margin-top: 0.5rem;
`;

const AutoDataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
`;

const AutoDataCard = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
`;

const AutoDataTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #3498db;
`;

const AutoDataItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;

  &:last-child {
    border-bottom: none;
  }
`;

const AutoDataLabel = styled.span`
  color: #666;
`;

const AutoDataValue = styled.span`
  font-weight: 600;
  color: #333;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: #999;
`;

const SaveStatus = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &.success {
    background: #e8f5e9;
    color: #27ae60;
  }

  &.error {
    background: #ffebee;
    color: #e74c3c;
  }
`;

function WeeklyReportPage() {
  // 週の計算（火曜始まり月曜終わり）
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    // 火曜日を0として計算（日=5, 月=6, 火=0, 水=1, 木=2, 金=3, 土=4）
    const diff = (day + 5) % 7;
    const tuesday = new Date(d);
    tuesday.setDate(d.getDate() - diff);
    tuesday.setHours(0, 0, 0, 0);

    const monday = new Date(tuesday);
    monday.setDate(tuesday.getDate() + 6);
    monday.setHours(23, 59, 59, 999);

    return { start: tuesday, end: monday };
  };

  const formatDateRange = (start, end) => {
    const format = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${start.getFullYear()}年 ${format(start)}(火) 〜 ${format(end)}(月)`;
  };

  const getWeekId = (date) => {
    const week = getWeekRange(date);
    return `${week.start.getFullYear()}-${String(week.start.getMonth() + 1).padStart(2, '0')}-${String(week.start.getDate()).padStart(2, '0')}`;
  };

  // 四半期の計算
  const getQuarter = (date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    const quarterNum = Math.floor(month / 3) + 1;
    const quarterStart = new Date(year, (quarterNum - 1) * 3, 1);
    const quarterEnd = new Date(year, quarterNum * 3, 0, 23, 59, 59);
    return {
      label: `${year}年 Q${quarterNum}`,
      start: quarterStart,
      end: quarterEnd,
      id: `${year}-Q${quarterNum}`
    };
  };

  const currentWeek = getWeekRange(new Date());
  const currentWeekId = getWeekId(new Date());
  const currentQuarter = getQuarter(new Date());

  // State
  const [selectedWeekId, setSelectedWeekId] = useState(currentWeekId);
  const [weekOptions, setWeekOptions] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  // KGI/KPI設定
  const [showSettings, setShowSettings] = useState(false);
  const [quarterSettings, setQuarterSettings] = useState({
    quarterId: currentQuarter.id,
    kgis: []
  });

  // 週次データ
  const [weeklyData, setWeeklyData] = useState({
    weekId: currentWeekId,
    kgiValues: {},  // KGI用の今週実績
    kpiValues: {},
    actions: [],
    previousActionResults: [],
    review: ''
  });

  // 自動集計データ（週次）
  const [autoData, setAutoData] = useState({});

  // 四半期集計データ（KGI用）
  const [quarterAutoData, setQuarterAutoData] = useState({});

  // 先週の累計データ（累計計算用）
  const [previousWeekCumulatives, setPreviousWeekCumulatives] = useState({
    kgiCumulatives: {},
    kpiCumulatives: {}
  });

  // UI State
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    settings: false,
    kpi: true,
    auto: true,
    action: true,
    review: true
  });

  // 新規追加用の入力状態
  const [newKGIName, setNewKGIName] = useState('');
  const [newKGITarget, setNewKGITarget] = useState('');
  const [newKPIInputs, setNewKPIInputs] = useState({}); // { kgiId: { name: '', target: '' } }

  // 初回読み込み完了フラグ
  const quarterSettingsLoaded = useRef(false);
  const weeklyDataLoaded = useRef({});

  // 週の選択肢を生成（過去12週 + 今週）
  useEffect(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 13; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i * 7));
      const week = getWeekRange(d);
      const weekId = getWeekId(d);
      options.push({
        id: weekId,
        label: formatDateRange(week.start, week.end),
        start: week.start,
        end: week.end,
        isCurrent: i === 0
      });
    }
    setWeekOptions(options);
  }, []);

  // 週が変更されたら週範囲を更新
  useEffect(() => {
    const option = weekOptions.find(w => w.id === selectedWeekId);
    if (option) {
      setSelectedWeek(prev => {
        // 同じ値なら更新しない（不要な再レンダリングを防ぐ）
        if (prev.start?.getTime() === option.start.getTime() &&
            prev.end?.getTime() === option.end.getTime()) {
          return prev;
        }
        return { start: option.start, end: option.end };
      });
    }
  }, [selectedWeekId, weekOptions]);

  // 四半期設定を読み込み
  const loadQuarterSettings = async () => {
    // 既に読み込み開始済みなら何もしない（読み込み開始時にフラグをセット）
    if (quarterSettingsLoaded.current) {
      return;
    }
    // 読み込み開始時にフラグをセット（非同期完了前に再実行を防ぐ）
    quarterSettingsLoaded.current = true;

    try {
      const docRef = doc(db, 'weeklyReportSettings', currentQuarter.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuarterSettings(docSnap.data());
      } else {
        setQuarterSettings({
          quarterId: currentQuarter.id,
          kgis: []
        });
      }
    } catch (error) {
      console.error('設定読み込みエラー:', error);
      // エラー時はフラグをリセットしてリトライ可能に
      quarterSettingsLoaded.current = false;
    }
  };

  // 週次データを読み込み
  const loadWeeklyData = async (weekId) => {
    const targetWeekId = weekId || selectedWeekId;
    console.log('loadWeeklyData called for:', targetWeekId);
    try {
      const docRef = doc(db, 'weeklyReports', targetWeekId);
      const docSnap = await getDoc(docRef);

      // 先週の累計データを取得（weekOptionsに依存せず直接計算）
      let prevWeekCumulatives = { kgiCumulatives: {}, kpiCumulatives: {} };

      // targetWeekIdから先週のIDを計算（例: "2025-12-02" -> "2025-11-25"）
      const [year, month, day] = targetWeekId.split('-').map(Number);
      const currentWeekStart = new Date(year, month - 1, day);
      const prevWeekDate = new Date(currentWeekStart);
      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
      const prevWeekId = getWeekId(prevWeekDate);

      console.log('📊 先週のID計算:', targetWeekId, '→', prevWeekId);

      const prevDocRef = doc(db, 'weeklyReports', prevWeekId);
      const prevDocSnap = await getDoc(prevDocRef);

      if (prevDocSnap.exists()) {
        const prevData = prevDocSnap.data();
        // 先週の累計値を取得（先週の累計フィールドがあればそれを使用、なければ先週の実績値を使用）
        prevWeekCumulatives = {
          kgiCumulatives: prevData.kgiCumulatives || prevData.kgiValues || {},
          kpiCumulatives: prevData.kpiCumulatives || prevData.kpiValues || {}
        };
        console.log('📊 先週の累計データ取得:', prevWeekId, prevWeekCumulatives);
      } else {
        console.log('📊 先週のデータなし:', prevWeekId);
      }

      console.log('📊 設定する先週累計:', prevWeekCumulatives);
      setPreviousWeekCumulatives(prevWeekCumulatives);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Loaded data for', targetWeekId, ':', data.weekId);
        // kgiValuesが無い古いデータの場合は空オブジェクトを追加
        setWeeklyData({
          ...data,
          weekId: targetWeekId,
          kgiValues: data.kgiValues || {},
          kpiValues: data.kpiValues || {},
          actions: data.actions || [],
          previousActionResults: data.previousActionResults || [],
          review: data.review || ''
        });
      } else {
        // 前週のアクションを取得して結果入力用に設定（prevWeekIdは上で既に計算済み）
        let previousActions = [];

        if (prevDocSnap.exists() && prevDocSnap.data().actions) {
          previousActions = prevDocSnap.data().actions
            .filter(a => a.content && a.content.trim() !== '')
            .map(action => ({
              ...action,
              result: '',
              resultNote: ''
            }));
        }

        console.log('No existing data, creating new for:', targetWeekId);
        setWeeklyData({
          weekId: targetWeekId,
          kgiValues: {},
          kpiValues: {},
          actions: [],
          previousActionResults: previousActions,
          review: ''
        });
      }
    } catch (error) {
      console.error('週次データ読み込みエラー:', error);
    }
  };

  // 自動集計データを読み込み
  const loadAutoData = async () => {
    try {
      const progressRef = collection(db, 'progressDashboard');
      const snapshot = await getDocs(progressRef);

      const serviceData = {};
      PROPOSAL_MENUS.forEach(menu => {
        serviceData[menu] = {
          newDeals: 0,
          closedDeals: 0,
          closedAmount: 0
        };
      });

      snapshot.forEach(docSnap => {
        const deal = docSnap.data();
        const menu = deal.proposalMenu;
        if (!menu || !serviceData[menu]) return;

        // 新規商談数（createdAtが今週の範囲内）
        if (deal.createdAt) {
          const createdDate = deal.createdAt.toDate ? deal.createdAt.toDate() : new Date(deal.createdAt);
          if (createdDate >= selectedWeek.start && createdDate <= selectedWeek.end) {
            serviceData[menu].newDeals++;
          }
        }

        // 成約（confirmedDateが今週の範囲内かつフェーズ8）
        if (deal.status === 'フェーズ8' && deal.confirmedDate) {
          const dateStr = deal.confirmedDate.replace(/\//g, '-');
          const confirmedDate = new Date(dateStr);
          if (confirmedDate >= selectedWeek.start && confirmedDate <= selectedWeek.end) {
            serviceData[menu].closedDeals++;
            serviceData[menu].closedAmount += deal.receivedOrderAmount || 0;
          }
        }
      });

      setAutoData(serviceData);
    } catch (error) {
      console.error('自動集計エラー:', error);
    }
  };

  // 四半期集計データを読み込み（KGI用）
  const loadQuarterAutoData = async () => {
    try {
      const progressRef = collection(db, 'progressDashboard');
      const snapshot = await getDocs(progressRef);

      const serviceData = {};
      // 全サービス + 「全体」を初期化
      PROPOSAL_MENUS.forEach(menu => {
        serviceData[menu] = {
          sales: 0,
          closedCount: 0,
          dealCount: 0
        };
      });
      serviceData['全体'] = {
        sales: 0,
        closedCount: 0,
        dealCount: 0
      };

      snapshot.forEach(docSnap => {
        const deal = docSnap.data();
        const menu = deal.proposalMenu;

        // 四半期内の案件をカウント（createdAtベース）
        if (deal.createdAt) {
          const createdDate = deal.createdAt.toDate ? deal.createdAt.toDate() : new Date(deal.createdAt);
          if (createdDate >= currentQuarter.start && createdDate <= currentQuarter.end) {
            if (menu && serviceData[menu]) {
              serviceData[menu].dealCount++;
            }
            serviceData['全体'].dealCount++;
          }
        }

        // 成約（confirmedDateが四半期内かつフェーズ8）
        if (deal.status === 'フェーズ8' && deal.confirmedDate) {
          const dateStr = deal.confirmedDate.replace(/\//g, '-');
          const confirmedDate = new Date(dateStr);
          if (confirmedDate >= currentQuarter.start && confirmedDate <= currentQuarter.end) {
            const amount = deal.receivedOrderAmount || 0;
            if (menu && serviceData[menu]) {
              serviceData[menu].closedCount++;
              serviceData[menu].sales += amount;
            }
            serviceData['全体'].closedCount++;
            serviceData['全体'].sales += amount;
          }
        }
      });

      setQuarterAutoData(serviceData);
    } catch (error) {
      console.error('四半期集計エラー:', error);
    }
  };

  // 初回読み込み - 四半期設定のみ
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadQuarterSettings();
      loadQuarterAutoData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 週が変更されたら週次データを再読み込み
  useEffect(() => {
    if (selectedWeekId && weekOptions.length > 0) {
      console.log('Week changed to:', selectedWeekId);
      loadWeeklyData(selectedWeekId);
      loadAutoData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekId, weekOptions]);

  // 四半期設定を保存
  const saveQuarterSettings = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'weeklyReportSettings', currentQuarter.id);
      await setDoc(docRef, quarterSettings);
      setSaveStatus({ type: 'success', message: '設定を保存しました' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('設定保存エラー:', error);
      setSaveStatus({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  // 週次データを保存
  const saveWeeklyData = async () => {
    setSaving(true);
    try {
      // 今週の累計を計算（先週の累計 + 今週の実績）
      const kgiCumulatives = {};
      const kpiCumulatives = {};

      // KGI累計を計算
      Object.keys(weeklyData.kgiValues || {}).forEach(kgiId => {
        const prevCumulative = previousWeekCumulatives.kgiCumulatives[kgiId] || 0;
        const thisWeekValue = weeklyData.kgiValues[kgiId] || 0;
        kgiCumulatives[kgiId] = prevCumulative + thisWeekValue;
      });
      // 先週にあって今週入力がないKGIも引き継ぐ
      Object.keys(previousWeekCumulatives.kgiCumulatives || {}).forEach(kgiId => {
        if (!(kgiId in kgiCumulatives)) {
          kgiCumulatives[kgiId] = previousWeekCumulatives.kgiCumulatives[kgiId];
        }
      });

      // KPI累計を計算
      Object.keys(weeklyData.kpiValues || {}).forEach(kpiId => {
        const prevCumulative = previousWeekCumulatives.kpiCumulatives[kpiId] || 0;
        const thisWeekValue = weeklyData.kpiValues[kpiId] || 0;
        kpiCumulatives[kpiId] = prevCumulative + thisWeekValue;
      });
      // 先週にあって今週入力がないKPIも引き継ぐ
      Object.keys(previousWeekCumulatives.kpiCumulatives || {}).forEach(kpiId => {
        if (!(kpiId in kpiCumulatives)) {
          kpiCumulatives[kpiId] = previousWeekCumulatives.kpiCumulatives[kpiId];
        }
      });

      const docRef = doc(db, 'weeklyReports', selectedWeekId);
      await setDoc(docRef, {
        ...weeklyData,
        weekId: selectedWeekId,
        weekStart: selectedWeek.start.toISOString(),
        weekEnd: selectedWeek.end.toISOString(),
        kgiCumulatives,
        kpiCumulatives,
        updatedAt: new Date().toISOString()
      });
      setSaveStatus({ type: 'success', message: '週報を保存しました' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('週報保存エラー:', error);
      setSaveStatus({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  // KGI追加（入力フォームから）
  const handleAddKGI = () => {
    if (!newKGIName.trim()) {
      alert('KGI名を入力してください');
      return;
    }
    const newKGI = {
      id: Date.now().toString(),
      name: newKGIName.trim(),
      target: parseFloat(newKGITarget) || 0,
      unit: '円',
      autoAggregate: false,
      aggregateService: '',
      aggregateMetric: 'sales',
      kpis: []
    };
    setQuarterSettings(prev => ({
      ...prev,
      kgis: [...prev.kgis, newKGI]
    }));
    setNewKGIName('');
    setNewKGITarget('');
  };

  // KGI削除
  const deleteKGI = (kgiId) => {
    setQuarterSettings(prev => ({
      ...prev,
      kgis: prev.kgis.filter(k => k.id !== kgiId)
    }));
  };

  // KGI更新
  const updateKGI = (kgiId, field, value) => {
    setQuarterSettings(prev => ({
      ...prev,
      kgis: prev.kgis.map(k => k.id === kgiId ? { ...k, [field]: value } : k)
    }));
  };

  // KPI追加（入力フォームから）
  const handleAddKPI = (kgiId) => {
    const input = newKPIInputs[kgiId] || { name: '', target: '' };
    if (!input.name.trim()) {
      alert('KPI名を入力してください');
      return;
    }
    setQuarterSettings(prev => ({
      ...prev,
      kgis: prev.kgis.map(k => k.id === kgiId ? {
        ...k,
        kpis: [...k.kpis, {
          id: Date.now().toString(),
          name: input.name.trim(),
          target: parseFloat(input.target) || 0,
          unit: '件'
        }]
      } : k)
    }));
    // 入力欄をクリア
    setNewKPIInputs(prev => ({
      ...prev,
      [kgiId]: { name: '', target: '' }
    }));
  };

  // 新規KPI入力欄の更新
  const updateNewKPIInput = (kgiId, field, value) => {
    setNewKPIInputs(prev => ({
      ...prev,
      [kgiId]: {
        ...(prev[kgiId] || { name: '', target: '' }),
        [field]: value
      }
    }));
  };

  // KPI削除
  const deleteKPI = (kgiId, kpiId) => {
    setQuarterSettings(prev => ({
      ...prev,
      kgis: prev.kgis.map(k => k.id === kgiId ? {
        ...k,
        kpis: k.kpis.filter(p => p.id !== kpiId)
      } : k)
    }));
  };

  // KPI更新
  const updateKPI = (kgiId, kpiId, field, value) => {
    setQuarterSettings(prev => ({
      ...prev,
      kgis: prev.kgis.map(k => k.id === kgiId ? {
        ...k,
        kpis: k.kpis.map(p => p.id === kpiId ? { ...p, [field]: value } : p)
      } : k)
    }));
  };

  // 週次KGI値更新
  const updateKGIValue = (kgiId, value) => {
    setWeeklyData(prev => ({
      ...prev,
      kgiValues: {
        ...prev.kgiValues,
        [kgiId]: parseFloat(value) || 0
      }
    }));
  };

  // 週次KPI値更新
  const updateKPIValue = (kpiId, value) => {
    setWeeklyData(prev => ({
      ...prev,
      kpiValues: {
        ...prev.kpiValues,
        [kpiId]: parseFloat(value) || 0
      }
    }));
  };

  // アクション追加
  const addAction = () => {
    setWeeklyData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        id: Date.now().toString(),
        content: ''
      }]
    }));
  };

  // アクション削除
  const deleteAction = (actionId) => {
    setWeeklyData(prev => ({
      ...prev,
      actions: prev.actions.filter(a => a.id !== actionId)
    }));
  };

  // アクション更新
  const updateAction = (actionId, field, value) => {
    setWeeklyData(prev => ({
      ...prev,
      actions: prev.actions.map(a => a.id === actionId ? { ...a, [field]: value } : a)
    }));
  };

  // 前週アクション結果更新
  const updatePreviousActionResult = (actionId, field, value) => {
    setWeeklyData(prev => ({
      ...prev,
      previousActionResults: prev.previousActionResults.map(a =>
        a.id === actionId ? { ...a, [field]: value } : a
      )
    }));
  };

  // 累計値を計算（四半期内の全週を合算）
  const calculateCumulativeValues = useCallback(async () => {
    // 今週までの四半期内の全週のKPI値を合算
    // 簡易版：現在の値のみ表示
    return weeklyData.kpiValues;
  }, [weeklyData.kpiValues]);

  const formatNumber = (num, unit) => {
    if (unit === '円') {
      return new Intl.NumberFormat('ja-JP').format(num) + '円';
    }
    return new Intl.NumberFormat('ja-JP').format(num) + unit;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Container>
      <Header>
        <Title>週報</Title>
        <HeaderActions>
          <WeekSelector
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
          >
            {weekOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label} {option.isCurrent ? '（今週）' : ''}
              </option>
            ))}
          </WeekSelector>
          {saveStatus && (
            <SaveStatus className={saveStatus.type}>
              {saveStatus.type === 'success' ? <FiCheck /> : <FiX />}
              {saveStatus.message}
            </SaveStatus>
          )}
          <Button className="success" onClick={saveWeeklyData} disabled={saving}>
            <FiSave />
            {saving ? '保存中...' : '週報を保存'}
          </Button>
        </HeaderActions>
      </Header>

      {/* 四半期KGI/KPI設定 */}
      <Card>
        <CardHeader
          className="settings"
          onClick={() => toggleSection('settings')}
        >
          <CardTitle>
            <FiSettings />
            四半期KGI/KPI設定（{currentQuarter.label}）
          </CardTitle>
          {expandedSections.settings ? <FiChevronUp /> : <FiChevronDown />}
        </CardHeader>
        {expandedSections.settings && (
          <CardContent>
            <QuarterInfo>
              期間: {currentQuarter.start.toLocaleDateString('ja-JP')} 〜 {currentQuarter.end.toLocaleDateString('ja-JP')}
            </QuarterInfo>

            {quarterSettings.kgis.map(kgi => (
              <KGISection key={kgi.id}>
                <KGIHeader>
                  <span style={{ fontWeight: 'bold' }}>KGI</span>
                  <SmallButton type="button" className="delete" onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteKGI(kgi.id); }}>
                    <FiTrash2 /> 削除
                  </SmallButton>
                </KGIHeader>
                <KGIContent>
                  <InputGroup>
                    <Label>名称:</Label>
                    <Input
                      className="name"
                      placeholder="例: 四半期売上"
                      value={kgi.name}
                      onChange={(e) => updateKGI(kgi.id, 'name', e.target.value)}
                    />
                    <Label>目標:</Label>
                    <Input
                      className="number"
                      type="number"
                      value={kgi.target}
                      onChange={(e) => updateKGI(kgi.id, 'target', parseFloat(e.target.value) || 0)}
                    />
                    <Select
                      value={kgi.unit}
                      onChange={(e) => updateKGI(kgi.id, 'unit', e.target.value)}
                    >
                      <option value="円">円</option>
                      <option value="件">件</option>
                      <option value="個">個</option>
                      <option value="%">%</option>
                      <option value="人">人</option>
                      <option value="日">日</option>
                    </Select>
                  </InputGroup>

                  <InputGroup style={{ marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={kgi.autoAggregate || false}
                        onChange={(e) => updateKGI(kgi.id, 'autoAggregate', e.target.checked)}
                      />
                      <span style={{ fontWeight: 'bold', color: '#27ae60' }}>自動集計する</span>
                    </label>
                    {kgi.autoAggregate && (
                      <>
                        <Label>サービス:</Label>
                        <Select
                          value={kgi.aggregateService || ''}
                          onChange={(e) => updateKGI(kgi.id, 'aggregateService', e.target.value)}
                        >
                          <option value="">選択してください</option>
                          <option value="全体">全体</option>
                          {PROPOSAL_MENUS.map(menu => (
                            <option key={menu} value={menu}>{menu}</option>
                          ))}
                        </Select>
                        <Label>指標:</Label>
                        <Select
                          value={kgi.aggregateMetric || 'sales'}
                          onChange={(e) => updateKGI(kgi.id, 'aggregateMetric', e.target.value)}
                        >
                          <option value="sales">成約金額</option>
                          <option value="closedCount">成約件数</option>
                          <option value="dealCount">新規商談数</option>
                        </Select>
                      </>
                    )}
                  </InputGroup>

                  <div style={{ marginTop: '1rem', marginLeft: '1rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>
                      KPI一覧
                    </div>
                    {kgi.kpis.map(kpi => (
                      <InputGroup key={kpi.id}>
                        <Label>KPI:</Label>
                        <Input
                          className="name"
                          placeholder="例: 新規商談数"
                          value={kpi.name}
                          onChange={(e) => updateKPI(kgi.id, kpi.id, 'name', e.target.value)}
                        />
                        <Label>目標:</Label>
                        <Input
                          className="number"
                          type="number"
                          value={kpi.target}
                          onChange={(e) => updateKPI(kgi.id, kpi.id, 'target', parseFloat(e.target.value) || 0)}
                        />
                        <Select
                          value={kpi.unit}
                          onChange={(e) => updateKPI(kgi.id, kpi.id, 'unit', e.target.value)}
                        >
                          <option value="円">円</option>
                          <option value="件">件</option>
                          <option value="個">個</option>
                          <option value="%">%</option>
                          <option value="人">人</option>
                          <option value="日">日</option>
                        </Select>
                        <SmallButton type="button" className="delete" onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteKPI(kgi.id, kpi.id); }}>
                          <FiTrash2 />
                        </SmallButton>
                      </InputGroup>
                    ))}
                    <InputGroup style={{ marginTop: '1rem', background: '#e8f4fd', padding: '0.75rem', borderRadius: '4px' }}>
                      <Label>新規KPI:</Label>
                      <Input
                        className="name"
                        placeholder="KPI名を入力"
                        value={(newKPIInputs[kgi.id] || {}).name || ''}
                        onChange={(e) => updateNewKPIInput(kgi.id, 'name', e.target.value)}
                      />
                      <Label>目標:</Label>
                      <Input
                        className="number"
                        type="number"
                        placeholder="0"
                        value={(newKPIInputs[kgi.id] || {}).target || ''}
                        onChange={(e) => updateNewKPIInput(kgi.id, 'target', e.target.value)}
                      />
                      <SmallButton type="button" className="add" onClick={() => handleAddKPI(kgi.id)}>
                        <FiPlus /> 追加
                      </SmallButton>
                    </InputGroup>
                  </div>
                </KGIContent>
              </KGISection>
            ))}

            {/* 新規KGI追加フォーム */}
            <div style={{ background: '#f0f7ff', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '2px dashed #3498db' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.75rem', color: '#2980b9' }}>新規KGI追加</div>
              <InputGroup>
                <Label>KGI名:</Label>
                <Input
                  className="name"
                  placeholder="例: 四半期売上"
                  value={newKGIName}
                  onChange={(e) => setNewKGIName(e.target.value)}
                />
                <Label>目標:</Label>
                <Input
                  className="number"
                  type="number"
                  placeholder="0"
                  value={newKGITarget}
                  onChange={(e) => setNewKGITarget(e.target.value)}
                />
                <span style={{ color: '#666' }}>円</span>
                <Button type="button" className="primary" onClick={handleAddKGI}>
                  <FiPlus /> KGI追加
                </Button>
              </InputGroup>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Button type="button" className="success" onClick={() => saveQuarterSettings()} disabled={saving}>
                <FiSave /> 設定を保存
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* KPI進捗入力 */}
      <Card>
        <CardHeader onClick={() => toggleSection('kpi')}>
          <CardTitle>KPI進捗入力</CardTitle>
          {expandedSections.kpi ? <FiChevronUp /> : <FiChevronDown />}
        </CardHeader>
        {expandedSections.kpi && (
          <CardContent>
            {quarterSettings.kgis.length === 0 ? (
              <EmptyState>
                KGI/KPIが設定されていません。上の設定セクションから追加してください。
              </EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>KGI / KPI</Th>
                    <Th className="number">四半期目標</Th>
                    <Th className="number">累計</Th>
                    <Th className="progress">進捗</Th>
                    <Th className="number">今週実績</Th>
                  </tr>
                </thead>
                <tbody>
                  {quarterSettings.kgis.map(kgi => {
                    // 自動集計の場合、四半期データから値を取得
                    let kgiActual = 0;
                    const kgiWeekValue = weeklyData.kgiValues?.[kgi.id] || 0;
                    if (kgi.autoAggregate && kgi.aggregateService && quarterAutoData[kgi.aggregateService]) {
                      kgiActual = quarterAutoData[kgi.aggregateService][kgi.aggregateMetric] || 0;
                    } else {
                      // 手動入力の場合：先週の累計 + 今週の実績
                      const prevKgiCumulative = previousWeekCumulatives.kgiCumulatives[kgi.id] || 0;
                      kgiActual = prevKgiCumulative + kgiWeekValue;
                    }
                    const kgiPercent = kgi.target > 0 ? Math.round((kgiActual / kgi.target) * 100) : 0;

                    return (
                      <React.Fragment key={kgi.id}>
                        <tr style={{ background: '#f8f9fa' }}>
                          <Td>
                            <strong>{kgi.name}</strong>
                            {kgi.autoAggregate && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#27ae60', fontWeight: 'normal' }}>
                                (自動集計)
                              </span>
                            )}
                          </Td>
                          <Td className="number">{formatNumber(kgi.target, kgi.unit)}</Td>
                          <Td className="number">
                            {formatNumber(kgiActual, kgi.unit)}
                          </Td>
                          <Td className="progress">
                            <ProgressBar>
                              <ProgressFill percent={kgiPercent} style={{ width: `${Math.min(kgiPercent, 100)}%` }} />
                              <ProgressText percent={kgiPercent}>{kgiPercent}%</ProgressText>
                            </ProgressBar>
                          </Td>
                          <Td className="number">
                            <Input
                              className="number"
                              type="number"
                              value={kgiWeekValue}
                              onChange={(e) => updateKGIValue(kgi.id, e.target.value)}
                              style={{ width: '100px' }}
                            />
                          </Td>
                        </tr>
                        {kgi.kpis.map(kpi => {
                          const weekValue = weeklyData.kpiValues[kpi.id] || 0;
                          // 累計 = 先週の累計 + 今週の実績
                          const prevCumulative = previousWeekCumulatives.kpiCumulatives[kpi.id] || 0;
                          const cumulative = prevCumulative + weekValue;
                          const percent = kpi.target > 0 ? Math.round((cumulative / kpi.target) * 100) : 0;
                          return (
                            <tr key={kpi.id}>
                              <Td style={{ paddingLeft: '2rem' }}>└ {kpi.name}</Td>
                              <Td className="number">{formatNumber(kpi.target, kpi.unit)}</Td>
                              <Td className="number">{formatNumber(cumulative, kpi.unit)}</Td>
                              <Td className="progress">
                                <ProgressBar>
                                  <ProgressFill percent={percent} style={{ width: `${Math.min(percent, 100)}%` }} />
                                  <ProgressText percent={percent}>{percent}%</ProgressText>
                                </ProgressBar>
                              </Td>
                              <Td className="number">
                                <Input
                                  className="number"
                                  type="number"
                                  value={weekValue}
                                  onChange={(e) => updateKPIValue(kpi.id, e.target.value)}
                                  style={{ width: '100px' }}
                                />
                              </Td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* 自動集計（サービス別） */}
      <Card>
        <CardHeader className="auto" onClick={() => toggleSection('auto')}>
          <CardTitle>サービス別実績（自動集計）</CardTitle>
          {expandedSections.auto ? <FiChevronUp /> : <FiChevronDown />}
        </CardHeader>
        {expandedSections.auto && (
          <CardContent>
            <AutoDataGrid>
              {PROPOSAL_MENUS.map(menu => (
                <AutoDataCard key={menu}>
                  <AutoDataTitle>{menu}</AutoDataTitle>
                  <AutoDataItem>
                    <AutoDataLabel>新規商談数</AutoDataLabel>
                    <AutoDataValue>{autoData[menu]?.newDeals || 0} 件</AutoDataValue>
                  </AutoDataItem>
                  <AutoDataItem>
                    <AutoDataLabel>新規成約数</AutoDataLabel>
                    <AutoDataValue>{autoData[menu]?.closedDeals || 0} 件</AutoDataValue>
                  </AutoDataItem>
                  <AutoDataItem>
                    <AutoDataLabel>成約金額</AutoDataLabel>
                    <AutoDataValue>
                      {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(autoData[menu]?.closedAmount || 0)}
                    </AutoDataValue>
                  </AutoDataItem>
                </AutoDataCard>
              ))}
            </AutoDataGrid>
          </CardContent>
        )}
      </Card>

      {/* 先週の定量アクション結果 */}
      {weeklyData.previousActionResults && weeklyData.previousActionResults.length > 0 && (
        <Card>
          <CardHeader className="action" onClick={() => toggleSection('prevAction')}>
            <CardTitle>
              <FiAlertTriangle />
              先週の定量アクション結果
            </CardTitle>
            {expandedSections.prevAction ? <FiChevronUp /> : <FiChevronDown />}
          </CardHeader>
          {expandedSections.prevAction !== false && (
            <CardContent>
              <Table>
                <thead>
                  <tr>
                    <Th>アクション内容</Th>
                    <Th style={{ width: '100px' }}>評価</Th>
                    <Th>備考</Th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.previousActionResults.map(action => (
                    <tr key={action.id}>
                      <Td>{action.content}</Td>
                      <Td>
                        <ActionResultSelect
                          value={action.result || ''}
                          onChange={(e) => updatePreviousActionResult(action.id, 'result', e.target.value)}
                        >
                          <option value="">選択</option>
                          <option value="◯">◯</option>
                          <option value="△">△</option>
                          <option value="×">×</option>
                        </ActionResultSelect>
                      </Td>
                      <Td>
                        <Input
                          style={{ width: '100%' }}
                          placeholder="備考を入力"
                          value={action.resultNote || ''}
                          onChange={(e) => updatePreviousActionResult(action.id, 'resultNote', e.target.value)}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      {/* 今週の定量アクション */}
      <Card>
        <CardHeader className="action" onClick={() => toggleSection('action')}>
          <CardTitle>今週の定量アクション</CardTitle>
          {expandedSections.action ? <FiChevronUp /> : <FiChevronDown />}
        </CardHeader>
        {expandedSections.action && (
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>アクション内容</Th>
                  <Th style={{ width: '80px' }}>操作</Th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.actions.map(action => (
                  <tr key={action.id}>
                    <Td>
                      <Input
                        style={{ width: '100%' }}
                        placeholder="例: 新規テレアポ30件"
                        value={action.content}
                        onChange={(e) => updateAction(action.id, 'content', e.target.value)}
                      />
                    </Td>
                    <Td>
                      <SmallButton className="delete" onClick={() => deleteAction(action.id)}>
                        <FiTrash2 />
                      </SmallButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div style={{ marginTop: '1rem' }}>
              <SmallButton className="add" onClick={addAction}>
                <FiPlus /> アクション追加
              </SmallButton>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 振り返り */}
      <Card>
        <CardHeader className="review" onClick={() => toggleSection('review')}>
          <CardTitle>振り返り</CardTitle>
          {expandedSections.review ? <FiChevronUp /> : <FiChevronDown />}
        </CardHeader>
        {expandedSections.review && (
          <CardContent>
            <TextArea
              placeholder="今週の振り返りを記入してください"
              value={weeklyData.review || ''}
              onChange={(e) => setWeeklyData(prev => ({ ...prev, review: e.target.value }))}
            />
            <CharCount>
              {weeklyData.review?.length || 0}文字
            </CharCount>
          </CardContent>
        )}
      </Card>
    </Container>
  );
}

export default WeeklyReportPage;
