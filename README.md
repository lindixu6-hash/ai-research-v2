# 🤖 AI 搜索引擎

**做一个能实时展示过程、会自己验证结果、来源可追溯的让人能用、敢用、放心用的 AI 搜索产品**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

---

## 📢 最新更新 (2026-05-15)

### 🔥 性能大幅优化
- **响应时间**: 45秒 → 10-15秒（并行搜索）
- **URL 去重**: 避免重复结果
- **多维度搜索策略**: 时间限定、site: 搜索源、对比分析

### 🎯 搜索质量提升
- **拒绝"正确的废话"**: 敢于下判断，给出明确结论
- **SOUL 原则融入**: 帮到实处、有主见、准确第一
- **结构化报告**: 技能学习/预测/对比类问题专属格式

### 💾 状态持久化
- 点击外部链接返回后，搜索结果保留
- 使用 sessionStorage 自动保存/恢复状态

---

## 🎯 为什么做这个项目？

我对市面上 AI 搜索产品进行调研后，发现了三大痛点：

| 痛点 | 描述 | 影响 |
|------|------|------|
| **搜索过程黑箱化** | 用户不知道 AI 在做什么，用了哪些关键词去检索 | 体验差，不信任 |
| **结果质量不稳定** | 脏数据、错误信息容易混入，时常出现幻觉 | 答案不可靠 |
| **用户不信任** | 不知道信息从哪来，不敢用 | 不敢用、不能用 |

### 我的解决方案

针对这些痛点，我设计并实现了一个平衡型 AI 搜索产品：

- **SSE 流式输出** → 实时展示搜索进度，让用户看到 AI 的思考过程
- **结果验证 Agent** → 专门验证搜索结果质量，过滤脏数据
- **来源标注** → 所有信息都标注来源，可追溯

---

## ✨ 核心功能

### 🔍 实时展示搜索进度

通过 SSE（Server-Sent Events）流式输出，实时展示 AI 搜索的每个步骤：

```
🚀 开始搜索...
🔑 生成搜索关键词...
🔍 搜索 (1/3): Python编程语言
✅ 验证: 4/5 条有效
📊 分析搜索结果...
📝 生成研究报告...
🎉 搜索完成！
```

### ✅ 结果验证 Agent

专门的验证机制，确保结果质量：

- **内容长度检查**：过滤过短的无意义内容
- **错误关键词过滤**：排除 404、页面不存在等无效结果
- **URL 有效性验证**：确保链接可访问
- **垃圾内容过滤**：排除纯广告内容

```
📊 Tavily 结果验证: 4/5 条有效（过滤了 1 条无效）
```

### 🏷️ 来源标注

所有答案都标注信息来源，用户可追溯：

```
💡 关键发现
   Python 是一种解释型语言...
   来源：Oracle 中国 | 可信度：高
```

### 🛡️ 三层兜底机制

确保搜索永远有结果：

```
第1层：Tavily（主搜索源，带重试）
    ↓ 失败
第2层：DuckDuckGo（备用，免费无密钥）
    ↓ 失败
第3层：兜底结果（引导用户手动搜索）
```

---

## 🏗️ 技术实现

### 架构设计

```
用户提问
    ↓
澄清问题（可选）
    ↓
生成搜索关键词
    ↓
多轮搜索 + 结果验证 ← 核心功能
    ↓
分析提取关键信息
    ↓
生成研究报告（含来源）
```

### 技术栈

| 模块 | 技术方案 | 说明 |
|------|----------|------|
| 前端 | React 18 + Vite 5 | 现代化、开发体验好 |
| 后端 | Node.js + Express | 轻量、易于部署 |
| 流式输出 | SSE (Server-Sent Events) | 实时性好，比 WebSocket 简单 |
| 搜索 API | Tavily + DuckDuckGo | Tavily 质量高，DuckDuckGo 兜底 |
| AI 模型 | Moonshot/Kimi | 中文理解能力强，长上下文 |

### 核心代码

**结果验证逻辑** (`backend/src/services/SearchService.js`):

```javascript
function validateResult(result) {
  // 1. 基本字段检查
  if (!result.title || !result.content) {
    return { valid: false, reason: '缺少标题或内容' };
  }

  // 2. 内容长度检查
  if (result.content.length < 20) {
    return { valid: false, reason: '内容过短' };
  }

  // 3. 错误关键词过滤
  const errorKeywords = ['404', 'Not Found', '页面不存在', '无法访问'];
  if (errorKeywords.some(k => result.content.includes(k))) {
    return { valid: false, reason: '包含错误关键词' };
  }

  // 4. URL 有效性检查
  if (!result.url || !result.url.startsWith('http')) {
    return { valid: false, reason: 'URL 无效' };
  }

  // 5. 垃圾内容过滤
  const spamKeywords = ['广告', '立即购买', '优惠活动'];
  if (spamKeywords.some(k => result.content.includes(k))) {
    return { valid: false, reason: '疑似广告内容' };
  }

  return { valid: true };
}
```

---

## 📦 安装运行

### 克隆项目

```bash
git clone https://github.com/lindixu6-hash/ai-research-v2.git
cd ai-research-v2
```

### 后端安装

```bash
cd backend
npm install
```

### 前端安装

```bash
cd frontend
npm install
```

### 配置环境变量

在 `backend/.env` 文件中配置：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# 搜索 API 配置
SEARCH_API_KEY=your_tavily_api_key
SEARCH_API_URL=https://api.tavily.com/search

# 大模型 API 配置
OPENAI_API_KEY=your_moonshot_api_key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
MODEL_NAME=moonshot-v1-128k
```

**获取 API 密钥：**
- Tavily: https://tavily.com（免费额度 1000 次/月）
- Moonshot: https://platform.moonshot.cn（新用户有免费额度）

### 启动服务

**后端**：
```bash
cd backend
npm start
```

**前端**：
```bash
cd frontend
npm run dev
```

访问：http://localhost:5173

---

## 📡 API 接口

### 健康检查

```
GET /health
```

### 流式搜索

```
POST /api/search/stream
Content-Type: application/json

{
  "query": "Python编程语言特点"
}
```

以 SSE 格式流式返回结果，包含以下事件类型：

| 事件 | 说明 |
|------|------|
| `start` | 开始搜索 |
| `step` | 进度更新 |
| `queries_generated` | 关键词生成完成 |
| `search_result` | 搜索结果返回 |
| `validation` | 结果验证统计 |
| `clarify` | 需要澄清问题 |
| `report` | 最终报告 |
| `error` | 错误信息 |

---

## 🌐 在线演示

- **生产环境**: http://47.86.191.93
- **前端预览**: https://ai-search-project.vercel.app
- **GitHub**: https://github.com/lindixu6-hash/ai-research-v2

---

## 📄 许可证

MIT License

---

## 📮 联系方式

- GitHub: [@lindixu6-hash](https://github.com/lindixu6-hash)

⭐ 如果这个项目对你有帮助，请给个 Star！
