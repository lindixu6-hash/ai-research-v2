/**
 * 流式搜索 API（SSE）- 终极优化版
 *
 * 优化点：
 * 1. 自适应搜索：根据置信度决定是否继续搜索
 * 2. 查询意图分类：8种类型，针对性回答
 * 3. URL 去重逻辑
 * 4. 引用系统：带来源URL的引用标注
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
 * 生成当前轮次的搜索关键词
 */
async function generateQueries(prompts, callLLMJSON, query, round, intent) {
  const prompt = prompts.SEARCH_QUERY + `\n\n用户问题：${query}\n当前轮次：${round}\n查询意图：${intent}`;

  // 每轮生成1-2个关键词
  const result = await callLLMJSON(prompts.SYSTEM, prompt);

  // 确保 queries 存在且是数组
  if (!result || !result.queries || !Array.isArray(result.queries)) {
    // fallback: 使用简单关键词
    return { queries: [query] };
  }

  return result;
}

/**
 * 评估当前搜索结果的置信度
 */
async function evaluateConfidence(prompts, callLLMJSON, query, searchResults, allResults) {
  // 构建搜索结果摘要
  const resultsSummary = allResults.slice(0, 10).map(r =>
    `- ${r.title}: ${((r.rawContent || r.content) || '').slice(0, 100)}...`
  ).join('\n');

  const prompt = prompts.ADAPTIVE_SEARCH + `\n\n用户问题：${query}\n\n当前搜索结果摘要：\n${resultsSummary}\n\n搜索结果数量：${allResults.length}条`;

  try {
    const result = await callLLMJSON(prompts.SYSTEM, prompt);
    return {
      confidence: result?.confidence || 0.5,
      need_more_search: result?.need_more_search !== false,
      reason: result?.reason || '',
      missing_info: result?.missing_info || []
    };
  } catch (e) {
    console.error('置信度评估失败:', e);
    // fallback: 基于结果数量判断
    return {
      confidence: Math.min(0.5 + allResults.length * 0.1, 0.9),
      need_more_search: allResults.length < 5,
      reason: '基于结果数量的估算'
    };
  }
}

