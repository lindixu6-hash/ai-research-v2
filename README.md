# AI 搜索引擎项目

智能搜索系统，集成 AI 分析和多源搜索能力。

## 项目结构

```
ai-search-project/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── agents/         # Agent提示词和逻辑
│   │   ├── routes/         # API路由
│   │   ├── services/       # 搜索服务等
│   │   └── app.js          # 入口文件
│   ├── .env                # 环境变量配置
│   └── package.json
│
├── frontend/               # 前端页面
│   ├── src/
│   │   ├── components/     # React组件
│   │   └── App.js
│   └── package.json
│
└── README.md
```

## 快速开始

### 后端启动

```bash
cd backend
npm install
npm start
```

服务运行在 `http://localhost:3000`

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

页面运行在 `http://localhost:5173`

## API 接口

### 健康检查
```
GET /api/health
```

### 搜索
```
GET /api/search?query=<关键词>
```

## 技术栈

- **后端**: Node.js + Express
- **前端**: React + Vite
- **AI**: 智能意图分析（开发中）

## 开发计划

- [ ] 集成真实搜索 API
- [ ] 实现 AI 意图分析
- [ ] 添加用户认证
- [ ] 历史记录功能

## License

MIT
