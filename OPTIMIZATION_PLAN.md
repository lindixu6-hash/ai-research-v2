# AI 搜索项目优化方案

> 基于 2026-05-15 日志分析和代码审查

---

## 📊 问题诊断汇总

### 严重问题（P0）

| 问题 | 数据 | 影响 |
|------|------|------|
| **响应速度** | 45.7秒 | 用户流失率 >80% |
| **搜索词冗余** | 5个词几乎同义 | 浪费配额，结果重叠 |
| **结果利用率** | 25→6 (24%) | 76%的结果被浪费 |
| **串行执行** | 5个搜索顺序执行 | 浪费并发能力 |

### 中等问题（P1）

| 问题 | 现状 | 应该 |
|------|------|------|
| 报告结构 | 泛泛而谈 | 清单式+可操作 |
| 来源单一 | PMI重复2次 | 多样化搜索源 |
| 意图推断 | 需手动澄清 | 自动推断 |

---

## 🎯 优化方案

### P0-1: 性能优化（目标：45s → 8s）

#### 当前瓶颈分析

```
45.7秒 = 5个搜索 × ~9秒/个（串行）
```

#### 优化措施

```javascript
// 1. 搜索词减少：5个 → 3个（精选高质量）
// 2. 并行搜索：Promise.all 已经实现，但可以优化
// 3. 流式输出：边搜边返回（重要）
```

#### 代码修改：workflowService.js

```javascript
// 当前：所有搜索完成后才返回
const searchResults = await batchSearch(queries);

// 优化：流式返回
async function executeWorkflowStream(userQuery, onProgress) {
  // 1. 先返回搜索关键词（让用户看到在搜什么）
  const queries = await generateQueries(userQuery);
  onProgress({ type: 'queries', data: queries });

  // 2. 每完成一个搜索，立即返回
  for (const query of queries) {
    const result = await search(query);
    onProgress({ type: 'search_result', data: result });
  }

  // 3. 分析完成后返回
  const findings = await analyze(results);
  onProgress({ type: 'findings', data: findings });

  // 4. 最终报告
  const report = await generateReport(findings);
  onProgress({ type: 'report', data: report });
}
```

#### 预期效果

| 阶段 | 当前 | 优化后 |
|------|------|--------|
| 首次响应 | 45s | 2s（搜索关键词） |
| 首批结果 | 45s | 5s（第一个搜索） |
| 完整报告 | 45s | 12s |

---

### P0-2: 搜索词策略优化

#### 当前问题

```javascript
// 实际生成的5个词（来自日志）
1. AI Project Management Skills
2. Artificial Intelligence PM Competencies
3. AI PM Technical Requirements
4. AI PM Skill Set
5. Project Management in AI Industry

// 问题：
// - 全部是同义词变换
// - 没有时间限定（可能搜到2019年的内容）
// - 没有真实场景（职位、面试、实战）
```

#### 优化策略

```javascript
// prompts.js - SEARCH_QUERY 优化

SEARCH_QUERY_ENHANCED: `你是一个搜索策略专家。

任务：根据用户问题，生成 3-4 个最优搜索关键词组合。

【核心原则】
1. 少而精 - 3个高质量 > 5个同义词
2. 多维度 - 事实、规律、对比、实战
3. 加限定 - 时间、场景、来源

【搜索词类型分配】
- 至少1个包含时间限定（2024 2025 最新）
- 至少1个包含场景限定（面试、实战、职位JD）
- 至少1个包含对比/差异（vs、区别、差异）

【绝对禁止】
- 不要生成同义词变换
- 不要生成纯描述性词汇
- 不要超过4个关键词

输出格式：
{
  "queries": [
    "关键词1（事实+时间）",
    "关键词2（场景限定）",
    "关键词3（对比/规律）"
  ]
}

示例：
用户："ai pm"
输出：
{
  "queries": [
    "AI product manager skills 2024 2025",
    "site:linkedin.com AI PM job requirements",
    "AI PM vs traditional PM skills difference"
  ]
}`
```

---

### P0-3: 结果去重和聚合

#### 当前问题

```
日志显示：
- 25个搜索结果
- 只有6个有效发现
- PMI来源重复2次
```

#### 优化代码

