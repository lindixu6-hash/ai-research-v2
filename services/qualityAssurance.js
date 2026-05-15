/**
 * 质量评估系统
 * 评估回答质量，检测问题
 *
 * 评估维度：
 * - 长度是否合适
 * - 是否有禁用话术
 * - 是否有直接答案
 * - 引用是否充分
 *
 * 创建时间：2026-05-15
 */

class QualityAssurance {
  constructor() {
    // 禁用话术列表
    this.forbiddenPhrases = [
      '可能取决于',
      '有待观察',
      '具体情况具体分析',
      '都有可能',
      '不好说',
      '包括但不限于',
      '从某种角度来说',
      '在一定程度上',
      '或许',
      '大概',
      '可能'
    ];

    // 每种意图类型的预期长度
    this.expectedLengths = {
      'informational-simple': { min: 30, max: 200 },
      'informational-complex': { min: 150, max: 800 },
      'navigational': { min: 20, max: 150 },
      'transactional': { min: 80, max: 400 },
      'commercial': { min: 200, max: 1000 },
      'generative': { min: 150, max: 1500 },
      'research': { min: 400, max: 2000 },
      'multi-part': { min: 300, max: 1500 }
    };
  }

  /**
   * 评估回答质量
   */
  assess(query, report, intent) {
    const issues = [];
    const warnings = [];

    // 检查 1：长度是否合适
    const lengthCheck = this.checkLength(report, intent);
    if (!lengthCheck.passed) {
      issues.push({
        type: 'length_issue',
        severity: lengthCheck.severity,
        message: lengthCheck.message
      });
    }

    // 检查 2：是否有禁用话术
    const forbiddenCheck = this.checkForbiddenPhrases(report);
    if (forbiddenCheck.found.length > 0) {
      issues.push({
        type: 'forbidden_phrase',
        severity: 'medium',
        message: `包含禁用话术: ${forbiddenCheck.found.join(', ')}`
      });
    }

    // 检查 3：是否有直接答案
    const directAnswerCheck = this.checkDirectAnswer(report, intent);
    if (!directAnswerCheck.passed) {
      warnings.push({
        type: 'no_direct_answer',
        message: directAnswerCheck.message
      });
    }

    // 检查 4：是否有引用
    const citationCheck = this.checkCitations(report);
    if (!citationCheck.passed) {
      warnings.push({
        type: 'no_citations',
        message: '缺少来源引用'
      });
    }

    // 检查 5：是否有结构
    const structureCheck = this.checkStructure(report);
    if (!structureCheck.passed) {
      warnings.push({
        type: 'poor_structure',
        message: structureCheck.message
      });
    }

    // 计算得分
    const score = this.calculateScore(issues, warnings);

    return {
      score,
      passed: issues.filter(i => i.severity === 'high').length === 0,
      issues,
      warnings,
      details: {
        length: report.length,
        hasCitations: citationCheck.count > 0,
        citationCount: citationCheck.count,
        structure: structureCheck.structure
      }
    };
  }

  /**
   * 检查长度
   */
  checkLength(report, intent) {
    const length = report.length;
    const expected = this.expectedLengths[intent.intent] || { min: 50, max: 1000 };

    if (length < expected.min) {
      return {
        passed: false,
        severity: 'medium',
        message: `报告过短（${length}字），预期至少${expected.min}字`
      };
    }

    if (length > expected.max) {
      return {
        passed: false,
        severity: length > expected.max * 1.5 ? 'high' : 'medium',
        message: `报告过长（${length}字），预期最多${expected.max}字`
      };
    }

    return { passed: true };
  }

  /**
   * 检查禁用话术
   */
  checkForbiddenPhrases(report) {
    const found = [];

    for (const phrase of this.forbiddenPhrases) {
      if (report.includes(phrase)) {
        found.push(phrase);
      }
    }

    return {
      passed: found.length === 0,
      found
    };
  }

