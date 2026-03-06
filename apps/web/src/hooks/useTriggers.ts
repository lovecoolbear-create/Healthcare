import { useMemo } from 'react';
import { Client, ProtocolTrigger, Product, UserTask } from '@healthcare/shared';
import { useData } from '../context/DataContext';
import { Zap, Package, Calendar, TrendingUp, ShieldCheck } from 'lucide-react';

export interface Alert extends Client {
  alertType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionLabel?: string;
  actionScript?: string;
  triggerId?: string;
  actionType?: string;
  alertMsg?: string;
  dueDate?: string;
  isUserTask?: boolean;
}

const SILENT_PERIOD_MS = 48 * 60 * 60 * 1000; // 48 小时静默期

export const ALERT_GROUPS = {
  'urgent': { label: '紧急干预', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50' },
  'ghosting': { label: '失联挽回', icon: Zap, color: 'text-red-600', bg: 'bg-red-50' },
  'inventory': { label: '补货转化', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
  'followup': { label: '常规随访', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
  'growth': { label: '关系维护', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  'sop': { label: '标准随访', icon: ShieldCheck, color: 'text-slate-500', bg: 'bg-slate-50' }
};

export function useTriggers(isSilentRuleEnabled: boolean = true) {
  const { clients, triggers, products, userTasks } = useData();

  const priorityMap = useMemo(() => ({ 
    'critical': 0, 
    'high': 1, 
    'medium': 2, 
    'low': 3 
  }), []);

  const allAlerts = useMemo(() => {
    const alerts: Alert[] = [];

    clients.forEach(client => {
      const clientPotentialAlerts: Alert[] = [];
      
      // --- 1. 自动化失联唤醒 (Ghosting Prevention Logic) ---
      if (client.missed_days && client.missed_days > 0) {
        if (client.missed_days >= 3) { // Level 3: 72h+
          clientPotentialAlerts.push({
            ...client,
            alertType: 'ghosting',
            alertMsg: `🔴 紧急挽回：已连续 ${client.missed_days} 天无数据`,
            priority: 'critical',
            actionLabel: '一键拨号/微信',
            actionScript: `你好 ${client.name}，看到你已经几天没更新数据了，是最近太忙了吗？身体调理需要坚持哦，有任何困难随时跟我沟通。`,
            actionType: 'highlight_client'
          });
        } else if (client.missed_days >= 2) { // Level 2: 48h
          clientPotentialAlerts.push({
            ...client,
            alertType: 'ghosting',
            alertMsg: `失联预警：已连续 ${client.missed_days} 天无数据`,
            priority: 'high',
            actionLabel: 'Web Push 推送',
            actionScript: `[HealthCare] 您的专属营养师正在关注您的进度，记得同步今日数据。`,
            actionType: 'send_template'
          });
        } else if (client.missed_days >= 1) { // Level 1: 24h
          clientPotentialAlerts.push({
            ...client,
            alertType: 'ghosting',
            alertMsg: `温馨问候模式：24h 无数据`,
            priority: 'medium',
            actionLabel: 'Banner 切换',
            actionScript: `今天忙坏了吧？记得按时补充营养哦`,
            actionType: 'push_red_dot'
          });
        }
      }

      // --- 2. 社交货币生成器 (Achievement Triggers for Nutritionist) ---
      if (client.checkin_streak && [7, 14, 21].includes(client.checkin_streak)) {
        clientPotentialAlerts.push({
          ...client,
          alertType: 'growth',
          alertMsg: `🎉 达成 ${client.checkin_streak} 天打卡里程碑！`,
          priority: 'low',
          actionLabel: '发送贺报',
          actionScript: `太棒了 ${client.name}！你已经连续坚持了 ${client.checkin_streak} 天，这是非常了不起的成就！`,
          actionType: 'send_template'
        });
      }

      triggers.filter(t => t.is_enabled).forEach(trigger => {
        let isTriggered = false;
        let alertMsg = '';
        const { condition, action } = trigger;

        // 1. 依从性判定 (Compliance)
        if (condition.type === 'adherence_streak') {
          if (client.missed_days && client.missed_days >= condition.threshold) {
            isTriggered = true;
            alertMsg = `连续 ${client.missed_days} 天未打卡`;
          }
        }

        // 2. 库存判定 (Inventory)
        else if (condition.type === 'stock_level') {
          const lowStockItem = client.inventory_status?.find(i => {
            // 如果没有设置阈值或阈值为负数，视为无效规则
            if (condition.threshold < 0) return false;
            
            if (!i.last_calibration_date) return i.remaining_days <= condition.threshold;
            
            const lastDate = new Date(i.last_calibration_date).getTime();
            const now = new Date().getTime();
            const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            const currentRemainingDays = Math.max(0, i.remaining_days - daysPassed);
            
            return currentRemainingDays <= condition.threshold;
          });

          if (lowStockItem) {
            isTriggered = true;
            const product = products.find(p => p.id === lowStockItem.product_id);
            
            let currentRemainingDays = lowStockItem.remaining_days;
            if (lowStockItem.last_calibration_date) {
              const lastDate = new Date(lowStockItem.last_calibration_date).getTime();
              const now = new Date().getTime();
              const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
              currentRemainingDays = Math.max(0, lowStockItem.remaining_days - daysPassed);
            }

            const estimatedRestockAmount = product?.price ? ` (预估补货: ¥${product.price})` : '';
            alertMsg = `${currentRemainingDays} 天后断货 (${product?.name || lowStockItem.product_id})${estimatedRestockAmount}`;
          }
        }

        // 3. 体感/风险判定 (Symptom/Risk)
        else if (condition.type === 'vital_trend') {
          // 增加安全性检查，确保 metrics 存在且 score 是有效数值
          const energyScore = client.feeling_metrics?.energy_score;
          const hasTrendPivot = client.feeling_metrics?.trend_pivot === true;
          
          if (hasTrendPivot || (typeof energyScore === 'number' && energyScore < 60)) {
            isTriggered = true;
            alertMsg = hasTrendPivot ? '体感指标出现剧烈波动' : '能量水平评分过低';
          }
        }

        // 4. 增长/SOP 节点 (Growth/SOP)
        else if (condition.type === 'protocol_duration') {
          if (client.created_at) {
            const now = new Date();
            const start = new Date(client.created_at);
            // 确保日期有效
            if (!isNaN(start.getTime())) {
              const diffTime = now.getTime() - start.getTime();
              const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              // 边缘情况：如果创建时间在未来，daysSinceStart 可能为负
              if (daysSinceStart === condition.threshold && daysSinceStart >= 0) {
                isTriggered = true;
                alertMsg = `方案执行第 ${daysSinceStart} 天回访`;
              }
            }
          }
        }

        if (isTriggered) {
          let category: keyof typeof ALERT_GROUPS = 'followup';
          if (trigger.category === 'inventory') category = 'inventory';
          if (trigger.category === 'symptom' || action.priority === 'critical') category = 'urgent';
          if (trigger.category === 'growth') category = 'growth';

          let finalActionMsg = action.payload_template
            .replace(/\{\{client_name\}\}/g, client.name)
            .replace(/\{\{threshold\}\}/g, condition.threshold.toString());

          if (condition.type === 'stock_level') {
            const lowStockProduct = client.inventory_status?.find(i => i.remaining_days <= condition.threshold);
            const product = products.find(p => p.id === lowStockProduct?.product_id);
            finalActionMsg = finalActionMsg.replace(/\{\{product_name\}\}/g, product?.name || '补剂');
          }

          clientPotentialAlerts.push({
            ...client,
            alertType: category,
            alertMsg: alertMsg,
            priority: action.priority,
            actionLabel: action.label,
            actionScript: finalActionMsg,
            triggerId: trigger.id,
            actionType: action.type
          });
        }
      });

      if (clientPotentialAlerts.length > 0) {
        clientPotentialAlerts.sort((a, b) => priorityMap[a.priority as keyof typeof priorityMap] - priorityMap[b.priority as keyof typeof priorityMap]);
        const topAlert = clientPotentialAlerts[0];

        let shouldShow = true;
        if (isSilentRuleEnabled && topAlert.priority !== 'critical' && client.last_alert_at) {
          const lastAlertTime = new Date(client.last_alert_at).getTime();
          const now = new Date().getTime();
          if (now - lastAlertTime < SILENT_PERIOD_MS) {
            if (client.last_alert_priority !== 'critical') {
              shouldShow = false;
            }
          }
        }

        if (shouldShow) {
          alerts.push(topAlert);
        }
      }
    });

    // 2. 手动待办
    userTasks.filter(t => t.status === 'pending').forEach(task => {
      const client = clients.find(c => c.id === task.clientId);
      if (!client) return;

      alerts.push({
        ...client,
        id: task.id,
        alertType: task.priority === 'critical' ? 'urgent' : 'followup',
        alertMsg: task.content,
        priority: task.priority,
        actionLabel: '【手动待办】',
        actionScript: task.script || task.content,
        dueDate: task.dueDate,
        isUserTask: true
      });
    });

    // 3. SOP 兜底
    if (alerts.length === 0 && !isSilentRuleEnabled) {
      clients.forEach(c => {
        if (!c.created_at) return;
        const daysSinceStart = Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const milestones = [3, 7, 14, 28];
        if (milestones.includes(daysSinceStart)) {
          let shouldShowSop = true;
          if (isSilentRuleEnabled && c.last_alert_at) {
             const lastAlertTime = new Date(c.last_alert_at).getTime();
             if (new Date().getTime() - lastAlertTime < SILENT_PERIOD_MS && c.last_alert_priority !== 'critical') {
                shouldShowSop = false;
             }
          }

          if (shouldShowSop && !alerts.find(a => a.id === c.id)) {
            alerts.push({
              ...c,
              alertType: 'sop',
              alertMsg: `入伙第 ${daysSinceStart} 天关键随访`,
              priority: 'high',
              actionLabel: '【标准随访】',
              actionScript: `你好 ${c.name}，今天是方案执行第 ${daysSinceStart} 天，身体感觉怎么样？`
            });
          }
        }
      });
    }

    return alerts.sort((a, b) => priorityMap[a.priority as keyof typeof priorityMap] - priorityMap[b.priority as keyof typeof priorityMap]);
  }, [clients, triggers, products, userTasks, isSilentRuleEnabled, priorityMap]);

  // 模拟测试逻辑：给定客户数据，预测会触发哪些触发器
  const simulateTriggers = (mockClient: Partial<Client>) => {
    const results: any[] = [];
    triggers.filter(t => t.is_enabled).forEach(trigger => {
      let isTriggered = false;
      const { condition } = trigger;
      
      if (condition.type === 'adherence_streak') {
        if (mockClient.missed_days !== undefined && mockClient.missed_days >= condition.threshold && condition.threshold >= 0) {
          isTriggered = true;
        }
      } else if (condition.type === 'stock_level') {
        const lowStock = mockClient.inventory_status?.some(i => i.remaining_days <= condition.threshold && condition.threshold >= 0);
        if (lowStock) isTriggered = true;
      } else if (condition.type === 'vital_trend') {
        const energyScore = mockClient.feeling_metrics?.energy_score;
        const hasTrendPivot = mockClient.feeling_metrics?.trend_pivot === true;
        if (hasTrendPivot || (typeof energyScore === 'number' && energyScore < 60)) {
          isTriggered = true;
        }
      } else if (condition.type === 'protocol_duration') {
        if (mockClient.created_at) {
          const now = new Date();
          const start = new Date(mockClient.created_at);
          if (!isNaN(start.getTime())) {
            const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceStart === condition.threshold && daysSinceStart >= 0) {
              isTriggered = true;
            }
          }
        }
      }

      if (isTriggered) {
        results.push({
          trigger,
          clientName: mockClient.name || '测试客户',
          matchThreshold: condition.threshold
        });
      }
    });
    return results;
  };

  return {
    allAlerts,
    simulateTriggers,
    ALERT_GROUPS
  };
}
