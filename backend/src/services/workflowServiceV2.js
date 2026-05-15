/**
 * AI搜索工作流编排器（优化版）
 *
 * 集成了所有优化组件：
 * - 意图分类
 * - 自适应搜索
 * - 引用系统
 * - 对话历史
 * - 用户画像
 * - 质量评估
 *
 * 创建时间：2026-05-15
 */

const { callLLM, callLLMJSON, callLLMJSONWithMode } = require('./llmService');
const { batchSearch } = require('./searchService');
const prompts = require('../prompts');

// 导入优化组件
const IntentClassifier = require('../../../services/intentClassifier');
const AdaptiveSearch = require('../../../services/adaptiveSearch');
const CitationManager = require('../../../services/citationManager');
const ConversationMemory = require('../../../services/conversationMemory');
const UserProfile = require('../../../services/userProfile');
const QualityAssurance = require('../../../services/qualityAssurance');

// 初始化组件
const classifier = new IntentClassifier();
const citationManager = new CitationManager();
const qualityAssurance = new QualityAssurance();

// 可选组件（需要用户ID）
let conversationMemory = null;
let userProfile = null;

/**
 * 启用对话历史和用户画像
 */
function enableMemoryFeatures(userId = 'default') {
  if (!conversationMemory) {
    conversationMemory = new ConversationMemory(50);
    console.log('✓ 对话历史已启用');
  }
  if (!userProfile) {
    userProfile = new UserProfile(userId);
    console.log('✓ 用户画像已启用');
  }
}

/**
 * 禁用记忆功能
 */
function disableMemoryFeatures() {
  conversationMemory = null;
  userProfile = null;
  console.log('✓ 记忆功能已禁用');
}

/**
 * 创建搜索客户端适配器
 * 将现有的 batchSearch 包装成 AdaptiveSearch 需要的格式
 */
function createSearchClient() {
  return {
    async search(query, options = {}) {
      const maxResults = options.maxResults || 10;
      const results = await batchSearch([query]);

      // 转换结果格式
      const successfulSearches = results.filter(r => r.success);
      const allResults = [];

      for (const search of successfulSearches) {
        for (const item of search.results) {
          allResults.push({
            title: item.title,
            url: item.url,
            content: item.content || item.rawContent,
            snippet: item.content || item.rawContent || ''
          });
        }
      }

      return {
        results: allResults.slice(0, maxResults)
      };
    }
  };
}

/**
 * 执行完整的AI搜索工作流（优化版）
 * @param {string} userQuery - 用户的问题
 * @param {object} options - 可选参数
 * @returns {Promise<object>} 搜索结果
 */
