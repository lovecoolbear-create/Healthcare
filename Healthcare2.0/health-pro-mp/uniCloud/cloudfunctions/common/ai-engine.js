/**
 * HealthCare Pro - AI智能推荐引擎
 * P2功能：基于WROM/RPS数据的智能健康干预建议
 * 
 * 算法特性：
 * 1. 风险预测：基于历史趋势预测客户健康风险
 * 2. 个性化方案：根据客户特征生成定制调理建议
 * 3. 最佳时机推荐：预测客户复购和干预的最佳时机
 * 4. 营养配方推荐：基于知识库的智能配方匹配
 */

const db = uniCloud.database();

class AIRecommendationEngine {
  // 健康风险预测
  async predictHealthRisk(clientId) {
    const userCollection = db.collection('he_users');
    const logsCollection = db.collection('he_health_logs');
    const plansCollection = db.collection('he_daily_plans');
    
    // 获取客户数据
    const clientRes = await userCollection.doc(clientId).get();
    if (clientRes.data.length === 0) {
      return { code: 404, msg: '客户不存在' };
    }
    
    const client = clientRes.data[0];
    
    // 获取历史健康数据（最近30天）
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const logsRes = await logsCollection.where({
      user_id: clientId,
      created_at: db.command.gt(thirtyDaysAgo)
    }).orderBy('created_at', 'desc').get();
    
    // 获取最近计划完成情况
    const plansRes = await plansCollection.where({
      user_id: clientId,
      date: db.command.gt(new Date(thirtyDaysAgo).toISOString().split('T')[0])
    }).get();
    
    // 分析趋势
    const analysis = this.analyzeTrends(logsRes.data, plansRes.data);
    
    // 生成风险预测
    const riskPrediction = {
      overall_risk: this.calculateOverallRisk(client, analysis),
      adherence_risk: analysis.adherenceScore < 60 ? 'high' : (analysis.adherenceScore < 80 ? 'medium' : 'low'),
      inventory_risk: this.predictInventoryRisk(client, analysis),
      repurchase_risk: this.predictRepurchaseRisk(client, analysis),
      
      // 具体风险因子
      risk_factors: this.identifyRiskFactors(client, analysis),
      
      // 预测时间窗口
      prediction_window: {
        next_checkin_probability: analysis.adherenceScore / 100,
        estimated_inventory_days: client.inventory_summary?.min_days || 7,
        recommended_contact_date: this.calculateRecommendedContact(analysis)
      },
      
      generated_at: Date.now()
    };
    
    return {
      code: 0,
      data: riskPrediction
    };
  }

