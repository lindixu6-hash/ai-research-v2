/**
 * API 封装
 * 统一管理后端接口调用
 */
import axios from 'axios';

// [TODO: 环境变量配置]
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,  // 2分钟超时（AI搜索可能很慢）
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 执行搜索
 * @param {string} query - 搜索问题
 * @returns {Promise} 搜索结果
 */
export async function search(query) {
  const response = await api.post('/search', { query });
  return response.data;
}

export default api;
