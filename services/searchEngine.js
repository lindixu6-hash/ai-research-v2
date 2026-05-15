/**
 * AI 搜索引擎 - 主工作流（优化版）
 *
 * 集成了所有优化组件：
 * - 意图分类
 * - 自适应搜索
 * - 引用系统
 * - 对话历史
 * - 用户记忆
 * - 质量评估
 *
 * 创建时间：2026-05-15
 */

const IntentClassifier = require('../services/intentClassifier');
const AdaptiveSearch = require('../services/adaptiveSearch');
const CitationManager = require('../services/citationManager');
const ConversationMemory = require('../services/conversationMemory');
const UserProfile = require('../services/userProfile');
const QualityAssurance = require('../services/qualityAssurance');

/**
 * 主搜索引擎
 */
class SearchEngine {
  constructor(searchClient, options = {}) {
    // 搜索客户端（需要实现 search 方法）
    this.searchClient = searchClient;

    // 初始化组件
    this.classifier = new IntentClassifier();
    this.citationManager = new CitationManager();
    this.qualityAssurance = new QualityAssurance();

    // 可选组件
    this.conversationMemory = options.enableMemory
      ? new ConversationMemory(options.maxHistory || 10)
      : null;
    this.userProfile = options.enableProfile
      ? new UserProfile(options.userId || 'default')
      : null;

    // 统计
    this.stats = {
      totalQueries: 0,
      avgTime: 0,
      avgRounds: 0
    };
  }

  /**
   * 处理查询（主入口）
   */
  async processQuery(query, options = {}) {
    const startTime = Date.now();

    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`收到查询: ${query}`);
      console.log(`${'='.repeat(50)}\n`);

      // 1. 加载用户上下文（如果启用）
      const userContext = await this.loadUserContext();

      // 2. 意图分类
      const intentResult = this.classifier.classify(query);
      console.log(`[意图分类] ${intentResult.intentName} (置信度: ${intentResult.confidence})`);
      console.log(`[参数] 复杂度: ${intentResult.complexity}, 最大轮数: ${intentResult.maxSearchRounds}`);

      // 3. 检查是否可以从历史中快速回答
      const quickAnswer = await this.checkHistory(query, intentResult);
      if (quickAnswer && !options.forceSearch) {
        console.log(`[历史命中] 使用缓存答案`);
        return quickAnswer;
      }

      // 4. 自适应搜索
      const adaptiveSearch = new AdaptiveSearch(this.searchClient);
      const searchResult = await adaptiveSearch.search(query, intentResult);
      console.log(`[搜索完成] ${searchResult.rounds}轮, ${searchResult.totalFound}条结果, 置信度: ${searchResult.confidence.toFixed(2)}`);

      // 5. 如果没有结果，返回提示
      if (searchResult.results.length === 0) {
        return this.handleNoResults(query, intentResult);
      }

      // 6. 分析结果并提取信息（带引用）
      const findings = await this.analyzeResults(query, searchResult.results, intentResult);

      // 7. 生成报告
      const report = await this.generateReport(query, findings, intentResult, userContext);

      // 8. 质量评估
      const quality = this.qualityAssurance.assess(query, report, intentResult);
      console.log(`[质量评估] 得分: ${quality.score}/100`);

      // 如果质量不合格，尝试改进
      let finalReport = report;
      if (!quality.passed && options.autoImprove) {
        console.log(`[质量改进] 检测到问题，尝试改进...`);
        finalReport = await this.improveReport(query, report, quality, intentResult);
      }

      // 9. 添加引用列表
      finalReport += this.citationManager.generateCitationList();

      // 10. 保存到历史
      if (this.conversationMemory) {
        await this.conversationMemory.add(query, finalReport, intentResult, searchResult);
      }

      // 11. 更新用户画像
      if (this.userProfile) {
        await this.userProfile.updateFromQuery(query, intentResult, quality);
      }

      // 12. 更新统计
      const elapsed = Date.now() - startTime;
      this.updateStats(elapsed, searchResult.rounds);

