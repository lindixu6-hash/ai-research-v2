/**
 * 意图分类器测试
 *
 * 创建时间：2026-05-15
 */

const IntentClassifier = require('../services/intentClassifier');

// 创建实例
const classifier = new IntentClassifier();

// 测试用例
const testCases = [
  { query: '美国上班时间', expected: 'informational-simple' },
  { query: 'AI PM需要什么技能', expected: 'informational-complex' },
  { query: '打开华为官网', expected: 'navigational' },
  { query: '买iPhone 16', expected: 'transactional' },
  { query: 'iPhone vs Android', expected: 'commercial' },
  { query: '写求职信', expected: 'generative' },
  { query: '分析2024年AI发展趋势', expected: 'research' },
  { query: '什么是AI PM？需要什么技能？薪资多少？', expected: 'multi-part' }
];

console.log('=== 意图分类测试 ===\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = classifier.classify(test.query);
  const status = result.intent === test.expected ? '✓' : '✗';

  if (result.intent === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} "${test.query}"`);
  console.log(`  预期: ${test.expected}`);
  console.log(`  实际: ${result.intent} (${result.intentName})`);
  console.log(`  置信度: ${result.confidence}`);
  console.log(`  复杂度: ${result.complexity}`);
  console.log(`  最大搜索轮数: ${result.maxSearchRounds}`);
  console.log();
}

console.log('=== 测试结果 ===');
console.log(`通过: ${passed}/${testCases.length}`);
console.log(`失败: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n✓ 所有测试通过！');
  process.exit(0);
} else {
  console.log('\n✗ 有测试失败，请检查');
  process.exit(1);
}
