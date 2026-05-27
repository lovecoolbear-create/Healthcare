'use strict';

const db = uniCloud.database();
const protocolsCollection = db.collection('he_user_protocols');
const plansCollection = db.collection('he_daily_plans');
const usersCollection = db.collection('he_users');
const inventoryCollection = db.collection('he_inventory');
const snapshotCollection = db.collection('he_protocol_snapshots');
const effectivenessCollection = db.collection('he_protocol_effectiveness_reports');

/**
 * 生成配方每日快照
 * 用于追踪配方使用效果
 * 建议设置定时任务每日凌晨执行
 */
exports.main = async (event, context) => {
  const { action, payload = {} } = event;
  
  try {
    switch (action) {
      case 'getProtocolPhasesInRange':
        return await getProtocolPhasesInRange(payload.userId, payload.startDate, payload.endDate);
        
      case 'generateDailySnapshots':
        return await generateDailySnapshots();
        
      case 'generateProtocolReport':
        return await generateProtocolReport(payload.protocolId);
        
      case 'getClientProtocolHistory':
        return await getClientProtocolHistory(payload.userId);
        
      case 'getProtocolEffectivenessStats':
        return await getProtocolEffectivenessStats(payload.templateId);
        
      case 'getAdvisorProtocolStats':
        return await getAdvisorProtocolStats(payload.advisorId);
        
      default:
        return { code: 400, msg: 'Unknown action' };
    }
  } catch (error) {
    console.error('Protocol effectiveness error:', error);
    return { code: 500, msg: error.message };
  }
};

/**
 * 获取指定日期范围内的配方阶段
 * 用于在图表上标记配方阶段
 */
async function getProtocolPhasesInRange(userId, startDate, endDate) {
  if (!userId || !startDate || !endDate) {
    return { code: 400, msg: '缺少必要参数' };
  }

  try {
    // 查询与日期范围有重叠的配方
    // 条件：配方开始日期在范围内，或配方结束日期在范围内，或配方覆盖整个范围
    const protocols = await protocolsCollection.where({
      user_id: userId,
      status: db.command.in(['active', 'completed', 'pending']),
      $or: [
        // 配方开始日期在范围内
        {
          start_date: db.command.gte(startDate).and(db.command.lte(endDate))
        },
        // 配方结束日期在范围内（有结束日期的情况）
        {
          end_date: db.command.gte(startDate).and(db.command.lte(endDate))
        },
        // 配方覆盖整个范围（开始早于范围，结束晚于范围）
        {
          start_date: db.command.lte(startDate),
          end_date: db.command.gte(endDate)
        },
        // 配方开始早于范围，没有结束日期（进行中）
        {
          start_date: db.command.lte(startDate),
          end_date: db.command.exists(false)
        }
      ]
    }).orderBy('start_date', 'asc').get();

    const phases = protocols.data.map(p => ({
      protocol_id: p._id,
      name: p.name,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      description: p.description
    }));

    return {
      code: 0,
      data: phases,
      msg: `找到 ${phases.length} 个配方阶段`
    };
  } catch (error) {
    console.error('获取配方阶段失败:', error);
    return { code: 500, msg: '获取配方阶段失败' };
  }
}

/**
 * 生成所有活跃配方的每日快照
 */
async function generateDailySnapshots() {
  const today = new Date().toISOString().split('T')[0];
  const todayTimestamp = Date.now();
  
  // 获取所有活跃配方
  const activeProtocols = await protocolsCollection.where({
    status: 'active'
  }).get();
  
  let generatedCount = 0;
  
  for (const protocol of activeProtocols.data) {
    try {
      // 获取当日计划数据
      const planRes = await plansCollection.where({
        user_id: protocol.user_id,
        date: today
      }).get();
      
      // 获取用户信息（WROM）
      const userRes = await usersCollection.doc(protocol.user_id).get();
      const user = userRes.data[0] || {};
      
      // 获取库存数据
      const inventoryRes = await inventoryCollection.where({
        user_id: protocol.user_id
      }).get();
      
      const plan = planRes.data[0] || {};
      
      // 计算配方使用第几天
      const startDate = new Date(protocol.start_date);
      const currentDate = new Date(today);
      const dayNumber = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // 计算依从性
      const tasks = plan.tasks || [];
      const completedTasks = tasks.filter(t => t.completed).length;
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // 计算平均体感
      const symptoms = plan.symptoms || [];
      const avgSymptom = symptoms.length > 0 
        ? symptoms.reduce((sum, s) => sum + (s.value || 0), 0) / symptoms.length 
        : 0;
      
      // 构建快照数据
      const snapshot = {
        protocol_id: protocol._id,
        user_id: protocol.user_id,
        template_id: protocol.template_id || null,
        date: today,
        day_number: dayNumber,
        protocol_status: protocol.status,
        is_active_day: true,
        
        adherence: {
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
          missed_tasks: tasks.filter(t => !t.completed).map(t => t.slot || 'unknown')
        },
        
        symptoms: {
          ...plan.symptoms?.reduce((acc, s) => {
            acc[s.key || s.label] = s.value || 0;
            return acc;
          }, {}),
          avg_score: parseFloat(avgSymptom.toFixed(2))
        },
        
        water_intake: plan.water_intake || 0,
        
        wrom: {
          score: user.wrom_score || 0,
          trend: user.wrom_trend || 'flat',
          breakdown: user.wrom_breakdown || {}
        },
        
        inventory_consumption: inventoryRes.data.map(inv => ({
          product_id: inv.product_id,
          product_name: inv.name,
          stock: inv.stock,
          unit: inv.unit
        })),
        
        created_at: todayTimestamp,
        data_source: 'daily_plan'
      };
      
      // 保存快照
      await snapshotCollection.add(snapshot);
      generatedCount++;
      
    } catch (err) {
      console.error(`Failed to generate snapshot for protocol ${protocol._id}:`, err);
    }
  }
  
  return {
    code: 0,
    msg: `Generated ${generatedCount} snapshots for ${activeProtocols.data.length} active protocols`,
    data: { generatedCount, date: today }
  };
}

