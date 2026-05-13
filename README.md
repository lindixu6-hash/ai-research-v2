# 🤖 AI 搜索引擎

> 基于 AI Agent 的智能搜索系统，支持联网搜索、多轮对话、流式输出

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

## ✨ 特性

- 🔍 **智能联网搜索** - 集成 Tavily 搜索 API，获取实时信息
- 🧠 **AI 驱动分析** - 使用 Kimi/Moonshot 大模型深度分析搜索结果
- 💬 **多轮对话** - 支持澄清问题，逐步理解用户需求
- 📡 **流式输出** - 实时展示 AI 思考过程，更好的用户体验
- 🌍 **多语言支持** - 中英文界面切换
- 🎨 **现代化 UI** - 基于 React + Vite 构建的响应式界面

## 🏗️ 项目架构

```
ai-search-project/
├── backend/                    # 后端服务 (Node.js + Express)
│   ├── src/
│   │   ├── agents/            # Agent 提示词
│   │   ├── routes/            # API 路由
│   │   │   ├── search.js      # 搜索接口
│   │   │   ├── stream.js      # 流式输出接口
│   │   │   └── api.js         # 通用接口
│   │   ├── services/          # 核心服务
│   │   │   ├── workflowService.js   # 工作流编排
│   │   │   ├── llmService.js        # AI 大模型服务
│   │   │   └── SearchService.js     # 搜索服务
│   │   ├── prompts.js         # 系统提示词
│   │   └── app.js             # 入口文件
│   └── .env                   # 环境变量配置
│
├── frontend/                   # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── SearchBar.jsx         # 搜索框
│   │   │   ├── SearchResults.jsx     # 搜索结果
│   │   │   └── LoadingSpinner.jsx    # 加载动画
│   │   ├── hooks/             # 自定义 Hooks
│   │   │   ├── useSearch.js          # 搜索逻辑
│   │   │   └── useStreamSearch.js    # 流式搜索
│   │   ├── utils/             # 工具函数
│   │   │   └── api.js                # API 封装
│   │   ├── i18n/              # 国际化
│   │   └── main.jsx           # 入口文件
│   └── vite.config.js         # Vite 配置
│
└── README.md
```

## 🔧 技术栈

### 后端
- **Node.js** - JavaScript 运行环境
- **Express** - Web 框架
- **Axios** - HTTP 请求
- **OpenAI SDK** - AI 大模型接口
- **CORS** - 跨域支持

### 前端
- **React 18** - UI 框架
- **Vite 5** - 构建工具
- **Axios** - HTTP 请求
- **i18next** - 国际化

### AI 服务
- **Kimi/Moonshot** - 大语言模型
- **Tavily** - 搜索 API

## 📦 安装

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

## ⚙️ 配置

在 `backend/.env` 文件中配置环境变量：

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

## 🚀 运行

### 启动后端

```bash
cd backend
npm start
```

服务运行在 `http://localhost:3000`

### 启动前端

```bash
cd frontend
npm run dev
```

页面运行在 `http://localhost:5173`

## 📡 API 接口

### 健康检查

```
GET /health
```

**响应：**
```json
{
  "status": "ok",
  "message": "AI搜索服务运行中",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 同步搜索

```
POST /api/search
Content-Type: application/json

{
  "query": "2024年AI Agent开发框架有哪些"
}
```

**响应：**
```json
{
  "status": "success",
  "query": "2024年AI Agent开发框架有哪些",
  "answer": {
    "summary": "2024年主流的AI Agent开发框架包括...",
    "content": "详细分析..."
  },
  "sources": [
    {
      "id": 1,
      "title": "文章标题",
      "url": "https://example.com",
      "snippet": "内容摘要..."
    }
  ]
}
```

### 流式搜索

```
GET /api/search/stream
```

以 Server-Sent Events (SSE) 格式流式返回结果。

## 🔍 工作流程

```
用户提问
    ↓
判断问题是否清晰
    ↓ (需要澄清)
返回澄清问题 ←───────┐
    ↓                 │
生成搜索关键词         │
    ↓                 │
调用搜索 API          │ 用户回答
    ↓                 │
获取搜索结果          │
    ↓                 │
AI 分析并生成答案 ─────┘
    ↓
返回结构化答案 + 来源
```

## 🌐 在线演示

- **前端**: https://ai-search-project.vercel.app
- **GitHub**: https://github.com/lindixu6-hash/ai-research-v2

## 📸 界面预览

### 搜索页面
- 居中搜索框
- 搜索模式切换（全部/学术/视频/图片）

### 结果页面
- 三栏布局：搜索历史 | AI 答案 | 来源列表
- 流式输出展示 AI 思考过程
- 来源卡片带引用标注

## 🛠️ 开发计划

- [x] 基础搜索功能
- [x] AI 答案生成
- [x] 流式输出
- [x] 多语言支持
- [ ] 用户认证
- [ ] 搜索历史
- [ ] 收藏功能
- [ ] 导出分享
- [ ] 移动端优化

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 📮 联系方式

- GitHub: [@lindixu6-hash](https://github.com/lindixu6-hash)

---

⭐ 如果这个项目对你有帮助，请给个 Star！
