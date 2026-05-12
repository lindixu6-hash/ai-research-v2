require('dotenv').config({ path: __dirname + '/.env' });
const { callLLMJSON } = require('./services/llmService');
const prompts = require('./prompts');

async function testSearchQuery() {
  console.log('🧪 测试搜索关键词生成...\n');

  try {
    const result = await callLLMJSON(
      prompts.SYSTEM,
      '为以下问题生成搜索关键词：2024年AI Agent开发框架有哪些'
    );
    console.log('原始返回:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

testSearchQuery();
