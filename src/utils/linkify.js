import React from 'react';

// URLパターン（http/https/ftp）
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

/**
 * テキスト内のURLをクリック可能なリンクに変換するコンポーネント
 * @param {string} text - 変換対象のテキスト
 * @returns {React.ReactNode} リンク化されたテキスト
 */
export const linkifyText = (text) => {
  if (!text || typeof text !== 'string') return text;

  const parts = text.split(URL_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      // RegExのlastIndexをリセット
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3498db', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
