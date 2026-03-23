import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiPlus, FiList, FiGrid, FiBarChart, FiUsers, FiUser, FiFileText, FiLogOut, FiDollarSign, FiHome, FiStar, FiTrendingUp, FiCalendar, FiClipboard, FiRepeat, FiBriefcase } from 'react-icons/fi';
import { analyzeMeetingNotes, isGPTServiceAvailable, debugAPIStatus, checkAPIKeyStatus } from './services/gptService.js';
import LoginPage from './components/LoginPage.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import LogEntryPage from './components/LogEntryPage.js';
import ProgressDashboard from './components/ProgressDashboard.js';
import KanbanBoard from './components/KanbanBoard.js';
import ProductDetailPage from './components/ProductDetailPage.js';
import IntroducerMasterPage from './components/IntroducerMasterPage.js';
import ActionLogList from './components/ActionLogList.js';
import SalesResultsList from './components/SalesResultsList.js';
import ContinuationManagementPage from './components/ContinuationManagementPage.js';
import HomeDashboard from './components/HomeDashboard.js';
import Breadcrumb from './components/Breadcrumb.js';
import InfluencerRegisterPage from './components/InfluencerRegisterPage.js';
import InfluencerListPage from './components/InfluencerListPage.js';
import CastingManagePage from './components/CastingManagePage.js';
import StaffMasterPage from './components/StaffMasterPage.js';
import NextActionManagementPage from './components/NextActionManagementPage.js';
import ProposalMenuMasterPage from './components/ProposalMenuMasterPage.js';
import LeadSourceMasterPage from './components/LeadSourceMasterPage.js';
import ProjectManagementPage from './components/ProjectManagementPage.js';
import WeeklyReportPage from './components/WeeklyReportPage.js';
import { UndoProvider } from './contexts/UndoContext.js';
import authService from './services/authService.js';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const Header = styled.header`
  background-color: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserText = styled.span`
  font-size: 0.9rem;
  color: #bdc3c7;
`;

const LogoutButton = styled.button`
  background: none;
  border: 1px solid #34495e;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #34495e;
    border-color: #3498db;
  }
`;

const NavContainer = styled.nav`
  background-color: #34495e;
  padding: 0 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const NavList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0;
`;

const NavItem = styled.li`
  display: flex;
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  color: #bdc3c7;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  
  &:hover {
    background-color: #2c3e50;
    color: white;
  }
  
  &.active {
    background-color: #2c3e50;
    border-bottom-color: #3498db;
    color: white;
  }
`;

const NavDropdown = styled.div`
  position: relative;
  
  &:hover > ul {
    display: block;
  }
`;

const NavDropdownButton = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  color: #bdc3c7;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #2c3e50;
    color: white;
  }
`;

const NavDropdownMenu = styled.ul`
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #2c3e50;
  min-width: 200px;
  list-style: none;
  margin: 0;
  padding: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 100;
`;

const NavDropdownItem = styled.li`
  display: block;
`;

const NavDropdownLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #34495e;
    color: white;
  }
`;

const MainContent = styled.main`
  padding: 2rem;
