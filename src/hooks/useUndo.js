import { useState, useCallback, useEffect } from 'react';

// Undo機能のためのカスタムフック
function useUndo() {
  const [undoStack, setUndoStack] = useState([]);
  const [isUndoEnabled, setIsUndoEnabled] = useState(false);

  // Undo操作を記録
  const recordAction = useCallback((actionData) => {
    const action = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      ...actionData
    };
    
    setUndoStack(prev => [...prev.slice(-9), action]); // 最新10件まで保持
    setIsUndoEnabled(true);
    
    console.log('🔄 操作記録:', action.type, action.description);
  }, []);

  // Undo実行
  const executeUndo = useCallback(async () => {
    if (undoStack.length === 0) {
      console.log('⚠️ 取り消し可能な操作がありません');
      return false;
    }

    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      console.log('⏪ 操作を取り消し中:', lastAction.type, lastAction.description);
      
      if (lastAction.undoFunction) {
        await lastAction.undoFunction();
      }
      
      // スタックから削除
      setUndoStack(prev => prev.slice(0, -1));
      
      // 通知表示
      showUndoNotification(lastAction.description);
      
      console.log('✅ 操作取り消し完了:', lastAction.description);
      return true;
    } catch (error) {
      console.error('💥 操作取り消しエラー:', error);
      alert('操作の取り消しに失敗しました: ' + error.message);
      return false;
    }
  }, [undoStack]);

  // 通知表示
  const showUndoNotification = (description) => {
    // 既存の通知を削除
    const existingNotification = document.getElementById('undo-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 新しい通知を作成
    const notification = document.createElement('div');
    notification.id = 'undo-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2ecc71;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    notification.textContent = `✅ ${description}を取り消しました`;
    
    document.body.appendChild(notification);
    
    // アニメーション
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // 3秒後に削除
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  };

  // キーボードショートカット設定
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd+Z (Mac) または Ctrl+Z (Windows)
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        // フォーム入力中は無視
        if (event.target.tagName === 'INPUT' || 
            event.target.tagName === 'TEXTAREA' || 
            event.target.isContentEditable) {
          return;
        }
        
        event.preventDefault();
        executeUndo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [executeUndo]);

  // Undoスタックの状態
  const undoInfo = {
    canUndo: undoStack.length > 0,
    lastAction: undoStack.length > 0 ? undoStack[undoStack.length - 1] : null,
    actionCount: undoStack.length
  };

  return {
    recordAction,
    executeUndo,
    undoInfo,
    isUndoEnabled
  };
}

export default useUndo;