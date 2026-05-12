require('dotenv').config({ path: __dirname + '/.env' });
const OpenAI = require('openai');

console.log('🔑 API Key:', process.env.OPENAI_API_KEY?.substring(0, 15) + '...');
console.log('🌐 Base URL:', process.env.OPENAI_BASE_URL);
console.log('🤖 Model:', process.env.MODEL_NAME);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL
});

async function testAPI() {
  try {
    console.log('\n📡 发送测试请求...');
    const response = await client.chat.completions.create({
      model: process.env.MODEL_NAME || 'moonshot-v1-8k',
      messages: [
        { role: 'user', content: '你好，请回复"测试成功"' }
      ],
      max_tokens: 50
    });

    console.log('✅ API 调用成功！');
    console.log('📝 响应:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ API 调用失败！');
    console.error('错误类型:', error.constructor.name);
    console.error('错误消息:', error.message);
    console.error('状态码:', error.status);
    if (error.response) {
      console.error('响应详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI();
