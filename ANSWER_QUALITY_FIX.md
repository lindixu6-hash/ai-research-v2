# 回答质量改进方案 v3.0

> 基于大厂AI搜索产品（Perplexity、Google AI Overviews、ChatGPT Search）分析

---

## 一、大厂查询意图分类（标准框架）

### 1.1 经典分类（Broder模型扩展）

| 类型 | 定义 | 示例 | AI回答方式 |
|------|------|------|------------|
| **Informational** | 用户想"了解/学习" | "什么是X？"、"如何做Y？" | 深度总结、知识梳理 |
| **Navigational** | 想去某个网站/页面 | "打开华为官网" | 直接链接 + 简要引导 |
| **Transactional** | 想买、注册、下载 | "买iPhone 16" | 比较信息，避免直接促销 |
| **Commercial Investigation** | 商业调研、比较 | "最佳CRM软件推荐" | 多方案对比 |

### 1.2 AI时代扩展

| 类型 | 定义 | 示例 |
|------|------|------|
| **Generative/Creative** | 让AI生成内容 | "写一篇文章"、"生成代码" |
| **Comparative** | 对比分析 | "iPhone vs Android" |
| **Multi-part** | 多部分问题 | "什么是X，怎么用，多少钱" |
| **Research Synthesis** | 研究综合 | "分析2024年AI趋势" |

### 1.3 复杂度分类（Perplexity）

| 级别 | 特征 | 处理方式 |
|------|------|----------|
| **Fast/Simple** | 简单事实、单主题 | 单次搜索 + 快速合成 |
| **Pro/Deep** | 多部分、对比、推理 | 多次检索 + 专家观点合成 |

---

## 二、大厂回答框架（标准格式）

### 2.1 BLUF 原则（Bottom Line Up Front）

```
# 核心答案（第一句就给结论）
[1-2句话直接回答用户问题]

然后才是详细分析...
```

### 2.2 结构化呈现

| 问题类型 | 结构 |
|----------|------|
| 信息型 | 小标题 + 分点 |
| 对比型 | 维度表格 |
| How-to型 | 编号步骤 |
| 研究型 | 关键发现 + 数据 + 局限性 |

### 2.3 来源引用

```
每句关键事实都带编号引用 [1][2][3]
```

### 2.4 长度自适应

```
简单问题：50-100字
复杂问题：根据需要扩展，但不啰嗦
```

---

## 三、当前项目问题诊断

### 问题1：分类完全错误

**错误回答：**
```
分类意图、兼容性意图、属性意图
```
→ 这是电商推荐分类，不是AI搜索查询意图！

**正确应该是：**
```
Informational、Navigational、Transactional、Commercial Investigation
```

### 问题2：缺少 BLUF 原则

**当前：** 核心结论太啰嗦，没有直接答案
**应该：** 第一句话就给出直接回答

### 问题3：无关内容出现

**问题：** "薪资和就业"完全不相关
**原因：** 报告模板固定，没有根据问题类型调整

### 问题4：搜索词质量不稳定

**好的例子（第5条）：**
```
1. New York company work hours 2024
2. New York work schedule vs national average
3. site:linkedin.com New York work hours
```

**差的例子（第1条）：**
```
1. AI Project Management Skills
2. Artificial Intelligence PM Competencies
3. AI PM Technical Requirements
4. AI PM Skill Set
5. Project Management in AI Industry
```
→ 5个同义词！

---

## 四、改进方案

### 4.1 新增问题分类 Agent

```javascript
QUERY_CLASSIFIER: `你是一个查询意图分类专家。

任务：判断用户查询属于哪种意图类型。

【意图类型】
1. **informational** - 信息型/知识型：用户想"了解/学习"
   - 特征："什么是"、"如何"、"怎么"、"为什么"
   - 示例："什么是AI PM"、"怎么做产品经理"

2. **navigational** - 导航型：想去某个网站/页面
   - 特征："打开"、"官网"、"登录"
   - 示例："打开华为官网"

3. **transactional** - 交易型/行动型：想买、注册、下载
   - 特征："买"、"下载"、"注册"、"价格"
   - 示例："买iPhone 16"、"下载ChatGPT"

4. **commercial** - 商业调研型：比较、推荐
   - 特征："最佳"、"推荐"、"vs"、"对比"
   - 示例："最佳CRM软件"、"iPhone vs Android"

