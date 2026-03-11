import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiUser, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import authService from '../services/authService.js';

const LoginContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const LoginCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 3rem;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
  position: relative;
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const LogoText = styled.h1`
  color: #2c3e50;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  margin-bottom: 0.5rem;
`;

const LogoSubtext = styled.p`
  color: #7f8c8d;
  margin: 0;
  font-size: 0.9rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  position: relative;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.9rem;
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  padding-left: 3rem;
  ${props => props.type === 'password' && 'padding-right: 3rem;'}
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  &::placeholder {
    color: #bdc3c7;
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 1rem;
  color: #7f8c8d;
  z-index: 1;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 1rem;
  background: none;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  z-index: 1;
  
  &:hover {
    color: #3498db;
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Checkbox = styled.input`
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #3498db;
`;

const CheckboxLabel = styled.label`
  color: #555;
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
`;

const LoginButton = styled.button`
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(52, 152, 219, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fee;
  border: 1px solid #f5c6cb;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

function LoginPage({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    id: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 既存セッションチェック
  useEffect(() => {
    if (authService.isAdminAuthenticated()) {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // バリデーション
    if (!formData.id.trim()) {
      setError('IDを入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.password.trim()) {
      setError('パスワードを入力してください');
      setIsLoading(false);
      return;
    }

    // ログイン試行
    const result = authService.login('admin', formData.id, formData.password, rememberMe);
    
    if (result.success) {
      setSuccess(result.message);
      // 即座に遷移
      onLoginSuccess();
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>
          <LogoText>営業管理システム</LogoText>
          <LogoSubtext>管理者ログイン</LogoSubtext>
        </Logo>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label htmlFor="id">ユーザーID</Label>
            <InputWrapper>
              <InputIcon>
                <FiUser size={20} />
              </InputIcon>
              <Input
                id="id"
                name="id"
                type="text"
                value={formData.id}
                onChange={handleInputChange}
                placeholder="ユーザーIDを入力"
                autoComplete="username"
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">パスワード</Label>
            <InputWrapper>
              <InputIcon>
                <FiLock size={20} />
              </InputIcon>
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="パスワードを入力"
                autoComplete="current-password"
              />
              <PasswordToggle
                type="button"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </PasswordToggle>
            </InputWrapper>
          </InputGroup>

          <CheckboxWrapper>
            <Checkbox
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <CheckboxLabel htmlFor="rememberMe">
              ログイン状態を保持する
            </CheckboxLabel>
          </CheckboxWrapper>

          <LoginButton type="submit" disabled={isLoading}>
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </LoginButton>

          {error && (
            <ErrorMessage>
              <FiAlertCircle />
              {error}
            </ErrorMessage>
          )}

          {success && (
            <SuccessMessage>
              <FiUser />
              {success}
            </SuccessMessage>
          )}
        </Form>
      </LoginCard>
    </LoginContainer>
  );
}

export default LoginPage;