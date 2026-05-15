/**
 * 用户反馈收集系统
 * 收集和管理用户反馈，用于持续改进
 *
 * 功能：
 * - 收集反馈
 * - 分析反馈模式
 * - 生成改进建议
 * - 导出反馈报告
 *
 * 创建时间：2026-05-15
 */

class FeedbackCollector {
  constructor() {
    this.feedbacks = [];
    this.load();
  }

  /**
   * 收集反馈
   */
  async collect(searchId, feedback) {
    const record = {
      id: this.generateId(),
      searchId,
      query: feedback.query,
      report: feedback.report,
      intent: feedback.intent,

      // 评分
      rating: feedback.rating || 0,        // 1-5星
      helpful: feedback.helpful || false,  // 是否有帮助

      // 问题
      issues: feedback.issues || [],       // 具体问题列表
      comment: feedback.comment || '',     // 用户评论

      // 元数据
      timestamp: Date.now(),
      userAgent: feedback.userAgent || '',
      sessionId: feedback.sessionId || ''
    };

    this.feedbacks.unshift(record);
    await this.save();

    // 如果评分低，触发分析
    if (record.rating <= 2) {
      await this.analyzeFailure(record);
    }

    return record;
  }

  /**
   * 分析失败案例
   */
  async analyzeFailure(feedback) {
    const analysis = {
      query: feedback.query,
      intent: feedback.intent,
      issues: feedback.issues,
      comment: feedback.comment,
      timestamp: feedback.timestamp,
      severity: 'low'
    };

    // 根据评分确定严重程度
    if (feedback.rating === 1) {
      analysis.severity = 'critical';
    } else if (feedback.rating === 2) {
      analysis.severity = 'high';
    }

    // 保存到失败案例库
    await this.saveFailure(analysis);
  }

  /**
   * 保存失败案例
   */
  async saveFailure(analysis) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(__dirname, '../../logs/failures.jsonl');

