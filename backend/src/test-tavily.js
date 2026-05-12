require('dotenv').config({ path: __dirname + '/.env' });
const axios = require('axios');

const SEARCH_API_KEY = process.env.SEARCH_API_KEY;
const SEARCH_API_URL = process.env.SEARCH_API_URL || 'https://api.tavily.com/search';

console.log('🔑 Tavily API Key:', SEARCH_API_KEY?.substring(0, 20) + '...');
console.log('🌐 Search URL:', SEARCH_API_URL);

async function testTavily() {
  try {
    console.log('\n📡 发送测试搜索请求...');
    const response = await axios.post(SEARCH_API_URL, {
      api_key: SEARCH_API_KEY,
      query: 'Python编程语言',
      search_depth: 'basic',
      max_results: 3,
      include_answer: false,
      include_raw_content: true
    });

    console.log('✅ Tavily API 调用成功！');
    console.log('📊 返回结果数:', response.data.results?.length);
    console.log('📝 第一个结果标题:', response.data.results?.[0]?.title);
  } catch (error) {
    console.error('❌ Tavily API 调用失败！');
    console.error('错误消息:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTavily();