  /**
   * 检查直接答案
   */
  checkDirectAnswer(report, intent) {
    // 简单信息型问题必须有直接答案
    if (intent.intent === 'informational-simple') {
      const hasAnswer = report.includes('是') ||
                        report.includes('为') ||
                        report.includes('：') ||
                        report.includes(':');

      if (!hasAnswer) {
        return {
          passed: false,
          message: '简单信息型问题缺少直接答案'
        };
      }
    }

    // 导航型问题必须有链接
    if (intent.intent === 'navigational') {
      const hasLink = report.includes('http') ||
                      report.includes('[');

      if (!hasLink) {
        return {
          passed: false,
          message: '导航型问题缺少链接'
        };
      }
    }

    return { passed: true };
  }

  /**
   * 检查引用
   */
  checkCitations(report) {
    // 查找 [1], [2] 格式的引用
    const citationPattern = /\[\d+\]/g;
    const matches = report.match(citationPattern) || [];

    // 去重
    const uniqueCitations = [...new Set(matches)];

    return {
      passed: uniqueCitations.length >= 2, // 至少2个引用
      count: uniqueCitations.length
    };
  }

  /**
   * 检查结构
   */
  checkStructure(report) {
    const lines = report.split('\n').filter(l => l.trim().length > 0);

    // 检查是否有标题
    const hasTitle = lines.some(l => l.startsWith('#'));

    // 检查是否有分点
    const hasBullets = lines.some(l => l.trim().startsWith('-') || l.trim().startsWith('*'));

    // 检查是否有编号
    const hasNumbers = lines.some(l => /^\d+\./.test(l.trim()));

    let structure = 'plain';
    if (hasTitle) structure = 'titled';
    if (hasBullets || hasNumbers) structure = 'structured';

    const passed = lines.length >= 3 && structure !== 'plain';

    return {
      passed,
      structure,
      message: passed ? '结构良好' : '结构过于简单'
    };
  }

  /**
   * 计算得分
   */
  calculateScore(issues, warnings) {
    let score = 100;

    // 严重问题扣分
    for (const issue of issues) {
      if (issue.severity === 'high') score -= 20;
      if (issue.severity === 'medium') score -= 10;
      if (issue.severity === 'low') score -= 5;
    }

    // 警告扣分
    score -= warnings.length * 3;

    return Math.max(score, 0);
  }

  /**
   * 生成改进建议
   */
  getImprovementSuggestions(assessment) {
    const suggestions = [];

    for (const issue of assessment.issues) {
      switch (issue.type) {
        case 'length_issue':
          if (issue.message.includes('过短')) {
            suggestions.push('建议：添加更多细节和背景信息');
          } else {
            suggestions.push('建议：精简内容，保留核心信息');
          }
          break;

        case 'forbidden_phrase':
          suggestions.push('建议：使用更确定的表述，避免模糊语言');
          break;

        case 'no_direct_answer':
          suggestions.push('建议：在开头直接给出答案');
          break;

        case 'no_citations':
          suggestions.push('建议：添加来源引用以增加可信度');
          break;

        case 'poor_structure':
          suggestions.push('建议：使用标题和分点来组织内容');
          break;
      }
    }

    return suggestions;
  }

  /**
   * 格式化评估报告
   */
  formatReport(assessment) {
    let report = '## 质量评估\n\n';
    report += `得分: ${assessment.score}/100\n`;
    report += `状态: ${assessment.passed ? '✓ 通过' : '✗ 未通过'}\n\n`;

    if (assessment.issues.length > 0) {
      report += '### 问题\n\n';
      for (const issue of assessment.issues) {
        report += `- [${issue.severity.toUpperCase()}] ${issue.message}\n`;
      }
      report += '\n';
    }

    if (assessment.warnings.length > 0) {
      report += '### 警告\n\n';
      for (const warning of assessment.warnings) {
        report += `- ${warning.message}\n`;
      }
      report += '\n';
    }

    const suggestions = this.getImprovementSuggestions(assessment);
    if (suggestions.length > 0) {
      report += '### 改进建议\n\n';
      for (const suggestion of suggestions) {
        report += `- ${suggestion}\n`;
      }
    }

    return report;
  }
}

module.exports = QualityAssurance;
