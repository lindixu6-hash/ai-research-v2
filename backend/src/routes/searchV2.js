/**
 * 搜索相关API路由（优化版）
 *
 * 集成了意图分类、自适应搜索、引用系统等优化组件
 */

const express = require('express');
const router = express.Router();
const { executeWorkflow, enableMemoryFeatures, getHistory, clearHistory, getStats } = require('../services/workflowServiceV2');

// 启用记忆功能（可选，默认启用）
enableMemoryFeatures('default');

/**
 * 同步搜索接口（优化版）
 *
 * 请求：POST /api/search/v2
 * Body: { query: "用户问题" }
 */
router.post('/v2', async (req, res) => {
  const { query } = req.body;

  // 参数验证
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      error: '请提供有效的搜索问题',
      example: { query: '2024年AI Agent开发框架有哪些' }
    });
  }

  console.log(`\n📨 收到搜索请求（V2优化版）: ${query}`);

  try {
    // 执行优化版工作流
    const result = await executeWorkflow(query.trim());

    // 根据不同状态返回不同响应
    if (result.status === 'error') {
      return res.status(500).json({
        error: result.error,
        message: '搜索执行失败，请稍后重试'
      });
    }

    // 成功返回
    return res.json({
      status: 'success',
      query: result.query,
      report: result.report,
      findings: result.findings,
      intent: result.intent,
      confidence: result.confidence,
      quality: result.quality,
      fromCache: result.fromCache || false,
      sources: result.findings.map(f => f.source).filter((v, i, a) => a.indexOf(v) === i),
      duration: result.workflow.duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API处理失败:', error);
    return res.status(500).json({
      error: error.message,
      message: '服务器内部错误'
    });
  }
});

/**
 * 添加用户反馈
 */
router.post('/feedback', async (req, res) => {
  const { queryId, rating, helpful, issues, comment } = req.body;

  try {
    const { addFeedback } = require('../services/workflowServiceV2');
    await addFeedback(queryId, { rating, helpful, issues, comment });

    return res.json({
      success: true,
      message: '反馈已记录'
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/**
 * 获取对话历史
 */
router.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const history = getHistory(limit);

  return res.json({
    history,
    count: history.length
  });
});

/**
 * 清除对话历史
 */
router.post('/history/clear', (req, res) => {
  const result = clearHistory();
  return res.json(result);
});

/**
 * 获取统计信息
 */
router.get('/stats', (req, res) => {
  const stats = getStats();
  return res.json(stats);
});

module.exports = router;
