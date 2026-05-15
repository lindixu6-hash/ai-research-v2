/**
 * 意图分类器
 * 根据用户查询判断问题类型和复杂度
 *
 * 创建时间：2026-05-15
 * 作者：Claude Code
 */

class IntentClassifier {
  constructor() {
    // 意图类型配置
    this.intents = {
      'informational-simple': {
        name: '简单信息型',
        patterns: [/什么是\s*\w+/, /几点|多少|哪里/, /多少钱/, /价格/, /数量/],
        keywords: ['什么是', '几点', '多少', '哪里', '价格'],
        expectedLength: { min: 50, max: 150 },
        maxSearchRounds: 2,
        maxResults: 5
      },
      'informational-complex': {
        name: '复杂信息型',
        patterns: [/详细介绍|深入了解|全面分析|怎么|如何/, /需要.*技能|需要.*能力|有哪些技能/],
        keywords: ['详细介绍', '深入了解', '全面分析', '怎么', '如何', '需要', '技能'],
        expectedLength: { min: 200, max: 500 },
        maxSearchRounds: 3,
        maxResults: 10
      },
      'navigational': {
        name: '导航型',
        patterns: [/打开|官网|登录|访问|地址/],
        keywords: ['打开', '官网', '登录', '访问', '地址'],
        expectedLength: { min: 30, max: 100 },
        maxSearchRounds: 1,
        maxResults: 3
      },
      'transactional': {
        name: '交易型',
        patterns: [/买|下载|注册|订阅|购买/],
        keywords: ['买', '下载', '注册', '订阅', '购买'],
        expectedLength: { min: 100, max: 300 },
        maxSearchRounds: 2,
        maxResults: 8
      },
      'commercial': {
        name: '商业调研型',
        patterns: [/最佳|推荐|vs|对比|哪个好|选择/],
        keywords: ['最佳', '推荐', 'vs', '对比', '哪个好', '选择'],
        expectedLength: { min: 300, max: 600 },
        maxSearchRounds: 3,
        maxResults: 12
      },
      'generative': {
        name: '生成型',
        patterns: [/写|生成|制定|设计|创建/],
        keywords: ['写', '生成', '制定', '设计', '创建'],
        expectedLength: { min: 200, max: 800 },
        maxSearchRounds: 2,
        maxResults: 5
      },
      'research': {
        name: '研究综合型',
        patterns: [/分析|研究|综述|趋势|发展|现状/],
        keywords: ['分析', '研究', '综述', '趋势', '发展', '现状'],
        expectedLength: { min: 500, max: 1500 },
        maxSearchRounds: 5,
        maxResults: 20
      },
      'multi-part': {
        name: '多部分型',
        patterns: [], // 特殊处理
        expectedLength: { min: 300, max: 800 },
        maxSearchRounds: 4,
        maxResults: 15
      }
    };
  }

  /**
   * 分类查询意图
   * @param {string} query - 用户查询
   * @returns {object} 意图信息
   */
  classify(query) {
    // 1. 检查是否是多部分问题（多个问号）
    const questionMarks = (query.match(/[？?]/g) || []).length;
    if (questionMarks > 1) {
      return this.buildResult('multi-part', query, 1.0);
    }

    // 2. 检查每种意图类型
    const scores = {};
    for (const [intentType, config] of Object.entries(this.intents)) {
      if (intentType === 'multi-part') continue;

      let score = 0;
      const patterns = config.patterns || [];
      const keywords = config.keywords || [];

      // 模式匹配得分
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          score += 0.6;
        }
      }

      // 关键词匹配得分
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          score += 0.4;
        }
      }

      scores[intentType] = Math.min(score, 1.0);
    }

    // 3. 找到得分最高的意图
    let bestIntent = 'informational-simple';
    let bestScore = 0;
    for (const [intentType, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intentType;
      }
    }

    return this.buildResult(bestIntent, query, bestScore);
  }

  /**
   * 构建返回结果
   */
  buildResult(intent, query, confidence) {
    const config = this.intents[intent];
    return {
      intent,
      intentName: config.name,
      confidence,
      expectedLength: config.expectedLength,
      maxSearchRounds: config.maxSearchRounds,
      maxResults: config.maxResults,
      complexity: this.estimateComplexity(query, intent)
    };
  }

  /**
   * 估计复杂度
   */
  estimateComplexity(query, intent) {
    // 简单意图类型
    const simpleIntents = ['informational-simple', 'navigational'];
    if (simpleIntents.includes(intent)) {
      return 'simple';
    }
    return 'complex';
  }

  /**
   * 获取回答模板
   */
  getTemplate(intent) {
    const templates = {
      'informational-simple': this.getSimpleTemplate(),
      'informational-complex': this.getComplexTemplate(),
      'navigational': this.getNavigationalTemplate(),
      'transactional': this.getTransactionTemplate(),
      'commercial': this.getCommercialTemplate(),
      'generative': this.getGenerativeTemplate(),
      'research': this.getResearchTemplate(),
      'multi-part': this.getMultiPartTemplate()
    };
    return templates[intent] || this.getSimpleTemplate();
  }

  getSimpleTemplate() {
    return `# 核心答案

[直接回答问题，1-3句话，包含具体数据]

## 补充信息（可选）

[如果需要，展开2-3点关键信息]`;
  }

  getComplexTemplate() {
    return `# 核心答案

[直接结论，1-2句话]

## 关键点

1. **要点1**：[具体描述]
2. **要点2**：[具体描述]
3. **要点3**：[具体描述]

## 详细说明

[展开2-3段，提供背景和细节]`;
  }

  getNavigationalTemplate() {
    return `# 链接

[直接链接]

## 说明

[简要说明，1-2句话]`;
  }

  getTransactionTemplate() {
    return `# 核心信息

- **价格**：[具体价格]
- **渠道**：[购买/下载渠道]
- **注意事项**：[重要提醒]`;
  }

  getCommercialTemplate() {
    return `# 对比结论

[一句话总结]

## 详细对比

| 维度 | 选项A | 选项B |
|------|-------|-------|
| 价格 | ... | ... |
| 优势 | ... | ... |
| 劣势 | ... | ... |

## 选择建议

- **选择A如果**：[具体场景]
- **选择B如果**：[具体场景]`;
  }

  getGenerativeTemplate() {
    return `# 生成结果

[直接生成的内容]

## 使用说明

[如何使用这个结果]`;
  }

  getResearchTemplate() {
    return `# 研究报告：[主题]

## 核心发现

[3-4句话总结]

## 关键数据

1. **数据1**：[具体数字 + 来源]
2. **数据2**：[具体数字 + 来源]

## 详细分析

### 背景
[背景信息]

### 核心问题
[关键问题分析]

### 趋势分析
[趋势和预测]

## 结论

[总结性判断]

## 局限性

[说明数据的局限性]`;
  }

  getMultiPartTemplate() {
    return `# 问题1：[第一个问题]

[回答]

# 问题2：[第二个问题]

[回答]

# 问题3：[第三个问题]

[回答]`;
  }
}

// 导出
module.exports = IntentClassifier;
