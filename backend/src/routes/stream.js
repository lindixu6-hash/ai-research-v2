/**
 * 流式搜索 API（SSE）
 * 实时推送 Agent 执行进度
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/search/stream
 * 流式搜索接口
 */
router.post('/stream', async (req, res) => {
  const { query } = req.body;
  const skipClarify = req.headers['x-skip-clarify'] === 'true';
  const clarifyAnswersHeader = req.headers['x-clarify-answers'];
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
    const { search } = require('../services/searchService');

    // ===== 第1步：开始 =====
    sendEvent('start', {
      message: '开始搜索...',
      timestamp: Date.now()
    });

    // ===== 第2步：澄清判断 =====
    const shouldSkipClarify = skipClarify || (clarifyAnswers && clarifyAnswers.length > 0);
    if (!shouldSkipClarify) {
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
        // 单问题渐进式澄清
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

    // ===== 第4步：执行搜索（带结果验证）=====
    const allResults = [];
    let totalSearched = 0;
    let totalValid = 0;
    let totalInvalid = 0;

    for (let i = 0; i < searchResult.queries.length; i++) {
      const q = searchResult.queries[i];
      sendEvent('step', {
        step: 'searching',
        current: i + 1,
        total: searchResult.queries.length,
        query: q,
        message: `搜索 (${i + 1}/${searchResult.queries.length}): ${q}`,
        timestamp: Date.now()
      });

      const result = await search(q);

      if (result.success && result.results) {
        totalSearched += result.results.length;

        // 显示验证统计
        if (result.validation) {
          totalValid += result.validation.validCount;
          totalInvalid += result.validation.invalidCount;
          sendEvent('validation', {
            query: q,
            total: result.validation.total,
            valid: result.validation.validCount,
            invalid: result.validation.invalidCount,
            message: `验证: ${result.validation.validCount}/${result.validation.total} 条有效`
          });
        }

        allResults.push(...result.results);
        sendEvent('search_result', {
          query: q,
          count: result.results.length,
          results: result.results.slice(0, 3).map(r => ({
            title: r.title,
            url: r.url
          }))
        });
      }
    }

    sendEvent('step', {
      step: 'search_done',
      message: `搜索完成，找到 ${allResults.length} 条有效结果（验证过滤了 ${totalInvalid} 条无效）`,
      timestamp: Date.now(),
      stats: {
        total: totalSearched,
        valid: totalValid,
        invalid: totalInvalid
      }
    });

    // ===== 第5步：分析提取 =====
    sendEvent('step', {
      step: 'analyzing',
      message: '分析搜索结果，提取关键信息...',
      timestamp: Date.now()
    });

    const searchContext = allResults.slice(0, 10).map(r => {  // 限制数量，避免超长
      return `来源：${r.url}\n内容：${(r.rawContent || r.content).slice(0, 500)}`;
    }).join('\n\n---\n\n');

    const analyzeResult = await callLLMJSON(
      prompts.SYSTEM,
      prompts.ANALYZE + '\n\n原始问题：' + query + '\n\n搜索结果：\n' + searchContext
    );

    // ===== 第6步：生成报告 =====
    sendEvent('step', {
      step: 'generating_report',
      message: '生成研究报告...',
      timestamp: Date.now()
    });

    const findingsText = analyzeResult.findings.map((f, i) =>
      `${i + 1}. ${f.fact}\n   来源：${f.source}\n   可信度：${f.confidence}`
    ).join('\n\n');

    const report = await callLLM(
      prompts.SYSTEM,
      prompts.REPORT + '\n\n原始问题：' + query + '\n\n研究发现：\n' + findingsText
    );

    // ===== 完成 =====
    sendEvent('report', {
      report: report,
      findings: analyzeResult.findings,
      duration: Date.now() - startTime
    });

    sendEvent('step', {
      step: 'complete',
      message: '搜索完成！',
      timestamp: Date.now()
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
  } finally {
    res.end();
  }
});

module.exports = router;
