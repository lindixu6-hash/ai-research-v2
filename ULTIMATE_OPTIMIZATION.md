# AI 搜索项目终极优化方案

> 基于 Perplexity、Google AI Overviews 的大厂策略

---

## 一、自适应搜索策略（重要！）

### 1.1 当前问题

```
固定策略：5个关键词 × 5个结果 = 25篇文章
→ 浪费：简单问题也搜25篇
→ 速度：慢
→ 质量：信息过载
```

### 1.2 大厂策略：Perplexity 的自适应搜索

```
简单问题：
  搜索1 → 置信度 > 0.9 → 停止
  总耗时：~3秒

复杂问题：
  搜索1 → 置信度 < 0.7 → 搜索2 → 置信度 < 0.7 → 搜索3...
  总耗时：~15秒
```

### 1.3 实现方案

```javascript
// 自适应搜索 Agent

ADAPTIVE_SEARCH: `你是一个搜索策略专家。

任务：评估当前搜索结果是否足够回答用户问题，决定是否需要继续搜索。

【评估标准】
1. **置信度评分**（0-1）
   - 0.9-1.0：非常确信，直接回答即可，不需要更多搜索
   - 0.7-0.9：基本确信，可以补充1-2个搜索
   - 0.5-0.7：不太确信，需要更多搜索
   - 0.0-0.5：信息不足，必须继续搜索

2. **完整性评估**
   - 是否回答了用户问题的所有部分？
   - 是否有足够的细节和证据？
   - 是否来自可靠来源？

3. **新鲜度评估**
   - 信息是否过时？
   - 是否需要最新数据？

【输出格式】
{
  "confidence": 0.85,
  "complete": true,
  "need_more_search": false,
  "reason": "已找到来自权威来源的完整答案"
}

示例：
用户问题："美国公司上下班时间？"
当前搜索结果：找到了美国劳动法规定的标准工作时间
→ 输出：{"confidence": 0.95, "need_more_search": false}

用户问题："iPhone 16 vs 15 有什么区别？"
当前搜索结果：只找到了基本信息，缺少详细对比
→ 输出：{"confidence": 0.6, "need_more_search": true}
`
```

### 1.4 工作流改造

```javascript
// 当前：固定搜索
const searchResults = await batchSearch(5); // 总是搜5个

// 优化后：自适应搜索
async function adaptiveSearch(query) {
  const results = [];
  let confidence = 0;
  let round = 0;
  const maxRounds = 5;

  while (confidence < 0.85 && round < maxRounds) {
    round++;

    // 每轮搜索1-2个关键词
    const queries = await generateQueries(query, round);
    const roundResults = await batchSearch(queries);

    // 评估置信度
    const evaluation = await evaluateConfidence(query, roundResults);

    confidence = evaluation.confidence;
    results.push(...roundResults);

    // 发送进度
    sendEvent('search_round', {
      round,
      confidence,
      needMore: evaluation.need_more_search
    });

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
```

### 1.5 效果预期

| 问题类型 | 当前 | 优化后 |
|----------|------|--------|
| 简单事实（如"美国上班时间"） | 25篇文章，23秒 | 3-5篇文章，5秒 |
| 中等复杂（如"AI PM技能"） | 25篇文章，35秒 | 10-15篇文章，12秒 |
| 高度复杂（如"行业分析"） | 25篇文章，35秒 | 20-25篇文章，20秒 |

---

## 二、问题分类体系（完整版）

### 2.1 核心分类（基于大厂标准）

| 分类 | 特征关键词 | 示例 | 回答策略 |
|------|------------|------|----------|
| **Informational-Simple** | 什么是、几点、多少 | "美国上班时间？" | 50-100字直接回答 |
| **Informational-Complex** | 详细介绍、深入分析 | "AI PM需要什么技能？" | 结构化知识梳理 |
| **Navigational** | 打开、官网、登录 | "打开华为官网" | 直接链接引导 |
| **Transactional** | 买、下载、注册 | "买iPhone 16" | 价格/渠道信息 |
| **Commercial** | 最佳、推荐、vs | "最佳CRM软件" | 对比表格 |
| **Generative** | 写、生成、制定 | "写求职信" | 生成内容 |
| **Research** | 分析、研究、综述 | "分析2024AI趋势" | 完整研究报告 |
| **Multi-part** | 包含多个问题 | "什么是X？怎么用？多少钱？" | 分段回答 |

