/**
 * AI 搜索引擎 - 快速开始示例
 *
 * 这个文件展示了如何使用新的优化组件
 */

const IntentClassifier = require('../services/intentClassifier');
const AdaptiveSearch = require('../services/adaptiveSearch');
const CitationManager = require('../services/citationManager');

// ========== 示例 1：基本使用 ==========

async function example1_Basic() {
  console.log('=== 示例 1：基本使用 ===\n');

  // 创建意图分类器
  const classifier = new IntentClassifier();

  // 分类查询
  const query = '美国上班时间';
  const intent = classifier.classify(query);

  console.log('查询:', query);
  console.log('意图:', intent.intentName);
  console.log('复杂度:', intent.complexity);
  console.log('最大搜索轮数:', intent.maxSearchRounds);
  console.log('预期回答长度:', intent.expectedLength);
  console.log();

  // 获取对应模板
  const template = classifier.getTemplate(intent.intent);
  console.log('使用模板:');
  console.log(template.split('\n').slice(0, 5).join('\n'));
}

// ========== 示例 2：意图分类 ==========

async function example2_Classification() {
  console.log('\n\n=== 示例 2：意图分类 ===\n');

  const classifier = new IntentClassifier();

  const queries = [
    '美国上班时间',
    'AI PM需要什么技能',
    '打开华为官网',
    'iPhone vs Android',
    '分析2024年AI发展趋势'
  ];

  for (const query of queries) {
    const intent = classifier.classify(query);
    console.log(`"${query}"`);
    console.log(`  → ${intent.intentName} (${intent.complexity})`);
    console.log(`  → 搜索轮数: ${intent.maxSearchRounds}, 结果数: ${intent.maxResults}`);
  }
}

// ========== 示例 3：引用管理 ==========

async function example3_Citations() {
  console.log('\n\n=== 示例 3：引用管理 ===\n');

  const citationManager = new CitationManager();

  // 模拟搜索结果
  const results = [
    { url: 'https://wikipedia.org/wiki/Working_hours', title: 'Working hours - Wikipedia', snippet: 'Standard working hours are 9am to 5pm' },
    { url: 'https://openai.com/blog', title: 'OpenAI Blog', snippet: 'AI is changing the world' },
    { url: 'https://github.com/openai/chatgpt', title: 'ChatGPT', snippet: 'ChatGPT is a large language model' }
  ];

  // 提取并添加引用
  for (const result of results) {
    const { fact, citation, source } = citationManager.extractWithCitation(result, result.snippet);
    console.log(`${fact} ${citation} (${source})`);
  }

  // 生成引用列表
  console.log(citationManager.generateCitationList());
}

// ========== 示例 4：完整工作流 ==========

async function example4_Complete() {
  console.log('\n\n=== 示例 4：完整工作流（模拟） ===\n');

  // 模拟搜索客户端
  class MockSearchClient {
    async search(query, options) {
      return {
        results: [
          { url: 'https://example.com/1', title: `${query} - Result 1`, snippet: `First result for ${query}` },
          { url: 'https://wikipedia.org', title: `${query} - Wikipedia`, snippet: `Wikipedia entry for ${query}` }
        ]
      };
    }
  }

  const query = '什么是人工智能？';

  // 1. 意图分类
  const classifier = new IntentClassifier();
  const intent = classifier.classify(query);
  console.log('1. 意图分类:', intent.intentName);

  // 2. 自适应搜索
  const searchClient = new MockSearchClient();
  const adaptiveSearch = new AdaptiveSearch(searchClient);
  const searchResults = await adaptiveSearch.search(query, intent);
  console.log('2. 搜索完成:', searchResults.rounds, '轮,', searchResults.totalFound, '条结果');

  // 3. 引用管理
  const citationManager = new CitationManager();
  const findings = searchResults.results.map(r => {
    const { fact, citation } = citationManager.extractWithCitation(r, r.snippet);
    return { text: fact, citation };
  });
  console.log('3. 引用添加:', citationManager.getCount(), '个');

  // 4. 生成报告
  const template = classifier.getTemplate(intent.intent);
  console.log('\n4. 报告模板:');
  console.log(template.split('\n').slice(0, 8).join('\n'));

  console.log('\n5. 引用列表:');
  console.log(citationManager.generateCitationList());
}

// ========== 运行所有示例 ==========

async function runAllExamples() {
  await example1_Basic();
  await example2_Classification();
  await example3_Citations();
  await example4_Complete();

  console.log('\n\n=== 所有示例运行完成 ===');
}

// 运行
runAllExamples().catch(console.error);
