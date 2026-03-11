#!/bin/bash

echo "🔨 パートナー専用アプリをビルド中..."

# パートナー用ビルド
REACT_APP_ENTRY_POINT=partner npm run build

# partner-buildディレクトリを作成
if [ -d "partner-build" ]; then
  rm -rf partner-build
fi

mv build partner-build

# partner.htmlをindex.htmlとしてコピー
cp public/partner.html partner-build/index.html

echo "✅ パートナー専用アプリのビルドが完了しました"
echo "📁 出力ディレクトリ: partner-build/"