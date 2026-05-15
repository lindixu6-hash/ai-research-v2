/**
 * 数据集日志查看 API
 * 用于查看和导出搜索日志
 */

const express = require('express');
const router = express.Router();
const { getLogStats, exportLogs } = require('../services/searchLogger');

/**
 * GET /api/logs/stats
 * 获取日志统计
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getLogStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logs/export
 * 导出日志（支持 limit 参数）
 */
router.get('/export', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await exportLogs(limit);

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logs/download
 * 下载日志文件（JSONL 格式）
 */
router.get('/download', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const LOG_FILE = path.join(__dirname, '../../logs/search/search_logs.jsonl');

    const content = await fs.readFile(LOG_FILE, 'utf8');

    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="search_logs_${Date.now()}.jsonl"`);
    res.send(content);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
