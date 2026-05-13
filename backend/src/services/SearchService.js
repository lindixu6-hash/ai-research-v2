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
 * 验证单个搜索结果的质量
 * 规则：内容长度、错误关键词、URL有效性
 */
function validateResult(result) {
  // 1. 检查基本字段
  if (!result.title || !result.content) {
    return { valid: false, reason: '缺少标题或内容' };
  }

  // 2. 检查内容长度（太短可能是无效结果）
  const minContentLength = 20; // 降低最小长度要求
  if (result.content.length < minContentLength) {
    return { valid: false, reason: `内容过短（${result.content.length}字符）` };
  }

  // 3. 检查是否包含错误关键词
  const errorKeywords = [
    '404', '403', '500',
    'Not Found', '页面不存在', '无法访问',
    'Access Denied', 'Forbidden', 'Error',
    '敬请期待', '页面暂无', '维护中'
  ];
  const hasErrorKeyword = errorKeywords.some(keyword =>
    result.content.includes(keyword) || result.title.includes(keyword)
  );
  if (hasErrorKeyword) {
    return { valid: false, reason: '包含错误关键词' };
  }

  // 4. 检查 URL 是否有效
  if (!result.url || !result.url.startsWith('http')) {
    return { valid: false, reason: 'URL 无效' };
  }

  // 5. 检查是否为纯广告或垃圾内容
  const spamKeywords = ['广告', '点击了解', '立即购买', '优惠活动', '限时促销'];
  const isSpam = spamKeywords.some(keyword => result.content.includes(keyword));
  if (isSpam) {
    return { valid: false, reason: '疑似广告内容' };
  }

  return { valid: true };
}

/**
 * 批量验证搜索结果
 * 返回有效结果和统计信息
 */
function validateResults(results) {
  const validResults = [];
  const invalidResults = [];

  results.forEach((result, index) => {
    const validation = validateResult(result);
    if (validation.valid) {
      validResults.push(result);
    } else {
      invalidResults.push({ index, result, reason: validation.reason });
    }
  });

  return {
    valid: validResults,
    invalid: invalidResults,
    total: results.length,
    validCount: validResults.length,
    invalidCount: invalidResults.length
  };
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

  const rawResults = response.data.results.map(item => ({
    title: item.title,
    url: item.url,
    content: item.content || '',
    rawContent: item.raw_content || ''
  }));

  // 验证搜索结果质量
  const validation = validateResults(rawResults);
  console.log(`📊 Tavily 结果验证: ${validation.validCount}/${validation.total} 条有效`);

  // 设置缓存（只缓存有效结果）
  setCache(query, 'tavily', validation.valid);

  return {
    success: true,
    query,
    results: validation.valid,
    validation: {
      total: validation.total,
      validCount: validation.validCount,
      invalidCount: validation.invalidCount
    }
  };
}

/**
 * 方案2: DuckDuckGo 搜索（备用，无需 API 密钥）
 *
 * DuckDuckGo 是什么？
 * - 注重隐私的搜索引擎，不追踪用户
 * - 提供免费 API，无需 API 密钥
 * - 作为 Tavily 失败时的备用方案
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

    const rawResults = [];

    // 解析 AbstractText
    if (response.data.AbstractText) {
      rawResults.push({
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
          rawResults.push({
            title: topic.Text.split(' - ')[0] || '相关结果',
            url: topic.FirstURL,
            content: topic.Text,
            rawContent: topic.Text
          });
        }
      });
    }

    // 验证搜索结果质量
    const validation = validateResults(rawResults);
    console.log(`📊 DuckDuckGo 结果验证: ${validation.validCount}/${validation.total} 条有效`);

    // 设置缓存（只缓存有效结果）
    setCache(query, 'duckduckgo', validation.valid);

    return {
      success: true,
      query,
      results: validation.valid,
      source: 'duckduckgo',
      validation: {
        total: validation.total,
        validCount: validation.validCount,
        invalidCount: validation.invalidCount
      }
    };
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
 *
 * 兜底措施说明：
 * - 第1层：Tavily（主搜索源）带重试，失败进入第2层
 * - 第2层：DuckDuckGo（备用）免费无密钥，失败进入第3层
 * - 第3层：兜底结果（最后手段）生成提示信息
 */
async function search(query) {
  console.log(`🔍 搜索: "${query}"`);

  // 方案1: 尝试 Tavily（带重试）
  console.log(`  尝试方案1: Tavily...`);
  const tavilyResult = await searchWithRetry(query, searchTavily);
  if (tavilyResult.success && tavilyResult.results.length > 0) {
    const v = tavilyResult.validation;
    console.log(`  ✅ Tavily 成功，找到 ${tavilyResult.results.length} 条有效结果${v ? `（过滤了 ${v.invalidCount} 条无效）` : ''}`);
    return tavilyResult;
  }

  // 方案2: 尝试 DuckDuckGo
  console.log(`  尝试方案2: DuckDuckGo...`);
  const ddgResult = await searchDuckDuckGo(query);
  if (ddgResult.success && ddgResult.results.length > 0) {
    const v = ddgResult.validation;
    console.log(`  ✅ DuckDuckGo 成功，找到 ${ddgResult.results.length} 条有效结果${v ? `（过滤了 ${v.invalidCount} 条无效）` : ''}`);
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
  clearCache,
  validateResult,
  validateResults
};
