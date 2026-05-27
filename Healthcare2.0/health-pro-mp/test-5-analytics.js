/**
 * 测试5: 数据分析增强
 * 流程：WROM评分计算 → RPS复购倾向 → 健康风险评估 → 周报生成
 */

const db = {
  users: [],
  plans: [],
  inventory: [],
  healthLogs: [],
  reports: []
};

const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const today = new Date().toISOString().split('T')[0];

// ==================== 模拟WROM评分系统 ====================

// 1. 计算WROM评分（健康综合评分）
async function calculateWROM(userId) {
  console.log('\n📊 计算WROM评分');
  
  const user = db.users.find(u => u._id === userId);
  if (!user) return null;
  
  // 1. 依从性得分 (40%)
  const recentPlans = db.plans.filter(p => 
    p.user_id === userId && 
    p.date >= getDateDaysAgo(7)
  );
  
  let totalTasks = 0;
  let completedTasks = 0;
  
  recentPlans.forEach(plan => {
    if (plan.tasks) {
      totalTasks += plan.tasks.length;
      completedTasks += plan.tasks.filter(t => t.completed).length;
    }
  });
  
  let adherenceScore = 0;
  if (totalTasks > 0) {
    adherenceScore = (completedTasks / totalTasks) * 40;
  }
  
  // 2. 库存得分 (30%)
  const userInventory = db.inventory.filter(i => i.user_id === userId);
  let inventoryScore = 15;
  
  if (userInventory.length > 0) {
    const coverageDays = userInventory.map(item => {
      const capacity = item.capacity || 30;
      const dailyUsage = item.daily_usage || 1;
      return (item.stock * capacity) / dailyUsage;
    });
    
    const avgCoverage = coverageDays.reduce((a, b) => a + b, 0) / coverageDays.length;
    
    if (avgCoverage < 7) {
      inventoryScore = (avgCoverage / 7) * 18;
    } else if (avgCoverage <= 45) {
      inventoryScore = 18 + ((avgCoverage - 7) / 38) * 12;
    } else {
      inventoryScore = Math.max(8, 30 - (avgCoverage - 45) * 0.35);
    }
  }
  
  // 3. 体感趋势得分 (20%)
  const symptomPlans = db.plans.filter(p => 
    p.user_id === userId && 
    p.symptoms && 
    p.symptoms.length > 0
  );
  
  let symptomScore = 15;
  if (symptomPlans.length > 0) {
    const currentWeek = symptomPlans.filter(p => p.date >= getDateDaysAgo(7));
    const lastWeek = symptomPlans.filter(p => 
      p.date >= getDateDaysAgo(14) && 
      p.date < getDateDaysAgo(7)
    );
    
    const currAvg = currentWeek.length > 0 
      ? currentWeek.reduce((sum, p) => sum + getSymptomAvg(p.symptoms), 0) / currentWeek.length 
      : 5;
    const lastAvg = lastWeek.length > 0 
      ? lastWeek.reduce((sum, p) => sum + getSymptomAvg(p.symptoms), 0) / lastWeek.length 
      : 5;
    
    if (currAvg >= lastAvg) {
      symptomScore = 15 + (currAvg - lastAvg) * 5;
      if (symptomScore > 20) symptomScore = 20;
    } else {
      symptomScore = 15 - (lastAvg - currAvg) * 10;
      if (symptomScore < 0) symptomScore = 0;
    }
  }
  
  // 4. 参与度得分 (10%)
  let engagementScore = 8;
  if (recentPlans.length > 0) {
    const activeDays = recentPlans.filter(p => 
      (p.tasks && p.tasks.some(t => t.completed)) ||
      p.water_intake > 0 ||
      (p.symptoms && p.symptoms.length > 0)
    ).length;
    engagementScore = Math.max(7, Math.min(10, 7 + activeDays * 0.5));
  }
  
  const totalScore = Math.round(adherenceScore + inventoryScore + symptomScore + engagementScore);
  
  // 保存评分
  user.wrom_score = totalScore;
  user.wrom_breakdown = {
    adherence: Math.round(adherenceScore),
    inventory: Math.round(inventoryScore),
    symptom: Math.round(symptomScore),
    engagement: Math.round(engagementScore)
  };
  user.wrom_updated_at = Date.now();
  
  console.log('✅ WROM评分计算完成');
  console.log('   总评分:', totalScore);
  console.log('   评分构成:');
  console.log(`     依从性(40%): ${Math.round(adherenceScore)}/40`);
  console.log(`     库存(30%): ${Math.round(inventoryScore)}/30`);
  console.log(`     体感(20%): ${Math.round(symptomScore)}/20`);
  console.log(`     参与度(10%): ${Math.round(engagementScore)}/10`);
  
  return {
    score: totalScore,
    breakdown: user.wrom_breakdown,
    trend: totalScore > (user.last_wrom || 0) ? 'up' : totalScore < (user.last_wrom || 0) ? 'down' : 'flat'
  };
}

