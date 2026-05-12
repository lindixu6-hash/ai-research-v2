require('dotenv').config({ path: __dirname + '/.env' });
const { callLLMJSON } = require('./services/llmService');
const prompts = require('./prompts');

async function test() {
  console.log('🧪 测试搜索关键词生成...\n');

  try {
    const result = await callLLMJSON(
      prompts.SYSTEM,
      '为以下问题生成搜索关键词：北京天气怎么样'
    );
    console.log('返回结果:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\nqueries:', result.queries);
    console.log('search_queries:', result.search_queries);
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

test();