      // 13. 返回结果
      return {
        query,
        answer: finalReport,
        intent: intentResult.intent,
        confidence: searchResult.confidence,
        quality: quality,
        metadata: {
          rounds: searchResult.rounds,
          results: searchResult.totalFound,
          citations: this.citationManager.getCount(),
          time: elapsed,
          fromHistory: false
        }
      };

    } catch (error) {
      console.error(`[错误] ${error.message}`);
      return this.handleError(query, error);
    }
  }

  /**
   * 加载用户上下文
   */
  async loadUserContext() {
    if (!this.userProfile) {
      return null;
    }

    return await this.userProfile.getContext();
  }

  /**
   * 检查历史记录
   */
  async checkHistory(query, intentResult) {
    if (!this.conversationMemory) {
      return null;
    }

    // 简单问题可以查历史
    if (intentResult.complexity === 'simple') {
      const cached = await this.conversationMemory.findSimilar(query);
      if (cached && cached.confidence > 0.9) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            fromHistory: true
          }
        };
      }
    }

    return null;
  }

  /**
   * 分析搜索结果
   */
  async analyzeResults(query, results, intentResult) {
    this.citationManager.reset();

    const findings = [];

    // 根据意图类型选择分析策略
    for (const result of results.slice(0, intentResult.maxResults)) {
      const { fact, citation, source } = this.citationManager.extractWithCitation(
        result,
        result.snippet || result.title || result.content || ''
      );

      findings.push({
        text: fact,
        citation,
        source,
        url: result.url,
        relevance: this.calculateRelevance(query, result)
      });
    }

    // 按相关性排序
    findings.sort((a, b) => b.relevance - a.relevance);

    return findings;
  }

  /**
   * 计算相关性
   */
  calculateRelevance(query, result) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const title = (result.title || '').toLowerCase();
    const snippet = (result.snippet || '').toLowerCase();
    const content = title + ' ' + snippet;

    let score = 0;
    for (const word of queryWords) {
      if (word.length > 2 && content.includes(word)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1);
  }

  /**
   * 生成报告
   */
  async generateReport(query, findings, intentResult, userContext) {
    const template = this.classifier.getTemplate(intentResult.intent);

    // 根据意图类型生成不同格式的报告
    switch (intentResult.intent) {
      case 'informational-simple':
        return this.generateSimpleAnswer(query, findings, userContext);

      case 'informational-complex':
        return this.generateComplexAnswer(query, findings, userContext);

      case 'commercial':
        return this.generateCommercialAnswer(query, findings, userContext);

      case 'navigational':
        return this.generateNavigationalAnswer(query, findings);

      case 'research':
        return this.generateResearchAnswer(query, findings, userContext);

      case 'multi-part':
        return this.generateMultiPartAnswer(query, findings, intentResult, userContext);

      default:
        return this.generateSimpleAnswer(query, findings, userContext);
    }
  }

  /**
   * 生成简单答案（BLUF 原则）
   */
  generateSimpleAnswer(query, findings, userContext) {
    if (findings.length === 0) {
      return '# 很抱歉\n\n我暂时找不到关于这个问题的可靠信息。';
    }

    // 直接回答，开门见山
    const topFacts = findings.slice(0, 2);
    let answer = '# 核心答案\n\n';

    for (const finding of topFacts) {
      answer += `${finding.text.replace(/^\d+\.\s*/, '')} ${finding.citation}\n\n`;
    }

    // 如果用户偏好简洁，到此为止
    if (userContext && userContext.preferBrief) {
      return answer;
    }

    // 可选的补充信息
    if (findings.length > 2) {
      answer += '## 补充信息\n\n';
      for (const finding of findings.slice(2, 4)) {
        answer += `- ${finding.text.replace(/^\d+\.\s*/, '')} ${finding.citation}\n`;
      }
    }

    return answer;
  }

  /**
   * 生成复杂答案
   */
  generateComplexAnswer(query, findings, userContext) {
    if (findings.length === 0) {
      return '# 很抱歉\n\n我暂时找不到关于这个问题的可靠信息。';
    }

    let answer = '# 核心答案\n\n';
    answer += `${findings[0].text} ${findings[0].citation}\n\n`;

    answer += '## 关键点\n\n';
    for (let i = 0; i < Math.min(findings.length, 5); i++) {
      const f = findings[i];
      const title = this.extractKeyPoint(f.text);
      answer += `${i + 1}. **${title}**：${f.text} ${f.citation}\n`;
    }

    answer += '\n## 详细说明\n\n';
    answer += '基于搜索结果，以上是关于该问题的核心信息。';

    return answer;
  }

  /**
   * 生成商业对比答案
   */
  generateCommercialAnswer(query, findings, userContext) {
    let answer = '# 对比结论\n\n';
    answer += '根据搜索结果，以下是相关对比信息：\n\n';

    answer += '## 对比信息\n\n';
    for (const f of findings.slice(0, 5)) {
      answer += `- ${f.text} ${f.citation}\n`;
    }

    answer += '\n## 建议\n\n';
    answer += '建议根据具体需求和使用场景来选择。';

    return answer;
  }

  /**
   * 生成导航型答案
   */
  generateNavigationalAnswer(query, findings) {
    let answer = '# 链接\n\n';

    for (const f of findings.slice(0, 3)) {
      answer += `- [${f.source}](${f.url})\n`;
    }

    answer += '\n## 说明\n\n';
    answer += `以上是关于"${query}"的相关链接。`;

    return answer;
  }

  /**
   * 生成研究报告
   */
  generateResearchAnswer(query, findings, userContext) {
    let answer = `# 研究报告：${query}\n\n`;

    answer += '## 核心发现\n\n';
    for (const f of findings.slice(0, 3)) {
      answer += `- ${f.text} ${f.citation}\n`;
    }

    answer += '\n## 关键数据\n\n';
    for (let i = 0; i < Math.min(findings.length, 5); i++) {
      const f = findings[i];
      answer += `${i + 1}. ${f.text} ${f.citation}\n`;
    }

    answer += '\n## 详细分析\n\n';
    answer += '### 背景\n\n';
    answer += '根据搜索结果，以上是关于该主题的研究信息。\n\n';

    answer += '### 局限性\n\n';
    answer += '以上信息基于搜索结果，可能存在时效性和完整性限制。';

    return answer;
  }

  /**
   * 生成多部分答案
   */
  generateMultiPartAnswer(query, findings, intentResult, userContext) {
    // 解析多个问题
    const questions = query.split(/[？?]/).filter(q => q.trim().length > 0);

    let answer = '';

    // 为每个问题分配部分结果
    const resultsPerQuestion = Math.ceil(findings.length / questions.length);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i].trim();
      const start = i * resultsPerQuestion;
      const end = start + resultsPerQuestion;
      const questionFindings = findings.slice(start, end);

      answer += `# 问题${i + 1}：${q}\n\n`;

      if (questionFindings.length > 0) {
        answer += `${questionFindings[0].text} ${questionFindings[0].citation}\n\n`;
      } else {
        answer += '抱歉，没有找到相关信息。\n\n';
      }
    }

    return answer;
  }

  /**
   * 提取关键点
   */
  extractKeyPoint(text) {
    // 简单提取：取前15个字
    return text.substring(0, 15).replace(/\[.*?\]/g, '').trim();
  }

  /**
   * 改进报告
   */
  async improveReport(query, report, quality, intentResult) {
    console.log(`[改进] 问题:`, quality.issues.map(i => i.type).join(', '));

    // 简单改进：移除禁用话术
    let improved = report;

    for (const issue of quality.issues) {
      if (issue.type === 'forbidden_phrase') {
        improved = improved.replace(new RegExp(issue.message.replace(/.*：/, ''), 'g'), '');
      }
      if (issue.type === 'too_long') {
        // 简单截断
        const lines = improved.split('\n');
        improved = lines.slice(0, Math.floor(lines.length * 0.7)).join('\n');
      }
    }

    return improved;
  }

  /**
   * 处理无结果
   */
  handleNoResults(query, intentResult) {
    return {
      query,
      answer: `# 很抱歉\n\n我暂时找不到关于"${query}"的可靠信息。\n\n建议：\n- 检查拼写是否正确\n- 尝试更具体的关键词\n- 如果这是最新话题，可能需要等待更多内容发布`,
      intent: intentResult.intent,
      confidence: 0,
      metadata: {
        rounds: 0,
        results: 0,
        citations: 0,
        fromHistory: false
      }
    };
  }

  /**
   * 处理错误
   */
  handleError(query, error) {
    return {
      query,
      answer: `# 出错了\n\n处理您的查询时遇到问题：${error.message}\n\n请稍后重试。`,
      error: error.message,
      metadata: {
        rounds: 0,
        results: 0,
        citations: 0
      }
    };
  }

  /**
   * 更新统计
   */
  updateStats(time, rounds) {
    this.stats.totalQueries++;
    this.stats.avgTime = (this.stats.avgTime * (this.stats.totalQueries - 1) + time) / this.stats.totalQueries;
    this.stats.avgRounds = (this.stats.avgRounds * (this.stats.totalQueries - 1) + rounds) / this.stats.totalQueries;
  }

  /**
   * 获取统计
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 添加用户反馈
   */
  async addFeedback(queryId, feedback) {
    if (this.userProfile) {
      await this.userProfile.addFeedback(queryId, feedback);
    }
  }

  /**
   * 获取对话历史
   */
  getHistory() {
    if (!this.conversationMemory) {
      return [];
    }
    return this.conversationMemory.getRecent(10);
  }

  /**
   * 清除历史
   */
  clearHistory() {
    if (this.conversationMemory) {
      this.conversationMemory.clear();
    }
  }
}

module.exports = SearchEngine;