async function executeWorkflow(userQuery, options = {}) {
  console.log(`\n🚀 开始AI搜索工作流（优化版）`);
  console.log(`📝 用户问题: ${userQuery}`);

  const workflow = {
    query: userQuery,
    startTime: Date.now(),
    steps: [],
    version: 'v2-optimized'
  };

  try {
    // ===== 第1步：意图分类 =====
    console.log(`\n⏳ 第1步：意图分类...`);
    const intentResult = classifier.classify(userQuery);

    workflow.steps.push({ step: 'intent_classification', result: intentResult });
    console.log(`✓ 意图: ${intentResult.intentName} (${intentResult.complexity})`);
    console.log(`  参数: 最大轮数=${intentResult.maxSearchRounds}, 最大结果=${intentResult.maxResults}`);

    // ===== 第2步：检查历史缓存 =====
    if (conversationMemory && intentResult.complexity === 'simple') {
      console.log(`\n⏳ 第2步：检查历史缓存...`);
      const cached = await conversationMemory.findSimilar(userQuery);
      if (cached && cached.confidence > 0.85) {
        console.log(`✓ 命中历史缓存，直接返回`);
        return {
          status: 'success',
          query: userQuery,
          report: cached.answer,
          findings: [],
          fromCache: true,
          workflow: workflow
        };
      }
      console.log(`✓ 无缓存，继续搜索`);
    }

    // ===== 第3步：自适应搜索 =====
    console.log(`\n⏳ 第3步：自适应搜索...`);
    const searchClient = createSearchClient();
    const adaptiveSearch = new AdaptiveSearch(searchClient);

    const searchResult = await adaptiveSearch.search(userQuery, intentResult);

    workflow.steps.push({ step: 'adaptive_search', result: searchResult });
    console.log(`✓ 搜索完成: ${searchResult.rounds}轮, ${searchResult.totalFound}条结果`);
    console.log(`  置信度: ${searchResult.confidence.toFixed(2)}`);

    // 如果没有结果，返回提示
    if (searchResult.results.length === 0) {
      return {
        status: 'success',
        query: userQuery,
        report: `# 很抱歉\n\n我暂时找不到关于"${userQuery}"的可靠信息。\n\n建议：\n- 检查拼写是否正确\n- 尝试更具体的关键词`,
        findings: [],
        workflow: workflow
      };
    }

    // ===== 第4步：分析提取关键信息（带引用） =====
    console.log(`\n⏳ 第4步：分析结果并提取信息...`);

    // 使用引用管理器
    citationManager.reset();

    // 格式化搜索结果
    const searchContext = searchResult.results.slice(0, intentResult.maxResults).map((r, i) => {
      const { fact, citation } = citationManager.extractWithCitation(r, r.snippet || r.content || '');
      return `${i + 1}. 【${r.title}】\n   来源：${r.url}\n   内容：${r.snippet || r.content || ''}`;
    }).join('\n\n');

    const analyzeResult = await callLLMJSONWithMode(
      prompts.SYSTEM,
      `从搜索结果中提取关键信息。问题："${userQuery}"\n\n搜索结果：\n${searchContext}\n\n输出JSON：{"findings": [{"fact": "信息", "source": "来源URL", "confidence": "high"}]}`,
      { max_tokens: 3000 }
    );

    workflow.steps.push({ step: 'analyze', result: analyzeResult });
    console.log(`✓ 提取了 ${analyzeResult.findings.length} 条关键信息`);

    // ===== 第5步：生成报告（根据意图类型） =====
    console.log(`\n⏳ 第5步：生成报告...`);

    // 获取对应的报告模板
    const template = getReportTemplate(intentResult.intent);

    const findingsText = analyzeResult.findings.map((f, i) =>
      `${i + 1}. ${f.fact}`
    ).join('\n\n');

    // 根据意图类型调整报告生成策略
    let reportPrompt;
    if (intentResult.complexity === 'simple') {
      // 简单问题：直接简洁回答
      reportPrompt = `用户问题："${userQuery}"\n\n研究发现：\n${findingsText}\n\n请直接回答问题，1-3句话即可，包含具体数据。不要废话，不要"可能取决于"等模糊表述。`;
    } else if (intentResult.intent === 'commercial') {
      // 商业对比：用对比格式
      reportPrompt = `用户问题："${userQuery}"\n\n研究发现：\n${findingsText}\n\n请生成对比报告，包含：对比结论、详细对比表格、选择建议。`;
    } else {
      // 其他类型：使用模板
      reportPrompt = `用户问题："${userQuery}"\n\n研究发现：\n${findingsText}\n\n请生成研究报告，结构：${template}`;
    }

    const report = await callLLM(
      prompts.SYSTEM,
      reportPrompt,
      { max_tokens: intentResult.expectedLength.max * 2 }
    );

    // 添加引用列表
    const reportWithCitations = report + citationManager.generateCitationList();

    workflow.steps.push({ step: 'report', result: reportWithCitations });

    // ===== 第6步：质量评估 =====
    console.log(`\n⏳ 第6步：质量评估...`);
    const quality = qualityAssurance.assess(userQuery, reportWithCitations, intentResult);

    workflow.steps.push({ step: 'quality', result: quality });
    console.log(`✓ 质量得分: ${quality.score}/100`);

    // ===== 第7步：保存到历史和更新用户画像 =====
    if (conversationMemory) {
      await conversationMemory.add(userQuery, reportWithCitations, intentResult, searchResult);
      console.log(`✓ 已保存到对话历史`);
    }

    if (userProfile) {
      await userProfile.updateFromQuery(userQuery, intentResult, quality);
      console.log(`✓ 已更新用户画像`);
    }

    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - workflow.startTime;

    console.log(`\n✅ 工作流完成！耗时 ${(workflow.duration / 1000).toFixed(1)} 秒`);

    return {
      status: 'success',
      query: userQuery,
      report: reportWithCitations,
      findings: analyzeResult.findings,
      intent: intentResult.intent,
      confidence: searchResult.confidence,
      quality: quality,
      fromCache: false,
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

/**
 * 根据意图类型获取报告模板
 */
function getReportTemplate(intent) {
  const templates = {
    'informational-simple': '核心答案（1-3句话直接回答）',
    'informational-complex': '核心答案、关键点、详细说明',
    'navigational': '链接、说明',
    'transactional': '核心信息（价格、渠道、注意事项）',
    'commercial': '对比结论、详细对比表格、选择建议',
    'generative': '生成结果、使用说明',
    'research': '核心发现、关键数据、详细分析、结论、局限性',
    'multi-part': '分问题回答'
  };
  return templates[intent] || '核心答案、详细说明';
}

/**
 * 添加用户反馈
 */
async function addFeedback(queryId, feedback) {
  if (userProfile) {
    await userProfile.addFeedback(queryId, feedback);
    return { success: true };
  }
  return { success: false, message: '用户画像未启用' };
}

/**
 * 获取对话历史
 */
function getHistory(limit = 10) {
  if (conversationMemory) {
    return conversationMemory.getRecent(limit);
  }
  return [];
}

/**
 * 清除历史
 */
function clearHistory() {
  if (conversationMemory) {
    conversationMemory.clear();
    return { success: true };
  }
  return { success: false, message: '对话历史未启用' };
}

/**
 * 获取统计信息
 */
function getStats() {
  const stats = {
    memoryEnabled: conversationMemory !== null,
    profileEnabled: userProfile !== null
  };

  if (conversationMemory) {
    stats.historyStats = conversationMemory.getStats();
  }

  if (userProfile) {
    stats.userStats = userProfile.getStats();
  }

  return stats;
}

module.exports = {
  executeWorkflow,
  enableMemoryFeatures,
  disableMemoryFeatures,
  addFeedback,
  getHistory,
  clearHistory,
  getStats
};
