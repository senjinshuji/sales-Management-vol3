import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import authService from '../services/authService.js';

const SessionExpiredOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const SessionExpiredModal = styled.div`
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
`;

const ModalTitle = styled.h3`
  color: #e74c3c;
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
`;

const ModalMessage = styled.p`
  color: #555;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`;

const ModalButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: #2980b9;
  }
`;

function ProtectedRoute({ 
  children, 
  userType, 
  onSessionExpired,
  fallbackComponent: FallbackComponent 
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    // 初期認証チェック
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated(userType);
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();

    // セッション期限切れコールバック設定
    const handleSessionExpired = (expiredUserType) => {
      if (expiredUserType === userType) {
        setIsAuthenticated(false);
        setShowSessionExpired(true);
      }
    };

    authService.setSessionExpiredCallback(handleSessionExpired);

    // 定期的な認証チェック（5秒間隔）
    const authCheckInterval = setInterval(() => {
      const currentAuth = authService.isAuthenticated(userType);
      if (currentAuth !== isAuthenticated) {
        setIsAuthenticated(currentAuth);
        if (!currentAuth) {
          setShowSessionExpired(true);
        }
      }
    }, 5000);

    return () => {
      clearInterval(authCheckInterval);
    };
  }, [userType, isAuthenticated]);

  const handleSessionExpiredConfirm = () => {
    setShowSessionExpired(false);
    if (onSessionExpired) {
      onSessionExpired();
    }
  };

  // ローディング中
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: '#666'
      }}>
        認証状態を確認中...
      </div>
    );
  }

  // 認証されていない場合
  if (!isAuthenticated) {
    return FallbackComponent ? <FallbackComponent /> : null;
  }

  return (
    <>
      {children}
      
      {/* セッション期限切れモーダル */}
      {showSessionExpired && (
        <SessionExpiredOverlay>
          <SessionExpiredModal>
            <ModalTitle>セッションが切れました</ModalTitle>
            <ModalMessage>
              セキュリティのため、一定時間操作がなかったためセッションが切れました。
              <br />
              再度ログインしてください。
            </ModalMessage>
            <ModalButton onClick={handleSessionExpiredConfirm}>
              ログイン画面へ
            </ModalButton>
          </SessionExpiredModal>
        </SessionExpiredOverlay>
      )}
    </>
  );
}

export default ProtectedRoute;