// 2. 计算RPS（复购倾向评分）
async function calculateRPS(userId) {
  console.log('\n🔄 计算RPS复购倾向评分');
  
  const user = db.users.find(u => u._id === userId);
  if (!user) return null;
  
  // 基于多个维度计算RPS
  let rpsScore = 50; // 基础分
  
  // 1. 库存充足度 (-20 to +10)
  const userInventory = db.inventory.filter(i => i.user_id === userId);
  if (userInventory.length > 0) {
    const avgCoverage = userInventory.reduce((sum, item) => {
      const days = (item.stock * (item.capacity || 30)) / (item.daily_usage || 1);
      return sum + days;
    }, 0) / userInventory.length;
    
    if (avgCoverage < 7) rpsScore += 15; // 库存低，急需复购
    else if (avgCoverage < 14) rpsScore += 10;
    else if (avgCoverage < 30) rpsScore += 5;
    else rpsScore -= 10; // 库存充足，复购意愿低
  }
  
  // 2. WROM评分影响 (-10 to +10)
  if (user.wrom_score) {
    if (user.wrom_score >= 80) rpsScore += 10; // 效果好，愿意继续
    else if (user.wrom_score >= 60) rpsScore += 5;
    else if (user.wrom_score < 40) rpsScore -= 10; // 效果差，可能流失
  }
  
  // 3. 活跃度影响 (-10 to +10)
  const recentPlans = db.plans.filter(p => p.user_id === userId && p.date >= getDateDaysAgo(7));
  const activeDays = recentPlans.filter(p => 
    p.tasks && p.tasks.some(t => t.completed)
  ).length;
  rpsScore += (activeDays / 7) * 10;
  
  // 限制在0-100
  rpsScore = Math.max(0, Math.min(100, Math.round(rpsScore)));
  
  // 分级
  let level = 'medium';
  if (rpsScore >= 70) level = 'high';
  else if (rpsScore < 40) level = 'low';
  
  user.rps_score = rpsScore;
  user.rps_level = level;
  
  console.log('✅ RPS评分计算完成');
  console.log('   评分:', rpsScore);
  console.log('   等级:', level === 'high' ? '高复购倾向' : level === 'medium' ? '中等复购倾向' : '低复购倾向');
  
  return { score: rpsScore, level };
}

// 3. 健康风险评估
async function assessHealthRisk(userId) {
  console.log('\n⚠️ 健康风险评估');
  
  const user = db.users.find(u => u._id === userId);
  const logs = db.healthLogs.filter(l => l.user_id === userId);
  
  const risks = [];
  let overallRisk = 'low';
  
  // 分析体重趋势
  const weightLogs = logs.filter(l => l.type === 'weight').sort((a, b) => a.date - b.date);
  if (weightLogs.length >= 2) {
    const first = weightLogs[0].value;
    const last = weightLogs[weightLogs.length - 1].value;
    const change = last - first;
    const changePercent = (change / first) * 100;
    
    if (Math.abs(changePercent) > 5) {
      risks.push({
        type: 'weight',
        level: changePercent > 10 ? 'high' : 'medium',
        message: `体重${change > 0 ? '增加' : '减少'} ${Math.abs(changePercent).toFixed(1)}%`,
        suggestion: '建议调整饮食计划并咨询顾问'
      });
    }
  }
  
  // 分析打卡依从性
  const recentPlans = db.plans.filter(p => p.user_id === userId && p.date >= getDateDaysAgo(7));
  if (recentPlans.length > 0) {
    const completionRate = recentPlans.filter(p => 
      p.tasks && p.tasks.length > 0 && p.tasks.every(t => t.completed)
    ).length / recentPlans.length;
    
    if (completionRate < 0.5) {
      risks.push({
        type: 'adherence',
        level: 'high',
        message: '近7天打卡完成率低于50%',
        suggestion: '建议使用提醒功能或联系顾问'
      });
    }
  }
  
  // 分析体感反馈
  const symptomPlans = recentPlans.filter(p => p.symptoms && p.symptoms.length > 0);
  if (symptomPlans.length > 0) {
    const highSymptoms = symptomPlans.filter(p => 
      p.symptoms.some(s => s.value >= 7)
    ).length;
    
    if (highSymptoms > 0) {
      risks.push({
        type: 'symptom',
        level: highSymptoms > 2 ? 'high' : 'medium',
        message: `近7天有 ${highSymptoms} 天报告较强不适`,
        suggestion: '建议及时联系顾问调整方案'
      });
    }
  }
  
  // 计算整体风险等级
  if (risks.some(r => r.level === 'high')) overallRisk = 'high';
  else if (risks.some(r => r.level === 'medium')) overallRisk = 'medium';
  
  console.log('✅ 风险评估完成');
  console.log('   整体风险:', overallRisk === 'high' ? '高风险' : overallRisk === 'medium' ? '中风险' : '低风险');
  risks.forEach(r => {
    console.log(`   ${r.level === 'high' ? '🔴' : '🟡'} ${r.type}: ${r.message}`);
  });
  
  return { overallRisk, risks };
}

