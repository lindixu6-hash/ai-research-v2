/**
 * 数据集日志查看 API（增强版）
 * 支持时间段筛选和方便的下载
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs/search');
const LOG_FILE = path.join(LOG_DIR, 'search_logs.jsonl');

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    // 忽略
  }
}

/**
 * 解析时间段筛选
 */
function parseTimeFilter(start, end) {
  const startTime = start ? new Date(start) : null;
  const endTime = end ? new Date(end) : null;

  if (startTime && isNaN(startTime.getTime())) {
    throw new Error('开始时间格式无效');
  }
  if (endTime && isNaN(endTime.getTime())) {
    throw new Error('结束时间格式无效');
  }

  return { startTime, endTime };
}

/**
 * 读取并筛选日志
 */
async function readLogs(filter = {}) {
  await ensureLogDir();

  const { startTime, endTime, limit } = filter;
  const logs = [];

  try {
    const content = await fs.readFile(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryTime = new Date(entry.timestamp);

        // 时间筛选
        if (startTime && entryTime < startTime) continue;
        if (endTime && entryTime > endTime) continue;

        logs.push(entry);

        // 限制数量
        if (limit && logs.length >= limit) break;
      } catch (e) {
        // 忽略解析错误的行
      }
    }
  } catch (error) {
    // 文件不存在时返回空数组
  }

  return logs;
}

/**
 * GET /api/logs/stats
 * 获取日志统计
 */
router.get('/stats', async (req, res) => {
  try {
    const logs = await readLogs();

    let totalQueries = logs.length;
    let totalErrors = 0;
    let totalDuration = 0;
    const queryTypes = {};
    const dailyStats = {};

    for (const entry of logs) {
      if (entry.error) totalErrors++;
      totalDuration += entry.duration || 0;

      // 统计查询类型
      const firstWord = entry.query.split(/[，。？\s]/)[0];
      queryTypes[firstWord] = (queryTypes[firstWord] || 0) + 1;

      // 按日期统计
      const date = entry.timestamp.split('T')[0];
      if (!dailyStats[date]) dailyStats[date] = 0;
      dailyStats[date]++;
    }

    res.json({
      success: true,
      data: {
        totalQueries,
        totalErrors,
        avgDuration: totalQueries > 0 ? Math.round(totalDuration / totalQueries) : 0,
        errorRate: totalQueries > 0 ? ((totalErrors / totalQueries) * 100).toFixed(2) + '%' : '0%',
        topQueries: Object.entries(queryTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([word, count]) => ({ word, count })),
        dailyStats: Object.entries(dailyStats)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-7)
          .map(([date, count]) => ({ date, count }))
      }
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
 * 导出日志（支持时间范围和 limit）
 * 参数：start, end, limit
 */
router.get('/export', async (req, res) => {
  try {
    const { start, end, limit } = req.query;

    const filter = {
      startTime: start || null,
      endTime: end || null,
      limit: limit ? parseInt(limit) : null
    };

    const logs = await readLogs(filter);

    res.json({
      success: true,
      count: logs.length,
      filter: { start, end, limit },
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
 * 参数：start, end（可选，用于时间筛选）
 */
router.get('/download', async (req, res) => {
  try {
    const { start, end } = req.query;

    const filter = {
      startTime: start || null,
      endTime: end || null
    };

    const logs = await readLogs(filter);

    // 转换为 JSONL 格式
    const jsonlContent = logs.map(log => JSON.stringify(log)).join('\n');

    // 生成文件名（包含时间范围）
    let filename = `search_logs_${Date.now()}.jsonl`;
    if (start || end) {
      const startPart = start ? start : 'begin';
      const endPart = end ? end : 'now';
      filename = `search_logs_${startPart}_to_${endPart}.jsonl`;
    }

    res.setHeader('Content-Type', 'application/jsonl');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonlContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/logs
 * 清空日志（谨慎使用）
 */
router.delete('/', async (req, res) => {
  try {
    await ensureLogDir();
    await fs.writeFile(LOG_FILE, '', 'utf8');

    res.json({
      success: true,
      message: '日志已清空'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
