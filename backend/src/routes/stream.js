/**
 * 流式搜索 API（SSE）- 性能优化版
 *
 * 优化点：
 * 1. 并行执行所有搜索（而非串行）
 * 2. 添加 URL 去重逻辑
 * 3. 减少不必要的等待
 */

const express = require('express');
const router = express.Router();
const { logSearch } = require('../services/searchLogger');

/**
 * URL 去重
 */
function deduplicateResults(results) {
  const seen = new Set();
  return results.filter(result => {
    const url = result.url;
    if (seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });
}

/**
 * POST /api/search/stream
 * 流式搜索接口
 */
router.post('/stream', async (req, res) => {
  const { query } = req.body;
  const skipClarify = req.headers['x-skip-clarify'] === 'true';
  const clarifyAnswersHeader = req.headers['x-clarify-answers'];
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  let clarifyAnswers = [];
  try {
    if (clarifyAnswersHeader) {
      clarifyAnswers = JSON.parse(decodeURIComponent(clarifyAnswersHeader));
    }
  } catch (e) {
    console.error('解析澄清答案失败:', e);
  }
  const startTime = Date.now();

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 发送事件的辅助函数
  const sendEvent = (type, data) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { callLLMJSON, callLLM } = require('../services/llmService');
    const prompts = require('../prompts');
    const { batchSearch } = require('../services/searchService');

    // ===== 第1步：开始 =====
    sendEvent('start', {
      message: '开始搜索...',
      timestamp: Date.now()
    });

    // ===== 第2步：问题分类 + 澄清判断 =====
    const shouldSkipClarify = skipClarify || (clarifyAnswers && clarifyAnswers.length > 0);
    let questionType = 'exploration'; // 默认类型

    if (!shouldSkipClarify) {
      sendEvent('step', {
        step: 'classify',
        message: '分析问题类型...',
        timestamp: Date.now()
      });

      // 问题分类
      const classifyResult = await callLLMJSON(
        prompts.SYSTEM,
        prompts.QUESTION_CLASSIFIER + '\n\n用户问题：' + query
      );
      questionType = classifyResult?.type || classifyResult || 'exploration';
      console.log('📋 问题类型:', questionType);

      sendEvent('step', {
        step: 'clarify',
        message: '分析问题是否清晰...',
        timestamp: Date.now()
      });

      const clarifyResult = await callLLMJSON(
        prompts.SYSTEM,
        prompts.CLARIFY + '\n\n用户问题：' + query
      );

      console.log('🔍 clarifyResult:', JSON.stringify(clarifyResult));

      if (clarifyResult.need_clarify) {
        sendEvent('clarify', {
          question: clarifyResult.question,
          options: clarifyResult.options || []
        });
        sendEvent('end', {});
        res.end();
        return;
      }
    }

    // ===== 第3步：生成搜索关键词 =====
    sendEvent('step', {
      step: 'generating_queries',
      message: '生成搜索关键词...',
      timestamp: Date.now()
    });

    // 构建带澄清答案的查询上下文
    let queryContext = query;
    if (clarifyAnswers.length > 0) {
      queryContext += `\n\n用户偏好：${clarifyAnswers.join('、')}`;
    }

    const searchResult = await callLLMJSON(
      prompts.SYSTEM,
      prompts.SEARCH_QUERY + '\n\n用户问题：' + queryContext
    );

    sendEvent('queries_generated', {
      queries: searchResult.queries,
      message: `生成了 ${searchResult.queries.length} 个搜索关键词`
    });

    // ===== 第4步：并行执行搜索（性能优化）=====
    sendEvent('step', {
      step: 'searching',
      message: `并行搜索 ${searchResult.queries.length} 个关键词...`,
      timestamp: Date.now()
    });

    // 使用 batchSearch 并行执行所有搜索
    const searchResults = await batchSearch(searchResult.queries);

    // 收集所有结果
    let allResults = [];
    let totalSearched = 0;
    let totalValid = 0;
    let totalInvalid = 0;

    searchResults.forEach(result => {
      if (result.success && result.results) {
        totalSearched += result.results.length;

        if (result.validation) {
          totalValid += result.validation.validCount;
          totalInvalid += result.validation.invalidCount;
        }

        allResults.push(...result.results);
      }
    });

    // URL 去重
    const beforeDedup = allResults.length;
    allResults = deduplicateResults(allResults);
    const afterDedup = allResults.length;
    const deduped = beforeDedup - afterDedup;

    sendEvent('step', {
      step: 'search_done',
      message: `搜索完成，找到 ${afterDedup} 条唯一结果（过滤了 ${totalInvalid} 条无效，去重 ${deduped} 条重复）`,
      timestamp: Date.now(),
      stats: {
        total: totalSearched,
        valid: totalValid,
        invalid: totalInvalid,
        deduped
      }
    });

    // 发送搜索结果摘要（前几个）
    searchResults.forEach(result => {
      if (result.success && result.results && result.results.length > 0) {
        sendEvent('search_result', {
          query: result.query,
          count: result.results.length,
          results: result.results.slice(0, 2).map(r => ({
            title: r.title,
            url: r.url
          }))
        });
      }
    });

    // ===== 第5步：分析提取 =====
    sendEvent('step', {
      step: 'analyzing',
      message: '分析搜索结果，提取关键信息...',
      timestamp: Date.now()
    });

    // 限制分析的结果数量，避免 token 过长
    const maxResultsToAnalyze = 15;
    const searchContext = allResults.slice(0, maxResultsToAnalyze).map(r => {
      return `来源：${r.url}\n标题：${r.title}\n内容：${(r.rawContent || r.content).slice(0, 800)}`;
    }).join('\n\n---\n\n');

    const analyzeResult = await callLLMJSON(
      prompts.SYSTEM,
      prompts.ANALYZE + '\n\n原始问题：' + query + '\n\n搜索结果（共' + allResults.length + '条，分析前' + maxResultsToAnalyze + '条）：\n' + searchContext
    );

    // ===== 第6步：生成报告（使用分层模板）=====
    sendEvent('step', {
      step: 'generating_report',
      message: `生成${questionType === 'factual' ? '简洁' : '研究'}报告...`,
      timestamp: Date.now()
    });

    const findingsText = analyzeResult.findings.map((f, i) =>
      `${i + 1}. ${f.fact}\n   来源：${f.source}\n   可信度：${f.confidence}`
    ).join('\n\n');

    // 根据问题类型选择模板
    const responseTemplate = prompts.RESPONSE_TEMPLATES[questionType] ||
                             prompts.RESPONSE_TEMPLATES.exploration;

    const report = await callLLM(
      prompts.SYSTEM,
      responseTemplate + '\n\n' + prompts.REPORT + '\n\n原始问题：' + query + '\n\n研究发现：\n' + findingsText
    );

    // ===== 完成 =====
    const duration = Date.now() - startTime;
    sendEvent('report', {
      report: report,
      findings: analyzeResult.findings,
      duration: duration,
      stats: {
        queriesCount: searchResult.queries.length,
        resultsCount: allResults.length,
        dedupedCount: deduped
      }
    });

    sendEvent('step', {
      step: 'complete',
      message: `搜索完成！耗时 ${Math.round(duration / 1000)} 秒`,
      timestamp: Date.now()
    });

    // 记录搜索日志
    await logSearch({
      query,
      clarifyAnswers,
      searchQueries: searchResult.queries,
      resultsCount: allResults.length,
      findings: analyzeResult.findings,
      report,
      duration: Date.now() - startTime,
      questionType, // 记录问题类型
      userAgent,
      ip: clientIp
    });

    sendEvent('end', {
      message: '完成！',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('流式搜索错误:', error);
    sendEvent('error', {
      message: error.message
    });

    // 记录错误日志
    await logSearch({
      query,
      clarifyAnswers,
      error: error.message,
      duration: Date.now() - startTime,
      userAgent,
      ip: clientIp
    });
  } finally {
    res.end();
  }
});

module.exports = router;
