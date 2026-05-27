/**
 * HealthCare Pro - 自动数据备份云函数
 * P0修复：数据库自动备份机制
 * 定时触发：每天凌晨2点执行
 */

const db = uniCloud.database();

// 需要备份的集合列表
const COLLECTIONS_TO_BACKUP = [
  'he_users',
  'he_daily_plans',
  'he_inventory',
  'he_health_logs',
  'he_refill_requests',
  'he_user_protocols',
  'he_interaction_logs',
  'he_products',
  'he_orders',
  'he_knowledge_base',
  'he_templates',
  'he_scoring_config',
  'he_notifications',
  'he_triggers',
  'he_security_logs'
];

// 备份单个集合
const backupCollection = async (collectionName) => {
  try {
    const collection = db.collection(collectionName);
    const { data } = await collection.limit(1000).get();
    
    // 准备备份数据
    const backupData = {
      collection: collectionName,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      record_count: data.length,
      records: data,
      hash: generateSimpleHash(JSON.stringify(data))
    };
    
    // 存储到备份集合
    const backupCollection = db.collection('he_backups');
    const backupRes = await backupCollection.add(backupData);
    
    return {
      success: true,
      collection: collectionName,
      backupId: backupRes.id,
      recordCount: data.length,
      error: null
    };
  } catch (err) {
    console.error(`备份 ${collectionName} 失败:`, err);
    return {
      success: false,
      collection: collectionName,
      backupId: null,
      recordCount: 0,
      error: err.message
    };
  }
};

// 简单的数据哈希（用于完整性校验）
const generateSimpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 8);
};

// 清理过期备份（保留最近30天）
const cleanupOldBackups = async () => {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const backupCollection = db.collection('he_backups');
    
    // 获取过期备份
    const oldBackups = await backupCollection.where({
      timestamp: db.command.lt(thirtyDaysAgo)
    }).get();
    
    let deletedCount = 0;
    for (const backup of oldBackups.data) {
      await backupCollection.doc(backup._id).remove();
      deletedCount++;
    }
    
    return {
      success: true,
      deletedCount,
      message: `清理了 ${deletedCount} 条过期备份记录`
    };
  } catch (err) {
    console.error('清理过期备份失败:', err);
    return {
      success: false,
      deletedCount: 0,
      error: err.message
    };
  }
};

// 生成备份摘要
const generateBackupSummary = (results) => {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalRecords = successful.reduce((sum, r) => sum + r.recordCount, 0);
  
  return {
    totalCollections: results.length,
    successfulBackups: successful.length,
    failedBackups: failed.length,
    totalRecords,
    details: results,
    timestamp: Date.now()
  };
};

// 发送备份通知（可以扩展为邮件/短信/钉钉等）
const sendBackupNotification = async (summary) => {
  // 将备份摘要存入通知表
  try {
    const notificationCollection = db.collection('he_notifications');
    await notificationCollection.add({
      type: 'system_backup',
      title: '数据备份完成',
      content: `成功备份 ${summary.successfulBackups}/${summary.totalCollections} 个集合，共 ${summary.totalRecords} 条记录`,
      status: summary.failedBackups > 0 ? 'warning' : 'success',
      created_at: Date.now(),
      metadata: summary,
      is_read: false
    });
  } catch (err) {
    console.error('备份通知发送失败:', err);
  }
};

// 主函数
exports.main = async (event, context) => {
  // 触发方式可能是定时触发或手动触发
  const isScheduled = event.trigger === 'timer';
  
  console.log('开始执行数据库备份...', new Date().toISOString());
  
  try {
    // 1. 执行备份
    const backupResults = [];
    for (const collectionName of COLLECTIONS_TO_BACKUP) {
      const result = await backupCollection(collectionName);
      backupResults.push(result);
      console.log(`${result.success ? '✓' : '✗'} ${collectionName}: ${result.recordCount} 条记录`);
    }
    
    // 2. 生成摘要
    const summary = generateBackupSummary(backupResults);
    
    // 3. 清理过期备份
    const cleanupResult = await cleanupOldBackups();
    summary.cleanup = cleanupResult;
    
    // 4. 发送通知
    await sendBackupNotification(summary);
    
    console.log('备份完成:', summary);
    
    return {
      code: 0,
      msg: '备份成功',
      data: summary
    };
  } catch (err) {
    console.error('备份过程发生错误:', err);
    return {
      code: 500,
      msg: '备份失败: ' + err.message,
      data: null
    };
  }
};
