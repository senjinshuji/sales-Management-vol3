const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// レート制限（15分間で100リクエスト）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use(limiter);

// ロギング
app.use(morgan('combined'));

// ボディパーサー
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API ルート
app.use('/api/action-logs', require('./routes/actionLogs'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/kanban', require('./routes/kanban'));
app.use('/api/notifications', require('./routes/notifications'));

// ヘルスチェックエンドポイント
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 基本APIルート
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '営業管理ツール API サーバーが正常に動作しています',
    timestamp: new Date().toISOString()
  });
});

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// エラーハンドラー
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 営業管理ツール API サーバーが起動しました`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 ログレベル: ${process.env.LOG_LEVEL || 'info'}`);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 