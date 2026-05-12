/**
 * AI搜索工作流编排器
 *
 * 核心逻辑：协调各个Agent按顺序执行完整的搜索流程
 *
 * 流程图：
 * 用户问题 → 澄清Agent → 搜索Agent → 执行搜索 → 分析Agent → 报告Agent → 返回结果
 */

const { callLLM, callLLMJSON, callLLMJSONWithMode } = require('./llmService');
const { batchSearch } = require('./searchService');
const prompts = require('../prompts');

/**
 * 执行完整的AI搜索工作流
 * @param {string} userQuery - 用户的问题
 * @param {object} options - 可选参数
 * @returns {Promise<object>} 搜索结果
 */
async function executeWorkflow(userQuery, options = {}) {
  console.log(`\n🚀 开始AI搜索工作流`);
  console.log(`📝 用户问题: ${userQuery}`);

  const workflow = {
    query: userQuery,
    startTime: Date.now(),
    steps: []
  };

  try {
    // ===== 第1步：澄清判断 =====
    console.log(`\n⏳ 第1步：判断是否需要澄清...`);
    const clarifyResult = await callLLMJSON(
      prompts.SYSTEM,
      `判断问题是否清晰："${userQuery}"

输出JSON格式：{"need_clarify": true/false, "questions": ["问题1"]}`
    );

    workflow.steps.push({ step: 'clarify', result: clarifyResult });

    // 如果需要澄清，直接返回（不继续搜索）
    if (clarifyResult.need_clarify) {
      console.log(`🤔 需要澄清，返回问题给用户`);
      return {
        status: 'need_clarify',
        questions: clarifyResult.questions,
        workflow: workflow
      };
    }
    console.log(`✅ 问题清晰，继续执行`);

    // ===== 第2步：生成搜索关键词 =====
    console.log(`\n⏳ 第2步：生成搜索关键词...`);
    const searchResult = await callLLMJSON(
      prompts.SYSTEM,
      `用户问题：${userQuery}

请为这个问题生成3-5个搜索关键词。

必须严格按照以下JSON格式输出：
{"queries": ["关键词1", "关键词2", "关键词3"]}`,
      { max_tokens: 500 }
    );

    workflow.steps.push({ step: 'search_queries', result: searchResult });
    // 兼容模型可能返回的不同键名
    console.log('🔍 调试：searchResult =', JSON.stringify(searchResult, null, 2));
    const queries = searchResult.queries || searchResult.search_queries || searchResult.keywords || searchResult.search_keywords || [];
    console.log(`🔑 生成 ${queries.length} 个搜索关键词`);

    // ===== 第3步：执行搜索 =====
    console.log(`\n⏳ 第3步：执行搜索...`);
    const searchResults = await batchSearch(queries);

    // 过滤出成功的搜索结果
    const successfulSearches = searchResults.filter(r => r.success);
    if (successfulSearches.length === 0) {
      throw new Error('所有搜索都失败了，请检查搜索API配置');
    }

    workflow.steps.push({ step: 'search_execution', result: successfulSearches });
    console.log(`✅ 搜索完成，获得 ${successfulSearches.length} 组结果`);

    // ===== 第4步：分析提取关键信息 =====
    console.log(`\n⏳ 第4步：分析搜索结果，提取关键信息...`);

    // 将搜索结果格式化成文本，限制长度避免超出token限制
    const searchContext = successfulSearches.map(r => {
      return `搜索词：${r.query}\n结果：\n${
        r.results.slice(0, 2).map((item, i) => {  // 只取前2个结果
          let content = item.rawContent || item.content;
          if (content && content.length > 500) {
            content = content.substring(0, 500) + '...';
          }
          return `${i + 1}. 【${item.title}】\n   来源：${item.url}\n   内容：${content}`;
        }).join('\n\n')
      }`;
    }).join('\n\n---\n\n');

    const analyzeResult = await callLLMJSONWithMode(
      prompts.SYSTEM,
      `从搜索结果中提取关键信息。问题："${userQuery}"\n\n搜索结果：\n${searchContext}\n\n输出JSON：{"findings": [{"fact": "信息", "source": "来源", "confidence": "high"}]}`,
      { max_tokens: 3000 }
    );

    workflow.steps.push({ step: 'analyze', result: analyzeResult });
    console.log(`📊 提取了 ${analyzeResult.findings.length} 条关键信息`);

    // ===== 第5步：生成报告 =====
    console.log(`\n⏳ 第5步：生成最终报告...`);
    const findingsText = analyzeResult.findings.map((f, i) =>
      `${i + 1}. ${f.fact}\n   来源：${f.source}\n   可信度：${f.confidence}`
    ).join('\n\n');

    const report = await callLLM(
      prompts.SYSTEM,
      `基于研究发现生成报告。问题："${userQuery}"\n\n发现：\n${findingsText}\n\n请生成简洁的研究报告，包含核心摘要和关键发现。`,
      { max_tokens: 2000 }
    );

    workflow.steps.push({ step: 'report', result: report });
    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - workflow.startTime;

    console.log(`\n✅ 工作流完成！耗时 ${(workflow.duration / 1000).toFixed(1)} 秒`);

    return {
      status: 'success',
      query: userQuery,
      report: report,
      findings: analyzeResult.findings,
      workflow: workflow
    };

  } catch (error) {
    console.error(`❌ 工作流执行失败:`, error.message);
    workflow.error = error.message;
    workflow.endTime = Date.now();

    return {
      status: 'error',
      error: error.message,
      workflow: workflow
    };
  }
}

module.exports = {
  executeWorkflow
};