/**
 * 生成配方效果总结报告
 */
async function generateProtocolReport(protocolId) {
  if (!protocolId) {
    return { code: 400, msg: 'Protocol ID required' };
  }
  
  // 获取配方信息
  const protocolRes = await protocolsCollection.doc(protocolId).get();
  if (protocolRes.data.length === 0) {
    return { code: 404, msg: 'Protocol not found' };
  }
  
  const protocol = protocolRes.data[0];
  
  // 获取该配方的所有快照
  const snapshotsRes = await snapshotCollection.where({
    protocol_id: protocolId
  }).orderBy('date', 'asc').get();
  
  const snapshots = snapshotsRes.data;
  
  if (snapshots.length === 0) {
    return { code: 404, msg: 'No snapshot data found for this protocol' };
  }
  
  // 计算统计数据
  const totalDays = snapshots.length;
  const activeDays = snapshots.filter(s => s.adherence.completed_tasks > 0).length;
  const avgCompletionRate = Math.round(
    snapshots.reduce((sum, s) => sum + s.adherence.completion_rate, 0) / totalDays
  );
  
  // 计算最长连续打卡
  let bestStreak = 0;
  let currentStreak = 0;
  for (const snapshot of snapshots) {
    if (snapshot.adherence.completion_rate >= 80) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  // 计算体感改善
  const firstWeek = snapshots.slice(0, 7);
  const lastWeek = snapshots.slice(-7);
  
  const initialSymptom = firstWeek.length > 0 
    ? firstWeek.reduce((sum, s) => sum + (s.symptoms?.avg_score || 0), 0) / firstWeek.length 
    : 0;
  const finalSymptom = lastWeek.length > 0 
    ? lastWeek.reduce((sum, s) => sum + (s.symptoms?.avg_score || 0), 0) / lastWeek.length 
    : 0;
  
  const symptomImprovement = initialSymptom > 0 
    ? ((finalSymptom - initialSymptom) / initialSymptom * 100).toFixed(1) 
    : 0;
  
  // 计算WROM变化
  const initialWROM = firstWeek.length > 0 ? firstWeek[0].wrom.score : 0;
  const finalWROM = lastWeek.length > 0 ? lastWeek[lastWeek.length - 1].wrom.score : 0;
  
  // 构建报告
  const report = {
    protocol_id: protocolId,
    user_id: protocol.user_id,
    template_id: protocol.template_id,
    protocol_name: protocol.name,
    protocol_duration_days: totalDays,
    
    period: {
      start_date: protocol.start_date,
      end_date: protocol.end_date || new Date().toISOString().split('T')[0],
      actual_start_date: snapshots[0]?.date,
      actual_end_date: snapshots[snapshots.length - 1]?.date
    },
    
    adherence: {
      total_days: totalDays,
      active_days: activeDays,
      missed_days: totalDays - activeDays,
      avg_completion_rate: avgCompletionRate,
      best_streak: bestStreak,
      adherence_level: avgCompletionRate >= 90 ? 'excellent' : 
                       avgCompletionRate >= 70 ? 'good' : 
                       avgCompletionRate >= 50 ? 'fair' : 'poor'
    },
    
    symptom_improvement: {
      initial_avg: parseFloat(initialSymptom.toFixed(2)),
      final_avg: parseFloat(finalSymptom.toFixed(2)),
      improvement_rate: parseFloat(symptomImprovement),
      improvement_level: symptomImprovement >= 30 ? '显著改善' :
                        symptomImprovement >= 10 ? '轻微改善' :
                        symptomImprovement >= -10 ? '无变化' : '恶化'
    },
    
    wrom_progress: {
      initial_score: initialWROM,
      final_score: finalWROM,
      change: finalWROM - initialWROM,
      change_rate: initialWROM > 0 ? (((finalWROM - initialWROM) / initialWROM) * 100).toFixed(1) : 0,
      trend: finalWROM > initialWROM ? 'up' : finalWROM < initialWROM ? 'down' : 'flat'
    },
    
    // 从 effectiveness 字段复制客户反馈和顾问评估
    client_feedback: protocol.effectiveness?.client_feedback || {},
    advisor_evaluation: protocol.effectiveness?.advisor_evaluation || {},
    
    status: 'completed',
    created_at: Date.now(),
    generated_at: Date.now()
  };
  
  // 保存报告
  const reportRes = await effectivenessCollection.add(report);
  
  return {
    code: 0,
    msg: 'Protocol effectiveness report generated',
    data: { reportId: reportRes.id, report }
  };
}

/**
 * 获取客户配方历史
 */
async function getClientProtocolHistory(userId) {
  if (!userId) {
    return { code: 400, msg: 'User ID required' };
  }
  
  // 获取所有配方
  const protocolsRes = await protocolsCollection.where({
    user_id: userId
  }).orderBy('created_at', 'desc').get();
  
  // 获取每个配方的效果报告
  const protocolsWithReports = await Promise.all(
    protocolsRes.data.map(async (protocol) => {
      const reportRes = await effectivenessCollection.where({
        protocol_id: protocol._id
      }).limit(1).get();
      
      return {
        ...protocol,
        effectiveness_report: reportRes.data[0] || null
      };
    })
  );
  
  return {
    code: 0,
    data: protocolsWithReports
  };
}

/**
 * 获取配方模板效果统计
 */
async function getProtocolEffectivenessStats(templateId) {
  if (!templateId) {
    return { code: 400, msg: 'Template ID required' };
  }
  
  // 获取使用该模板的所有配方报告
  const reportsRes = await effectivenessCollection.where({
    template_id: templateId,
    status: 'completed'
  }).get();
  
  const reports = reportsRes.data;
  
  if (reports.length === 0) {
    return { code: 404, msg: 'No data found for this template' };
  }
  
  // 聚合统计
  const stats = {
    template_id: templateId,
    total_usage: reports.length,
    
    avg_adherence: Math.round(
      reports.reduce((sum, r) => sum + r.adherence.avg_completion_rate, 0) / reports.length
    ),
    
    avg_duration: Math.round(
      reports.reduce((sum, r) => sum + r.protocol_duration_days, 0) / reports.length
    ),
    
    avg_wrom_improvement: (
      reports.reduce((sum, r) => sum + parseFloat(r.wrom_progress.change), 0) / reports.length
    ).toFixed(1),
    
    completion_rate: Math.round(
      (reports.filter(r => r.adherence.adherence_level === 'excellent').length / reports.length) * 100
    ),
    
    effectiveness_distribution: {
      '显著改善': reports.filter(r => r.symptom_improvement.improvement_level === '显著改善').length,
      '轻微改善': reports.filter(r => r.symptom_improvement.improvement_level === '轻微改善').length,
      '无变化': reports.filter(r => r.symptom_improvement.improvement_level === '无变化').length,
      '恶化': reports.filter(r => r.symptom_improvement.improvement_level === '恶化').length
    }
  };
  
  return {
    code: 0,
    data: stats
  };
}

/**
 * 获取顾问的配方统计概览
 */
async function getAdvisorProtocolStats(advisorId) {
  if (!advisorId) {
    return { code: 400, msg: 'Advisor ID required' };
  }
  
  // 获取顾问管理的所有客户
  const clientsRes = await usersCollection.where({
    role: 'client',
    nutritionist_id: advisorId
  }).get();
  
  const clientIds = clientsRes.data.map(c => c._id);
  
  if (clientIds.length === 0) {
    return { code: 0, data: { total_clients: 0, active_protocols: 0 } };
  }
  
  // 获取所有活跃配方
  const activeProtocolsRes = await protocolsCollection.where({
    user_id: db.command.in(clientIds),
    status: 'active'
  }).get();
  
  // 获取即将到期的配方（7天内到期）
  const today = new Date();
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const expiringProtocolsRes = await protocolsCollection.where({
    user_id: db.command.in(clientIds),
    status: 'active',
    end_date: db.command.lte(sevenDaysLater.toISOString().split('T')[0]),
    end_date: db.command.gte(today.toISOString().split('T')[0])
  }).get();
  
  // 获取待开始的配方
  const pendingProtocolsRes = await protocolsCollection.where({
    user_id: db.command.in(clientIds),
    status: 'pending'
  }).get();
  
  return {
    code: 0,
    data: {
      total_clients: clientIds.length,
      active_protocols: activeProtocolsRes.data.length,
      expiring_soon: expiringProtocolsRes.data.length,
      pending_start: pendingProtocolsRes.data.length,
      
      active_protocol_details: activeProtocolsRes.data.map(p => ({
        protocol_id: p._id,
        client_id: p.user_id,
        protocol_name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        days_remaining: p.end_date 
          ? Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24))
          : null
      })),
      
      expiring_details: expiringProtocolsRes.data.map(p => ({
        protocol_id: p._id,
        client_id: p.user_id,
        protocol_name: p.name,
        end_date: p.end_date,
        days_until_expire: Math.ceil((new Date(p.end_date) - today) / (1000 * 60 * 60 * 24))
      }))
    }
  };
}
