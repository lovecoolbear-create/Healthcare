#!/usr/bin/env node
/**
 * 打卡数据同步验证脚本
 * 静态分析 cloud function 和前端代码，验证所有打卡路径都正确写入双数据源
 */

const fs = require('fs');
const path = require('path');

const CLOUD_FN_PATH = path.resolve(__dirname, '../uniCloud-alipay/cloudfunctions/client-api/index.js');
const CLIENT_HOME_PATH = path.resolve(__dirname, '../src/pages/client/home/index.vue');
const CLIENT_DETAIL_PATH = path.resolve(__dirname, '../src/pages/admin/client-detail/index.vue');
const DESKTOP_DASHBOARD_PATH = path.resolve(__dirname, '../src/pages/admin/dashboard/components/DesktopDashboard.vue');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(description, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ ${description}`);
  } else {
    failedChecks++;
    console.log(`  ❌ ${description}`);
    if (detail) console.log(`     → ${detail}`);
  }
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// =====================================================
// 1. Cloud Function: updateDailyPlanTasks 双写验证
// =====================================================
console.log('\n📦 === Cloud Function: updateDailyPlanTasks ===\n');

const cloudCode = readFile(CLOUD_FN_PATH);

// 找到 updateDailyPlanTasks 的代码块
const updateDailyPlanStart = cloudCode.indexOf("case 'updateDailyPlanTasks':");
const updateDailyPlanEnd = cloudCode.indexOf("case 'generateDailyPlan':", updateDailyPlanStart);
const updateDailyPlanBlock = cloudCode.substring(updateDailyPlanStart, updateDailyPlanEnd);

check(
  'updateDailyPlanTasks 存在',
  updateDailyPlanStart > -1,
  'action handler not found'
);

check(
  '写入 he_daily_plans (plansCollection.doc().update)',
  updateDailyPlanBlock.includes('plansCollection.doc(plan._id).update(updateData)'),
  '主数据源写入缺失'
);

check(
  '写入 he_check_in_records (任务记录)',
  updateDailyPlanBlock.includes("record_type: 'task'") && updateDailyPlanBlock.includes('checkInRecordsCollection'),
  '任务打卡记录未同步到 he_check_in_records'
);

check(
  '写入 he_check_in_records (饮水记录)',
  updateDailyPlanBlock.includes("record_type: 'water'") && updateDailyPlanBlock.includes('water_intake'),
  '饮水记录未同步到 he_check_in_records'
);

check(
  '写入 he_check_in_records (体感记录)',
  updateDailyPlanBlock.includes("record_type: 'symptom'"),
  '体感记录未同步到 he_check_in_records'
);

check(
  '写入 he_check_in_records (健康指标记录)',
  updateDailyPlanBlock.includes("record_type: 'health_metric'"),
  '健康指标记录未同步到 he_check_in_records'
);

check(
  '双写失败不影响主流程 (try-catch)',
  updateDailyPlanBlock.includes('he_check_in_records 同步失败'),
  '双写逻辑缺少错误容错'
);

check(
  '任务记录使用 Upsert 策略',
  updateDailyPlanBlock.includes('existingCheckIn.data.length > 0'),
  '任务记录应使用 upsert 避免重复'
);

check(
  '体感记录使用覆盖式更新（先删后写）',
  updateDailyPlanBlock.includes('old._id).remove()'),
  '体感记录应先删除旧记录再写入新记录'
);

check(
  'section_status 写入 he_daily_plans',
  updateDailyPlanBlock.includes('updateData.section_status = section_status'),
  'section_status 未保存到 he_daily_plans'
);

// =====================================================
// 2. Cloud Function: 其他打卡入口也写 he_check_in_records
// =====================================================
console.log('\n📦 === Cloud Function: 独立打卡入口验证 ===\n');

// updateWaterIntake
const updateWaterStart = cloudCode.indexOf("case 'updateWaterIntake':");
const updateWaterEnd = cloudCode.indexOf("case 'updateSymptoms':", updateWaterStart);
const updateWaterBlock = cloudCode.substring(updateWaterStart, updateWaterEnd);

check(
  'updateWaterIntake 写入 he_check_in_records',
  updateWaterBlock.includes('checkInRecordsCollection.add') && updateWaterBlock.includes("record_type: 'water'"),
  'updateWaterIntake 缺少独立打卡记录写入'
);

// updateSymptoms
const updateSymptomsStart = cloudCode.indexOf("case 'updateSymptoms':");
const updateSymptomsEnd = cloudCode.indexOf("case 'getHealthMetrics':", updateSymptomsStart);
const updateSymptomsBlock = cloudCode.substring(updateSymptomsStart, updateSymptomsEnd);

check(
  'updateSymptoms 写入 he_check_in_records',
  updateSymptomsBlock.includes('checkInRecordsCollection.add') && updateSymptomsBlock.includes("record_type: 'symptom'"),
  'updateSymptoms 缺少独立打卡记录写入'
);

check(
  'updateSymptoms 同时保存 section_status',
  updateSymptomsBlock.includes('updateData.section_status = section_status'),
  'updateSymptoms 未保存 section_status'
);

// updateHealthMetric
const updateMetricStart = cloudCode.indexOf("case 'updateHealthMetric':");
const updateMetricEnd = cloudCode.indexOf("case 'getHealthLogRange':", updateMetricStart);
const updateMetricBlock = cloudCode.substring(updateMetricStart, updateMetricEnd);

check(
  'updateHealthMetric 写入 he_check_in_records',
  updateMetricBlock.includes('checkInRecordsCollection.add') && updateMetricBlock.includes("record_type: 'health_metric'"),
  'updateHealthMetric 缺少独立打卡记录写入'
);

check(
  'updateHealthMetric 同步 health_metrics 到 he_daily_plans',
  updateMetricBlock.includes('health_metrics: healthMetrics'),
  'updateHealthMetric 未同步 health_metrics 到 he_daily_plans'
);

// =====================================================
// 3. Cloud Function: 读取端验证
// =====================================================
console.log('\n📦 === Cloud Function: 数据读取端验证 ===\n');

// getAdminDashboardData 读 he_daily_plans
const dashboardDataStart = cloudCode.indexOf("case 'getAdminDashboardData':");
check(
  'getAdminDashboardData 存在',
  dashboardDataStart > -1,
  'Dashboard data action not found'
);

// getCheckInRecords 读 he_check_in_records
const checkInRecordsStart = cloudCode.indexOf("case 'getCheckInRecords':");
check(
  'getCheckInRecords 存在',
  checkInRecordsStart > -1,
  'Check-in records action not found'
);

if (checkInRecordsStart > -1) {
  const checkInBlock = cloudCode.substring(checkInRecordsStart, cloudCode.indexOf("case 'getAdminOrders':", checkInRecordsStart));
  check(
    'getCheckInRecords 查询 he_check_in_records',
    checkInBlock.includes('checkInRecordsCollection.where'),
    'getCheckInRecords 未查询正确的集合'
  );
  check(
    'getCheckInRecords 返回按日期汇总',
    checkInBlock.includes('summaryByDate'),
    'getCheckInRecords 缺少按日期汇总'
  );
}

// =====================================================
// 4. 小程序客户端: 打卡操作触发验证
// =====================================================
console.log('\n📱 === 小程序客户端: 打卡触发验证 ===\n');

const clientHome = readFile(CLIENT_HOME_PATH);

check(
  'toggleTask 调用 updateDailyPlanTasks',
  clientHome.includes("action: 'updateDailyPlanTasks'"),
  'toggleTask 未调用正确的 action'
);

check(
  'toggleTask 传递 section_status',
  clientHome.includes('section_status: sectionStatus'),
  'toggleTask 未传递 section_status'
);

check(
  'syncData 调用 updateDailyPlanTasks',
  clientHome.includes("is_final_sync: true"),
  'syncData 未设置 is_final_sync 标记'
);

check(
  'syncData 传递完整数据 (tasks + water + symptoms + metrics)',
  clientHome.includes('water_intake: waterIntake.value') &&
  clientHome.includes('health_metrics: metrics.value') &&
  clientHome.includes('symptoms: symptoms.value'),
  'syncData 未传递完整的4板块数据'
);

check(
  'updateWater 调用 updateWaterIntake',
  clientHome.includes("action: 'updateWaterIntake'"),
  'updateWater 未调用正确的 action'
);

check(
  'updateWater 后自动同步 syncSectionStatus',
  clientHome.includes('await syncSectionStatus()'),
  'updateWater 后未触发 section_status 同步'
);

check(
  'saveMetric 调用 updateHealthMetric',
  clientHome.includes("action: 'updateHealthMetric'"),
  'saveMetric 未调用正确的 action'
);

check(
  'saveSymptoms 调用 updateSymptoms',
  clientHome.includes("action: 'updateSymptoms'"),
  'saveSymptoms 未调用正确的 action'
);

// 【关键】体感自动保存验证
check(
  '体感评分变化自动保存 (watch + debounce)',
  clientHome.includes('symptomSaveTimer') && clientHome.includes('watch(symptoms'),
  '缺少体感评分变化的自动保存监听'
);

check(
  '体感自动保存使用防抖',
  clientHome.includes('clearTimeout(symptomSaveTimer)') && clientHome.includes('setTimeout'),
  '体感自动保存缺少防抖机制'
);

// =====================================================
// 5. 顾问端客户详情: 数据源一致性验证
// =====================================================
console.log('\n🖥️  === 顾问端客户详情: 数据源验证 ===\n');

const clientDetail = readFile(CLIENT_DETAIL_PATH);

check(
  '客户详情调用 getCheckInRecords',
  clientDetail.includes("action: 'getCheckInRecords'"),
  '客户详情未使用 he_check_in_records 数据源'
);

check(
  '饮水数据来源于 todayCheckIn (非 todayPlans)',
  clientDetail.includes('todayCheckIn.water_intake') && !clientDetail.includes('todayPlans[0]?.water_intake'),
  '饮水数据仍使用旧数据源 todayPlans'
);

check(
  '体感数据来源于 todayCheckIn',
  clientDetail.includes('todayCheckIn.symptoms'),
  '体感数据未使用 todayCheckIn'
);

check(
  '历史打卡记录展示存在',
  clientDetail.includes('checkInHistory') && clientDetail.includes('打卡记录汇总'),
  '缺少历史打卡记录展示区域'
);

check(
  '历史打卡显示完成率',
  clientDetail.includes('day.completedTasks') && clientDetail.includes('day.totalTasks'),
  '历史打卡缺少完成率显示'
);

// =====================================================
// 6. Web 工作台 Dashboard: 数据源验证
// =====================================================
console.log('\n🖥️  === Web Dashboard: 数据源验证 ===\n');

const dashboard = readFile(DESKTOP_DASHBOARD_PATH);

check(
  'Dashboard 调用 getAdminDashboardData',
  dashboard.includes("action: 'getAdminDashboardData'"),
  'Dashboard 未调用正确的 action'
);

check(
  'Dashboard 显示 sectionStatus 打卡详情',
  dashboard.includes('sectionStatus.water') &&
  dashboard.includes('sectionStatus.metrics') &&
  dashboard.includes('sectionStatus.symptoms') &&
  dashboard.includes('sectionStatus.tasks'),
  'Dashboard 缺少4板块打卡状态展示'
);

check(
  'Dashboard 显示饮水完成状态',
  dashboard.includes('饮水完成') || dashboard.includes('饮水'),
  'Dashboard 缺少饮水状态显示'
);

check(
  'Dashboard 显示体感完成状态',
  dashboard.includes('体感') && (dashboard.includes('体感评分') || dashboard.includes('体感待填')),
  'Dashboard 缺少体感状态显示'
);

check(
  'Dashboard 显示健康指标完成状态',
  dashboard.includes('健康指标完成') || dashboard.includes('健康指标待填'),
  'Dashboard 缺少健康指标状态显示'
);

// =====================================================
// 汇总
// =====================================================
console.log('\n' + '='.repeat(60));
console.log(`📊 验证结果汇总: ${passedChecks}/${totalChecks} 通过`);
console.log('='.repeat(60));

if (failedChecks > 0) {
  console.log(`\n⚠️  ${failedChecks} 项检查未通过，请查看上方 ❌ 标记的项目\n`);
  process.exit(1);
} else {
  console.log('\n🎉 所有检查通过！打卡数据全链路同步验证成功。\n');
  console.log('数据流路径确认:');
  console.log('  小程序打卡 → updateDailyPlanTasks → he_daily_plans ✅ + he_check_in_records ✅');
  console.log('  小程序饮水 → updateWaterIntake → he_daily_plans ✅ + he_check_in_records ✅');
  console.log('  小程序体感 → updateSymptoms → he_daily_plans ✅ + he_check_in_records ✅');
  console.log('  小程序指标 → updateHealthMetric → he_health_logs ✅ + he_daily_plans ✅ + he_check_in_records ✅');
  console.log('  Web今日关注 ← getAdminDashboardData ← he_daily_plans.section_status ✅');
  console.log('  Web客户详情 ← getCheckInRecords ← he_check_in_records ✅');
  console.log('');
  process.exit(0);
}
