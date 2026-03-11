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

// セッション設定
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分（ミリ秒）
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1分間隔でアクティビティチェック

class AuthService {
  constructor() {
    this.lastActivity = Date.now();
    this.activityTimer = null;
    this.setupActivityTracking();
  }

  // アクティビティトラッキング設定
  setupActivityTracking() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateLastActivity();
      }, true);
    });

    // 定期的なセッションチェック
    this.activityTimer = setInterval(() => {
      this.checkSessionTimeout();
    }, ACTIVITY_CHECK_INTERVAL);
  }

  // 最終アクティビティ時刻更新
  updateLastActivity() {
    this.lastActivity = Date.now();
    
    // セッションが存在する場合は延長
    const adminSession = this.getSession('admin');
    const partnerSession = this.getSession('partner');
    
    if (adminSession) {
      this.extendSession('admin');
    }
    if (partnerSession) {
      this.extendSession('partner');
    }
  }

  // セッションタイムアウトチェック
  checkSessionTimeout() {
    const now = Date.now();
    const adminSession = this.getSession('admin');
    const partnerSession = this.getSession('partner');

    if (adminSession && (now - adminSession.lastActivity > SESSION_TIMEOUT)) {
      this.logout('admin');
      this.onSessionExpired?.('admin');
    }

    if (partnerSession && (now - partnerSession.lastActivity > SESSION_TIMEOUT)) {
      this.logout('partner');
      this.onSessionExpired?.('partner');
    }
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
      const now = Date.now();

      // セッション有効期限チェック
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        this.logout(userType);
        return null;
      }

      return { ...session, fromLocal };
    } catch (error) {
      console.error('Session parse error:', error);
      this.logout(userType);
      return null;
    }
  }

  // セッション延長
  extendSession(userType) {
    const session = this.getSession(userType);
    if (!session) return;

    const credentials = AUTH_CREDENTIALS[userType];
    const updatedSession = {
      ...session,
      lastActivity: Date.now()
    };

    const storage = session.rememberMe ? localStorage : sessionStorage;
    storage.setItem(credentials.sessionKey, JSON.stringify(updatedSession));
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

  // セッション期限切れコールバック設定
  setSessionExpiredCallback(callback) {
    this.onSessionExpired = callback;
  }

  // クリーンアップ
  cleanup() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
  }
}

// シングルトンインスタンス
const authService = new AuthService();

export default authService;