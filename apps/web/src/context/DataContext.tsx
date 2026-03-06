'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  mockClients, 
  mockProducts, 
  mockGlobalTriggers, 
  mockProtocol,
  mockIngredients,
  mockFeedbacks,
  mockWeightLogs
} from '../../../mp/src/mocks/data';
import { Client, Product, Protocol, ProtocolTrigger, Ingredient, FollowUpNote, ConflictRule, UserTask, Feedback, WeightLog, CheckinLog } from '@healthcare/shared';
import { cloud } from '../services/cloud';

// --- 类型定义 ---

export interface ImportBatch {
  id: string;
  type: 'clients' | 'products';
  timestamp: string;
  count: number;
  dataIds: string[]; // 记录该批次导入的所有 ID，用于撤回
}

interface DataContextType {
  clients: Client[];
  products: Product[];
  triggers: ProtocolTrigger[];
  protocols: Protocol[];
  ingredients: Ingredient[]; // 新增：成分库状态
  importBatches: ImportBatch[]; // 新增：导入批次记录
  userTasks: UserTask[]; // 新增：手动创建的待办任务
  conflictRules: ConflictRule[]; // 新增：冲突规则库
  feedbacks: Feedback[]; // [v3.9] 留言互动数据
  weightLogs: WeightLog[]; // [v3.9] 体征日志数据
  checkinLogs: CheckinLog[]; // [v4.0] 打卡日志数据
  setClients: React.Dispatch<React.SetStateAction<Client[]>>; // 新增：供特殊场景手动更新
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client, partial?: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product, partial?: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addIngredient: (ingredient: Ingredient) => Promise<void>; // 新增：添加成分
  bulkAddClients: (clients: Client[], batchId: string) => Promise<void>;
  bulkAddProducts: (products: Product[], batchId: string) => Promise<void>;
  rollbackBatch: (batchId: string) => Promise<void>;
  addTrigger: (trigger: ProtocolTrigger) => Promise<void>;
  updateTrigger: (trigger: ProtocolTrigger, partial?: Partial<ProtocolTrigger>) => Promise<void>;
  deleteTrigger: (id: string) => Promise<void>;
  addProtocol: (protocol: Protocol) => Promise<void>;
  updateProtocol: (protocol: Protocol, partial?: Partial<Protocol>) => Promise<void>;
  deleteProtocol: (id: string) => Promise<void>;
  cleanEmptyProtocols: () => Promise<number>;
  addUserTask: (task: UserTask) => Promise<void>;
  updateUserTask: (task: UserTask, partial?: Partial<UserTask>) => Promise<void>;
  deleteUserTask: (id: string) => Promise<void>;
  addFeedback: (feedback: Feedback) => Promise<void>; // [v3.9] 发送留言
  updateFeedback: (id: string, partial: Partial<Feedback>) => Promise<void>; // [v3.9] 更新留言状态 (如已读)
  addWeightLog: (log: WeightLog) => Promise<void>; // [v3.9] 记录体征数据
  addHealthMetric: (metric: any) => Promise<void>; // 新增：健康指标同步
  addCheckinLog: (log: CheckinLog) => Promise<void>; // [v4.0] 添加打卡记录
  deleteCheckinLog: (id: string) => Promise<void>; // [v4.0] 删除打卡记录 (撤销)
  addUserLog: (clientId: string, log: Omit<FollowUpNote, 'id' | 'client_id' | 'practitioner_id' | 'created_at'>, tags?: string[]) => Promise<void>;
  calibrateInventory: (clientId: string, productId: string, stock: number) => Promise<void>;
  checkConflicts: (clientId: string, protocolId: string) => ConflictRule[]; // 新增：检测冲突逻辑
  refreshData: () => Promise<void>; // 新增：刷新数据
  isLoaded: boolean; // 新增：加载状态
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with lazy initialization to access localStorage only on client
  // 1. 状态初始化：必须保证服务端和客户端渲染的首帧完全一致，否则 Hydration 会失败导致按钮点不动
  const [isLoaded, setIsLoaded] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [triggers, setTriggers] = useState<ProtocolTrigger[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [conflictRules, setConflictRules] = useState<ConflictRule[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);

  // 2. 初始化数据逻辑
  const initData = async () => {
    console.log('[Step 1] initData 开始执行');
    
    try {
      // [断腕操作] 按要求跳过本地存储读取，直接进入云端同步流程
      console.log('[Step 2] 跳过本地存储，强制使用 Mock/云端');
      
      setClients(mockClients);
      setProducts(mockProducts);
      
      // [强制注入] 确保积分奖励规则存在，即使 mockGlobalTriggers 中没有
      const pointRules: ProtocolTrigger[] = [
        {
          id: 'trig-9',
          category: 'points',
          name: '基础打卡奖励',
          description: '每日坚持的动力',
          condition: { type: 'adherence_streak', threshold: 1 },
          action: { type: 'push_red_dot', priority: 'low', label: '【积分入账】', payload_template: '1' },
          is_enabled: true,
          updated_at: new Date().toISOString()
        },
        {
          id: 'trig-10',
          category: 'points',
          name: '连续 3 天额外奖励',
          description: '建立初步习惯',
          condition: { type: 'adherence_streak', threshold: 3 },
          action: { type: 'push_red_dot', priority: 'low', label: '【额外积分】', payload_template: '1' },
          is_enabled: true,
          updated_at: new Date().toISOString()
        },
        {
          id: 'trig-11',
          category: 'points',
          name: '连续 7 天大奖',
          description: '达成首周目标',
          condition: { type: 'adherence_streak', threshold: 7 },
          action: { type: 'push_red_dot', priority: 'medium', label: '【里程碑大奖】', payload_template: '2' },
          is_enabled: true,
          updated_at: new Date().toISOString()
        }
      ];

      const allTriggers = [...mockGlobalTriggers];
      pointRules.forEach(rule => {
        if (!allTriggers.find(t => t.id === rule.id)) {
          allTriggers.push(rule);
        }
      });

      setTriggers(allTriggers);
      setProtocols([mockProtocol]);
      setIngredients(mockIngredients);
      setFeedbacks(mockFeedbacks);
      setWeightLogs(mockWeightLogs);
      setUserTasks([]);
      setImportBatches([]);
      setCheckinLogs([]);

      // [核心修复] 将 Mock 数据同步到 localStorage，确保 cloud.findClientByPhone 能查到
      if (typeof window !== 'undefined') {
        localStorage.setItem('hc_clients', JSON.stringify(mockClients));
        localStorage.setItem('hc_products', JSON.stringify(mockProducts));
        localStorage.setItem('hc_feedbacks', JSON.stringify(mockFeedbacks));
      }

      console.log('[Step 3] 初始 Mock 数据载入完成并同步至本地');
    } catch (e: any) {
      console.error(`[Error] ${e.message}`);
    } finally {
      console.log('[Step 4] 强制进入应用');
      setIsLoaded(true);
    }

    // 3. 后台同步逻辑 (现在改为立即同步)
    console.log('[Data] 正在同步云端数据...');
    try {
      console.log('[Sync] 启动后台云端同步');
      const withTimeout = async (promise: Promise<any>) => {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
        return Promise.race([promise, timeout]);
      };

      const fetchPromises = [
        withTimeout(cloud.getCollection<Client>('clients')),
        withTimeout(cloud.getCollection<Product>('products')),
        withTimeout(cloud.getCollection<ProtocolTrigger>('triggers')),
        withTimeout(cloud.getCollection<Protocol>('protocols')),
        withTimeout(cloud.getCollection<Ingredient>('ingredients')),
        withTimeout(cloud.getCollection<ImportBatch>('import_batches')),
        withTimeout(cloud.getCollection<UserTask>('user_tasks')),
        withTimeout(cloud.getCollection<ConflictRule>('conflict_rules')),
        withTimeout(cloud.getCollection<Feedback>('feedbacks')),
        withTimeout(cloud.getCollection<WeightLog>('weight_logs')),
        withTimeout(cloud.getCollection<CheckinLog>('checkin_logs')),
      ];

      const results = await Promise.allSettled(fetchPromises);
      
      const keys = [
        'hc_clients', 'hc_products', 'hc_triggers', 'hc_protocols', 
        'hc_ingredients', 'hc_import_batches', 'hc_user_tasks', 
        'hc_conflict_rules', 'hc_feedbacks', 'hc_weight_logs', 'hc_checkin_logs'
      ];
      const setters = [
        setClients, setProducts, setTriggers, setProtocols, 
        setIngredients, setImportBatches, setUserTasks, 
        setConflictRules, setFeedbacks, setWeightLogs, setCheckinLogs
      ];

      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value && Array.isArray(res.value) && res.value.length > 0) {
          setters[i](res.value);
          localStorage.setItem(keys[i], JSON.stringify(res.value));
        }
      });
      console.log('[Data] ✅ 后台同步完成');
    } catch (err) {
      console.log('[Data] 后台同步失败 (非阻塞):', err);
    }
  };

  useEffect(() => {
    console.log('[System] useEffect 触发');
    
    // 如果是 PWA 或者有旧数据，立即尝试放行
    const isStandalone = typeof window !== 'undefined' && (
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches
    );
    const hasData = typeof window !== 'undefined' && !!localStorage.getItem('hc_clients');

    if (isStandalone || hasData) {
      console.log('[System] 检测到 PWA/本地数据，加速开屏');
      setIsLoaded(true);
    }

    const timer = setTimeout(() => {
      initData();
    }, 50);

    // 终极兜底：无论如何，3秒后必须关闭全屏加载状态（如果还有的话）
    const safetyTimer = setTimeout(() => {
      setIsLoaded(true);
      console.log('[System] 触发 3s 终极兜底放行');
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, []);

  const refreshData = async () => {
    setIsLoaded(false);
    await initData();
  };

  // 状态变更时仅保存到 localStorage 作为备份（云端同步已移至操作函数内部）
  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_clients', JSON.stringify(clients));
  }, [clients, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_products', JSON.stringify(products));
  }, [products, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_triggers', JSON.stringify(triggers));
  }, [triggers, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_protocols', JSON.stringify(protocols));
  }, [protocols, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_ingredients', JSON.stringify(ingredients));
  }, [ingredients, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_import_batches', JSON.stringify(importBatches));
  }, [importBatches, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_user_tasks', JSON.stringify(userTasks));
  }, [userTasks, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_feedbacks', JSON.stringify(feedbacks));
  }, [feedbacks, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_weight_logs', JSON.stringify(weightLogs));
  }, [weightLogs, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('hc_checkin_logs', JSON.stringify(checkinLogs));
  }, [checkinLogs, isLoaded]);

  // CRUD Operations with Cloud Sync
  const addClient = async (client: Client) => {
    setClients(prev => [client, ...prev]);
    await cloud.addItem('clients', client);
  };

  const updateClient = async (updatedClient: Client, partialUpdate?: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    // 如果提供了 partialUpdate，则只同步增量数据到云端，否则全量同步
    await cloud.updateItem('clients', updatedClient.id, partialUpdate || updatedClient);
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    await cloud.deleteItem('clients', id);
  };

  const addProduct = async (product: Product) => {
    setProducts(prev => [product, ...prev]);
    await cloud.addItem('products', product);
  };

  const updateProduct = async (updatedProduct: Product, partialUpdate?: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    await cloud.updateItem('products', updatedProduct.id, partialUpdate || updatedProduct);
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await cloud.deleteItem('products', id);
  };

  const bulkAddClients = async (newClients: Client[], batchId: string) => {
    setClients(prev => [...newClients, ...prev]);
    const batch: ImportBatch = {
      id: batchId,
      type: 'clients',
      timestamp: new Date().toISOString(),
      count: newClients.length,
      dataIds: newClients.map(c => c.id)
    };
    setImportBatches(prev => [batch, ...prev]);
    
    // 云端同步
    await Promise.all([
      cloud.syncData('clients', newClients),
      cloud.addItem('import_batches', batch)
    ]);
  };

  const addTrigger = async (trigger: ProtocolTrigger) => {
    setTriggers(prev => [...prev, trigger]);
    await cloud.addItem('triggers', trigger);
  };

  const updateTrigger = async (updatedTrigger: ProtocolTrigger, partialUpdate?: Partial<ProtocolTrigger>) => {
    setTriggers(prev => prev.map(t => t.id === updatedTrigger.id ? updatedTrigger : t));
    await cloud.updateItem('triggers', updatedTrigger.id, partialUpdate || updatedTrigger);
  };

  const deleteTrigger = async (id: string) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
    await cloud.deleteItem('triggers', id);
  };

  const addProtocol = async (protocol: Protocol) => {
    setProtocols(prev => [protocol, ...prev]);
    await cloud.addItem('protocols', protocol);
  };

  const updateProtocol = async (updatedProtocol: Protocol, partialUpdate?: Partial<Protocol>) => {
    setProtocols(prev => {
      const exists = prev.some(p => p.id === updatedProtocol.id);
      if (exists) {
        return prev.map(p => p.id === updatedProtocol.id ? updatedProtocol : p);
      }
      return [updatedProtocol, ...prev];
    });

    const existsInCloud = protocols.some(p => p.id === updatedProtocol.id);
    if (existsInCloud) {
      await cloud.updateItem('protocols', updatedProtocol.id, partialUpdate || updatedProtocol);
    } else {
      await cloud.addItem('protocols', updatedProtocol);
    }
  };

  const deleteProtocol = async (id: string) => {
    setProtocols(prev => prev.filter(p => p.id !== id));
    await cloud.deleteItem('protocols', id);
  };

  const cleanEmptyProtocols = async () => {
    const emptyProtocols = protocols.filter(p => 
      (!p.name || p.name === '新调理配方 SOP' || p.name.trim() === '') && 
      p.phases.length === 0 && 
      p.triggers.length === 0
    );

    if (emptyProtocols.length === 0) return 0;

    const idsToDelete = emptyProtocols.map(p => p.id);
    setProtocols(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    
    await Promise.all(idsToDelete.map(id => cloud.deleteItem('protocols', id)));
    return idsToDelete.length;
  };

  const addUserTask = async (task: UserTask) => {
    setUserTasks(prev => [task, ...prev]);
    await cloud.addItem('user_tasks', task);
  };

  const updateUserTask = async (updatedTask: UserTask, partialUpdate?: Partial<UserTask>) => {
    setUserTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    await cloud.updateItem('user_tasks', updatedTask.id, partialUpdate || updatedTask);
  };

  const deleteUserTask = async (id: string) => {
    setUserTasks(prev => prev.filter(t => t.id !== id));
    await cloud.deleteItem('user_tasks', id);
  };

  const addFeedback = async (feedback: Feedback) => {
    setFeedbacks(prev => [...prev, feedback]);
    await cloud.addItem('feedbacks', feedback);
  };

  const updateFeedback = async (id: string, partial: Partial<Feedback>) => {
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, ...partial } : f));
    await cloud.updateItem('feedbacks', id, partial);
  };

  const addWeightLog = async (log: WeightLog) => {
    setWeightLogs(prev => [...prev, log]);
    await cloud.addItem('weight_logs', log);
  };

  const addHealthMetric = async (metric: any) => {
    // 同时也存入 weight_logs 以保持兼容性，如果它是一个体重指标
    if (metric.metric_type === 'Weight') {
      const weightLog: WeightLog = {
        id: metric.id,
        client_id: metric.client_id,
        weight_kg: metric.metric_value,
        recorded_at: metric.recorded_at || new Date().toISOString(),
        source: 'manual'
      };
      setWeightLogs(prev => [...prev, weightLog]);
    }
    // 同步到云端 health_metrics 表
    await cloud.addItem('health_metrics', metric);
  };

  const addCheckinLog = async (log: CheckinLog) => {
    setCheckinLogs(prev => [...prev, log]);
    await cloud.addItem('checkin_logs', log);
    
    // 联动逻辑：打卡成功后，自动扣减客户库存
    const client = clients.find(c => c.id === log.client_id);
    if (client && log.product_id) {
      const currentInventory = client.inventory_status || [];
      const item = currentInventory.find(i => i.product_id === log.product_id);
      if (item) {
        // 简单扣减：假设每次打卡消耗 1 个单位（实际应根据 action.dosage_per_time 计算）
        // 这里先做简单处理，后续在业务层可以传入更精确的扣减值
        await calibrateInventory(log.client_id, log.product_id, Math.max(0, item.current_stock - 1));
      }
    }
  };

  const deleteCheckinLog = async (id: string) => {
    const logToDelete = checkinLogs.find(l => l.id === id);
    setCheckinLogs(prev => prev.filter(l => l.id !== id));
    await cloud.deleteItem('checkin_logs', id);

    // 联动逻辑：撤销打卡后，自动回退客户库存
    if (logToDelete && logToDelete.client_id && logToDelete.product_id) {
      const client = clients.find(c => c.id === logToDelete.client_id);
      if (client) {
        const currentInventory = client.inventory_status || [];
        const item = currentInventory.find(i => i.product_id === logToDelete.product_id);
        if (item) {
          await calibrateInventory(logToDelete.client_id, logToDelete.product_id, item.current_stock + 1);
        }
      }
    }
  };

  const addIngredient = async (ingredient: Ingredient) => {
    setIngredients(prev => [ingredient, ...prev]);
    await cloud.addItem('ingredients', ingredient);
  };

  const addUserLog = async (clientId: string, logData: Omit<FollowUpNote, 'id' | 'client_id' | 'practitioner_id' | 'created_at'>, tags?: string[]) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newLog: FollowUpNote = {
      ...logData,
      id: `log-${Date.now()}`,
      client_id: clientId,
      practitioner_id: client.practitioner_id,
      created_at: new Date().toISOString(),
    };

    const updatedClient = {
      ...client,
      follow_up_notes: [newLog, ...(client.follow_up_notes || [])],
      tags: tags || client.tags,
    };
    
    // 增量同步：只同步更新的字段
    const partialUpdate: Partial<Client> = {
      follow_up_notes: updatedClient.follow_up_notes,
      tags: updatedClient.tags,
    };
    
    await updateClient(updatedClient, partialUpdate);
  };

  const calibrateInventory = async (clientId: string, productId: string, stock: number) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // 获取当前配方，计算每日用量以估算水位
    const protocol = protocols.find(p => p.id === client.protocol_id);
    let dailyUsage = 0;
    
    if (protocol) {
      // 找到该产品在配方中的所有动作，计算总用量
      protocol.phases.forEach(phase => {
        phase.actions.forEach(action => {
          if (action.product_id === productId) {
            const freq = action.frequency_per_day || 0;
            const dosage = parseFloat(action.dosage_per_time) || 0;
            dailyUsage += freq * dosage;
          }
        });
      });
    }

    const remainingDays = dailyUsage > 0 ? Math.floor(stock / dailyUsage) : 999;
    
    const currentInventory = client.inventory_status || [];
    const itemIndex = currentInventory.findIndex(i => i.product_id === productId);
    
    let updatedInventory;
    if (itemIndex > -1) {
      updatedInventory = [...currentInventory];
      updatedInventory[itemIndex] = {
        ...updatedInventory[itemIndex],
        current_stock: stock,
        remaining_days: remainingDays,
        last_calibration_date: new Date().toISOString(),
      };
    } else {
      updatedInventory = [
        ...currentInventory,
        {
          product_id: productId,
          current_stock: stock,
          remaining_days: remainingDays,
          last_calibration_date: new Date().toISOString(),
        }
      ];
    }

    const updatedClient = {
      ...client,
      inventory_status: updatedInventory
    };

    await updateClient(updatedClient, { inventory_status: updatedInventory });
  };

  const checkConflicts = (clientId: string, protocolId: string): ConflictRule[] => {
    const client = clients.find(c => c.id === clientId);
    const protocol = protocols.find(p => p.id === protocolId);
    if (!client || !protocol) return [];

    const foundConflicts: ConflictRule[] = [];
    const clientMedications = (client.current_medications || []).join(',').toLowerCase();
    
    // 展平配方中的所有成分名称
    const protocolIngredientNames = protocol.phases.flatMap(phase => 
      phase.actions.flatMap(action => {
        const product = products.find(p => p.id === action.product_id);
        return product?.ingredients?.map(ing => {
          const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
          return ingredient?.name.toLowerCase() || '';
        }) || [];
      })
    );

    conflictRules.forEach(rule => {
      const medMatch = clientMedications.includes(rule.medication_keyword.toLowerCase());
      const ingredientMatch = protocolIngredientNames.some(name => name.includes(rule.ingredient_keyword.toLowerCase()));
      
      if (medMatch && ingredientMatch) {
        foundConflicts.push(rule);
      }
    });

    return foundConflicts;
  };

  const bulkAddProducts = async (newProducts: Product[], batchId: string) => {
    setProducts(prev => [...newProducts, ...prev]);
    const batch: ImportBatch = {
      id: batchId,
      type: 'products',
      timestamp: new Date().toISOString(),
      count: newProducts.length,
      dataIds: newProducts.map(p => p.id)
    };
    setImportBatches(prev => [batch, ...prev]);

    // 云端同步
    await Promise.all([
      cloud.syncData('products', newProducts),
      cloud.addItem('import_batches', batch)
    ]);
  };

  const rollbackBatch = async (batchId: string) => {
    const batch = importBatches.find(b => b.id === batchId);
    if (!batch) return;

    if (batch.type === 'clients') {
      setClients(prev => prev.filter(c => !batch.dataIds.includes(c.id)));
      // 从云端批量删除
      await Promise.all(batch.dataIds.map(id => cloud.deleteItem('clients', id)));
    } else {
      setProducts(prev => prev.filter(p => !batch.dataIds.includes(p.id)));
      // 从云端批量删除
      await Promise.all(batch.dataIds.map(id => cloud.deleteItem('products', id)));
    }
    setImportBatches(prev => prev.filter(b => b.id !== batchId));
    await cloud.deleteItem('import_batches', batchId);
  };

    if (!isLoaded) {
      // 在加载期间也渲染 children，确保页面内容可见
      // 加载层作为 Overlay 存在
    }
  
    return (
      <DataContext.Provider
        value={{
          clients,
          products,
          triggers,
          protocols,
          ingredients,
          importBatches,
          userTasks,
          conflictRules,
          feedbacks,
          weightLogs,
    checkinLogs,
    setClients,
    addClient,
    updateClient,
          deleteClient,
          addProduct,
          updateProduct,
          deleteProduct,
          bulkAddClients,
          bulkAddProducts,
          rollbackBatch,
          addTrigger,
          updateTrigger,
          deleteTrigger,
          addProtocol,
          updateProtocol,
          deleteProtocol,
          cleanEmptyProtocols,
          addUserTask,
          updateUserTask,
          deleteUserTask,
          addFeedback,
          updateFeedback,
          addWeightLog,
          addHealthMetric,
          addCheckinLog,
          deleteCheckinLog,
          addIngredient,
          addUserLog,
          calibrateInventory,
          checkConflicts,
          refreshData,
          isLoaded,
        }}
      >
        {/* 彻底移除 Overlay 覆盖层，改用极简的绝对定位提示，且不阻断交互 */}
        {!isLoaded && (
          <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
            <div className="bg-slate-900/80 text-white text-[10px] px-3 py-2 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <div className="w-2 h-2 border border-white/30 border-t-white rounded-full animate-spin" />
              正在同步数据...
            </div>
          </div>
        )}
        {children}
      </DataContext.Provider>
    );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
