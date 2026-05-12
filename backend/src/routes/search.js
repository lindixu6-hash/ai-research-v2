/**
 * 搜索相关API路由
 *
 * 提供两个接口：
 * 1. POST /api/search - 同步搜索（简单，适合测试）
 * 2. GET /api/search/stream - 流式搜索（更好的用户体验）
 */

const express = require('express');
const router = express.Router();
const { executeWorkflow } = require('../services/workflowService');

/**
 * 同步搜索接口
 *
 * 请求：POST /api/search
 * Body: { query: "用户问题" }
 *
 * [TODO: 完成后再考虑流式接口]
 */
router.post('/', async (req, res) => {
  const { query } = req.body;

  // 参数验证
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      error: '请提供有效的搜索问题',
      example: { query: '2024年AI Agent开发框架有哪些' }
    });
  }

  console.log(`\n📨 收到搜索请求: ${query}`);

  try {
    // 执行完整工作流
    const result = await executeWorkflow(query.trim());

    // 根据不同状态返回不同响应
    if (result.status === 'need_clarify') {
      // 需要澄清
      return res.json({
        status: 'need_clarify',
        questions: result.questions,
        message: '为了更准确地回答，请先回答以下问题：'
      });
    }

    if (result.status === 'error') {
      // 执行出错
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
 * 健康检查接口
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI搜索API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