`;

// 管理者アプリケーションコンポーネント
function AdminApp() {
  // GPT APIテスト関数をwindowオブジェクトに追加（開発用）
  useEffect(() => {
    window.testGPTAPI = async (testText = 'テスト用の議事録：顧客は来月のサービス導入を検討中。予算は月額30万円。技術部門との打ち合わせが必要。') => {
      console.log('=== GPT API テスト開始 ===');
      console.log('APIキー確認:', isGPTServiceAvailable() ? '✅設定済み' : '❌未設定');
      
      try {
        const result = await analyzeMeetingNotes(testText);
        console.log('✅ 分析結果:', result);
        return result;
      } catch (error) {
        console.error('💥 テスト失敗:', error);
        return { error: error.message };
      }
    };
    
    // APIキーの状態確認関数
    window.checkGPTStatus = debugAPIStatus;
    
    // APIキーの有効性チェック関数
    window.validateGPTKey = async () => {
      console.log('🔍 APIキーの有効性をチェック中...');
      const result = await checkAPIKeyStatus();
      console.log(result.valid ? '✅' : '❌', result.message || result.error);
      return result;
    };
    
    console.log('💡 GPT API デバッグコマンド:');
    console.log('- testGPTAPI() : GPT機能をテスト');
    console.log('- checkGPTStatus() : APIキーの状態を確認');
    console.log('- validateGPTKey() : APIキーの有効性をチェック');
    
    // 初回ロード時にAPI状態を確認
    debugAPIStatus();
  }, []);

  const handleLogout = () => {
    authService.logout('admin');
    window.location.reload(); // ページをリロードして認証状態をリセット
  };

  return (
    <UndoProvider>
      <AppContainer>
        <Header>
        <Title>営業進捗管理ツール</Title>
        <UserInfo>
          <UserText>管理者としてログイン中</UserText>
          <LogoutButton onClick={handleLogout}>
            <FiLogOut />
            ログアウト
          </LogoutButton>
        </UserInfo>
      </Header>
      
      <NavContainer>
        <NavList>
          <NavItem>
            <NavLink to="/">
              <FiHome />
              ホーム
            </NavLink>
          </NavItem>
          <NavDropdown>
            <NavDropdownButton>
              <FiBarChart />
              新規案件
            </NavDropdownButton>
            <NavDropdownMenu>
              <NavDropdownItem>
                <NavDropdownLink to="/progress-dashboard">
                  <FiList />
                  新規案件一覧
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/kanban">
                  <FiGrid />
                  看板ボード
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/sales-results">
                  <FiDollarSign />
                  成約案件一覧
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/weekly-report">
                  <FiClipboard />
                  週報
                </NavDropdownLink>
              </NavDropdownItem>
            </NavDropdownMenu>
          </NavDropdown>
          <NavItem>
            <NavLink to="/project-management">
              <FiBriefcase />
              既存案件
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/next-action-management">
              <FiClipboard />
              NA管理
            </NavLink>
          </NavItem>
          <NavDropdown>
            <NavDropdownButton>
              <FiUsers />
              マスター管理
            </NavDropdownButton>
            <NavDropdownMenu>
              <NavDropdownItem>
                <NavDropdownLink to="/introducer-master">
                  <FiUsers />
                  紹介者マスター
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/proposal-menu-master">
                  <FiList />
                  提案メニューマスター
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/lead-source-master">
                  <FiList />
                  流入経路マスター
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/if/list">
                  <FiStar />
                  インフルエンサー
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/casting/manage">
                  <FiTrendingUp />
                  キャスティング管理
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/staff-master">
                  <FiUser />
                  人管理
                </NavDropdownLink>
              </NavDropdownItem>
            </NavDropdownMenu>
          </NavDropdown>
        </NavList>
      </NavContainer>

      <MainContent>
        <Breadcrumb />
        <Routes>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/progress-dashboard" element={<ProgressDashboard />} />
          <Route path="/log-entry" element={<LogEntryPage />} />
          <Route path="/action-logs" element={<ActionLogList />} />
          <Route path="/kanban" element={<KanbanBoard />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/introducer-master" element={<IntroducerMasterPage />} />
          <Route path="/proposal-menu-master" element={<ProposalMenuMasterPage />} />
          <Route path="/lead-source-master" element={<LeadSourceMasterPage />} />
          <Route path="/sales-results" element={<SalesResultsList />} />
          <Route path="/continuation-management" element={<ContinuationManagementPage />} />
          <Route path="/if/register" element={<InfluencerRegisterPage />} />
          <Route path="/if/register/:id" element={<InfluencerRegisterPage />} />
          <Route path="/if/list" element={<InfluencerListPage />} />
          <Route path="/casting/manage" element={<CastingManagePage />} />
          <Route path="/project-management" element={<ProjectManagementPage />} />
          <Route path="/staff-master" element={<StaffMasterPage />} />
          <Route path="/next-action-management" element={<NextActionManagementPage />} />
          <Route path="/weekly-report" element={<WeeklyReportPage />} />
        </Routes>
      </MainContent>
      </AppContainer>
    </UndoProvider>
  );
}

// メイン App コンポーネント
function App() {
  const [forceReauth, setForceReauth] = useState(false);

  const handleLoginSuccess = () => {
    setForceReauth(false);
  };

  const handleSessionExpired = () => {
    setForceReauth(true);
  };

  return (
    <Router>
      <ProtectedRoute 
        userType="admin"
        onSessionExpired={handleSessionExpired}
        fallbackComponent={() => <LoginPage onLoginSuccess={handleLoginSuccess} />}
      >
        {forceReauth ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <AdminApp />
        )}
      </ProtectedRoute>
    </Router>
  );
}

export default App;