      await fs.appendFile(filePath, JSON.stringify(analysis) + '\n');
    } catch (error) {
      console.error('[反馈系统] 保存失败案例出错:', error.message);
    }
  }

  /**
   * 分析反馈模式
   */
  analyzePatterns() {
    const patterns = {
      issueTypes: {},
      lowRatedQueries: [],
      avgRating: 0,
      totalFeedbacks: this.feedbacks.length
    };

    if (this.feedbacks.length === 0) {
      return patterns;
    }

    // 统计问题类型
    for (const feedback of this.feedbacks) {
      for (const issue of feedback.issues) {
        const type = issue.type || 'unknown';
        if (!patterns.issueTypes[type]) {
          patterns.issueTypes[type] = { count: 0, examples: [] };
        }
        patterns.issueTypes[type].count++;
        if (patterns.issueTypes[type].examples.length < 3) {
          patterns.issueTypes[type].examples.push(feedback.query);
        }
      }

      // 计算平均评分
      patterns.avgRating += feedback.rating;

      // 收集低分查询
      if (feedback.rating <= 2 && patterns.lowRatedQueries.length < 10) {
        patterns.lowRatedQueries.push({
          query: feedback.query,
          rating: feedback.rating,
          issues: feedback.issues
        });
      }
    }

    patterns.avgRating = patterns.avgRating / patterns.totalFeedbacks;

    return patterns;
  }

  /**
   * 获取改进建议
   */
  getImprovementSuggestions() {
    const patterns = this.analyzePatterns();
    const suggestions = [];

    // 基于问题类型的建议
    for (const [type, data] of Object.entries(patterns.issueTypes)) {
      if (data.count >= 3) {
        // 重复出现的问题，需要系统性修复
        suggestions.push({
          priority: 'high',
          issue: type,
          count: data.count,
          suggestion: this.getSuggestionForIssue(type),
          examples: data.examples
        });
      }
    }

    // 基于评分的建议
    if (patterns.avgRating < 3) {
      suggestions.push({
        priority: 'critical',
        issue: 'overall_quality',
        suggestion: '整体评分偏低，建议全面审查回答生成流程'
      });
    }

    return suggestions;
  }

  /**
   * 根据问题类型获取建议
   */
  getSuggestionForIssue(type) {
    const suggestions = {
      'too_long': '回答过长，建议精简模板或增加摘要',
      'too_short': '回答过短，建议增加细节展开',
      'forbidden_phrase': '检测到禁用话术，建议更新提示词',
      'no_direct_answer': '缺少直接答案，建议强调BLUF原则',
      'no_citations': '缺少引用，确保搜索结果正确传递',
      'wrong_intent': '意图识别错误，建议更新分类规则',
      'irrelevant': '结果不相关，建议改进搜索策略'
    };

    return suggestions[type] || '需要进一步分析';
  }

  /**
   * 获取统计报告
   */
  getStatsReport() {
    const patterns = this.analyzePatterns();

    let report = '# 用户反馈统计报告\n\n';
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;

    report += '## 概览\n\n';
    report += `- 总反馈数: ${patterns.totalFeedbacks}\n`;
    report += `- 平均评分: ${patterns.avgRating.toFixed(1)}/5.0\n\n`;

    if (Object.keys(patterns.issueTypes).length > 0) {
      report += '## 问题分布\n\n';
      const sortedIssues = Object.entries(patterns.issueTypes)
        .sort((a, b) => b[1].count - a[1].count);

      for (const [type, data] of sortedIssues) {
        report += `- **${type}**: ${data.count}次\n`;
        if (data.examples.length > 0) {
          report += `  - 示例: ${data.examples.join(', ')}\n`;
        }
      }
      report += '\n';
    }

    if (patterns.lowRatedQueries.length > 0) {
      report += '## 低分案例\n\n';
      for (const item of patterns.lowRatedQueries) {
        report += `- "${item.query}" (${item.rating}★)\n`;
      }
      report += '\n';
    }

    const suggestions = this.getImprovementSuggestions();
    if (suggestions.length > 0) {
      report += '## 改进建议\n\n';
      for (const s of suggestions) {
        report += `- [${s.priority}] ${s.suggestion}\n`;
      }
    }

    return report;
  }

  /**
   * 获取最近的反馈
   */
  getRecent(count = 20) {
    return this.feedbacks.slice(0, count);
  }

  /**
   * 按评分筛选
   */
  getByRating(minRating, maxRating = 5) {
    return this.feedbacks.filter(f => f.rating >= minRating && f.rating <= maxRating);
  }

  /**
   * 按意图筛选
   */
  getByIntent(intent) {
    return this.feedbacks.filter(f => f.intent === intent);
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存到存储
   */
  async save() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(__dirname, '../../logs/feedbacks.jsonl');

      // 只保存最新的记录
      if (this.feedbacks.length > 0) {
        const latest = this.feedbacks[0];
        await fs.appendFile(filePath, JSON.stringify(latest) + '\n');
      }
    } catch (error) {
      console.error('[反馈系统] 保存失败:', error.message);
    }
  }

  /**
   * 从存储加载
   */
  load() {
    try {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '../../logs/feedbacks.jsonl');

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n');

        // 加载最近的反馈
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            this.feedbacks.push(record);
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    } catch (error) {
      console.error('[反馈系统] 加载失败:', error.message);
    }
  }

  /**
   * 导出反馈
   */
  export() {
    return JSON.stringify(this.feedbacks, null, 2);
  }

  /**
   * 清除旧反馈
   */
  async clearOld(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const beforeCount = this.feedbacks.length;

    this.feedbacks = this.feedbacks.filter(f => f.timestamp > cutoffTime);

    const cleared = beforeCount - this.feedbacks.length;
    if (cleared > 0) {
      console.log(`[反馈系统] 清除了 ${cleared} 条旧反馈`);
    }

    return cleared;
  }
}

module.exports = FeedbackCollector;