  // 分析健康趋势
  analyzeTrends(logs, plans) {
    const adherenceScore = this.calculateAdherence(plans);
    const trendDirection = this.calculateTrendDirection(logs);
    const volatility = this.calculateVolatility(logs);
    
    return {
      adherenceScore,
      trendDirection,  // 'improving', 'stable', 'declining'
      volatility,      // 波动率 0-100
      data_points: logs.length,
      completed_tasks: plans.filter(p => p.tasks?.every(t => t.completed)).length,
      total_tasks: plans.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)
    };
  }

  // 计算依从性得分
  calculateAdherence(plans) {
    if (plans.length === 0) return 50;
    
    let completed = 0;
    let total = 0;
    
    plans.forEach(plan => {
      if (plan.tasks) {
        completed += plan.tasks.filter(t => t.completed).length;
        total += plan.tasks.length;
      }
    });
    
    return total > 0 ? Math.round((completed / total) * 100) : 50;
  }

  // 计算趋势方向
  calculateTrendDirection(logs) {
    if (logs.length < 3) return 'stable';
    
    // 简单的线性趋势分析
    const recent = logs.slice(0, Math.min(7, logs.length));
    const scores = recent.map(l => l.wrom_score || l.score || 50);
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  // 计算波动性
  calculateVolatility(logs) {
    if (logs.length < 2) return 0;
    
    const scores = logs.map(l => l.wrom_score || l.score || 50);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    
    return Math.round(Math.sqrt(variance));
  }

  // 计算整体风险
  calculateOverallRisk(client, analysis) {
    const wrom = client.wrom_score || 50;
    const adherence = analysis.adherenceScore;
    
    // 风险加权计算
    let riskScore = 100 - wrom;  // WROM越低风险越高
    
    if (adherence < 60) riskScore += 20;
    else if (adherence < 80) riskScore += 10;
    
    if (analysis.trendDirection === 'declining') riskScore += 15;
    if (analysis.volatility > 20) riskScore += 10;
    
    // 归一化到0-100
    riskScore = Math.min(100, Math.max(0, riskScore));
    
    return {
      score: Math.round(riskScore),
      level: riskScore > 70 ? 'high' : (riskScore > 40 ? 'medium' : 'low'),
      confidence: this.calculateConfidence(analysis.data_points)
    };
  }

  // 预测库存风险
  predictInventoryRisk(client, analysis) {
    const inventory = client.inventory_summary || {};
    const minDays = inventory.min_days || 7;
    
    return {
      level: minDays < 3 ? 'high' : (minDays < 7 ? 'medium' : 'low'),
      estimated_days: minDays,
      urgency: minDays < 3 ? 'immediate' : (minDays < 7 ? 'soon' : 'normal')
    };
  }

  // 预测复购风险（RPS相关）
  predictRepurchaseRisk(client, analysis) {
    const rpsScore = client.rps_score || 50;
    const wromScore = client.wrom_score || 50;
    
    // RPS低表示复购意愿/能力弱
    let riskLevel = 'low';
    if (rpsScore < 40) riskLevel = 'high';
    else if (rpsScore < 60) riskLevel = 'medium';
    
    return {
      level: riskLevel,
      rps_score: rpsScore,
      factors: [
        rpsScore < 50 ? '复购评分较低' : null,
        analysis.trendDirection === 'declining' ? '健康趋势下降' : null,
        analysis.adherenceScore < 60 ? '依从性差' : null
      ].filter(Boolean)
    };
  }

  // 识别风险因子
  identifyRiskFactors(client, analysis) {
    const factors = [];
    
    if (client.wrom_score && client.wrom_score < 60) {
      factors.push({
        type: 'wrom_low',
        severity: 'high',
        description: 'WROM评分低于60，需要重点关注',
        recommendation: '建议立即跟进，了解客户体感变化'
      });
    }
    
    if (analysis.adherenceScore < 60) {
      factors.push({
        type: 'poor_adherence',
        severity: 'medium',
        description: '计划依从性较差',
        recommendation: '分析依从性差的原因，调整方案难度'
      });
    }
    
    if (analysis.trendDirection === 'declining') {
      factors.push({
        type: 'declining_trend',
        severity: 'medium',
        description: '健康指标呈下降趋势',
        recommendation: '回顾近期方案执行情况'
      });
    }
    
    return factors;
  }

  // 计算推荐联系时间
  calculateRecommendedContact(analysis) {
    const now = new Date();
    
    // 如果依从性好，3天后联系
    // 如果依从性差，明天就联系
    const days = analysis.adherenceScore > 80 ? 3 : (analysis.adherenceScore > 60 ? 2 : 1);
    
    now.setDate(now.getDate() + days);
    return now.toISOString().split('T')[0];
  }

  // 计算置信度
  calculateConfidence(dataPoints) {
    if (dataPoints < 3) return 'low';
    if (dataPoints < 7) return 'medium';
    return 'high';
  }

  // 生成智能干预建议
  async generateInterventionRecommendations(clientId) {
    const riskPrediction = await this.predictHealthRisk(clientId);
    
    if (riskPrediction.code !== 0) {
      return riskPrediction;
    }
    
    const risk = riskPrediction.data;
    const recommendations = [];
    
    // 基于风险等级生成建议
    if (risk.overall_risk.level === 'high') {
      recommendations.push({
        type: 'immediate_follow_up',
        priority: 1,
        title: '立即跟进',
        description: '客户健康风险较高，建议24小时内联系',
        actions: [
          '电话询问体感变化',
          '确认当前方案执行情况',
          '必要时调整方案或暂停'
        ]
      });
    }
    
    if (risk.inventory_risk.level === 'high') {
      recommendations.push({
        type: 'inventory_alert',
        priority: 2,
        title: '库存预警',
        description: `预计${risk.inventory_risk.estimated_days}天后断货`,
        actions: [
          '确认补货需求',
          '安排发货',
          '提醒客户准备收货'
        ]
      });
    }
    
    if (risk.repurchase_risk.level === 'high') {
      recommendations.push({
        type: 'repurchase_prevention',
        priority: 3,
        title: '复购风险干预',
        description: '客户可能流失，需要挽回',
        actions: [
          '了解不满意原因',
          '提供替代方案',
          '给予优惠激励'
        ]
      });
    }
    
    // 个性化建议
    const personalized = await this.generatePersonalizedAdvice(clientId, risk);
    
    return {
      code: 0,
      data: {
        risk_summary: risk,
        urgent_recommendations: recommendations.sort((a, b) => a.priority - b.priority),
        personalized_advice: personalized,
        generated_at: Date.now()
      }
    };
  }

  // 生成个性化建议（基于知识库）
  async generatePersonalizedAdvice(clientId, riskData) {
    const userCollection = db.collection('he_users');
    const knowledgeBase = db.collection('he_knowledge_base');
    
    const clientRes = await userCollection.doc(clientId).get();
    if (clientRes.data.length === 0) return [];
    
    const client = clientRes.data[0];
    const riskFactors = riskData.risk_factors || [];
    
    const advice = [];
    
    // 根据风险因子匹配知识库建议
    for (const factor of riskFactors) {
      // 简单匹配关键词（实际应该用更复杂的NLP）
      const relatedKnowledge = await knowledgeBase.where({
        tags: db.command.all([factor.type]),
        type: 'intervention'
      }).limit(3).get();
      
      if (relatedKnowledge.data.length > 0) {
        advice.push({
          related_risk: factor,
          knowledge_items: relatedKnowledge.data,
          suggested_action: relatedKnowledge.data[0]?.content || '暂无具体建议'
        });
      }
    }
    
    // 如果没有匹配到，提供通用建议
    if (advice.length === 0) {
      advice.push({
        type: 'general',
        suggested_action: '继续保持当前方案，定期跟进即可'
      });
    }
    
    return advice;
  }

  // 批量分析（用于Dashboard统计）
  async batchAnalyze(clients) {
    const results = {
      total: clients.length,
      high_risk: 0,
      medium_risk: 0,
      low_risk: 0,
      avg_wrom: 0,
      avg_adherence: 0,
      immediate_attention: []
    };
    
    let totalWrom = 0;
    let totalAdherence = 0;
    
    for (const client of clients) {
      totalWrom += client.wrom_score || 0;
      
      // 简化分析，实际应该调用 predictHealthRisk
      const risk = client.wrom_score < 60 ? 'high' : (client.wrom_score < 75 ? 'medium' : 'low');
      results[risk + '_risk']++;
      
      if (risk === 'high') {
        results.immediate_attention.push({
          client_id: client._id,
          name: client.username,
          wrom: client.wrom_score,
          reason: 'WROM评分低于60'
        });
      }
    }
    
    results.avg_wrom = clients.length > 0 ? Math.round(totalWrom / clients.length) : 0;
    results.avg_adherence = 75; // Mock value
    
    return results;
  }
}

module.exports = new AIRecommendationEngine();
