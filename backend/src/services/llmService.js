/**
 * 大模型服务
 *
 * 功能：统一调用各种兼容OpenAI接口的模型
 * 支持：OpenAI、DeepSeek、通义千问等
 */

const OpenAI = require('openai');

// [TODO: 确认.env文件中的API密钥已填写]
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
});

// 默认模型（从环境变量读取，默认使用 Kimi）
const DEFAULT_MODEL = process.env.MODEL_NAME || 'moonshot-v1-8k';

/**
 * 调用大模型（通用方法）
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userPrompt - 用户提示词
 * @param {object} options - 可选参数
 * @returns {Promise<string>} 模型返回的文本
 */
async function callLLM(systemPrompt, userPrompt, options = {}) {
  try {
    const response = await client.chat.completions.create({
      model: options.model || DEFAULT_MODEL,  // 使用环境变量配置的模型
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options.temperature || 0.7,
      // 要求输出JSON格式
      response_format: options.jsonMode ? { type: 'json_object' } : undefined
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('❌ 大模型调用失败:', error.message);
    throw new Error(`大模型调用失败: ${error.message}`);
  }
}

/**
 * 调用大模型并解析JSON响应（使用jsonMode强制）
 * 注意：会消耗更多token，适合关键步骤
 */
async function callLLMJSONWithMode(systemPrompt, userPrompt, options = {}) {
  const content = await callLLM(systemPrompt, userPrompt, {
    ...options,
    temperature: options.temperature || 0.3,
    jsonMode: true  // 强制JSON输出
  });

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ JSON解析失败，原始内容:', content);
    throw new Error('模型返回的不是有效JSON');
  }
}

/**
 * 调用大模型并解析JSON响应
 * 适用于需要结构化输出的场景（如澄清、搜索关键词生成）
 */
async function callLLMJSON(systemPrompt, userPrompt, options = {}) {
  // 增加token限制，防止截断
  const content = await callLLM(systemPrompt, userPrompt, {
    ...options,
    temperature: options.temperature || 0.3,
    max_tokens: options.max_tokens || 2000   // 增加到2000
  });

  try {
    // 尝试提取JSON（处理可能的markdown包装）
    let jsonStr = content.trim();

    // 移除可能的markdown代码块标记
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    // 尝试找到第一个 { 和最后一个 }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('❌ JSON解析失败，原始内容:', content);
    console.error('❌ 提取后的字符串:', content.substring(0, 200));
    throw new Error('模型返回的不是有效JSON');
  }
}

/**
 * 调用大模型并解析JSON响应（使用jsonMode）
 * 注意：会消耗更多token，适合复杂场景
 */
async function callLLMJSONStrict(systemPrompt, userPrompt, options = {}) {
  const content = await callLLM(systemPrompt, userPrompt, {
    ...options,
    jsonMode: true  // 强制JSON输出
  });

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ JSON解析失败，原始内容:', content);
    throw new Error('模型返回的不是有效JSON');
  }
}

module.exports = {
  callLLM,
  callLLMJSON,
  callLLMJSONWithMode,
  callLLMJSONStrict
};
