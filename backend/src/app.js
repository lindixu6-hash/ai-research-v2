/**
 * AI搜索后端服务入口
 * 功能：提供API接口，协调Agent工作流，处理搜索请求
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
// CORS 配置：允许所有来源（生产环境建议限制具体域名）
// 使用正则表达式匹配所有 Vercel 部署域名 + 本地开发
const corsOptions = {
  origin: (origin, callback) => {
    // 允许所有 Vercel 域名
    if (!origin) return callback(null, true); // 允许无 origin 的请求（如 mobile apps）
    if (origin.includes('vercel.app') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(null, true); // 临时允许所有来源，调试后可收紧
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());   // 解析JSON请求体

// 日志中间件（记录每个请求）
app.use((req, res, next) => {
  console.log(`\n📡 ${req.method} ${req.path}`);
  next();
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AI搜索服务运行中',
    timestamp: new Date().toISOString()
  });
});

// 搜索API路由
app.use('/api/search', require('./routes/search'));
app.use('/api/search', require('./routes/stream'));  // 流式路由
app.use('/api/logs', require('./routes/logs'));      // 日志路由

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: req.path
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message
  });
});

// 启动服务（监听所有网络接口，以便从外部访问）
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n` + `=`.repeat(50));
  console.log(`🚀 AI搜索服务启动成功！`);
  console.log(`=`.repeat(50));
  console.log(`📍 服务地址: http://0.0.0.0:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📚 API文档: POST http://localhost:${PORT}/api/search`);
  console.log(`=`.repeat(50) + `\n`);
});
