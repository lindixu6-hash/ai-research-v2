/**
 * 引用管理器测试
 *
 * 创建时间：2026-05-15
 */

const CitationManager = require('../services/citationManager');

const manager = new CitationManager();

console.log('=== 引用管理器测试 ===\n');

// 模拟搜索结果
const mockResults = [
  { url: 'https://openai.com/blog/chatgpt', title: 'Introducing ChatGPT' },
  { url: 'https://blog.google/technology/ai/', title: 'Google AI Updates' },
  { url: 'https://wikipedia.org/wiki/Artificial_intelligence', title: 'Artificial Intelligence' },
  { url: 'https://github.com/openai/chatgpt', title: 'ChatGPT Repository' },
  { url: 'https://arxiv.org/abs/2301.00001', title: 'LLM Paper' }
];

// 测试提取和引用
console.log('测试1：提取信息并添加引用');
for (const result of mockResults) {
  const { fact, citation, source } = manager.extractWithCitation(result, '这是一个测试事实');
  console.log(`  ${fact} ${citation} (${source})`);
}

console.log(`\n引用数量: ${manager.getCount()}`);

// 测试生成引用列表
console.log('\n测试2：生成引用列表');
console.log(manager.generateCitationList());

// 测试重置
manager.reset();
console.log(`\n测试3：重置后引用数量: ${manager.getCount()}`);

console.log('\n✓ 所有测试完成！');
