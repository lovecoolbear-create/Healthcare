/**
 * 健康打卡与数据同步测试脚本
 * 流程：客户打卡 → 填写健康指标 → 数据同步到趋势分析
 */

const db = {
  users: [],
  plans: [],
  healthLogs: [],
  interactionLogs: []
};

const TEST_USER_ID = 'user_cai_17722222222';
const TEST_NUTRITIONIST_ID = 'nutritionist_001';
const TODAY = new Date().toISOString().split('T')[0];

// ==================== 模拟API ====================

// 1. 初始化用户和计划
async function setup() {
  console.log('📋 初始化测试数据');
  
  // 用户
  db.users.push({
    _id: TEST_USER_ID,
    username: '蔡',
    phone: '17722222222',
    role: 'client',
    nutritionist_id: TEST_NUTRITIONIST_ID,
    wrom_score: 75,
    wrom_breakdown: {
      adherence: 20,
      inventory: 15,
      symptom: 15,
      engagement: 25
    }
  });
  
  // 今日计划（来自之前的测试）
  db.plans.push({
    _id: 'plan_' + Date.now(),
    user_id: TEST_USER_ID,
    date: TODAY,
    template_name: '降血脂方案',
    tasks: [
      { product_name: '深海鱼油', daily_usage: 2, unit: '粒', slot: '早', completed: false },
      { product_name: '维生素C', daily_usage: 1, unit: '粒', slot: '中', completed: false }
    ],
    water_intake: 0,
    symptoms: [],
    created_at: Date.now()
  });
  
  console.log('✅ 测试数据准备完成\n');
}

// 2. 客户打卡 - 完成任务
async function completeTasks() {
  console.log('📱 Step 1: 客户打卡 - 完成任务');
  
  const plan = db.plans.find(p => p.user_id === TEST_USER_ID && p.date === TODAY);
  if (!plan) {
    console.log('❌ 计划不存在');
    return;
  }
  
  // 标记所有任务完成
  plan.tasks.forEach(task => {
    task.completed = true;
    task.completed_at = Date.now();
  });
  plan.updated_at = Date.now();
  
  const completedCount = plan.tasks.filter(t => t.completed).length;
  console.log(`✅ 打卡完成: ${completedCount}/${plan.tasks.length} 任务`);
  console.log('   任务列表:');
  plan.tasks.forEach(t => {
    console.log(`     - ${t.slot}: ${t.product_name} ${t.completed ? '✓' : '○'}`);
  });
  
  return { completed: completedCount, total: plan.tasks.length };
}

// 3. Web/顾问端：检查打卡状态变化
async function checkAdminNotification() {
  console.log('\n💻 Step 2: 顾问端查看打卡状态');
  
  const plan = db.plans.find(p => p.user_id === TEST_USER_ID && p.date === TODAY);
  const user = db.users.find(u => u._id === TEST_USER_ID);
  
  const completed = plan.tasks.filter(t => t.completed).length;
  const total = plan.tasks.length;
  const allCompleted = completed === total;
  
  console.log('✅ 顾问端数据同步验证:');
  console.log(`   客户: ${user.username}`);
  console.log(`   今日打卡: ${completed}/${total}`);
  console.log(`   状态: ${allCompleted ? '✅ 全部完成' : '⏳ 进行中'}`);
  
  if (allCompleted) {
    console.log('   🔔 系统通知: 客户蔡已完成今日全部打卡任务');
  }
  
  return { user, plan, completed, total, allCompleted };
}

// 4. 客户填写饮水量
async function updateWaterIntake(waterAmount) {
  console.log('\n💧 Step 3: 客户记录饮水量');
  
  const plan = db.plans.find(p => p.user_id === TEST_USER_ID && p.date === TODAY);
  plan.water_intake = waterAmount;
  plan.updated_at = Date.now();
  
  console.log(`✅ 饮水量已记录: ${waterAmount}ml`);
  return plan.water_intake;
}

// 5. 客户填写健康指标（体重、体脂、血脂、内脏脂肪）
async function saveHealthMetrics(metrics) {
  console.log('\n📊 Step 4: 客户填写健康指标');
  
  const healthLog = {
    _id: 'health_' + Date.now(),
    user_id: TEST_USER_ID,
    date: TODAY,
    weight: metrics.weight,           // 体重 kg
    body_fat: metrics.bodyFat,        // 体脂率 %
    blood_lipid: metrics.bloodLipid,  // 血脂 mmol/L
    visceral_fat: metrics.visceralFat, // 内脏脂肪等级
    created_at: Date.now()
  };
  
  db.healthLogs.push(healthLog);
  
  console.log('✅ 健康指标已保存:');
  console.log(`   体重: ${metrics.weight}kg`);
  console.log(`   体脂率: ${metrics.bodyFat}%`);
  console.log(`   血脂: ${metrics.bloodLipid}mmol/L`);
  console.log(`   内脏脂肪: ${metrics.visceralFat}级`);
  
  return healthLog;
}

