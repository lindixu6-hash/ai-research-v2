/**
 * 搜索日志记录服务
 * 用于构建数据集，记录用户查询和模型回答
 */

const fs = require('fs').promises;
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs/search');
const LOG_FILE = path.join(LOG_DIR, 'search_logs.jsonl');

// 确保日志目录存在
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('创建日志目录失败:', error);
  }
}

/**
 * 记录搜索日志
 * @param {Object} data - 搜索数据
 */
async function logSearch(data) {
  await ensureLogDir();

  const logEntry = {
    timestamp: new Date().toISOString(),
    datetime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    query: data.query,
    clarifyAnswers: data.clarifyAnswers || [],
    searchQueries: data.searchQueries || [],
    resultsCount: data.resultsCount || 0,
    findings: data.findings || [],
    report: data.report || '',
    duration: data.duration || 0,
    error: data.error || null,
    userAgent: data.userAgent || '',
    ip: data.ip || '',
    // 新增：自适应搜索相关字段
    queryIntent: data.queryIntent || null,
    rounds: data.rounds || null,
    confidence: data.confidence || null
  };

  try {
    // 追加到 JSONL 文件（每行一个 JSON 对象，便于分析）
    await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
    console.log('✅ 搜索日志已记录');
  } catch (error) {
    console.error('❌ 记录日志失败:', error);
  }
}

/**
 * 获取日志统计
 */
async function getLogStats() {
  await ensureLogDir();

  try {
    const content = await fs.readFile(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    let totalQueries = 0;
    let totalErrors = 0;
    let avgDuration = 0;
    const queryTypes = {};

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        totalQueries++;
        if (entry.error) totalErrors++;
        avgDuration += entry.duration || 0;

        // 统计查询类型（简单按第一个词分类）
        const firstWord = entry.query.split(/[，。？\s]/)[0];
        queryTypes[firstWord] = (queryTypes[firstWord] || 0) + 1;
      } catch (e) {
        // 忽略解析错误的行
      }
    }

    return {
      totalQueries,
      totalErrors,
      avgDuration: totalQueries > 0 ? Math.round(avgDuration / totalQueries) : 0,
      errorRate: totalQueries > 0 ? ((totalErrors / totalQueries) * 100).toFixed(2) + '%' : '0%',
      topQueries: Object.entries(queryTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  } catch (error) {
    return { totalQueries: 0, totalErrors: 0, avgDuration: 0, errorRate: '0%', topQueries: [] };
  }
}

/**
 * 导出日志为 JSON
 */
async function exportLogs(limit = 100) {
  await ensureLogDir();

  try {
    const content = await fs.readFile(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    const logs = lines
      .slice(-limit)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    return logs;
  } catch (error) {
    return [];
  }
}

module.exports = {
  logSearch,
  getLogStats,
  exportLogs
};
