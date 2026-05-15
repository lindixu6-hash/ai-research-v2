# AI 搜索项目系统性优化方案

> 基于 Claude 回答质量秘诀的深度分析

---

## 一、当前项目状态诊断

### 1.1 基于日志数据的分析

从最新的日志 (`search_logs_1778854596996.jsonl`)：

| 问题 | 现象 | 根因 |
|------|------|------|
| 搜索词为0 | 4条记录搜索词都是0 | 没有执行搜索？ |
| 耗时不稳定 | 5.6秒 - 50.8秒 | 没有自适应策略 |
| 结果不稳定 | 0-6条发现 | 没有质量控制 |
| 无引用系统 | 报告没有来源标注 | 缺少可信度 |

### 1.2 基于之前对话的分析

**已确认的问题：**

1. **意图分类缺失** - 所有问题用同一套流程
2. **回答不精准** - 简单问题复杂化
3. **分类框架错误** - 用了电商分类而非搜索分类
4. **搜索策略固定** - 5个关键词×5结果=25篇
5. **无引用系统** - 无法验证信息来源

---

## 二、基于"回答质量秘诀"的系统性分析

### 秘诀1：理解上下文 → 项目问题

**我的做法：**
- 充分利用对话历史
- 记住用户偏好
- 关联之前的讨论

**项目当前状态：**
- ❌ 无对话历史利用
- ❌ 无用户记忆
- ❌ 每次搜索都是独立的

**问题影响：**
- 无法关联用户之前的查询
- 无法个性化推荐
- 无法积累知识

---

### 秘诀2：结构化思考 → 项目问题

**我的做法：**
- 复杂任务先分解
- 一步步执行
- 验证每一步

**项目当前状态：**
- ⚠️ 有工作流但不够细致
- ❌ 没有任务分解
- ❌ 没有中间验证

**问题影响：**
- 搜索质量不稳定
- 无法中途调整策略
- 错误无法及时纠正

---

### 秘诀3：工具优先 → 项目问题

**我的做法：**
- 能用工具就不用猜测
- 先读取文件再操作
- 使用合适的工具

**项目当前状态：**
- ✅ 有搜索工具（Tavily）
- ✅ 有 LLM 工具
- ❌ 没有搜索质量评估工具
- ❌ 没有置信度评估工具

**问题影响：**
- 不知道搜索结果好不好
- 不知道何时该停止搜索
- 无法自适应调整

---

### 秘诀4：验证结果 → 项目问题

**我的做法：**
- 执行后检查
- 读取文件确认
- 失败就修复

**项目当前状态：**
- ❌ 没有回答质量评估
- ❌ 没有用户反馈机制
- ❌ 没有错误学习机制

**问题影响：**
- 不知道回答好不好
- 无法从错误中学习
- 无法持续改进

---

### 秘诀5：简洁表达 → 项目问题

**我的做法：**
- 避免废话
- 直接给结果
- 结构清晰

**项目当前状态：**
- ⚠️ 有 SOUL 原则但未完全实施
- ❌ 固定模板导致啰嗦
- ❌ 没有 BLUF 原则

**问题影响：**
- 简单问题复杂化
- 开头不够直接
- 用户体验差

---

## 三、系统性优化方案

### 阶段一：核心能力建设（P0，1-2周）

#### 1.1 意图分类系统

```javascript
// 新增：services/intentClassifier.js

class IntentClassifier {
  /**
   * 检测查询意图
   */
  classify(query) {
    const patterns = {
      'informational-simple': {
        patterns: [/什么是|几点|多少|哪里/],
        examples: ['美国上班时间', 'AI PM是什么']
      },
      'informational-complex': {
        patterns: [/详细介绍|深入了解|全面分析/],
        examples: ['AI PM需要什么技能']
      },
      'commercial': {
        patterns: [/最佳|推荐|vs|对比/],
        examples: ['iPhone vs Android']
      },
      // ... 其他类型
    };

    // 检测逻辑
    for (const [intent, config] of Object.entries(patterns)) {
      if (config.patterns.some(p => p.test(query))) {
        return {
          intent,
          complexity: this.estimateComplexity(query),
          expectedLength: this.estimateLength(intent)
        };
      }
    }

    return { intent: 'informational-simple', complexity: 'simple', expectedLength: '50-100' };
  }

  estimateComplexity(query) {
    // 多个问题 = 复杂
    if ((query.match(/[？?]/g) || []).length > 1) {
      return 'complex';
    }
    return 'simple';
  }

  estimateLength(intent) {
    const lengths = {
      'informational-simple': '50-100',
      'informational-complex': '200-500',
      'commercial': '300-600',
      'research': '500-1000'
    };
    return lengths[intent] || '100-300';
  }
}
```

#### 1.2 自适应搜索系统