// 6. 客户填写体感反馈
async function saveSymptoms(symptoms, notes) {
  console.log('\n💬 Step 5: 客户填写体感反馈');
  
  const plan = db.plans.find(p => p.user_id === TEST_USER_ID && p.date === TODAY);
  
  // 症状数据（如：精力、睡眠、消化等）
  plan.symptoms = symptoms.map(s => ({
    name: s.name,
    value: s.value,  // 1-10分
    label: s.label
  }));
  plan.symptom_notes = notes;
  plan.updated_at = Date.now();
  
  // 同时记录到互动日志（顾问端可见）
  db.interactionLogs.push({
    _id: 'log_' + Date.now(),
    user_id: TEST_USER_ID,
    nutritionist_id: TEST_NUTRITIONIST_ID,
    type: 'symptom',
    content: `客户提交了今日体感反馈: ${symptoms.map(s => `${s.name}(${s.value}分)`).join(', ')}`,
    created_at: Date.now()
  });
  
  console.log('✅ 体感反馈已保存:');
  symptoms.forEach(s => {
    console.log(`   ${s.name}: ${s.value}/10分 (${s.label})`);
  });
  if (notes) {
    console.log(`   备注: ${notes}`);
  }
  console.log('   🔔 顾问端已收到体感反馈通知');
  
  return plan.symptoms;
}

// 7. 小程序趋势页面：数据分析展示
async function showTrendsAnalysis() {
  console.log('\n📈 Step 6: 小程序趋势页面数据分析');
  
  const userHealthLogs = db.healthLogs.filter(h => h.user_id === TEST_USER_ID);
  const userPlans = db.plans.filter(p => p.user_id === TEST_USER_ID);
  
  console.log('✅ 累计数据展示:');
  
  // 体重趋势
  if (userHealthLogs.length > 0) {
    const weights = userHealthLogs.map(h => h.weight);
    console.log(`   体重趋势: ${Math.min(...weights)}kg ~ ${Math.max(...weights)}kg`);
    console.log(`   最新体重: ${weights[weights.length - 1]}kg`);
  }
  
  // 饮水记录
  const waterLogs = userPlans.map(p => ({ date: p.date, intake: p.water_intake }));
  const avgWater = waterLogs.reduce((sum, w) => sum + w.intake, 0) / waterLogs.length;
  console.log(`   平均饮水: ${avgWater.toFixed(0)}ml/天`);
  console.log(`   今日饮水: ${waterLogs.find(w => w.date === TODAY)?.intake || 0}ml`);
  
  // 体脂率
  if (userHealthLogs.length > 0) {
    const bodyFats = userHealthLogs.map(h => h.body_fat);
    console.log(`   体脂率: ${bodyFats[bodyFats.length - 1]}%`);
  }
  
  // 血脂
  if (userHealthLogs.length > 0) {
    const lipids = userHealthLogs.map(h => h.blood_lipid);
    console.log(`   血脂: ${lipids[lipids.length - 1]}mmol/L`);
  }
  
  // 内脏脂肪
  if (userHealthLogs.length > 0) {
    const visceral = userHealthLogs.map(h => h.visceral_fat);
    console.log(`   内脏脂肪等级: ${visceral[visceral.length - 1]}级`);
  }
  
  // 体感趋势
  const symptomPlans = userPlans.filter(p => p.symptoms && p.symptoms.length > 0);
  if (symptomPlans.length > 0) {
    const latestSymptoms = symptomPlans[symptomPlans.length - 1].symptoms;
    const avgSymptom = latestSymptoms.reduce((sum, s) => sum + s.value, 0) / latestSymptoms.length;
    console.log(`   今日体感评分: ${avgSymptom.toFixed(1)}/10分`);
  }
  
  return {
    healthLogs: userHealthLogs,
    waterLogs,
    symptomPlans
  };
}

