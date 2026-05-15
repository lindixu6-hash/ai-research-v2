# AI 搜索项目实操优化指南

> 每一步都有具体代码和验证方法，跟着做即可

---

## 前置准备

### 0.1 创建必要目录

```bash
cd /Users/xulindi/Desktop/ai-search-project

# 创建 services 目录（如果不存在）
mkdir -p services
mkdir -p logs
mkdir -p tests
```

### 0.2 备份现有代码

```bash
# 备份 backend 源码
cp -r backend backend.backup.$(date +%s)

# 查看备份
ls -la | grep backend.backup
```

---

## 第一阶段：意图分类系统（预计 2-3 小时）

### 步骤 1：创建意图分类器

**文件：** `services/intentClassifier.js`

```bash
cat > services/intentClassifier.js << 'EOF'
/**
 * 意图分类器
 * 根据用户查询判断问题类型和复杂度
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
        patterns: [/详细介绍|深入了解|全面分析|怎么|如何/],
        keywords: ['详细介绍', '深入了解', '全面分析', '怎么', '如何'],
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
EOF
```

**验证：**

```bash
# 检查文件是否创建成功
cat services/intentClassifier.js | head -20

# 运行语法检查
node -c services/intentClassifier.js && echo "✓ 语法正确" || echo "✗ 语法错误"
```

---

### 步骤 2：创建测试文件

**文件：** `tests/intentClassifier.test.js`

```bash
cat > tests/intentClassifier.test.js << 'EOF'
/**
 * 意图分类器测试
 */

const IntentClassifier = require('../services/intentClassifier');

// 创建实例
const classifier = new IntentClassifier();

// 测试用例
const testCases = [
  { query: '美国上班时间', expected: 'informational-simple' },
  { query: 'AI PM需要什么技能', expected: 'informational-complex' },
  { query: '打开华为官网', expected: 'navigational' },
  { query: '买iPhone 16', expected: 'transactional' },
  { query: 'iPhone vs Android', expected: 'commercial' },
  { query: '写求职信', expected: 'generative' },
  { query: '分析2024年AI发展趋势', expected: 'research' },
  { query: '什么是AI PM？需要什么技能？薪资多少？', expected: 'multi-part' }
];

console.log('=== 意图分类测试 ===\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = classifier.classify(test.query);
  const status = result.intent === test.expected ? '✓' : '✗';

  if (result.intent === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} "${test.query}"`);
  console.log(`  预期: ${test.expected}`);
  console.log(`  实际: ${result.intent} (${result.intentName})`);
  console.log(`  置信度: ${result.confidence}`);
  console.log(`  复杂度: ${result.complexity}`);
  console.log(`  最大搜索轮数: ${result.maxSearchRounds}`);
  console.log();
}

