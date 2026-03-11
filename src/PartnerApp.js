import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import styled from 'styled-components';
import { FiPlus, FiFileText, FiList, FiGrid, FiHome, FiUsers, FiLogOut, FiDollarSign } from 'react-icons/fi';
import PartnerLoginPage from './components/PartnerLoginPage.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import authService from './services/authService.js';
import LogEntryPage from './components/LogEntryPage.js';
import PartnerActionLogList from './components/PartnerActionLogList.js';
import PartnerProgressDashboard from './components/PartnerProgressDashboard.js';
import PartnerRepresentativeMasterPage from './components/PartnerRepresentativeMasterPage.js';
import ProductDetailPage from './components/ProductDetailPage.js';
import PartnerKanbanBoard from './components/PartnerKanbanBoard.js';
import PartnerSalesResultsList from './components/PartnerSalesResultsList.js';
import PartnerHomeDashboard from './components/PartnerHomeDashboard.js';
import Breadcrumb from './components/Breadcrumb.js';
import { UndoProvider } from './contexts/UndoContext.js';
import './App.css';

const AppContainer = styled.div`
  min-height: 100vh;
  background-color: #f8f9fa;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const Subtitle = styled.p`
  margin: 0.5rem 0 0 0;
  font-size: 1rem;
  opacity: 0.9;
  font-weight: 300;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserText = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
`;

const LogoutButton = styled.button`
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
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
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const NavContainer = styled.nav`
  background-color: #5a67d8;
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
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  color: #e2e8f0;
  text-decoration: none;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  font-weight: 500;
  
  &:hover {
    background-color: #4c51bf;
    color: white;
    transform: translateY(-1px);
  }
  
  &.active {
    background-color: #4c51bf;
    border-bottom-color: #f7fafc;
    color: white;
  }
  
  svg {
    font-size: 1.1rem;
  }
`;

const MainContent = styled.main`
  padding: 2rem;
  width: 100%;
`;

const WelcomeCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  text-align: center;
  margin-bottom: 2rem;
`;

const WelcomeTitle = styled.h2`
  color: #2d3748;
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
`;

const WelcomeText = styled.p`
  color: #718096;
  font-size: 1.1rem;
  line-height: 1.6;
`;

function PartnerWelcome() {
  return <PartnerHomeDashboard />;
}

// パートナーアプリケーションコンポーネント
function PartnerInternalApp() {
  // URLから会社名を取得
  const getPartnerCompany = () => {
    const path = window.location.pathname;
    if (path.startsWith('/partner-entry/piala')) {
      return 'piala';
    }
    // 他の会社用のパスもここに追加可能
    return 'default';
  };
  
  const partnerCompany = getPartnerCompany();
  const isOldPartnerPath = window.location.pathname.startsWith('/partner');
  
  // 旧パートナーパスの場合はリダイレクト
  if (isOldPartnerPath && !window.location.pathname.startsWith('/partner-entry')) {
    window.location.href = '/partner-entry/piala';
    return null;
  }

  const handleLogout = () => {
    authService.logout('partner');
    window.location.reload(); // ページをリロードして認証状態をリセット
  };
  
  return (
    <UndoProvider>
      <AppContainer>
        <Header>
        <div>
          <Title>営業パートナー専用システム</Title>
          <Subtitle>案件進捗管理ツール - 株式会社ピアラ</Subtitle>
        </div>
        <UserInfo>
          <UserText>パートナーとしてログイン中</UserText>
          <LogoutButton onClick={handleLogout}>
            <FiLogOut />
            ログアウト
          </LogoutButton>
        </UserInfo>
      </Header>
        
        <NavContainer>
          <NavList>
            <NavItem>
              <NavLink to="/partner-entry/piala">
                <FiHome />
                ホーム
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/partner-entry/piala/log-entry">
                <FiPlus />
                アクションログ記録
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/partner-entry/piala/action-logs">
                <FiFileText />
                ログ一覧
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/partner-entry/piala/dashboard">
                <FiList />
                案件一覧
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/partner-entry/piala/kanban">
                <FiGrid />
                看板ボード
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/partner-entry/piala/representative-master">
                <FiUsers />
                担当者マスター
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/partner-entry/piala/sales-results">
                <FiDollarSign />
                成約案件一覧
              </NavLink>
            </NavItem>
          </NavList>
        </NavContainer>

        <MainContent>
          <Breadcrumb />
          <Routes>
            <Route path="/partner-entry/piala" element={<PartnerWelcome />} />
            <Route path="/partner-entry/piala/log-entry" element={<LogEntryPage />} />
            <Route path="/partner-entry/piala/action-logs" element={<PartnerActionLogList />} />
            <Route path="/partner-entry/piala/dashboard" element={<PartnerProgressDashboard />} />
            <Route path="/partner-entry/piala/product/:id" element={<ProductDetailPage />} />
            <Route path="/partner-entry/piala/kanban" element={<PartnerKanbanBoard />} />
            <Route path="/partner-entry/piala/representative-master" element={<PartnerRepresentativeMasterPage />} />
            <Route path="/partner-entry/piala/sales-results" element={<PartnerSalesResultsList />} />
          </Routes>
        </MainContent>
      </AppContainer>
    </UndoProvider>
  );
}

// メイン PartnerApp コンポーネント
function PartnerApp() {
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
        userType="partner"
        onSessionExpired={handleSessionExpired}
        fallbackComponent={() => <PartnerLoginPage onLoginSuccess={handleLoginSuccess} />}
      >
        {forceReauth ? (
          <PartnerLoginPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <PartnerInternalApp />
        )}
      </ProtectedRoute>
    </Router>
  );
}

export default PartnerApp;