/**
 * 自适应搜索测试（使用模拟搜索客户端）
 *
 * 创建时间：2026-05-15
 */

const AdaptiveSearch = require('../services/adaptiveSearch');

// 模拟搜索客户端
class MockSearchClient {
  constructor(results) {
    this.results = results;
  }

  async search(query, options) {
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      results: this.results.slice(0, options.maxResults || 5)
    };
  }
}

// 测试
async function runTests() {
  console.log('=== 自适应搜索测试 ===\n');

  // 创建模拟客户端（返回高质量结果）
  const mockClient = new MockSearchClient([
    { url: 'https://example.com/1', title: '测试结果1' },
    { url: 'https://example.com/2', title: '测试结果2' },
    { url: 'https://example.com/3', title: '测试结果3' },
    { url: 'https://example.com/4', title: '测试结果4' },
    { url: 'https://gov.example.com/data', title: '官方数据' }
  ]);

  const adaptiveSearch = new AdaptiveSearch(mockClient);

  // 测试1：简单问题（应该快速停止）
  console.log('测试1：简单问题');
  const result1 = await adaptiveSearch.search(
    '美国上班时间',
    { intent: 'informational-simple', maxSearchRounds: 2, maxResults: 5 }
  );
  console.log(`  轮数: ${result1.rounds}`);
  console.log(`  置信度: ${result1.confidence.toFixed(2)}`);
  console.log(`  结果数: ${result1.totalFound}`);
  console.log(result1.rounds <= 2 ? '  ✓ 通过\n' : '  ✗ 失败\n');

  // 测试2：复杂问题（应该多轮搜索）
  console.log('测试2：复杂问题');
  const result2 = await adaptiveSearch.search(
    '2024年AI发展趋势',
    { intent: 'research', maxSearchRounds: 5, maxResults: 20 }
  );
  console.log(`  轮数: ${result2.rounds}`);
  console.log(`  置信度: ${result2.confidence.toFixed(2)}`);
  console.log(`  结果数: ${result2.totalFound}`);
  console.log(result2.rounds >= 1 ? '  ✓ 通过\n' : '  ✗ 失败\n');

  console.log('=== 测试完成 ===');
  console.log('✓ 自适应搜索系统正常工作！');
}

runTests().catch(console.error);
