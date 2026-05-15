#!/bin/bash
# 运行所有测试

echo "========================================="
echo "  AI 搜索项目 - 全部测试"
echo "========================================="
echo ""

PROJECT_DIR="/Users/xulindi/Desktop/ai-search-project"

# 测试计数器
TOTAL=0
PASSED=0
FAILED=0

# 运行测试函数
run_test() {
  local name=$1
  local file=$2

  TOTAL=$((TOTAL + 1))
  echo "运行测试: $name"

  if node "$file" > /dev/null 2>&1; then
    echo "  ✓ 通过"
    PASSED=$((PASSED + 1))
  else
    echo "  ✗ 失败"
    FAILED=$((FAILED + 1))
  fi
  echo ""
}

# 运行所有测试
run_test "意图分类器" "$PROJECT_DIR/tests/intentClassifier.test.js"
run_test "自适应搜索" "$PROJECT_DIR/tests/adaptiveSearch.test.js"
run_test "引用管理器" "$PROJECT_DIR/tests/citationManager.test.js"
run_test "集成测试" "$PROJECT_DIR/tests/integration.test.js"

# 总结
echo "========================================="
echo "  测试总结"
echo "========================================="
echo "总计: $TOTAL"
echo "通过: $PASSED"
echo "失败: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✓ 所有测试通过！"
  exit 0
else
  echo "✗ 有测试失败"
  exit 1
fi
