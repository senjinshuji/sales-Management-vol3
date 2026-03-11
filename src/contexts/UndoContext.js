import React, { createContext, useContext } from 'react';
import useUndo from '../hooks/useUndo.js';

// Undoコンテキストの作成
const UndoContext = createContext();

// UndoContextのプロバイダー
export function UndoProvider({ children }) {
  const undoHook = useUndo();

  return (
    <UndoContext.Provider value={undoHook}>
      {children}
    </UndoContext.Provider>
  );
}

// UndoContextを使用するためのカスタムフック
export function useUndoContext() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndoContext must be used within an UndoProvider');
  }
  return context;
}

export default UndoContext;