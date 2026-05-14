/**
 * API 封装
 * 统一管理后端接口调用
 */
import axios from 'axios';

// [TODO: 环境变量配置]
// 临时直接连接后端（需要浏览器允许混合内容）
const API_BASE = 'http://47.86.191.93:3000';

// 演示模式数据
const DEMO_DATA = {
  status: 'success',
  query: '演示搜索',
  answer: {
    summary: '这是一个 AI 搜索引擎的演示版本。完整功能需要连接后端 API 服务。',
    content: '## 关于本项目\n\n这是一个基于 React + Vite 构建的 AI 搜索引擎前端项目。\n\n### 主要功能\n- 🔍 智能搜索\n- 📝 流式答案生成\n- 📚 来源引用\n- 🌍 多语言支持\n\n### 技术栈\n- React 18\n- Vite 5\n- Axios\n- i18next\n\n### 注意事项\n\n当前是**演示模式**，展示的是静态内容。要体验完整功能，需要：\n\n1. 启动后端服务（Node.js + Express）\n2. 配置 AI API（如 OpenAI 或国内 AI 服务）\n3. 前端连接后端 API\n\n项目已开源，欢迎访问 [GitHub 仓库](https://github.com/lindixu6-hash/ai-research-v2) 查看完整代码！'
  },
  sources: [
    {
      id: 1,
      title: 'AI 搜索引擎项目',
      url: 'https://github.com/lindixu6-hash/ai-research-v2',
      snippet: '基于 React + Vite + Node.js 的 AI 搜索引擎项目，支持流式输出和多语言。',
      favicon: '📁'
    },
    {
      id: 2,
      title: 'React 官方文档',
      url: 'https://react.dev',
      snippet: 'React 是用于构建用户界面的 JavaScript 库。',
      favicon: '⚛️'
    },
    {
      id: 3,
      title: 'Vite 官方文档',
      url: 'https://vitejs.dev',
      snippet: '下一代前端工具链，为开发提供极速体验。',
      favicon: '⚡'
    }
  ],
  activities: [
    { icon: '🔍', message: '正在搜索', details: '演示模式' },
    { icon: '📖', message: '阅读来源', details: '加载演示数据' },
    { icon: '✅', message: '完成', details: '展示静态内容' }
  ]
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,  // 2分钟超时（AI搜索可能很慢）
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 检测是否为演示模式（无法连接后端）
 */
async function checkDemoMode() {
  try {
    // 尝试 ping 后端
    await axios.get(API_BASE.replace('/api', '/health'), { timeout: 3000 });
    return false;
  } catch {
    return true;
  }
}

/**
 * 执行搜索
 * @param {string} query - 搜索问题
 * @returns {Promise} 搜索结果
 */
export async function search(query) {
  // 检查后端是否可用（不自动进入演示模式）
  const isDemo = await checkDemoMode();

  if (isDemo) {
    // 返回演示数据
    await new Promise(resolve => setTimeout(resolve, 800)); // 模拟延迟
    return {
      ...DEMO_DATA,
      query: query || DEMO_DATA.query
    };
  }

  const response = await api.post('/search', { query });
  return response.data;
}

export default api;
