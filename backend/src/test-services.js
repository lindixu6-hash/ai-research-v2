require('dotenv').config({ path: __dirname + '/.env' });
const { callLLMJSON } = require('./services/llmService');
const prompts = require('./prompts');

// 测试大模型是否能正常调用
async function test() {
  console.log('🧪 测试大模型连接...\n');

  try {
    // 正确用法：Agent提示词作为系统提示词
    const result = await callLLMJSON(
      prompts.CLARIFY,  // 系统提示词（Agent的职责定义）
      '判断这个问题是否需要澄清："2024年AI Agent开发框架有哪些"'  // 用户任务
    );

    console.log('✅ 测试成功！模型返回：');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ 测试失败：', error.message);
    console.log('\n请检查：');
    console.log('1. .env文件中的API密钥是否正确');
    console.log('2. 网络是否能访问API地址');
  }
}

test();