/**
 * POST /api/search/stream
 * 流式搜索接口 - 自适应搜索版本
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

    // ===== 第2步：查询意图分类 + 澄清判断 =====
    const shouldSkipClarify = skipClarify || (clarifyAnswers && clarifyAnswers.length > 0);
    let queryIntent = 'informational-simple';
    let maxRounds = 3;
    let expectedLength = '50-100';

    if (!shouldSkipClarify) {
      sendEvent('step', {
        step: 'classify',
        message: '分析查询意图...',
        timestamp: Date.now()
      });

      // 查询意图分类（基于大厂标准，8种类型）
      const classifyResult = await callLLMJSON(
        prompts.SYSTEM,
        prompts.QUERY_CLASSIFIER + '\n\n用户问题：' + query
      );

      queryIntent = classifyResult?.intent || 'informational-simple';
      maxRounds = classifyResult?.max_rounds || 3;
      expectedLength = classifyResult?.expected_length || '50-100';

      console.log('📋 查询意图:', queryIntent, '| 最大轮数:', maxRounds, '| 预期长度:', expectedLength);

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

    // ===== 第3步：自适应搜索循环 =====
    let allResults = [];
    let currentConfidence = 0;
    let round = 0;
    let totalSearched = 0;
    let totalValid = 0;
    let totalInvalid = 0;

    while (currentConfidence < 0.85 && round < maxRounds) {
      round++;

      sendEvent('step', {
        step: 'searching',
        message: `第${round}轮搜索...`,
        timestamp: Date.now()
      });

      // 生成当前轮次的搜索关键词
      const searchResult = await generateQueries(prompts, callLLMJSON, query, round, queryIntent);

      sendEvent('queries_generated', {
        queries: searchResult.queries,
        round: round,
        message: `第${round}轮：${searchResult.queries.length} 个关键词`
      });

      // 并行执行搜索
      const roundResults = await batchSearch(searchResult.queries);

      // 收集本轮结果
      let roundResultsList = [];
      roundResults.forEach(result => {
        if (result.success && result.results) {
          totalSearched += result.results.length;
          if (result.validation) {
            totalValid += result.validation.validCount;
            totalInvalid += result.validation.invalidCount;
          }
          roundResultsList.push(...result.results);
        }
      });

      // URL 去重
      roundResultsList = deduplicateResults(roundResultsList);
      allResults.push(...roundResultsList);

      // 发送搜索结果摘要
      roundResults.forEach(result => {
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

      // 评估置信度
      sendEvent('step', {
        step: 'evaluating',
        message: '评估结果质量...',
        timestamp: Date.now()
      });

      const evaluation = await evaluateConfidence(prompts, callLLMJSON, query, roundResults, allResults);
      currentConfidence = evaluation.confidence;

      sendEvent('confidence_update', {
        round: round,
        confidence: currentConfidence,
        need_more: evaluation.need_more_search,
        reason: evaluation.reason,
        total_results: allResults.length
      });

      // 如果置信度足够或明确不需要更多搜索，停止
      if (!evaluation.need_more_search || currentConfidence >= 0.85) {
        console.log(`✅ 置信度 ${currentConfidence} >= 0.85，停止搜索`);
        break;
      }

      console.log(`⏳ 第${round}轮完成，置信度 ${currentConfidence}，继续搜索...`);
    }

    // URL 去重（最终）
    const beforeDedup = allResults.length;
    allResults = deduplicateResults(allResults);
    const afterDedup = allResults.length;
    const deduped = beforeDedup - afterDedup;

    sendEvent('step', {
      step: 'search_done',
      message: `搜索完成（${round}轮），找到 ${afterDedup} 条唯一结果，置信度 ${(currentConfidence * 100).toFixed(0)}%`,
      timestamp: Date.now(),
      stats: {
        rounds: round,
        confidence: currentConfidence,
        total: totalSearched,
        valid: totalValid,
        invalid: totalInvalid,
        deduped
      }
    });

    // ===== 第4步：分析提取（带来源URL）=====
    sendEvent('step', {
      step: 'analyzing',
      message: '分析搜索结果，提取关键信息...',
      timestamp: Date.now()
    });

    // 限制分析的结果数量
    const maxResultsToAnalyze = 15;
    const searchContext = allResults.slice(0, maxResultsToAnalyze).map(r => {
      return `来源：${r.url}\n标题：${r.title}\n内容：${(r.rawContent || r.content).slice(0, 800)}`;
    }).join('\n\n---\n\n');

    const analyzeResult = await callLLMJSON(
      prompts.SYSTEM,
      prompts.ANALYZE + '\n\n原始问题：' + query + '\n\n搜索结果（共' + allResults.length + '条，分析前' + maxResultsToAnalyze + '条）：\n' + searchContext
    );

    // ===== 第5步：生成报告（带引用）=====
    sendEvent('step', {
      step: 'generating_report',
      message: '生成研究报告...',
      timestamp: Date.now()
    });

    // 生成引用文本
    const findingsWithCitations = analyzeResult.findings.map((f, i) => {
      const citation = `[${i + 1}]`;
      return {
        ...f,
        citation,
        index: i + 1
      };
    });

    const findingsText = findingsWithCitations.map(f =>
      `${f.index}. ${f.fact} ${f.citation}\n   来源：${f.source}\n   URL：${f.url || 'N/A'}\n   可信度：${f.confidence}`
    ).join('\n\n');

    // 生成来源列表
    const references = findingsWithCitations.map((f, i) => {
      return `[${i + 1}] ${f.source}${f.url ? ' - ' + f.url : ''}`;
    }).join('\n');

    // 根据意图选择模板
    const responseTemplate = prompts.RESPONSE_TEMPLATES[queryIntent] ||
                             prompts.RESPONSE_TEMPLATES.informational_simple;

    const report = await callLLM(
      prompts.SYSTEM,
      responseTemplate + '\n\n' + prompts.REPORT + '\n\n用户问题：' + query + '\n\n研究发现：\n' + findingsText + '\n\n## 参考来源\n' + references
    );

    // ===== 完成 =====
    const duration = Date.now() - startTime;
    sendEvent('report', {
      report: report,
      findings: analyzeResult.findings,
      duration: duration,
      stats: {
        rounds: round,
        confidence: currentConfidence,
        resultsCount: allResults.length,
        dedupedCount: deduped
      }
    });

    sendEvent('step', {
      step: 'complete',
      message: `搜索完成！耗时 ${Math.round(duration / 1000)} 秒（${round}轮搜索）`,
      timestamp: Date.now()
    });

    // 记录搜索日志
    await logSearch({
      query,
      clarifyAnswers,
      searchQueries: [], // 多轮搜索，记录较复杂
      resultsCount: allResults.length,
      findings: analyzeResult.findings,
      report,
      duration: Date.now() - startTime,
      queryIntent,
      rounds: round,
      confidence: currentConfidence,
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