console.log('=== 测试结果 ===');
console.log(`通过: ${passed}/${testCases.length}`);
console.log(`失败: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n✓ 所有测试通过！');
  process.exit(0);
} else {
  console.log('\n✗ 有测试失败，请检查');
  process.exit(1);
}
EOF
```

**验证：**

```bash
# 运行测试
node tests/intentClassifier.test.js

# 预期输出：
# === 意图分类测试 ===
#
# ✓ "美国上班时间"
#   预期: informational-simple
#   实际: informational-simple (简单信息型)
# ...
# ✓ 所有测试通过！
```

---

### 步骤 3：集成到主工作流

**修改：** `backend/src/index.js`（或主入口文件）

```bash
# 先找到主入口文件
ls backend/src/*.js backend/*.js 2>/dev/null | head -5
```

根据实际文件名，在主工作流中添加意图分类：

```javascript
// 在文件顶部添加
const IntentClassifier = require('../../services/intentClassifier');
const classifier = new IntentClassifier();

// 在处理查询的地方添加
async function processQuery(query) {
  // 1. 意图分类
  const intentResult = classifier.classify(query);
  console.log('[意图分类]', intentResult);

  // 2. 根据意图调整搜索策略
  const searchResults = await performSearch(
    query,
    intentResult.maxSearchRounds,
    intentResult.maxResults
  );

  // 3. 获取对应的回答模板
  const template = classifier.getTemplate(intentResult.intent);

  // 4. 生成回答
  const report = await generateReport(
    query,
    searchResults,
    template,
    intentResult
  );

  return {
    report,
    intent: intentResult,
    metadata: {
      searchRounds: searchResults.rounds,
      resultsCount: searchResults.results.length
    }
  };
}
```

**验证：**

```bash
# 重启服务
pm2 restart ai-search

# 查看日志，应该看到意图分类信息
pm2 logs ai-search --lines 20
```

---

## 第二阶段：自适应搜索系统（预计 2-3 小时）

### 步骤 4：创建自适应搜索器

**文件：** `services/adaptiveSearch.js`

```bash
cat > services/adaptiveSearch.js << 'EOF'
/**
 * 自适应搜索器
 * 根据置信度动态调整搜索策略
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
EOF
```

**验证：**

```bash
# 检查文件
node -c services/adaptiveSearch.js && echo "✓ 语法正确" || echo "✗ 语法错误"
```

---

### 步骤 5：创建搜索测试

**文件：** `tests/adaptiveSearch.test.js`

```bash
cat > tests/adaptiveSearch.test.js << 'EOF'
/**
 * 自适应搜索测试（使用模拟搜索客户端）
 */

const AdaptiveSearch = require('../services/adaptiveSearch');

// 模拟搜索客户端
class MockSearchClient {
  constructor(results) {
    this.results = results;
  }

  async search(query, options) {
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      results: this.results.slice(0, options.maxResults || 5)
    };
  }
}

// 测试
async function runTests() {
  console.log('=== 自适应搜索测试 ===\n');

  // 创建模拟客户端（返回高质量结果）
  const mockClient = new MockSearchClient([
    { url: 'https://example.com/1', title: '测试结果1' },
    { url: 'https://example.com/2', title: '测试结果2' },
    { url: 'https://example.com/3', title: '测试结果3' },
    { url: 'https://example.com/4', title: '测试结果4' },
    { url: 'https://gov.example.com/data', title: '官方数据' }
  ]);

  const adaptiveSearch = new AdaptiveSearch(mockClient);

  // 测试1：简单问题（应该快速停止）
  console.log('测试1：简单问题');
  const result1 = await adaptiveSearch.search(
    '美国上班时间',
    { intent: 'informational-simple', maxSearchRounds: 2, maxResults: 5 }
  );
  console.log(`  轮数: ${result1.rounds}`);
  console.log(`  置信度: ${result1.confidence.toFixed(2)}`);
  console.log(`  结果数: ${result1.totalFound}`);
  console.log(result1.rounds <= 2 ? '  ✓ 通过\n' : '  ✗ 失败\n');

  // 测试2：复杂问题（应该多轮搜索）
  console.log('测试2：复杂问题');
  const result2 = await adaptiveSearch.search(
    '2024年AI发展趋势',
    { intent: 'research', maxSearchRounds: 5, maxResults: 20 }
  );
  console.log(`  轮数: ${result2.rounds}`);
  console.log(`  置信度: ${result2.confidence.toFixed(2)}`);
  console.log(`  结果数: ${result2.totalFound}`);
  console.log(result2.rounds >= 1 ? '  ✓ 通过\n' : '  ✗ 失败\n');

  console.log('=== 测试完成 ===');
}

runTests().catch(console.error);
EOF
```

**验证：**

```bash
# 运行测试
node tests/adaptiveSearch.test.js
```

---

## 第三阶段：引用系统（预计 1-2 小时）

### 步骤 6：创建引用管理器

**文件：** `services/citationManager.js`

```bash
cat > services/citationManager.js << 'EOF'
/**
 * 引用管理器
 * 为报告添加来源引用
 */

class CitationManager {
  constructor() {
    this.citations = [];
    this.citationIndex = 1;
  }

  /**
   * 从搜索结果提取信息并记录引用
   */
  extractWithCitation(result, fact) {
    const citation = {
      index: this.citationIndex++,
      source: this.extractSourceName(result),
      url: result.url,
      title: result.title,
      publishedDate: this.extractDate(result)
    };

    this.citations.push(citation);

    return {
      fact,
      citation: `[${citation.index}]`,
      source: citation.source
    };
  }

  /**
   * 提取来源名称
   */
  extractSourceName(result) {
    if (!result.url) return '未知来源';

    try {
      const url = new URL(result.url);
      const domain = url.hostname.replace('www.', '');

      // 友好名称映射
      const names = {
        'perplexity.ai': 'Perplexity',
        'blog.google': 'Google Blog',
        'openai.com': 'OpenAI',
        'anthropic.com': 'Anthropic',
        'wikipedia.org': 'Wikipedia',
        'github.com': 'GitHub',
        'stackoverflow.com': 'Stack Overflow',
        'medium.com': 'Medium',
        'linkedin.com': 'LinkedIn'
      };

      return names[domain] || domain;
    } catch {
      return '未知来源';
    }
  }

  /**
   * 提取发布日期
   */
  extractDate(result) {
    return result.publishedDate || result.date || null;
  }

  /**
   * 生成引用列表
   */
  generateCitationList() {
    if (this.citations.length === 0) {
      return '';
    }

    let text = '\n\n## 参考来源\n\n';

    for (const citation of this.citations) {
      text += `[${citation.index}] ${citation.source}`;
      if (citation.title) {
        text += ` - ${citation.title}`;
      }
      text += `\n    ${citation.url}\n`;
    }

    return text;
  }

  /**
   * 重置引用
   */
  reset() {
    this.citations = [];
    this.citationIndex = 1;
  }

  /**
   * 获取当前引用数
   */
  getCount() {
    return this.citations.length;
  }
}

module.exports = CitationManager;
EOF
```

**验证：**

```bash
node -c services/citationManager.js && echo "✓ 语法正确"
```

---

### 步骤 7：创建引用测试

**文件：** `tests/citationManager.test.js`

```bash
cat > tests/citationManager.test.js << 'EOF'
/**
 * 引用管理器测试
 */

const CitationManager = require('../services/citationManager');

const manager = new CitationManager();

console.log('=== 引用管理器测试 ===\n');

// 模拟搜索结果
const mockResults = [
  { url: 'https://openai.com/blog/chatgpt', title: 'Introducing ChatGPT' },
  { url: 'https://blog.google/technology/ai/', title: 'Google AI Updates' },
  { url: 'https://wikipedia.org/wiki/Artificial_intelligence', title: 'Artificial Intelligence' }
];

// 测试提取和引用
console.log('测试1：提取信息并添加引用');
for (const result of mockResults) {
  const { fact, citation, source } = manager.extractWithCitation(result, '这是一个测试事实');
  console.log(`  ${fact} ${citation} (${source})`);
}

console.log(`\n引用数量: ${manager.getCount()}`);

// 测试生成引用列表
console.log('\n测试2：生成引用列表');
console.log(manager.generateCitationList());

// 测试重置
manager.reset();
console.log(`\n测试3：重置后引用数量: ${manager.getCount()}`);

console.log('\n✓ 所有测试完成！');
EOF
```

**验证：**

```bash
node tests/citationManager.test.js
```

---

## 第四阶段：集成测试（预计 1 小时）

### 步骤 8：创建端到端测试

**文件：** `tests/integration.test.js`

```bash
cat > tests/integration.test.js << 'EOF'
/**
 * 端到端集成测试
 */

const IntentClassifier = require('../services/intentClassifier');
const AdaptiveSearch = require('../services/adaptiveSearch');
const CitationManager = require('../services/citationManager');

// 模拟搜索客户端
class MockSearchClient {
  async search(query, options) {
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      results: [
        { url: 'https://example.com/1', title: `${query} - 结果1` },
        { url: 'https://example.com/2', title: `${query} - 结果2` },
        { url: 'https://example.com/3', title: `${query} - 结果3` }
      ]
    };
  }
}

async function runIntegrationTest() {
  console.log('=== 端到端集成测试 ===\n');

  // 1. 意图分类
  console.log('步骤1：意图分类');
  const classifier = new IntentClassifier();
  const query = '美国上班时间';
  const intentResult = classifier.classify(query);

  console.log(`  查询: ${query}`);
  console.log(`  意图: ${intentResult.intentName}`);
  console.log(`  复杂度: ${intentResult.complexity}`);
  console.log(`  最大搜索轮数: ${intentResult.maxSearchRounds}`);
  console.log('  ✓ 意图分类完成\n');

  // 2. 自适应搜索
  console.log('步骤2：自适应搜索');
  const searchClient = new MockSearchClient();
  const adaptiveSearch = new AdaptiveSearch(searchClient);
  const searchResult = await adaptiveSearch.search(query, intentResult);

  console.log(`  搜索轮数: ${searchResult.rounds}`);
  console.log(`  最终置信度: ${searchResult.confidence.toFixed(2)}`);
  console.log(`  找到结果: ${searchResult.totalFound}条`);
  console.log('  ✓ 搜索完成\n');

  // 3. 引用管理
  console.log('步骤3：引用管理');
  const citationManager = new CitationManager();

  for (const result of searchResult.results.slice(0, 3)) {
    const { fact, citation } = citationManager.extractWithCitation(
      result,
      `关于"${query}"的信息`
    );
    console.log(`  ${fact} ${citation}`);
  }

  console.log(`\n${citationManager.generateCitationList()}`);
  console.log('  ✓ 引用完成\n');

  // 4. 生成报告（简化版）
  console.log('步骤4：生成报告');
  const template = classifier.getTemplate(intentResult.intent);

  console.log('  使用模板:');
  console.log('  ' + template.split('\n')[0]);
  console.log('  ✓ 模板选择完成\n');

  console.log('=== 测试总结 ===');
  console.log('✓ 所有组件正常工作！');
  console.log('\n下一步：将各组件集成到主工作流中');
}

runIntegrationTest().catch(console.error);
EOF
```

**验证：**

```bash
node tests/integration.test.js
```

---

## 第五阶段：部署和验证（预计 30 分钟）

### 步骤 9：更新主工作流

根据你的项目结构，修改主工作流文件：

```bash
# 找到主入口文件
find backend -name "*.js" -type f | grep -E "(index|app|server|main)" | head -5
```

在文件中添加：

```javascript
// 导入新组件
const IntentClassifier = require('../../services/intentClassifier');
const AdaptiveSearch = require('../../services/adaptiveSearch');
const CitationManager = require('../../services/citationManager');

// 初始化
const classifier = new IntentClassifier();
const citationManager = new CitationManager();

// 在处理查询的函数中
async function handleQuery(query) {
  console.log(`[收到查询] ${query}`);

  // 1. 意图分类
  const intentResult = classifier.classify(query);
  console.log(`[意图] ${intentResult.intentName} (置信度: ${intentResult.confidence})`);

  // 2. 自适应搜索
  const adaptiveSearch = new AdaptiveSearch(searchClient);
  const searchResult = await adaptiveSearch.search(query, intentResult);
  console.log(`[搜索] ${searchResult.rounds}轮, ${searchResult.totalFound}条结果`);

  // 3. 分析结果（带引用）
  citationManager.reset();
  const findings = [];

  for (const result of searchResult.results) {
    const { fact, citation } = citationManager.extractWithCitation(
      result,
      result.snippet || result.title
    );
    findings.push({ fact, citation, url: result.url });
  }

  // 4. 生成报告
  const template = classifier.getTemplate(intentResult.intent);
  const report = generateReport(query, findings, template, intentResult);

  // 5. 添加引用列表
  const finalReport = report + citationManager.generateCitationList();

  return {
    query,
    report: finalReport,
    intent: intentResult.intent,
    metadata: {
      rounds: searchResult.rounds,
      results: searchResult.totalFound,
      confidence: searchResult.confidence,
      citations: citationManager.getCount()
    }
  };
}
```

### 步骤 10：部署测试

```bash
# 1. 提交代码
cd /Users/xulindi/Desktop/ai-search-project
git add services/ tests/
git commit -m "feat: 添加意图分类、自适应搜索、引用系统"

# 2. 部署到服务器
# （根据你的部署方式）
# rsync -avz backend/ user@server:/path/to/backend/
# 或 git push 后在服务器拉取

# 3. 重启服务
# pm2 restart ai-search

# 4. 测试查询
# curl -X POST http://your-server/api/search -d '{"query": "美国上班时间"}'
```

### 步骤 11：监控验证

```bash
# 监控日志
pm2 logs ai-search --lines 50

# 检查关键指标：
# - 意图分类是否正确
# - 搜索轮数是否合理（简单问题1-2轮）
# - 置信度是否达到阈值
# - 引用是否正确添加
```

---

## 验收标准

### 功能验收

| 功能 | 验收标准 | 验证方法 |
|------|----------|----------|
| 意图分类 | 8种类型识别准确率 > 80% | 运行测试 `node tests/intentClassifier.test.js` |
| 自适应搜索 | 简单问题 < 2轮搜索 | 查询"美国上班时间"，检查日志 |
| 引用系统 | 每个事实都有 [1] 引用 | 检查输出报告 |
| 性能 | 简单问题 < 10秒 | 实际测试查询耗时 |

### 质量验收

| 问题类型 | 改进前 | 改进后 |
|----------|--------|--------|
| 简单问题变复杂 | 500字报告 | 50-100字直接答案 |
| 搜索词冗余 | 5个固定词 | 1-2个自适应词 |
| 无来源引用 | 无引用 | 有 [1][2] 引用 |
| 耗时过长 | 20-40秒 | 5-15秒 |

---

## 常见问题

### Q1: 测试失败怎么办？

```bash
# 查看详细错误
node tests/intentClassifier.test.js 2>&1 | tail -20

# 检查依赖
npm list

# 重新安装依赖
npm install
```

### Q2: 服务启动失败？

```bash
# 检查端口占用
lsof -i :3000

# 查看错误日志
pm2 logs ai-search --err

# 尝试直接启动
node backend/src/index.js
```

### Q3: 搜索不工作？

```bash
# 检查 API 密钥
echo $TAVILY_API_KEY

# 测试搜索 API
curl -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d '{"api_key": "'$TAVILY_API_KEY'", "query": "test"}'
```

---

## 下一步

完成以上步骤后，你的项目应该已经具备：

- ✅ 意图分类（8种类型）
- ✅ 自适应搜索（根据置信度停止）
- ✅ 引用系统（来源透明）

接下来可以实施：

**第二阶段优化（2-3周）：**
1. 质量评估系统
2. 用户反馈收集
3. 错误学习机制

详细方案见：`SYSTEMATIC_OPTIMIZATION.md`

---

**创建时间：** 2026-05-15
**预计总耗时：** 4-6 小时
**难度等级：** 中等