5. **generative** - 生成型：让AI生成内容
   - 特征："写"、"生成"、"制定"、"设计"
   - 示例："写一封邮件"、"生成代码"

6. **research** - 研究综合型：深度分析、多部分
   - 特征："分析"、"研究"、"综述"、"趋势"
   - 示例："分析2024年AI发展趋势"

【复杂度】
- **simple** - 简单：单一问题、事实查询
- **complex** - 复杂：多部分、需要对比、多步推理

【输出格式】
{"intent": "类型", "complexity": "simple/complex"}

示例：
输入："美国公司上下班时间？"
输出：{"intent": "informational", "complexity": "simple"}

输入："iPhone vs Android哪个好？"
输出：{"intent": "commercial", "complexity": "complex"}
`
```

### 4.2 分层回答策略

```javascript
// 根据意图 + 复杂度选择回答策略

RESPONSE_STRATEGIES: {
  // 简单信息型：50-100字直接回答
  informational_simple: `# 核心答案

[1-3句话直接回答问题，包含具体数据]

【不要展开复杂结构，不要无关内容】`,

  // 复杂信息型：结构化知识梳理
  informational_complex: `# 核心答案

[直接结论]

## 关键点
1. **要点1**：[具体描述]
2. **要点2**：[具体描述]
3. **要点3**：[具体描述]

## 详细说明
[展开2-3段]

## 参考
- [来源1](链接)
- [来源2](链接)`,

  // 商业调研型：对比表格
  commercial: `# 核心答案

[一句话对比结论]

## 详细对比

| 维度 | A | B |
|------|---|---|
| 价格 | ... | ... |
| 性能 | ... | ... |
| 优缺点 | ... | ... |

## 选择建议
- **选择A如果**：...
- **选择B如果**：...`,

  // 研究综合型：完整报告
  research: `# 研究报告：[主题]

## 核心发现
[3-4句话总结]

## 详细分析
### 背景
...
### 关键数据
...
### 趋势分析
...

## 结论
[总结性判断]`
}
```

### 4.3 禁止无关内容

```javascript
// 报告生成时，根据问题类型过滤无关章节

FORBIDDEN_SECTIONS = {
  informational_simple: ['薪资和就业', '学习路径', '推荐资源'],
  navigational: ['薪资和就业', '学习路径', '详细分析'],
  transactional: ['学习路径', '技能清单'],
  // ...
}
```

---

## 五、效果对比

### 之前（错误分类 + 啰嗦回答）

```
用户：大厂的AI搜索产品怎么分类？

回答：
## 核心结论
- 大厂的AI搜索产品对用户问题的分类方法主要基于用户意图，
  可以划分为分类意图（Categorical）、兼容性意图（Compatibility）
  和属性意图（Attribute-based）。
  （❌ 错误分类，啰嗦）
```

### 之后（正确分类 + BLUF）

```
用户：大厂的AI搜索产品怎么分类？

回答：
# 核心答案

大厂AI搜索产品主要将用户查询分为四类：**Informational（信息型）**、
**Navigational（导航型）**、**Transactional（交易型）**、
**Commercial Investigation（商业调研型）**。AI时代还扩展了
Generative（生成型）和Comparative（对比型）。

## 详细分类
### 1. Informational（信息型）
- 定义：用户想"了解/学习"
- 示例："什么是AI PM？"
- 处理：深度总结、知识梳理

### 2. Navigational（导航型）
- 定义：想去某个网站/页面
- 示例："打开华为官网"
- 处理：直接链接 + 简要引导

...（依此类推）
```

---

## 六、实施优先级

| 优先级 | 任务 | 预计时间 | 效果 |
|--------|------|----------|------|
| P0 | 修复分类框架 | 1小时 | 解决核心错误 |
| P0 | 实现 BLUF 原则 | 1小时 | 回答更直接 |
| P1 | 分层回答策略 | 2小时 | 针对不同类型优化 |
| P1 | 禁止无关内容 | 1小时 | 避免噪音 |
| P2 | 来源引用 | 2小时 | 提升可信度 |

---

**创建时间：** 2026-05-15
**基于：** Perplexity、Google AI Overviews、ChatGPT Search 分析
**状态：** 待实施