```javascript
// 新增：services/resultAggregator.js

class ResultAggregator {
  /**
   * URL级别去重
   */
  deduplicateByURL(results) {
    const seen = new Set();
    return results.filter(r => {
      const domain = this.extractDomain(r.url);
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    });
  }

  /**
   * 内容相似度去重（简化版）
   */
  deduplicateByContent(results, threshold = 0.7) {
    // 使用简单的词汇重叠度判断
    return results.filter((r1, i) => {
      return !results.slice(0, i).some(r2 =>
        this.similarity(r1.content, r2.content) > threshold
      );
    });
  }

  /**
   * 按来源类型分组（避免单一来源垄断）
   */
  groupBySource(results) {
    const groups = {
      official: [],   // 官方/权威
      community: [],  // 社区/论坛
      news: [],       // 新闻
      company: []     // 公司博客
    };
    // ... 分类逻辑
    return groups;
  }
}

module.exports = new ResultAggregator();
```

---

### P1-1: 报告结构化

#### 当前报告问题

```
核心摘要：
"项目经理需要掌握7个关键AI技能"

问题：
- 没说是哪7个
- 没说怎么学
- 没说去哪学
```

#### 优化后的报告格式

```javascript
// prompts.js - REPORT_ENHANCED

REPORT_ENHANCED: `你是一个专业报告撰写专家。

任务：基于研究发现，生成一份可操作的研究报告。

【报告结构】（严格遵守）

# 核心结论（一句话）
[直接判断，不铺垫]

## 具体清单
[如果是技能/工具/方法类问题，必须列出具体清单]

### AI PM 核心技能清单
1. **技能名称** - 重要程度：⭐⭐⭐⭐⭐
   - 说明：[一句话解释]
   - 学习资源：[具体链接/课程]

2. **技能名称** - 重要程度：⭐⭐⭐⭐
   - ...

## 学习路径
[基于清单，给出具体学习顺序]
1. 第一步：...
2. 第二步：...

## 参考来源
- [来源1](链接)
- [来源2](链接)

【绝对禁止】
- 不要说"7个技能"但不列出来
- 不要说"需要学习"但不说学什么
- 不要说"可能取决于"
`
```

---

### P1-2: 意图自动推断

```javascript
// 当前：需要用户手动回答"技能要求"
// 优化：自动从query推断

// prompts.js - CLARIFY 优化

CLARIFY_SMART: `你是一个问题澄清助手。

任务：判断用户问题是否需要澄清。

【自动推断规则】
以下情况直接推断意图，无需询问：
1. 用户已提供上下文（如"技能要求"、"就业前景"）
2. 问题包含明确的场景词（面试、求职、学习）
3. 可以给出一个覆盖大部分需求的答案

只有在以下情况才询问：
1. 问题过于宽泛（如"AI"一个词）
2. 问题有多种合理的解释方向

输出格式：
{
  "need_clarify": true/false,
  "inferred_intent": "如果可以推断，直接填入意图",
  "question": "如果需要澄清，提供问题"
}`
```

---

## 📋 实施计划

| 优先级 | 任务 | 预计时间 | 效果 |
|--------|------|----------|------|
| P0-1 | 流式输出 | 2小时 | 用户体验显著提升 |
| P0-2 | 搜索词优化 | 1小时 | 结果质量提升 |
| P0-3 | 结果去重 | 1小时 | 减少冗余 |
| P1-1 | 报告结构化 | 2小时 | 可操作性提升 |
| P1-2 | 意图推断 | 1小时 | 减少交互步骤 |

**总计：** ~7小时

---

## 🧪 验证方案

优化后用相同问题测试：

```bash
# 测试问题
query="ai pm"

# 验收标准
1. 响应时间 < 15秒
2. 搜索词 ≤ 4个且包含时间限定
3. 报告包含具体技能清单
4. 来源多样性 > 3个不同域名
```

---

## 📊 预期效果对比

| 指标 | 当前 | 优化后 |
|------|------|--------|
| 响应时间 | 45s | 12s |
| 首次可见 | 45s | 2s |
| 搜索词数量 | 5个同义词 | 3个精准词 |
| 报告可操作性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 用户满意度 | 估计60% | 预期85% |

---

**创建时间：** 2026-05-15
**基于数据：** search_logs_1778830254776.jsonl
**状态：** 待实施
