import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiPlus, FiList, FiGrid, FiBarChart, FiUsers, FiUser, FiFileText, FiLogOut, FiDollarSign, FiHome, FiStar, FiTrendingUp, FiCalendar, FiClipboard, FiRepeat, FiBriefcase } from 'react-icons/fi';
import { analyzeMeetingNotes, isGPTServiceAvailable, debugAPIStatus, checkAPIKeyStatus } from './services/gptService.js';
import LoginPage from './components/LoginPage.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import LogEntryPage from './components/LogEntryPage.js';
import ProgressDashboard from './components/ProgressDashboard.js';
import ProductDetailPage from './components/ProductDetailPage.js';
import IntroducerMasterPage from './components/IntroducerMasterPage.js';
import ActionLogList from './components/ActionLogList.js';
import ContinuationManagementPage from './components/ContinuationManagementPage.js';
import HomeDashboard from './components/HomeDashboard.js';
import NewDealsDashboard from './components/NewDealsDashboard.js';
import ExistingDealsDashboard from './components/ExistingDealsDashboard.js';
import Breadcrumb from './components/Breadcrumb.js';
import InfluencerRegisterPage from './components/InfluencerRegisterPage.js';
import InfluencerListPage from './components/InfluencerListPage.js';
import CastingManagePage from './components/CastingManagePage.js';
import StaffMasterPage from './components/StaffMasterPage.js';
import NextActionManagementPage from './components/NextActionManagementPage.js';
import ProposalMenuMasterPage from './components/ProposalMenuMasterPage.js';
import LeadSourceMasterPage from './components/LeadSourceMasterPage.js';
import ProjectManagementPage from './components/ProjectManagementPage.js';
import ClosedDealsList from './components/ClosedDealsList.js';
import ProposalDealsList from './components/ProposalDealsList.js';
import OperatorDashboard from './components/OperatorDashboard.js';
import { UndoProvider } from './contexts/UndoContext.js';
import authService from './services/authService.js';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: var(--color-bg);
`;

const HeaderWrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const Header = styled.header`
  background: #0F172A;
  color: white;
  padding: 0 2rem;
  height: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #F1F5F9;
  letter-spacing: 0.3px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserText = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
`;

const LogoutButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const NavContainer = styled.nav`
  background: #1E293B;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  color: #94a3b8;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;

  &:hover {
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.04);
  }

  &.active {
    border-bottom-color: #3b82f6;
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
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.04);
  }
`;

const NavDropdownMenu = styled.ul`
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #1E293B;
  min-width: max-content;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  z-index: 100;
`;

const NavDropdownItem = styled.li`
  display: block;
`;

const NavDropdownLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #e2e8f0;
  }
`;

const MainContent = styled.main`
  padding: 24px 32px;
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
        <HeaderWrapper>
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
          <NavDropdown>
            <NavDropdownButton>
              <FiHome />
              ホーム
            </NavDropdownButton>
            <NavDropdownMenu>
              <NavDropdownItem>
                <NavDropdownLink to="/">
                  <FiBarChart />
                  ダッシュボード
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/closed-deals">
                  <FiDollarSign />
                  成約案件一覧
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/proposal-deals">
                  <FiList />
                  提案案件一覧
                </NavDropdownLink>
              </NavDropdownItem>
            </NavDropdownMenu>
          </NavDropdown>
          <NavDropdown>
            <NavDropdownButton>
              <FiBarChart />
              新規案件
            </NavDropdownButton>
            <NavDropdownMenu>
              <NavDropdownItem>
                <NavDropdownLink to="/new-deals-dashboard">
                  <FiBarChart />
                  ダッシュボード
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/progress-dashboard">
                  <FiList />
                  新規案件一覧
                </NavDropdownLink>
              </NavDropdownItem>
            </NavDropdownMenu>
          </NavDropdown>
          <NavDropdown>
            <NavDropdownButton>
              <FiBriefcase />
              既存案件
            </NavDropdownButton>
            <NavDropdownMenu>
              <NavDropdownItem>
                <NavDropdownLink to="/existing-deals-dashboard">
                  <FiBarChart />
                  ダッシュボード
                </NavDropdownLink>
              </NavDropdownItem>
              <NavDropdownItem>
                <NavDropdownLink to="/project-management">
                  <FiList />
                  案件一覧
                </NavDropdownLink>
              </NavDropdownItem>
            </NavDropdownMenu>
          </NavDropdown>
          <NavItem>
            <NavLink to="/operator-dashboard">
              <FiUser />
              運用管理
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
                  担当者管理
                </NavDropdownLink>
              </NavDropdownItem>
            </NavDropdownMenu>
          </NavDropdown>
        </NavList>
      </NavContainer>
      </HeaderWrapper>

      <MainContent>
        <Breadcrumb />
        <Routes>
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/new-deals-dashboard" element={<NewDealsDashboard />} />
          <Route path="/existing-deals-dashboard" element={<ExistingDealsDashboard />} />
          <Route path="/progress-dashboard" element={<ProgressDashboard />} />
          <Route path="/log-entry" element={<LogEntryPage />} />
          <Route path="/action-logs" element={<ActionLogList />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/introducer-master" element={<IntroducerMasterPage />} />
          <Route path="/proposal-menu-master" element={<ProposalMenuMasterPage />} />
          <Route path="/lead-source-master" element={<LeadSourceMasterPage />} />
          <Route path="/closed-deals" element={<ClosedDealsList />} />
          <Route path="/proposal-deals" element={<ProposalDealsList />} />
          <Route path="/continuation-management" element={<ContinuationManagementPage />} />
          <Route path="/if/register" element={<InfluencerRegisterPage />} />
          <Route path="/if/register/:id" element={<InfluencerRegisterPage />} />
          <Route path="/if/list" element={<InfluencerListPage />} />
          <Route path="/casting/manage" element={<CastingManagePage />} />
          <Route path="/project-management" element={<ProjectManagementPage />} />
          <Route path="/staff-master" element={<StaffMasterPage />} />
          <Route path="/next-action-management" element={<NextActionManagementPage />} />
          <Route path="/operator-dashboard" element={<OperatorDashboard />} />
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