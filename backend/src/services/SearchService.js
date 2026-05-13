/**
 * 搜索服务 - 增强版
 * 功能：多搜索源 + 兜底机制 + 重试 + 缓存
 */

const axios = require('axios');

// 配置
const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'https://api.tavily.com/search';
const MAX_RETRIES = 2; // 最大重试次数
const CACHE_TTL = 5 * 60 * 1000; // 缓存5分钟

// 简单的内存缓存
const cache = new Map();

/**
 * 生成缓存键
 */
function getCacheKey(query, source) {
  return `${source}:${query}`;
}

/**
 * 获取缓存
 */
function getFromCache(query, source) {
  const key = getCacheKey(query, source);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`💾 使用缓存: ${query} (${source})`);
    return cached.data;
  }
  return null;
}

/**
 * 设置缓存
 */
function setCache(query, source, data) {
  const key = getCacheKey(query, source);
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的搜索
 */
async function searchWithRetry(query, searchFn, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await searchFn(query);
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.error(`❌ 搜索失败 (尝试 ${i + 1}/${retries + 1}):`, error.message);
      if (i < retries) {
        const waitTime = Math.pow(2, i) * 1000; // 指数退避: 1s, 2s, 4s
        console.log(`⏳ ${waitTime / 1000}秒后重试...`);
        await delay(waitTime);
      }
    }
  }
  return { success: false, query, error: '搜索失败，已重试' };
}

/**
 * 方案1: Tavily 搜索（主搜索源）
 */
async function searchTavily(query) {
  // 先查缓存
  const cached = getFromCache(query, 'tavily');
  if (cached) return { success: true, query, results: cached, cached: true };

  const response = await axios.post(SEARCH_API_URL, {
    api_key: SEARCH_API_KEY,
    query: query,
    search_depth: 'basic',
    max_results: 5,
    include_answer: false,
    include_raw_content: true
  }, { timeout: 10000 }); // 10秒超时

  const results = response.data.results.map(item => ({
    title: item.title,
    url: item.url,
    content: item.content || '',
    rawContent: item.raw_content || ''
  }));

  // 设置缓存
  setCache(query, 'tavily', results);

  return { success: true, query, results };
}

/**
 * 方案2: DuckDuckGo 搜索（备用，无需 API 密钥）
 */
async function searchDuckDuckGo(query) {
  // 先查缓存
  const cached = getFromCache(query, 'duckduckgo');
  if (cached) return { success: true, query, results: cached, cached: true };

  try {
    // 使用 DuckDuckGo Instant Answer API
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json' },
      timeout: 8000
    });

    const results = [];

    // 解析 AbstractText
    if (response.data.AbstractText) {
      results.push({
        title: response.data.Heading || 'DuckDuckGo',
        url: response.data.AbstractURL || response.data.AbstractSource || 'https://duckduckgo.com',
        content: response.data.AbstractText,
        rawContent: response.data.AbstractText
      });
    }

    // 解析 RelatedTopics
    if (response.data.RelatedTopics && Array.isArray(response.data.RelatedTopics)) {
      response.data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || '相关结果',
            url: topic.FirstURL,
            content: topic.Text,
            rawContent: topic.Text
          });
        }
      });
    }

    // 设置缓存
    setCache(query, 'duckduckgo', results);

    return { success: true, query, results, source: 'duckduckgo' };
  } catch (error) {
    console.error('DuckDuckGo 搜索失败:', error.message);
    return { success: false, query, error: error.message, source: 'duckduckgo' };
  }
}

/**
 * 方案3: 生成模拟搜索结果（最后兜底）
 */
function generateFallbackResults(query) {
  console.log(`⚠️ 所有搜索源失败，生成兜底结果`);

  return {
    success: true,
    query,
    results: [{
      title: `关于"${query}"的信息`,
      url: 'https://www.google.com/search?q=' + encodeURIComponent(query),
      content: `抱歉，暂时无法搜索到关于"${query}"的实时信息。您可以：\n\n1. 检查网络连接\n2. 稍后再试\n3. 访问 Google 搜索: https://www.google.com/search?q=${encodeURIComponent(query)}`,
      rawContent: `抱歉，暂时无法搜索到关于"${query}"的实时信息。`
    }],
    fallback: true
  };
}

/**
 * 智能搜索 - 自动切换搜索源
 * 优先级: Tavily → DuckDuckGo → 兜底结果
 */
async function search(query) {
  console.log(`🔍 搜索: "${query}"`);

  // 方案1: 尝试 Tavily（带重试）
  console.log(`  尝试方案1: Tavily...`);
  const tavilyResult = await searchWithRetry(query, searchTavily);
  if (tavilyResult.success && tavilyResult.results.length > 0) {
    console.log(`  ✅ Tavily 成功，找到 ${tavilyResult.results.length} 条结果`);
    return tavilyResult;
  }

  // 方案2: 尝试 DuckDuckGo
  console.log(`  尝试方案2: DuckDuckGo...`);
  const ddgResult = await searchDuckDuckGo(query);
  if (ddgResult.success && ddgResult.results.length > 0) {
    console.log(`  ✅ DuckDuckGo 成功，找到 ${ddgResult.results.length} 条结果`);
    return ddgResult;
  }

  // 方案3: 返回兜底结果
  console.log(`  使用方案3: 兜底结果`);
  return generateFallbackResults(query);
}

/**
 * 批量搜索多个关键词
 * 即使部分失败也会返回成功的结果
 */
async function batchSearch(queries) {
  console.log(`\n🚀 开始批量搜索，共 ${queries.length} 个关键词`);

  // 并行执行所有搜索
  const results = await Promise.allSettled(
    queries.map(query => search(query))
  );

  // 处理结果
  const successful = [];
  const failed = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successful.push({
        query: queries[index],
        ...result.value
      });
    } else {
      failed.push({
        query: queries[index],
        error: result.reason?.message || result.value?.error || '未知错误'
      });
    }
  });

  console.log(`\n📊 批量搜索结果:`);
  console.log(`  ✅ 成功: ${successful.length}/${queries.length}`);

  if (failed.length > 0) {
    console.log(`  ❌ 失败: ${failed.length}/${queries.length}`);
    failed.forEach(f => {
      console.log(`     - "${f.query}": ${f.error}`);
    });
  }

  // 即使全部失败，也返回空结果而不是抛出错误
  return [...successful, ...failed.map(f => ({
    success: false,
    query: f.query,
    error: f.error,
    results: []
  }))];
}

/**
 * 清除缓存
 */
function clearCache() {
  cache.clear();
  console.log('🗑️ 缓存已清除');
}

module.exports = {
  search,
  batchSearch,
  clearCache
};
