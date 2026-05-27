#!/bin/bash
# 配方全生命周期测试运行脚本

echo "==============================================="
echo "配方全生命周期 Playwright 测试"
echo "==============================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 Node.js 版本
echo "检查 Node.js 版本..."
node -v || exit 1

# 检查 Playwright 是否安装
echo ""
echo "检查 Playwright..."
if ! npx playwright --version &> /dev/null; then
    echo "Playwright 未安装，正在安装..."
    npm install -D @playwright/test
    npx playwright install chromium
fi

# 运行测试
echo ""
echo "==============================================="
echo "开始运行配方全生命周期测试"
echo "==============================================="
echo ""
echo "测试阶段:"
echo "  1. 营养师创建新配方模板"
echo "  2. 编辑已有配方"
echo "  3. 同步配方到云端"
echo "  4. 验证方案已分配给客户"
echo "  5. 停止客户方案"
echo "  6. 恢复已停止的方案"
echo "  7. 停止并删除方案"
echo "  8. 验证客户端同步（小程序端）"
echo "  9. 停止后客户端验证任务消失"
echo ""
echo "==============================================="
echo ""

# 运行测试
npx playwright test tests/protocol-lifecycle.spec.ts --project=chromium --reporter=list "$@"

TEST_EXIT_CODE=$?

echo ""
echo "==============================================="
echo "测试完成"
echo "==============================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 所有测试通过!"
else
    echo "❌ 部分测试失败，退出码: $TEST_EXIT_CODE"
    echo ""
    echo "调试建议:"
    echo "  1. 确保本地开发服务器运行在 http://localhost:3000"
    echo "  2. 使用 --headed 参数查看浏览器界面:"
    echo "     bash run-protocol-tests.sh --headed"
    echo "  3. 只运行特定阶段:"
    echo "     npx playwright test tests/protocol-lifecycle.spec.ts -g 'Phase 5'"
fi

exit $TEST_EXIT_CODE
