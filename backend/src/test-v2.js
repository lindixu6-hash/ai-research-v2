/**
 * 优化版工作流测试
 *
 * 运行方式: cd backend && node src/test-v2.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { executeWorkflow, getHistory, getStats } = require('./services/workflowServiceV2');

// 测试查询
const testQueries = [
  '美国上班时间',           // 简单信息型
  'AI PM需要什么技能',      // 复杂信息型
  'iPhone vs Android'      // 商业调研型
];

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  优化版工作流测试');
  console.log('='.repeat(60) + '\n');

  for (const query of testQueries) {
    console.log(`\n🔍 测试查询: "${query}"`);
    console.log('-'.repeat(60));

    try {
      const result = await executeWorkflow(query);

      console.log(`\n结果:`);
      console.log(`  状态: ${result.status}`);
      console.log(`  意图: ${result.intent}`);
      console.log(`  置信度: ${result.confidence?.toFixed(2) || 'N/A'}`);
      console.log(`  质量分: ${result.quality?.score || 'N/A'}/100`);
      console.log(`  耗时: ${result.workflow.duration}ms`);
      console.log(`  来自缓存: ${result.fromCache ? '是' : '否'}`);

      console.log(`\n报告预览:`);
      console.log(result.report.substring(0, 300) + '...');

    } catch (error) {
      console.error(`❌ 测试失败: ${error.message}`);
    }

    // 等待一下，避免API限流
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 测试历史和统计
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('  历史和统计');
  console.log('='.repeat(60));

  const history = getHistory(5);
  console.log(`\n对话历史 (最近5条):`);
  for (const h of history) {
    console.log(`  - ${h.query} (${h.intent})`);
  }

  const stats = getStats();
  console.log(`\n统计信息:`);
  console.log(`  记忆功能: ${stats.memoryEnabled ? '启用' : '禁用'}`);
  console.log(`  用户画像: ${stats.profileEnabled ? '启用' : '禁用'}`);
  if (stats.historyStats) {
    console.log(`  历史记录: ${stats.historyStats.total}条`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// 运行测试
runTests().catch(console.error);
