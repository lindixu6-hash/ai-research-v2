/**
 * 自适应搜索器
 * 根据置信度动态调整搜索策略
 *
 * 创建时间：2026-05-15
 */

class AdaptiveSearch {
  constructor(searchClient) {
    this.searchClient = searchClient;
    this.confidenceThreshold = 0.85;
  }

  /**
   * 自适应搜索
   * @param {string} query - 原始查询
   * @param {object} intentInfo - 意图信息
   * @returns {object} 搜索结果
   */
  async search(query, intentInfo) {
    const results = [];
    let confidence = 0;
    let round = 0;

    const maxRounds = intentInfo.maxSearchRounds || 3;
    const maxResults = intentInfo.maxResults || 10;

    console.log(`[自适应搜索] 开始搜索，最大轮数: ${maxRounds}`);

    while (confidence < this.confidenceThreshold && round < maxRounds) {
      round++;

      // 每轮生成1-2个搜索关键词
      const searchQueries = await this.generateQueries(query, intentInfo, round);
      console.log(`[自适应搜索] 第${round}轮，搜索词:`, searchQueries);

      // 执行搜索
      const roundResults = await this.batchSearch(searchQueries, maxResults);

      // 评估置信度
      const evaluation = await this.evaluateConfidence(query, roundResults);
      confidence = evaluation.confidence;

      console.log(`[自适应搜索] 第${round}轮完成，置信度: ${confidence.toFixed(2)}`);

      results.push(...roundResults);

      // 如果置信度足够，停止搜索
      if (!evaluation.need_more_search) {
        console.log(`[自适应搜索] 置信度达标，停止搜索`);
        break;
      }
    }

    return {
      results: this.deduplicate(results),
      confidence,
      rounds: round,
      totalFound: results.length
    };
  }

  /**
   * 生成搜索关键词
   */
  async generateQueries(query, intentInfo, round) {
    // 第一轮：直接使用原查询
    if (round === 1) {
      return [query];
    }

    // 后续轮：生成相关搜索词
    const variations = {
      'informational-simple': [
        `${query} 定义`,
        `${query} 是什么`
      ],
      'informational-complex': [
        `${query} 指南`,
        `${query} 教程`,
        `${query} 详细介绍`
      ],
      'commercial': [
        `${query} 对比`,
        `${query} 评测`,
        `${query} 推荐`
      ],
      'research': [
        `${query} 研究`,
        `${query} 报告`,
        `${query} 数据`,
        `${query} 趋势`
      ],
      'transactional': [
        `${query} 价格`,
        `${query} 官网`,
        `${query} 购买`
      ],
      'navigational': [
        `${query} 官网`,
        `${query} 官方网站`
      ],
      'generative': [
        `${query} 示例`,
        `${query} 模板`
      ],
      'multi-part': [
        `${query} 指南`,
        `${query} 教程`
      ]
    };

    const queries = variations[intentInfo.intent] || [query];
    // 每轮返回1-2个查询
    return queries.slice(0, 2);
  }

  /**
   * 批量搜索
   */
  async batchSearch(queries, maxResults) {
    const results = [];

    for (const query of queries) {
      try {
        const response = await this.searchClient.search(query, {
          maxResults: Math.ceil(maxResults / queries.length)
        });
        results.push(...(response.results || []));
      } catch (error) {
        console.error(`[搜索失败] ${query}:`, error.message);
      }
    }

    return results;
  }

  /**
   * 评估搜索结果置信度
   */
  async evaluateConfidence(query, results) {
    let score = 0;
    const reasons = [];

    // 1. 结果数量
    if (results.length >= 3) {
      score += 0.3;
      reasons.push('结果数量足够');
    }
    if (results.length >= 5) {
      score += 0.2;
      reasons.push('结果数量丰富');
    }

    // 2. 来源质量
    const reliableSources = results.filter(r => {
      const url = r.url || '';
      return url.includes('.gov') ||
             url.includes('.edu') ||
             url.includes('wikipedia.org') ||
             url.includes('scholar.google');
    });
    score += Math.min(reliableSources.length * 0.1, 0.3);
    if (reliableSources.length > 0) {
      reasons.push(`权威来源: ${reliableSources.length}个`);
    }

    // 3. 内容相关性（简单版：检查标题包含关键词）
    const queryWords = query.toLowerCase().split(/\s+/);
    const relevantResults = results.filter(r => {
      const title = (r.title || '').toLowerCase();
      return queryWords.some(word => word.length > 2 && title.includes(word));
    });
    const relevanceRatio = relevantResults.length / Math.max(results.length, 1);
    score += relevanceRatio * 0.2;

    return {
      confidence: Math.min(score, 1),
      need_more_search: score < this.confidenceThreshold,
      reasons
    };
  }

  /**
   * 去重
   */
  deduplicate(results) {
    const seen = new Set();
    return results.filter(r => {
      const url = r.url || '';
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }
}

module.exports = AdaptiveSearch;
