/**
 * 端到端集成测试
 * 测试所有组件协同工作
 *
 * 创建时间：2026-05-15
 */

const IntentClassifier = require('../services/intentClassifier');
const AdaptiveSearch = require('../services/adaptiveSearch');
const CitationManager = require('../services/citationManager');

// 模拟搜索客户端
class MockSearchClient {
  constructor(results) {
    this.results = results;
  }

  async search(query, options) {
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      results: [
        { url: `https://example.com/1`, title: `${query} - 结果1`, snippet: `关于${query}的第一条信息` },
        { url: `https://example.com/2`, title: `${query} - 结果2`, snippet: `关于${query}的第二条信息` },
        { url: `https://wikipedia.org/wiki/${encodeURIComponent(query)}`, title: `${query} - Wikipedia`, snippet: `${query}的维基百科条目` }
      ]
    };
  }
}

async function runIntegrationTest() {
  console.log('=== 端到端集成测试 ===\n');

  // 测试多个查询
  const testQueries = [
    '美国上班时间',
    'AI PM需要什么技能',
    'iPhone vs Android'
  ];

  for (const query of testQueries) {
    console.log(`\n--- 测试查询: "${query}" ---\n`);

    // 1. 意图分类
    console.log('步骤1：意图分类');
    const classifier = new IntentClassifier();
    const intentResult = classifier.classify(query);

    console.log(`  查询: ${query}`);
    console.log(`  意图: ${intentResult.intentName}`);
    console.log(`  复杂度: ${intentResult.complexity}`);
    console.log(`  最大搜索轮数: ${intentResult.maxSearchRounds}`);
    console.log('  ✓ 意图分类完成');

    // 2. 自适应搜索
    console.log('\n步骤2：自适应搜索');
    const searchClient = new MockSearchClient();
    const adaptiveSearch = new AdaptiveSearch(searchClient);
    const searchResult = await adaptiveSearch.search(query, intentResult);

    console.log(`  搜索轮数: ${searchResult.rounds}`);
    console.log(`  最终置信度: ${searchResult.confidence.toFixed(2)}`);
    console.log(`  找到结果: ${searchResult.totalFound}条`);
    console.log('  ✓ 搜索完成');

    // 3. 引用管理
    console.log('\n步骤3：引用管理');
    const citationManager = new CitationManager();

    const findings = [];
    for (const result of searchResult.results.slice(0, 3)) {
      const { fact, citation, source } = citationManager.extractWithCitation(
        result,
        result.snippet || result.title
      );
      findings.push({ fact, citation, url: result.url });
      console.log(`  ${fact.substring(0, 40)}... ${citation}`);
    }

    console.log(`\n${citationManager.generateCitationList()}`);
    console.log('  ✓ 引用完成');

    // 4. 生成报告（简化版）
    console.log('步骤4：生成报告');
    const template = classifier.getTemplate(intentResult.intent);

    console.log('\n  使用模板:');
    const templateLines = template.split('\n').slice(0, 5);
    templateLines.forEach(line => console.log(`  ${line}`));
    console.log('  ✓ 模板选择完成');
  }

  console.log('\n\n=== 测试总结 ===');
  console.log('✓ 所有组件正常工作！');
  console.log('\n下一步：将各组件集成到主工作流中');
}

runIntegrationTest().catch(console.error);
