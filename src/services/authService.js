// 認証サービス - ID/パスワード認証とセッション管理
import CryptoJS from 'crypto-js';

// 認証情報定義
const AUTH_CREDENTIALS = {
  admin: {
    id: 'salessenjin',
    passwordHash: CryptoJS.SHA256('salessenjin1234').toString(),
    sessionKey: 'sales_admin_session'
  },
  partner: {
    id: 'salessenjinpiala', 
    passwordHash: CryptoJS.SHA256('salessenjinpiala1234').toString(),
    sessionKey: 'sales_partner_session'
  }
};

class AuthService {
  constructor() {
    // タイムアウトなし — ログアウトは手動またはブラウザ終了時のみ
  }

  // ログイン認証
  login(userType, id, password, rememberMe = false) {
    const credentials = AUTH_CREDENTIALS[userType];
    
    if (!credentials) {
      return { success: false, message: 'Invalid user type' };
    }

    if (id !== credentials.id) {
      return { success: false, message: 'IDまたはパスワードが正しくありません' };
    }

    const passwordHash = CryptoJS.SHA256(password).toString();
    if (passwordHash !== credentials.passwordHash) {
      return { success: false, message: 'IDまたはパスワードが正しくありません' };
    }

    // セッション作成
    const sessionData = {
      userType,
      id,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      rememberMe
    };

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(credentials.sessionKey, JSON.stringify(sessionData));

    console.log(`✅ Login successful for ${userType}:`, id);
    return { success: true, message: 'ログインしました' };
  }

  // ログアウト
  logout(userType) {
    const credentials = AUTH_CREDENTIALS[userType];
    if (!credentials) return;

    // 両方のストレージから削除
    localStorage.removeItem(credentials.sessionKey);
    sessionStorage.removeItem(credentials.sessionKey);

    console.log(`🚪 Logout for ${userType}`);
  }

  // セッション取得
  getSession(userType) {
    const credentials = AUTH_CREDENTIALS[userType];
    if (!credentials) return null;

    // localStorage優先、なければsessionStorageを確認
    let sessionData = localStorage.getItem(credentials.sessionKey);
    let fromLocal = true;
    
    if (!sessionData) {
      sessionData = sessionStorage.getItem(credentials.sessionKey);
      fromLocal = false;
    }

    if (!sessionData) return null;

    try {
      const session = JSON.parse(sessionData);
      return { ...session, fromLocal };
    } catch (error) {
      console.error('Session parse error:', error);
      this.logout(userType);
      return null;
    }
  }

  // 認証状態チェック
  isAuthenticated(userType) {
    const session = this.getSession(userType);
    return session !== null;
  }

  // 管理者認証チェック
  isAdminAuthenticated() {
    return this.isAuthenticated('admin');
  }

  // パートナー認証チェック
  isPartnerAuthenticated() {
    return this.isAuthenticated('partner');
  }

  // セッション期限切れコールバック設定（互換性のため残す）
  setSessionExpiredCallback(callback) {
    this.onSessionExpired = callback;
  }
}

// シングルトンインスタンス
const authService = new AuthService();

export default authService;