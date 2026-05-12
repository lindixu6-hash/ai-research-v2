/**
 * 搜索服务
 *
 * 功能：调用外部搜索API获取信息
 * 支持：Tavily（推荐）、Bing、DuckDuckGo
 */

const axios = require('axios');

// [TODO: 确认.env文件中的搜索API密钥已填写]
const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'https://api.tavily.com/search';

/**
 * 执行搜索
 * @param {string} query - 搜索关键词
 * @returns {Promise<object>} 搜索结果
 */
async function search(query) {
  try {
    // Tavily API格式（推荐，有免费额度）
    if (SEARCH_API_URL.includes('tavily')) {
      const response = await axios.post(SEARCH_API_URL, {
        api_key: SEARCH_API_KEY,
        query: query,
        search_depth: 'basic',  // basic 或 advanced
        max_results: 5,         // 最多返回5条结果
        include_answer: false,  // 我们自己让AI分析，不需要它的答案
        include_raw_content: true  // 需要正文内容用于AI分析
      });

      return {
        success: true,
        query: query,
        results: response.data.results.map(item => ({
          title: item.title,
          url: item.url,
          content: item.content || '',       // 摘要
          rawContent: item.raw_content || '' // 正文（重要！AI需要读这个）
        }))
      };
    }

    // [TODO: 如果用Bing Search，在这里添加对应的API调用逻辑]
    // Bing API示例...

    // 兜底：DuckDuckGo（不需要API密钥，但效果一般）
    // 实际项目中建议用Tavily或Bing

  } catch (error) {
    console.error(`❌ 搜索失败 "${query}":`, error.message);
    return {
      success: false,
      query: query,
      error: error.message
    };
  }
}

/**
 * 批量搜索多个关键词
 * @param {string[]} queries - 搜索关键词数组
 * @returns {Promise<object[]>} 所有搜索结果
 */
async function batchSearch(queries) {
  console.log(`🔍 开始批量搜索，共 ${queries.length} 个关键词`);

  // 并行执行所有搜索（更快）
  const results = await Promise.all(
    queries.map(query => search(query))
  );

  // 统计成功数量
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 搜索完成：${successCount}/${queries.length} 成功`);

  return results;
}

module.exports = {
  search,
  batchSearch
};