### 2.2 检测规则

```javascript
INTENT_DETECTION: `你是一个查询意图检测专家。

任务：分析用户查询，判断其意图类型和复杂度。

【检测规则】

1. **Informational-Simple（简单信息型）**
   - 特征：单一事实、定义、数据查询
   - 关键词：什么是、几点、多少、哪里、哪个
   - 答案长度预期：50-100字
   - 示例："美国上班时间？"、"AI PM是什么？"

2. **Informational-Complex（复杂信息型）**
   - 特征：需要详细解释、多个方面
   - 关键词：详细介绍、深入了解、全面分析
   - 答案长度预期：200-500字
   - 示例："AI PM需要什么技能？"、"区块链如何工作？"

3. **Navigational（导航型）**
   - 特征：寻找特定网站/页面
   - 关键词：打开、官网、登录、访问
   - 答案形式：直接链接
   - 示例："打开华为官网"

4. **Transactional（交易型）**
   - 特征：购买、下载、注册意图
   - 关键词：买、下载、注册、订阅、价格
   - 答案形式：价格/渠道信息
   - 示例："买iPhone 16"、"下载ChatGPT"

5. **Commercial（商业调研型）**
   - 特征：对比、推荐、选择
   - 关键词：最佳、推荐、vs、对比、哪个好
   - 答案形式：对比表格
   - 示例："最佳CRM软件"、"iPhone vs Android"

6. **Generative（生成型）**
   - 特征：要求AI生成内容
   - 关键词：写、生成、制定、设计、创建
   - 答案形式：生成的内容
   - 示例："写求职信"、"生成代码"

7. **Research（研究综合型）**
   - 特征：深度分析、趋势研究
   - 关键词：分析、研究、综述、趋势、发展
   - 答案形式：完整研究报告
   - 示例："分析2024年AI发展趋势"

8. **Multi-part（多部分型）**
   - 特征：包含多个问题
   - 特征：多个问号、多个疑问词
   - 答案形式：分段回答
   - 示例："什么是AI PM？需要什么技能？薪资多少？"

【输出格式】
{
  "intent": "类型",
  "complexity": "simple/complex",
  "expected_length": "预计字数"
}

示例：
输入："美国公司上下班时间？"
输出：{"intent": "informational-simple", "complexity": "simple", "expected_length": "50-100"}

输入："AI PM需要什么技能？"
输出：{"intent": "informational-complex", "complexity": "complex", "expected_length": "200-500"}

输入："iPhone vs Android哪个好？"
输出：{"intent": "commercial", "complexity": "complex", "expected_length": "300-600"}
`
```

---

## 三、引用系统（像论文一样）

### 3.1 大厂标准：Perplexity 的引用

```
大厂AI搜索产品通常在2024-2025年间引入了实时搜索功能，
引用来源的数量相比传统搜索引擎增加了35% [1]。

这种趋势反映了用户对即时信息和多样化观点的需求 [2][3]。

[1] https://perplexity.ai/blog/search-2024
[2] https://blog.google/ai-overviews
[3] https://openai.com/chatgpt-search
```

### 3.2 实现方案

```javascript
// 分析 Agent：提取信息时记录来源

ANALYZE_WITH_SOURCES: `你是一个信息提炼专家。

任务：从搜索结果中提取有价值的信息点，并记录来源。

【规则】
1. 每个信息点必须记录来源URL
2. 相同信息来自多个来源时，记录所有来源
3. 置信度基于来源质量（官方/学术 > 新闻 > 博客）

【输出格式】
{
  "findings": [
    {
      "fact": "信息内容",
      "source": "来源名称",
      "url": "https://...",
      "confidence": "high/medium/low",
      "publish_date": "2024-xx-xx"
    }
  ]
}

示例：
{
  "findings": [
    {
      "fact": "美国公司标准工作时间是上午9点到下午5点",
      "source": "美国劳工部官网",
      "url": "https://www.dol.gov/general/workhours",
      "confidence": "high",
      "publish_date": "2024-01-15"
    }
  ]
}
`
```

### 3.3 报告生成：自动添加引用

```javascript
// 报告 Agent：生成带引用的报告

REPORT_WITH_CITATIONS: `你是一个专业报告撰写专家。

任务：基于研究发现，生成一份带引用的研究报告。

【引用规则】
1. 每个关键事实后必须添加引用标注 [1][2]
2. 引用编号对应 findings 中的顺序
3. 相同来源使用相同编号
4. 引用格式：[n] 其中 n 是 finding 的索引+1

