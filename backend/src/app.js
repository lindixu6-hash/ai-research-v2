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
app.use(cors());           // 允许前端跨域访问
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

// 启动服务
app.listen(PORT, () => {
  console.log(`\n` + `=`.repeat(50));
  console.log(`🚀 AI搜索服务启动成功！`);
  console.log(`=`.repeat(50));
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
  console.log(`📚 API文档: POST http://localhost:${PORT}/api/search`);
  console.log(`=`.repeat(50) + `\n`);
});