```javascript
// 新增：services/adaptiveSearch.js

class AdaptiveSearch {
  /**
   * 自适应搜索
   */
  async search(query, intent) {
    const results = [];
    let confidence = 0;
    let round = 0;

    // 根据意图确定最大搜索轮数
    const maxRounds = this.getMaxRounds(intent);

    while (confidence < 0.85 && round < maxRounds) {
      round++;

      // 每轮生成1-2个关键词
      const queries = await this.generateQueries(query, intent, round);
      const roundResults = await this.batchSearch(queries);

      // 评估置信度
      const evaluation = await this.evaluateConfidence(query, roundResults);
      confidence = evaluation.confidence;

      results.push(...roundResults);

      // 如果置信度足够，停止搜索
      if (!evaluation.need_more_search) {
        break;
      }
    }

    return {
      results,
      confidence,
      rounds: round
    };
  }

  getMaxRounds(intent) {
    // 简单问题：1-2轮
    // 复杂问题：3-5轮
    const simpleIntents = ['informational-simple', 'navigational'];
    if (simpleIntents.includes(intent)) {
      return 2;
    }
    return 5;
  }

  /**
   * 评估搜索结果置信度
   */
  async evaluateConfidence(query, results) {
    // 检查：
    // 1. 是否有足够的结果
    // 2. 来源是否可靠
    // 3. 信息是否完整
    // 4. 是否有矛盾

    let score = 0;

    // 结果数量
    if (results.length >= 3) score += 0.3;
    if (results.length >= 5) score += 0.2;

    // 来源质量
    const reliableSources = results.filter(r =>
      r.url.includes('.gov') ||
      r.url.includes('edu') ||
      r.url.includes('wikipedia.org')
    );
    score += Math.min(reliableSources.length * 0.15, 0.3);

    // 信息完整性
    const hasCompleteAnswer = await this.checkCompleteness(query, results);
    score += hasCompleteAnswer ? 0.2 : 0;

    return {
      confidence: Math.min(score, 1),
      need_more_search: score < 0.85
    };
  }
}
```

#### 1.3 引用系统

```javascript
// 修改：services/analyzer.js

class Analyzer {
  /**
   * 分析搜索结果，带来源记录
   */
  async analyze(query, searchResults) {
    const findings = [];

    for (const result of searchResults) {
      // 提取信息时记录来源
      const facts = await this.extractFacts(result);

      for (const fact of facts) {
        findings.push({
          fact: fact.text,
          source: this.extractSourceName(result),
          url: result.url,
          confidence: this.assessConfidence(result),
          publishDate: this.extractDate(result)
        });
      }
    }

    // 去重
    return this.deduplicate(findings);
  }

  /**
   * 提取来源名称
   */
  extractSourceName(result) {
    const url = new URL(result.url);
    const domain = url.hostname.replace('www.', '');

    // 友好的名称映射
    const names = {
      'perplexity.ai': 'Perplexity',
      'blog.google': 'Google Blog',
      'openai.com': 'OpenAI',
      'anthropic.com': 'Anthropic'
    };

    return names[domain] || domain;
  }
}

// 修改：services/reportGenerator.js

class ReportGenerator {
  /**
   * 生成带引用的报告
   */
  async generateWithCitations(query, findings, intent) {
    const template = this.getTemplate(intent);

    // 为每个事实添加引用
    let report = template.intro;
    let citationIndex = 1;

    for (const finding of findings) {
      const text = `${finding.fact} [${citationIndex}]`;
      report += text + '\n\n';
      citationIndex++;
    }

    // 添加引用列表
    report += '\n\n## 参考来源\n\n';
    findings.forEach((f, i) => {
      report += `[${i+1}] ${f.source} - ${f.url}\n`;
    });

    return report;
  }
}
```

---

### 阶段二：质量保证（P1，2-3周）

#### 2.1 回答质量评估

```javascript
// 新增：services/qualityAssurance.js

class QualityAssurance {
  /**
   * 评估回答质量
   */
  assess(query, report, intent) {
    const issues = [];

    // 检查1：长度是否合适
    const expectedLength = this.getExpectedLength(intent);
    const actualLength = report.length;
    if (actualLength > expectedLength.max) {
      issues.push({
        type: 'too_long',
        message: `报告过长（${actualLength}字），预期${expectedLength.max}字`
      });
    }

    // 检查2：是否有禁用话术
    const forbiddenPhrases = [
      '可能取决于',
      '有待观察',
      '具体情况具体分析',
      '都有可能'
    ];
    for (const phrase of forbiddenPhrases) {
      if (report.includes(phrase)) {
        issues.push({
          type: 'forbidden_phrase',
          message: `包含禁用话术：${phrase}`
        });
      }
    }

    // 检查3：是否有直接答案
    if (intent === 'informational-simple') {
      if (!report.includes('是') && !report.includes('为')) {
        issues.push({
          type: 'no_direct_answer',
          message: '简单信息型问题缺少直接答案'
        });
      }
    }

    return {
      score: 100 - issues.length * 10,
      issues,
      passed: issues.length === 0
    };
  }
}
```

#### 2.2 用户反馈系统