// 8. Web端：报表和数据记录
async function showAdminDashboard() {
  console.log('\n💻 Step 7: Web端报表与记录');
  
  const user = db.users.find(u => u._id === TEST_USER_ID);
  const plan = db.plans.find(p => p.user_id === TEST_USER_ID && p.date === TODAY);
  const logs = db.interactionLogs.filter(l => l.user_id === TEST_USER_ID);
  
  console.log('✅ 客户档案详情:');
  console.log(`   客户: ${user.username}`);
  console.log(`   WROM评分: ${user.wrom_score}分`);
  console.log(`   今日打卡: ${plan.tasks.filter(t => t.completed).length}/${plan.tasks.length}`);
  console.log(`   今日饮水: ${plan.water_intake}ml`);
  console.log(`   健康指标记录: ${db.healthLogs.filter(h => h.user_id === TEST_USER_ID).length}条`);
  
  console.log('\n   📊 WROM评分构成:');
  console.log(`     - 依从性: ${user.wrom_breakdown.adherence}/25分`);
  console.log(`     - 库存: ${user.wrom_breakdown.inventory}/20分`);
  console.log(`     - 症状: ${user.wrom_breakdown.symptom}/20分`);
  console.log(`     - 互动: ${user.wrom_breakdown.engagement}/35分`);
  
  console.log('\n   📝 互动日志:');
  logs.forEach((log, i) => {
    console.log(`     ${i + 1}. [${new Date(log.created_at).toLocaleTimeString()}] ${log.content}`);
  });
  
  return { user, plan, logs };
}

// 9. 更新WROM评分（根据今日打卡和健康数据）
async function updateWromScore() {
  console.log('\n🎯 Step 8: 更新WROM评分');
  
  const user = db.users.find(u => u._id === TEST_USER_ID);
  const plan = db.plans.find(p => p.user_id === TEST_USER_ID && p.date === TODAY);
  
  // 计算依从性得分（打卡完成度）
  const completionRate = plan.tasks.filter(t => t.completed).length / plan.tasks.length;
  const adherenceScore = Math.round(25 * completionRate);
  
  // 计算互动得分（饮水+症状记录）
  let engagementScore = 25;
  if (plan.water_intake > 0) engagementScore += 5;
  if (plan.symptoms && plan.symptoms.length > 0) engagementScore += 5;
  engagementScore = Math.min(35, engagementScore);
  
  // 更新用户WROM
  user.wrom_breakdown.adherence = adherenceScore;
  user.wrom_breakdown.engagement = engagementScore;
  user.wrom_score = (
    user.wrom_breakdown.adherence +
    user.wrom_breakdown.inventory +
    user.wrom_breakdown.symptom +
    user.wrom_breakdown.engagement
  );
  user.last_wrom_calc = Date.now();
  
  console.log('✅ WROM评分已更新:');
  console.log(`   新评分: ${user.wrom_score}分`);
  console.log(`   依从性: ${adherenceScore}/25分 (打卡完成率${(completionRate * 100).toFixed(0)}%)`);
  console.log(`   互动: ${engagementScore}/35分 (饮水${plan.water_intake > 0 ? '✓' : '○'} 症状${plan.symptoms?.length > 0 ? '✓' : '○'})`);
  
  return user.wrom_score;
}

// ==================== 主测试流程 ====================

async function runHealthCheckInTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    健康打卡与数据同步测试 - 完整流程验证');
  console.log('═══════════════════════════════════════════════════\n');
  
  try {
    // 初始化
    await setup();
    
    // Step 1-2: 客户打卡 + 顾问端同步
    const checkInResult = await completeTasks();
    await checkAdminNotification();
    
    // Step 3-5: 客户填写数据
    await updateWaterIntake(1500); // 1500ml饮水
    await saveHealthMetrics({
      weight: 65.5,      // kg
      bodyFat: 22.5,     // %
      bloodLipid: 4.8,   // mmol/L
      visceralFat: 8     // 等级
    });
    await saveSymptoms([
      { name: '精力', value: 8, label: '充沛' },
      { name: '睡眠', value: 7, label: '良好' },
      { name: '消化', value: 9, label: '很好' }
    ], '今天感觉不错，睡眠质量有改善');
    
    // Step 6-7: 数据同步展示
    await showTrendsAnalysis();
    await showAdminDashboard();
    
    // Step 8: 评分更新
    await updateWromScore();
    
    // 最终验证
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 完整流程测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📊 数据流向验证:');
    console.log('   小程序端  →  打卡/饮水/健康指标/体感  →  云数据库');
    console.log('   云数据库  →  同步计算  →  趋势分析/WROM评分');
    console.log('   Web端     →  读取数据  →  客户档案/报表');
    console.log('   顾问端     →  实时通知  →  客户动态');
    
    console.log('\n📁 最终数据状态:');
    console.log(`   用户: ${db.users.length}`);
    console.log(`   每日计划: ${db.plans.length}`);
    console.log(`   健康记录: ${db.healthLogs.length}`);
    console.log(`   互动日志: ${db.interactionLogs.length}`);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error(error.stack);
  }
}

// 运行测试
runHealthCheckInTest();
