/**
 * 每日自动生成计划云函数
 * 定时触发：每天凌晨 3:00 执行
 * 
 * 功能：为所有有活跃方案的客户自动生成当日的 he_daily_plans 记录
 * 确保顾问在早上看到 Dashboard 时，所有客户的打卡状态都是准确的
 */

const db = uniCloud.database();
const usersCollection = db.collection('he_users');
const plansCollection = db.collection('he_daily_plans');
const templatesCollection = db.collection('he_templates');

const getLocalDateStr = (date = new Date()) => {
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

exports.main = async (event, context) => {
  const startTime = Date.now();
  const today = getLocalDateStr();
  const isScheduled = context && context.triggerSource === 'timer';
  
  console.log(`[daily-plan-generator] 开始执行 | 触发方式: ${isScheduled ? '定时触发' : '手动触发'} | 目标日期: ${today}`);

  let totalClients = 0;
  let generatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // 1. 获取所有有活跃方案的客户
    const clientsRes = await usersCollection.where({ role: 'client' }).get();
    const allClients = clientsRes.data || [];
    totalClients = allClients.length;

    console.log(`[daily-plan-generator] 共找到 ${totalClients} 个客户`);

    // 2. 筛选出有活跃 assigned_templates 的客户
    const clientsWithActivePlans = allClients.filter(client => {
      const templates = client.assigned_templates || [];
      if (templates.length === 0) return false;
      
      return templates.some(t => {
        if (typeof t === 'string') return true;
        return t.status === 'active' || !t.status;
      });
    });

    console.log(`[daily-plan-generator] 其中有 ${clientsWithActivePlans.length} 个客户有活跃方案`);

    if (clientsWithActivePlans.length === 0) {
      console.log('[daily-plan-generator] 没有需要生成计划的客户，结束');
      return {
        code: 0,
        msg: '没有需要生成计划的客户',
        data: { totalClients: 0, generated: 0, skipped: 0, errors: 0, duration: Date.now() - startTime }
      };
    }

    // 3. 批量获取所有用到的模板
    const templateIdsToFetch = new Set();
    clientsWithActivePlans.forEach(client => {
      (client.assigned_templates || []).forEach(t => {
        const tid = typeof t === 'string' ? t : (t.id || t.template_id);
        if (tid) templateIdsToFetch.add(String(tid));
      });
      // 兼容旧版单数字段
      if (client.assigned_template) templateIdsToFetch.add(String(client.assigned_template));
    });

    const templatesRes = templateIdsToFetch.size > 0
      ? await templatesCollection.where({ _id: db.command.in(Array.from(templateIdsToFetch)) }).get()
      : { data: [] };
    
    const templatesByKey = new Map();
    templatesRes.data.forEach(t => templatesByKey.set(t._id, t));

    // 4. 逐个检查并生成计划
    for (const client of clientsWithActivePlans) {
      try {
        const userId = client._id;
        const userName = client.username || client.nickname || client.phone || '未知';

        // 检查是否已有今日计划
        const existingRes = await plansCollection.where({
          user_id: userId,
          date: today
        }).count();

        if (existingRes.total > 0) {
          skippedCount++;
          continue;
        }

        // 归一化 assigned_templates
        const assignedMeta = (client.assigned_templates || []).map(item =>
          typeof item === 'string' ? { id: item, status: 'active' } : item
        );

        // 兼容旧版单数方案
        if (client.assigned_template && !assignedMeta.some(m => m.id === client.assigned_template)) {
          assignedMeta.push({ id: client.assigned_template, status: 'active' });
        }

        const activeTemplates = assignedMeta.filter(m => m.status === 'active' || !m.status);

        if (activeTemplates.length === 0) {
          skippedCount++;
          continue;
        }

        // 为每个活跃模板生成计划记录
        let plansGeneratedForThisClient = 0;
        for (const meta of activeTemplates) {
          const templateId = String(meta.id);
          const template = templatesByKey.get(templateId);

          if (!template) {
            console.log(`[daily-plan-generator] 模板不存在: ${templateId}, 客户: ${userName}`);
            continue;
          }

          // 处理产品数据
          let items = [];
          if (template.products && template.products.length > 0) {
            items = template.products;
          } else if (template.items && template.items.length > 0) {
            items = template.items;
          }

          if (items.length === 0) {
            console.log(`[daily-plan-generator] 模板无产品: ${template.name}, 客户: ${userName}`);
            continue;
          }

          // 构建任务列表（按时段分组）
          const timingToSlot = { morning: '早', noon: '中', lunch: '中', dinner: '晚', bedtime: '睡' };
          const tasks = items.map((product, index) => ({
            product_id: product.product_id || product.id || '',
            product_name: product.product_name || product.name || product.item_name || '',
            slot: product.slot || product.timing || 'morning',
            completed: false,
            dosage: product.daily_usage || product.dosage || 1,
            unit: product.unit || '粒'
          }));

          // 写入计划记录
          await plansCollection.add({
            user_id: userId,
            nutritionist_id: client.nutritionist_id || '',
            date: today,
            template_id: templateId,
            template_name: template.name,
            tasks,
            water_intake: 0,
            water_target: 2000,
            points: 0,
            section_status: {
              water: { completed: false, current: 0, target: 2000 },
              metrics: { completed: false, items: [] },
              symptoms: { completed: false, score: 0 },
              tasks: {
                morning: { completed: false, items: tasks.filter(t => ['morning', '早'].includes(t.slot)) },
                noon: { completed: false, items: tasks.filter(t => ['noon', 'lunch', '中'].includes(t.slot)) },
                evening: { completed: false, items: tasks.filter(t => ['dinner', '晚'].includes(t.slot)) },
                bedtime: { completed: false, items: tasks.filter(t => ['bedtime', '睡'].includes(t.slot)) }
              }
            },
            created_at: Date.now(),
            updated_at: Date.now(),
            checkin_completed: false
          });

          plansGeneratedForThisClient++;
        }

        if (plansGeneratedForThisClient > 0) {
          generatedCount++;
          console.log(`[daily-plan-generator] ✅ ${userName}: 生成 ${plansGeneratedForThisClient} 条计划`);
        } else {
          skippedCount++;
        }

      } catch (clientErr) {
        errorCount++;
        const errMsg = clientErr.message || String(clientErr);
        errors.push({ client: client._id || client.phone, error: errMsg });
        console.error(`[daily-plan-generator] ❌ 处理客户失败:`, clientErr);
      }
    }

  } catch (err) {
    console.error('[daily-plan-generator] 执行异常:', err);
    return {
      code: 500,
      msg: `执行异常: ${err.message}`,
      data: { totalClients, generated: generatedCount, skipped: skippedCount, errors: errorCount, duration: Date.now() - startTime }
    };
  }

  const duration = Date.now() - startTime;
  console.log(`[daily-plan-generator] 执行完成 | 总客户: ${totalClients} | 新生成: ${generatedCount} | 已存在跳过: ${skippedCount} | 错误: ${errorCount} | 耗时: ${duration}ms`);

  return {
    code: 0,
    msg: `完成：生成${generatedCount}个客户的当日计划，跳过${skippedCount}个`,
    data: {
      date: today,
      totalClients,
      generated: generatedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 10),
      duration
    }
  };
};