```javascript
// 新增：services/feedbackCollector.js

class FeedbackCollector {
  /**
   * 收集用户反馈
   */
  collect(searchId, feedback) {
    const data = {
      searchId,
      query: feedback.query,
      report: feedback.report,
      rating: feedback.rating, // 1-5星
      helpful: feedback.helpful, // boolean
      issues: feedback.issues, // 具体问题
      timestamp: Date.now()
    };

    // 保存到日志
    this.saveFeedback(data);

    // 如果评分低，触发分析
    if (feedback.rating <= 2) {
      this.analyzeFailure(data);
    }
  }

  /**
   * 分析失败案例
   */
  analyzeFailure(feedback) {
    const analysis = {
      query: feedback.query,
      report: feedback.report,
      issues: feedback.issues,
      timestamp: feedback.timestamp
    };

    // 保存到失败案例库
    this.saveFailure(analysis);
  }
}
```

---

### 阶段三：持续改进（P2，3-4周）

#### 3.1 错误学习机制

```javascript
// 新增：services/learningEngine.js

class LearningEngine {
  /**
   * 从错误中学习
   */
  async learnFromFeedback() {
    // 1. 读取反馈日志
    const feedbacks = await this.loadFeedback();

    // 2. 分析模式
    const patterns = this.analyzePatterns(feedbacks);

    // 3. 更新规则
    for (const pattern of patterns) {
      if (pattern.count > 3) {
        // 重复出现的问题，需要系统性修复
        await this.updateRule(pattern);
      }
    }
  }

  /**
   * 分析反馈模式
   */
  analyzePatterns(feedbacks) {
    const patterns = {};

    for (const feedback of feedbacks) {
      for (const issue of feedback.issues) {
        const key = issue.type;
        if (!patterns[key]) {
          patterns[key] = { count: 0, examples: [] };
        }
        patterns[key].count++;
        patterns[key].examples.push(feedback);
      }
    }

    return patterns;
  }
}
```

#### 3.2 A/B 测试框架

```javascript
// 新增：services/experiment.js

class Experiment {
  /**
   * A/B 测试不同的策略
   */
  async test(query, strategyA, strategyB) {
    // 同时用两种策略生成回答
    const [resultA, resultB] = await Promise.all([
      strategyA.execute(query),
      strategyB.execute(query)
    ]);

    // 返回对比结果
    return {
      query,
      strategyA: resultA,
      strategyB: resultB,
      comparison: this.compare(resultA, resultB)
    };
  }
}
```

---

## 四、实施路线图

### Week 1-2：核心能力

| 任务 | 文件 | 预期效果 |
|------|------|----------|
| 意图分类 | `intentClassifier.js` | 8种类型识别 |
| 自适应搜索 | `adaptiveSearch.js` | 耗时-50% |
| 引用系统 | `analyzer.js`, `reportGenerator.js` | 可信度+100% |

### Week 3-4：质量保证

| 任务 | 文件 | 预期效果 |
|------|------|----------|
| 质量评估 | `qualityAssurance.js` | 自动检测问题 |
| 反馈收集 | `feedbackCollector.js` | 持续改进 |
| 错误学习 | `learningEngine.js` | 从错误中学习 |

### Week 5-6：高级功能

| 任务 | 文件 | 预期效果 |
|------|------|----------|
| 对话历史 | `conversationMemory.js` | 上下文关联 |
| 个性化推荐 | `personalization.js` | 用户体验+50% |
| A/B 测试 | `experiment.js` | 持续优化 |

---

## 五、成功指标

### 性能指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 简单问题耗时 | 23秒 | 5秒 |
| 复杂问题耗时 | 35秒 | 15秒 |
| 回答精准度 | 60% | 85% |
| 用户满意度 | 估计60% | 85% |

### 质量指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 意图识别准确率 | N/A | 90% |
| 引用覆盖率 | 0% | 80% |
| 禁用话术出现率 | 30% | 5% |
| 用户反馈评分 | N/A | 4.2/5.0 |

---

## 六、总结

### 核心问题

基于"回答质量秘诀"的5个维度，你的项目主要问题：

1. **理解上下文** → 无对话历史、无用户记忆
2. **结构化思考** → 工作流不够细致、无中间验证
3. **工具优先** → 缺少质量评估工具、置信度工具
4. **验证结果** → 无质量评估、无反馈机制
5. **简洁表达** → 固定模板啰嗦、无 BLUF 原则

### 解决方案

分三个阶段实施：
1. **核心能力建设**（2周）- 意图分类、自适应搜索、引用系统
2. **质量保证**（2周）- 质量评估、用户反馈
3. **持续改进**（2周）- 错误学习、A/B 测试

### 预期效果

- 简单问题耗时：23秒 → 5秒（-78%）
- 回答精准度：60% → 85%（+42%）
- 用户满意度：60% → 85%（+42%）

---

**创建时间：** 2026-05-15
**基于：** Claude 回答质量秘诀
**状态：** 待实施
