# AI Research v2

一个面向研究、竞品分析和求职决策场景的 AI 搜索产品原型。

它不只返回答案，还会展示搜索过程、给出来源引用，并根据问题类型自动调整搜索深度，尽量减少“黑箱搜索”和“正确的废话”。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

## 在线体验

- Demo: http://47.86.191.93
- Repo: https://github.com/lindixu6-hash/ai-research-v2

## 项目定位

这个仓库更适合作为一个 **AI PM / AI 应用产品作品集项目** 来看，而不只是一个搜索 Demo。

它重点展示的是：

- 能否识别真实用户痛点，而不是只堆功能
- 能否把“搜索质量”拆成可设计、可验证、可迭代的模块
- 能否把产品方案、提示词策略、搜索策略、前后端原型和部署串成闭环

## 我想解决的问题

在调研 AI 搜索产品时，这几个问题反复出现：

1. 用户不知道系统到底搜了什么，过程黑箱
2. 搜索结果质量不稳定，容易混入低质或错误内容
3. 很多回答冗长、保守、不够直接，用户很难快速得到结论

所以这个项目的目标不是“做一个像 ChatGPT 一样什么都能答的系统”，而是：

> 做一个更适合真实研究和决策场景的 AI 搜索产品，让用户更快拿到有来源、可验证、可继续追问的答案。

## 核心方案

### 1. 意图识别 + 分层回答

问题会先被识别为不同类型，例如：

- 简单信息型
- 复杂信息型
- 商业对比型
- 研究型
- 多部分问题

不同类型的问题，会触发不同的搜索轮数、结果规模和回答深度，避免所有问题都被用同一种方式处理。

### 2. 自适应搜索

系统不是固定搜一次就结束，而是会根据结果置信度动态决定是否继续搜索。

- 结果少，继续搜
- 来源不够权威，继续补
- 相关性不足，再扩展关键词

对应实现见：

- [services/adaptiveSearch.js](services/adaptiveSearch.js)

### 3. 流式搜索过程展示

前端通过 SSE 实时展示搜索过程，例如：

- 开始搜索
- 生成关键词
- 执行搜索
- 验证结果
- 生成报告

这件事的价值不是“炫技”，而是降低用户对 AI 搜索黑箱的焦虑。

### 4. 来源引用与可追溯

答案中的引用会映射到具体来源，支持点击跳转。  
这让“我为什么要相信这个答案”有了更好的解释路径。

### 5. 澄清问题与反馈闭环

对于模糊问题，系统支持先澄清再搜索；后端也预留了反馈、历史和统计接口，便于后续做搜索质量迭代。

## 这个项目体现的能力

如果把它当成 AI PM 求职项目，它比较能体现这几种能力：

- **问题定义能力**  
  把“AI 搜索不好用”拆成透明度、质量、效率、信任四类问题

- **产品设计能力**  
  不是只做聊天框，而是设计了澄清、搜索、验证、引用、反馈的完整流程

- **AI 应用理解能力**  
  知道 LLM 不该直接裸答，而要结合搜索、置信度、来源管理和工作流编排

- **技术协同能力**  
  能把 PRD、搜索策略、提示词、前端交互、后端工作流和部署打通

- **迭代意识**  
  仓库里保留了多轮优化文档，能看见从 v1 到 v2 的思考过程

## 关键功能

### 用户侧

- 搜索提问
- 示例问题一键触发
- 搜索过程流式展示
- 引用可点击查看来源
- 澄清问题弹窗
- 搜索结果状态保留

### 后端能力

- `/api/search/v2` 优化版搜索接口
- `/api/search/stream` 流式搜索接口
- `/api/search/feedback` 用户反馈接口
- `/api/search/history` 历史记录接口
- `/api/search/stats` 统计接口

## 架构概览

```text
React + Vite 前端
    ↓
SSE / REST API
    ↓
Express 后端
    ↓
意图分类 / 工作流编排 / 自适应搜索 / 来源管理
    ↓
Tavily / DuckDuckGo / Moonshot(Kimi)
```

关键代码入口：

- 前端入口: [frontend/src/App.jsx](frontend/src/App.jsx)
- 后端入口: [backend/src/app.js](backend/src/app.js)
- 优化版搜索路由: [backend/src/routes/searchV2.js](backend/src/routes/searchV2.js)
- 自适应搜索器: [services/adaptiveSearch.js](services/adaptiveSearch.js)

## 目录结构

```text
ai-research-v2/
├── frontend/              # React 前端
├── backend/               # Express 后端
├── services/              # 搜索、验证、意图分类等核心逻辑
├── api/                   # 部署环境 API 入口
├── docs/                  # PRD、竞品、Demo 文档
├── tests/                 # 集成和策略测试
└── README.md
```

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/lindixu6-hash/ai-research-v2.git
cd ai-research-v2
```

### 2. 安装依赖

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. 配置环境变量

在 `backend/.env` 中配置：

```env
PORT=3001
NODE_ENV=development

SEARCH_API_KEY=your_tavily_api_key
SEARCH_API_URL=https://api.tavily.com/search

OPENAI_API_KEY=your_moonshot_api_key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
MODEL_NAME=moonshot-v1-128k
```

### 4. 启动项目

后端：

```bash
cd backend
npm run dev
```

前端：

```bash
cd frontend
npm run dev
```

默认访问：

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`

## 配套文档

- PRD: [docs/PRD.md](docs/PRD.md)
- Demo 场景: [docs/DEMO_CASES.md](docs/DEMO_CASES.md)
- 竞品分析: [docs/竞品分析.md](docs/%E7%AB%9E%E5%93%81%E5%88%86%E6%9E%90.md)
- 开源拆解: [docs/开源项目拆解.md](docs/%E5%BC%80%E6%BA%90%E9%A1%B9%E7%9B%AE%E6%8B%86%E8%A7%A3.md)
- 架构说明: [ARCHITECTURE_FLOW.md](ARCHITECTURE_FLOW.md)

## 面试时可以重点展开的点

如果你用这个项目做 AI PM / AI 应用产品岗位作品集，比较适合重点聊这几件事：

1. 为什么用户在 AI 搜索里需要“来源透明”和“过程可见”
2. 为什么要先做意图分类，再决定搜索深度和回答方式
3. 为什么“继续搜不继续搜”应该由置信度驱动
4. 为什么这个项目既是产品方案，也是一个可运行原型
5. 如果继续迭代，应该怎样做 eval、反馈闭环和搜索质量看板

## 下一步优化

- 增加更明确的评测体系和答案质量 eval
- 完善来源质量评分与排序策略
- 增加用户账户、历史记录与导出能力
- 建立更稳定的反馈数据闭环
- 为不同场景提供更细的行业模板

## License

MIT