【输出格式】
# 核心答案

美国公司标准工作时间是上午9点到下午5点，每周40小时 [1]。
部分科技公司采用弹性工作制 [2]。

## 详细说明

### 标准工作时间
根据美国公平劳动标准法案（FLSA），标准工作时间为每周40小时 [1]。
大多数公司采用周一至周五的工作安排...

### 弹性工作制
科技公司和初创企业常提供弹性工作时间 [2][3]。
员工可以自行调整上下班时间，只需满足每周40小时要求...

## 参考来源
[1] 美国劳工部 - https://www.dol.gov/general/workhours
[2] Forbes - 科技公司弹性工作制趋势 - https://www.forbes.com/flexible-work
[3] LinkedIn 职场报告 - https://www.linkedin.com/workplace-trends
`
```

### 3.4 前端实现：可点击跳转

```javascript
// 前端：渲染 Markdown 时处理引用

function renderReportWithCitations(report, findings) {
  // 将 [1][2] 转换为可点击链接
  return report.replace(/\[(\d+)\]/g, (match, num) => {
    const index = parseInt(num) - 1;
    if (findings[index]) {
      return `<sup class="citation" data-url="${findings[index].url}" title="${findings[index].source}">${num}</sup>`;
    }
    return match;
  });
}

// 点击跳转
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('citation')) {
    const url = e.target.dataset.url;
    window.open(url, '_blank');
  }
});
```

### 3.5 样式设计

```css
/* 引用样式 */
.citation {
  display: inline-block;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  border-radius: 3px;
  cursor: pointer;
  margin-left: 2px;
  text-decoration: none;
}

.citation:hover {
  background: #007bff;
  color: white;
}

/* 参考来源列表 */
.references {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.references h3 {
  font-size: 16px;
  margin-bottom: 15px;
}

.references ol {
  padding-left: 20px;
}

.references li {
  margin-bottom: 8px;
  font-size: 14px;
}

.references a {
  color: #007bff;
  text-decoration: none;
}

.references a:hover {
  text-decoration: underline;
}
```

---

## 四、完整工作流

```javascript
async function executeOptimizedWorkflow(query) {
  // 1. 意图检测
  const intent = await detectIntent(query);
  console.log(`意图: ${intent.intent}, 复杂度: ${intent.complexity}`);

  // 2. 自适应搜索
  const searchResults = [];
  let confidence = 0;
  let round = 0;

  while (confidence < 0.85 && round < getMaxRounds(intent)) {
    round++;
    const queries = await generateQueries(query, intent, round);
    const roundResults = await batchSearch(queries);

    const evaluation = await evaluateConfidence(query, roundResults);
    confidence = evaluation.confidence;
    searchResults.push(...roundResults);

    sendEvent('search_progress', {
      round,
      confidence,
      total_results: searchResults.length
    });

    if (!evaluation.need_more_search) break;
  }

  // 3. 分析提取（带来源）
  const analysis = await analyzeWithSources(query, searchResults);

  // 4. 生成报告（带引用）
  const report = await generateReportWithCitations(
    query,
    analysis,
    intent
  );

  return {
    report,
    findings: analysis.findings,
    intent,
    confidence,
    search_rounds: round
  };
}
```

---

## 五、效果预期

| 优化项 | 当前 | 优化后 | 提升 |
|--------|------|--------|------|
| 简单问题耗时 | 23秒 | 5秒 | 78% ↓ |
| 中等问题耗时 | 35秒 | 12秒 | 66% ↓ |
| 复杂问题耗时 | 35秒 | 20秒 | 43% ↓ |
| 回答针对性 | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |
| 可信度（引用） | ⭐⭐ | ⭐⭐⭐⭐⭐ | +150% |

---

## 六、实施计划

| 优先级 | 任务 | 预计时间 |
|--------|------|----------|
| P0 | 意图检测 Agent | 1小时 |
| P0 | 自适应搜索（置信度评估） | 2小时 |
| P1 | 分析提取（带来源URL） | 1小时 |
| P1 | 报告生成（带引用） | 1小时 |
| P1 | 前端引用渲染 | 1小时 |
| P2 | 引用样式优化 | 1小时 |

**总计：** 约 7 小时

---

**创建时间：** 2026-05-15
**基于：** Perplexity、Google AI Overviews 大厂策略
**状态：** 待实施