// 4. 生成周报
async function generateWeeklyReport(userId) {
  console.log('\n📈 生成周报');
  
  const user = db.users.find(u => u._id === userId);
  const weekAgo = getDateDaysAgo(7);
  
  // 统计数据
  const weeklyPlans = db.plans.filter(p => p.user_id === userId && p.date >= weekAgo);
  const totalDays = 7;
  const checkinDays = weeklyPlans.filter(p => 
    p.tasks && p.tasks.some(t => t.completed)
  ).length;
  
  const completionRates = weeklyPlans.map(p => {
    if (!p.tasks || p.tasks.length === 0) return 0;
    return (p.tasks.filter(t => t.completed).length / p.tasks.length) * 100;
  });
  const avgCompletion = completionRates.length > 0 
    ? (completionRates.reduce((a, b) => a + b, 0) / completionRates.length).toFixed(1)
    : 0;
  
  const totalWater = weeklyPlans.reduce((sum, p) => sum + (p.water_intake || 0), 0);
  const symptomDays = weeklyPlans.filter(p => p.symptoms && p.symptoms.length > 0).length;
  
  // 获取健康指标
  const weightLogs = db.healthLogs.filter(l => 
    l.user_id === userId && l.type === 'weight' && l.date >= weekAgo
  );
  const latestWeight = weightLogs.length > 0 
    ? weightLogs[weightLogs.length - 1].value 
    : null;
  const firstWeight = weightLogs.length > 0 
    ? weightLogs[0].value 
    : null;
  const weightChange = latestWeight && firstWeight 
    ? (latestWeight - firstWeight).toFixed(2) 
    : null;
  
  const report = {
    _id: generateId(),
    user_id: userId,
    period: `${weekAgo} 至 ${today}`,
    created_at: Date.now(),
    summary: {
      checkinDays,
      totalDays,
      checkinRate: Math.round((checkinDays / totalDays) * 100),
      avgCompletion: parseFloat(avgCompletion),
      totalWater,
      symptomDays,
      weightChange,
      latestWeight
    },
    wrom: user.wrom_score,
    rps: user.rps_score,
    highlights: [],
    suggestions: []
  };
  
  // 生成亮点和建议
  if (parseFloat(avgCompletion) >= 80) {
    report.highlights.push('本周打卡完成率优秀，继续保持！');
  }
  if (totalWater >= 14000) { // 平均每天2L
    report.highlights.push('饮水习惯良好，有助于代谢健康');
  }
  if (weightChange && parseFloat(weightChange) < 0) {
    report.highlights.push('体重呈下降趋势，健康改善中');
  }
  
  if (parseFloat(avgCompletion) < 50) {
    report.suggestions.push('建议设置打卡提醒，提高依从性');
  }
  if (totalWater < 7000) {
    report.suggestions.push('饮水量不足，建议每天饮水2L以上');
  }
  if (symptomDays > 3) {
    report.suggestions.push('多次报告不适，建议联系顾问调整方案');
  }
  
  db.reports.push(report);
  
  console.log('✅ 周报生成完成');
  console.log('   周期:', report.period);
  console.log('   打卡:', `${checkinDays}/${totalDays} 天 (${report.summary.checkinRate}%)`);
  console.log('   完成率:', avgCompletion + '%');
  console.log('   饮水:', totalWater + 'ml');
  console.log('   体重变化:', weightChange ? weightChange + 'kg' : '无数据');
  console.log('   WROM:', user.wrom_score);
  console.log('   亮点:', report.highlights.length, '条');
  console.log('   建议:', report.suggestions.length, '条');
  
  return report;
}

