/**
 * API 路由
 * 定义所有 API 端点
 */

const express = require('express');
const router = express.Router();
const SearchService = require('../services/SearchService');
const SearchAgent = require('../agents/SearchAgent');

// 初始化服务
const searchService = new SearchService();
const searchAgent = new SearchAgent();

/**
 * GET /api/search
 * 搜索接口
 * @query {string} query - 搜索关键词
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      });
    }

    // 1. 分析搜索意图
    const intent = searchAgent.analyzeIntent(query);

    // 2. 生成搜索策略
    const strategy = searchAgent.generateStrategy(intent);

    // 3. 执行搜索
    const results = await searchService.search(query, strategy);

    res.json({
      success: true,
      data: {
        query,
        intent,
        results,
        count: results.length
      }
    });
  } catch (error) {
    console.error('搜索路由错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '服务器内部错误'
    });
  }
});

/**
 * GET /api/health
 * 健康检查接口
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