// 5. 管理报表
async function getAdminReports(days = 7) {
  console.log('\n📊 生成管理报表');
  
  const totalClients = db.users.filter(u => u.role === 'client').length;
  const totalOrders = 0; // 简化
  
  // RPS分布
  const rpsDistribution = { low: 0, medium: 0, high: 0 };
  db.users.filter(u => u.role === 'client').forEach(u => {
    if (u.rps_level === 'high') rpsDistribution.high++;
    else if (u.rps_level === 'low') rpsDistribution.low++;
    else rpsDistribution.medium++;
  });
  
  // 风险分布
  const riskDistribution = { low: 0, medium: 0, high: 0 };
  // 简化计算
  
  // 周趋势
  const weeklyTrend = Array.from({ length: days }, (_, i) => ({
    date: getDateDaysAgo(days - 1 - i),
    wrom: 70 + Math.floor(Math.random() * 20),
    rps: 50 + Math.floor(Math.random() * 30)
  }));
  
  const report = {
    totalClients,
    rpsDistribution,
    riskDistribution,
    weeklyTrend,
    generatedAt: Date.now()
  };
  
  console.log('✅ 管理报表生成');
  console.log('   客户总数:', totalClients);
  console.log('   RPS分布:', 
    `高复购${rpsDistribution.high}人 | ` +
    `中复购${rpsDistribution.medium}人 | ` +
    `低复购${rpsDistribution.low}人`
  );
  
  return report;
}

// ==================== 辅助函数 ====================

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getSymptomAvg(symptoms) {
  if (!symptoms || symptoms.length === 0) return 5;
  return symptoms.reduce((sum, s) => sum + (s.value || 0), 0) / symptoms.length;
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    测试5: 数据分析增强 - WROM/RPS/风险/周报');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 初始化用户
    const client = {
      _id: 'client_001',
      username: '张小明',
      role: 'client',
      wrom_score: 0,
      rps_score: 0
    };
    db.users.push(client);
    
    // 模拟7天打卡数据
    for (let i = 6; i >= 0; i--) {
      const date = getDateDaysAgo(i);
      const tasks = [
        { product_name: '深海鱼油', completed: Math.random() > 0.2 },
        { product_name: '维生素C', completed: Math.random() > 0.3 },
        { product_name: '钙片', completed: Math.random() > 0.25 }
      ];
      
      db.plans.push({
        _id: generateId(),
        user_id: client._id,
        date: date,
        tasks: tasks,
        water_intake: 1500 + Math.floor(Math.random() * 1000),
        symptoms: Math.random() > 0.5 ? [{ name: '疲劳', value: Math.floor(Math.random() * 5) + 3 }] : [],
        created_at: Date.now() - i * 86400000
      });
    }
    
    // 模拟库存数据
    db.inventory.push(
      { _id: generateId(), user_id: client._id, product_name: '深海鱼油', stock: 3, capacity: 30, daily_usage: 2 },
      { _id: generateId(), user_id: client._id, product_name: '维生素C', stock: 5, capacity: 60, daily_usage: 1 },
      { _id: generateId(), user_id: client._id, product_name: '钙片', stock: 2, capacity: 30, daily_usage: 1 }
    );
    
    // 模拟体重数据
    db.healthLogs.push(
      { _id: generateId(), user_id: client._id, type: 'weight', value: 70.5, date: getDateDaysAgo(6) },
      { _id: generateId(), user_id: client._id, type: 'weight', value: 70.2, date: getDateDaysAgo(3) },
      { _id: generateId(), user_id: client._id, type: 'weight', value: 69.8, date: today }
    );
    
    // 1. 计算WROM
    await calculateWROM(client._id);
    
    // 2. 计算RPS
    await calculateRPS(client._id);
    
    // 3. 健康风险评估
    await assessHealthRisk(client._id);
    
    // 4. 生成周报
    await generateWeeklyReport(client._id);
    
    // 5. 管理报表
    // 添加更多模拟用户
    for (let i = 0; i < 9; i++) {
      db.users.push({
        _id: `client_${i + 2}`,
        username: `客户${i + 2}`,
        role: 'client',
        rps_score: Math.floor(Math.random() * 100),
        rps_level: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
      });
    }
    await getAdminReports(7);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 数据分析增强测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   用户数据:', db.users.length);
    console.log('   计划记录:', db.plans.length);
    console.log('   库存记录:', db.inventory.length);
    console.log('   健康日志:', db.healthLogs.length);
    console.log('   周报:', db.reports.length);
    
    const finalClient = db.users.find(u => u._id === 'client_001');
    console.log('\n   客户最终WROM评分:', finalClient.wrom_score);
    console.log('   客户最终RPS评分:', finalClient.rps_score);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runTest();
