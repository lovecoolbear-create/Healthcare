'use client';

import React, { Suspense } from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Bell, 
  Plus, 
  Search,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Package,
  Layers,
  Activity,
  FileEdit,
  Menu,
  X,
  ShieldCheck,
  Target,
  FlaskConical,
  Database,
  Zap,
  CheckCircle2,
  Moon,
  Trash2,
  Save
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useData } from '../context/DataContext';
import { Client, Product, ProtocolPhase, ProtocolAction, ProtocolTrigger, Protocol } from '@healthcare/shared';
import { mockIngredients } from '../../../mp/src/mocks/data';
import { ImportBatch } from '../context/DataContext';

import { Sidebar } from '../components/Sidebar';
import { ActiveTab } from '../types';
import { useTriggers, Alert as TriggerAlert, ALERT_GROUPS } from '../hooks/useTriggers';

function DashboardContent() {
  const { 
    clients, addClient, updateClient, deleteClient, bulkAddClients,
    products, addProduct, updateProduct, deleteProduct, bulkAddProducts,
    triggers, addTrigger, updateTrigger, deleteTrigger,
    protocols, addProtocol, updateProtocol, deleteProtocol, cleanEmptyProtocols,
    ingredients, addIngredient,
    importBatches, rollbackBatch,
    userTasks, addUserTask, updateUserTask, addUserLog
  } = useData();
  
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'dashboard';
  const [activeTab, setActiveTab] = React.useState<ActiveTab>(initialTab);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false);
  const [newTaskMode, setNewTaskMode] = React.useState<'log' | 'todo'>('log');

  // Ingredient search state
  const [ingredientSearch, setIngredientSearch] = React.useState('');
  const [selectedIngredients, setSelectedIngredients] = React.useState<{ingredient_id: string, amount_per_unit: number, unit: string}[]>([]);

  React.useEffect(() => {
    if (editingProduct?.ingredients) {
      setSelectedIngredients(editingProduct.ingredients);
    } else {
      setSelectedIngredients([]);
    }
  }, [editingProduct]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // 当 URL 参数变化时更新 tab
  React.useEffect(() => {
    const tab = searchParams.get('tab') as ActiveTab;
    if (tab) {
      setActiveTab(tab);
      setIsMobileMenuOpen(false); // 切换 tab 时关闭手机菜单
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSilentRuleEnabled, setIsSilentRuleEnabled] = React.useState(true);
  
  // 使用中心化逻辑 hook
  const { allAlerts, simulateTriggers } = useTriggers(isSilentRuleEnabled);
  
  // 产品选择 Modal 状态
  const [isProductSelectModalOpen, setIsProductSelectModalOpen] = React.useState(false);
  const [activePhaseIdForProductSelect, setActivePhaseIdForProductSelect] = React.useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = React.useState('');
  
  // --- 逻辑模拟器状态 (Logic Simulator States) ---
  const [isSimulatorOpen, setIsSimulatorOpen] = React.useState(false);
  const [mockClient, setMockClient] = React.useState<Partial<Client>>({
    name: '测试客户',
    missed_days: 0,
    inventory_status: [],
    feeling_metrics: { energy_score: 80, sleep_score: 80, mood_score: 80, trend_pivot: false },
    created_at: new Date().toISOString()
  });
  const [simulationResults, setSimulationResults] = React.useState<any[]>([]);

  const handleSimulate = () => {
    const results = simulateTriggers(mockClient);
    setSimulationResults(results);
  };
  
  // --- 实战工作助手逻辑 (Work Assistant Logic) ---
  // 核心逻辑：基于“成交意向”与“服务风险”智能生成待办
  
  // 辅助变量用于统计和兼容旧代码
  const stockAlertClients = allAlerts.filter(a => a.alertType === 'inventory');
  const sopMilestoneClients = allAlerts.filter(a => a.alertType === 'sop' || a.alertType === 'growth');

  // 计算来源分布数据
  const sourceDistribution = clients.reduce((acc, client) => {
    const source = client.source || 'direct';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceLabels: Record<string, string> = {
    'direct': '自然到访',
    'wechat_moments': '朋友圈',
    'referral': '客户推荐',
    'tiktok': '抖音/小红书',
    'other': '其他'
  };

  // Protocol State - now managing the currently edited protocol
  const [currentProtocol, setCurrentProtocol] = React.useState<Protocol | null>(null);

  const [isTriggerModalOpen, setIsTriggerModalOpen] = React.useState(false);
  const [editingTrigger, setEditingTrigger] = React.useState<ProtocolTrigger | null>(null);

  // --- 批量导入相关状态 (Bulk Import States) ---
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [importType, setImportType] = React.useState<'clients' | 'products'>('clients');
  const [importStep, setImportStep] = React.useState<'upload' | 'preview' | 'history'>('upload');
  const [previewData, setPreviewData] = React.useState<any[]>([]);
  const [importErrors, setImportErrors] = React.useState<{row: number, field: string, msg: string}[]>([]);

  // 模拟 Excel 解析与校验逻辑
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 1) return;

      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = values[index];
        });
        return rowObj;
      });

      let data: any[] = [];
      let errors: any[] = [];

      if (importType === 'products') {
        // Map headers to internal fields
        const fieldMap: Record<string, string> = {
          '产品名称': 'name',
          '品牌': 'brand',
          '企业名称': 'enterprise_name',
          '单次剂量单位': 'dosage_unit',
          '规格数量': 'spec_quantity',
          '规格单位': 'spec_unit',
          '主要功效(逗号分隔)': 'main_efficacy_raw',
          '核心成分(ID:含量:单位,逗号分隔)': 'ingredients_raw',
          '产品分类': 'category',
          '每日建议剂量': 'dosage_per_day',
          '禁忌项': 'precautions'
        };

        data = dataRows.map(row => {
          const item: any = {};
          Object.keys(fieldMap).forEach(header => {
            item[fieldMap[header]] = row[header];
          });
          return item;
        });

        // Validation
        data.forEach((item, idx) => {
          if (!item.name) errors.push({ row: idx, field: 'name', msg: '产品名称必填' });
          if (!item.brand) errors.push({ row: idx, field: 'brand', msg: '品牌必填' });
          if (item.spec_quantity && isNaN(Number(item.spec_quantity))) {
            errors.push({ row: idx, field: 'spec_quantity', msg: '规格数量必须为数字' });
          }
        });
      } else {
        // Map headers to internal fields for clients
        const fieldMap: Record<string, string> = {
          '姓名': 'name',
          '手机号': 'phone',
          '性别(male/female)': 'gender',
          '生日(YYYY-MM-DD)': 'birthday',
          '身高(cm)': 'height_cm',
          '体重(kg)': 'weight_kg',
          '调理目标': 'health_goal',
          '获客来源': 'source'
        };

        data = dataRows.map(row => {
          const item: any = {};
          Object.keys(fieldMap).forEach(header => {
            item[fieldMap[header]] = row[header];
          });
          return item;
        });

        // Validation
        const seenPhones = new Set();
        data.forEach((item, idx) => {
          if (!item.name) errors.push({ row: idx, field: 'name', msg: '姓名必填' });
          if (!item.phone) errors.push({ row: idx, field: 'phone', msg: '手机号必填' });
          if (seenPhones.has(item.phone) || clients.some(c => c.phone === item.phone)) {
            errors.push({ row: idx, field: 'phone', msg: '手机号重复' });
          }
          seenPhones.add(item.phone);
          if (item.birthday && isNaN(Date.parse(item.birthday))) {
            errors.push({ row: idx, field: 'birthday', msg: '日期格式错误' });
          }
        });
      }

      setPreviewData(data);
      setImportErrors(errors);
      setImportStep('preview');
    };
    reader.readAsText(file);
  };

  // 动态生成导入模板
  const handleDownloadTemplate = () => {
    // 基础核心字段 (强制性)
    const clientBaseFields = ['姓名', '手机号', '性别(male/female)', '生日(YYYY-MM-DD)', '身高(cm)', '体重(kg)'];
    const productBaseFields = ['产品名称', '品牌', '企业名称', '单次剂量单位', '规格数量', '规格单位', '主要功效(逗号分隔)', '核心成分(ID:含量:单位,逗号分隔)'];

    // 动态扩展字段 (基于 PDR 2.0 中心化引擎)
    // 客户档案扩展：调理目标、获客来源
    const clientExtendedFields = ['调理目标', '获客来源'];
    // 产品库扩展：产品分类、每日建议剂量、禁忌项
    const productExtendedFields = ['产品分类', '每日建议剂量', '禁忌项'];

    const headers = importType === 'clients' 
      ? [...clientBaseFields, ...clientExtendedFields]
      : [...productBaseFields, ...productExtendedFields];
    
    // 生成 CSV 内容 (UTF-8 with BOM for Excel compatibility)
    const csvContent = "\uFEFF" + headers.join(",");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${importType === 'clients' ? '客户档案' : '产品库'}_标准导入模板_v2.0.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmImport = () => {
    if (importErrors.length > 0) {
      alert('请修正所有错误后再入库');
      return;
    }

    const batchId = `batch-${Date.now()}`;
    if (importType === 'products') {
      const newProducts: Product[] = previewData.map((d, i) => ({
        id: `prod-${batchId}-${i}`,
        name: d.name,
        brand: d.brand,
        enterprise_name: d.enterprise_name,
        category: d.category,
        dosage_per_day: d.dosage_per_day ? Number(d.dosage_per_day) : undefined,
        precautions: d.precautions,
        dosage_unit: d.dosage_unit,
        spec_quantity: Number(d.spec_quantity),
        spec_unit: d.spec_unit,
        main_efficacy: d.main_efficacy_raw ? d.main_efficacy_raw.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [],
        ingredients: d.ingredients_raw ? d.ingredients_raw.split(/[,，]/).map((s: string) => {
          const p = s.trim().split(/[:：]/);
          return { ingredient_id: p[0], amount_per_unit: Number(p[1]), unit: p[2] || 'mg' };
        }).filter((ing: any) => ing.ingredient_id) : []
      }));
      bulkAddProducts(newProducts, batchId);
    } else {
      const newClients: Client[] = previewData.map((d, i) => ({
        id: `client-${batchId}-${i}`,
        name: d.name,
        phone: d.phone,
        gender: d.gender,
        birthday: d.birthday,
        height_cm: d.height_cm ? Number(d.height_cm) : undefined,
        weight_kg: d.weight_kg ? Number(d.weight_kg) : undefined,
        health_goal: d.health_goal,
        source: d.source,
        practitioner_id: 'p-001',
        created_at: new Date().toISOString()
      }));
      bulkAddClients(newClients, batchId);
    }

    setIsImportModalOpen(false);
    setImportStep('upload');
    alert(`成功导入 ${previewData.length} 条记录`);
  };

  // --- 干预触发器配置 logic (Trigger Config Logic) ---
  const handleAddClient = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClient: Client = {
      id: editingClient?.id || `c-${Date.now()}`,
      practitioner_id: 'p-001',
      created_at: editingClient?.created_at || new Date().toISOString(),
      ...editingClient,
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      gender: (formData.get('gender') as 'male' | 'female' | 'other') || 'female',
      birthday: formData.get('birthday') as string || undefined,
      height_cm: Number(formData.get('height_cm')) || undefined,
      weight_kg: Number(formData.get('weight_kg')) || undefined,
      health_goal: formData.get('health_goal') as string,
      source: formData.get('source') as string,
      conversion_intent: formData.get('conversion_intent') as 'low' | 'medium' | 'high',
    };

    if (editingClient?.id) {
      const partialUpdate: Partial<Client> = {
        name: newClient.name,
        phone: newClient.phone,
        gender: newClient.gender,
        birthday: newClient.birthday,
        height_cm: newClient.height_cm,
        weight_kg: newClient.weight_kg,
        health_goal: newClient.health_goal,
        source: newClient.source,
        conversion_intent: newClient.conversion_intent
      };
      await updateClient(newClient, partialUpdate);
    } else {
      await addClient(newClient);
    }
    setIsClientModalOpen(false);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const efficacyStr = formData.get('main_efficacy') as string;
    const efficacyList = efficacyStr ? efficacyStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
    
  const newProduct: Product = {
    id: editingProduct?.id || `prod-${Date.now()}`,
    name: formData.get('name') as string,
    brand: formData.get('brand') as string,
    enterprise_name: formData.get('enterprise_name') as string,
    dosage_unit: formData.get('dosage_unit') as string,
    spec_quantity: Number(formData.get('spec_quantity')) || 60,
    spec_unit: formData.get('spec_unit') as string || '粒',
    main_efficacy: efficacyList,
    ingredients: selectedIngredients,
  };

    if (editingProduct?.id) {
      const partialUpdate: Partial<Product> = {
        name: newProduct.name,
        brand: newProduct.brand,
        enterprise_name: newProduct.enterprise_name,
        dosage_unit: newProduct.dosage_unit,
        spec_quantity: newProduct.spec_quantity,
        spec_unit: newProduct.spec_unit,
        main_efficacy: newProduct.main_efficacy,
        ingredients: newProduct.ingredients
      };
      await updateProduct(newProduct, partialUpdate);
    } else {
      await addProduct(newProduct);
    }
    setIsProductModalOpen(false);
  };

  const handleSaveTrigger = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTrigger: ProtocolTrigger = {
      id: editingTrigger?.id || `trig-${Date.now()}`,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as any,
      is_enabled: true,
      updated_at: new Date().toISOString(),
      condition: {
        type: formData.get('condition_type') as any,
        threshold: Number(formData.get('condition_threshold')),
        period_days: formData.get('condition_period_days') ? Number(formData.get('condition_period_days')) : undefined,
      },
      action: {
        type: formData.get('action_type') as any,
        priority: formData.get('action_priority') as any,
        label: formData.get('action_label') as string,
        payload_template: formData.get('action_payload_template') as string,
      }
    };

    if (editingTrigger?.id) {
      const partialUpdate: Partial<ProtocolTrigger> = {
        name: newTrigger.name,
        description: newTrigger.description,
        category: newTrigger.category,
        condition: newTrigger.condition,
        action: newTrigger.action,
        updated_at: newTrigger.updated_at
      };
      await updateTrigger(newTrigger, partialUpdate);
    } else {
      await addTrigger(newTrigger);
    }
    setIsTriggerModalOpen(false);
  };

  const handleAddPhase = async () => {
    if (!currentProtocol) return;
    const newPhase: ProtocolPhase = {
      id: `phase-${Date.now()}`,
      protocol_id: currentProtocol.id,
      name: `第 ${currentProtocol.phases.length + 1} 阶段`,
      order: currentProtocol.phases.length + 1,
      duration_days: 14,
      actions: []
    };
    const updatedProtocol = {
      ...currentProtocol,
      phases: [...currentProtocol.phases, newPhase]
    };
    setCurrentProtocol(updatedProtocol);
    // 只有当配方已经存在于库中时才自动保存阶段变更
    if (protocols.some(p => p.id === updatedProtocol.id)) {
      await updateProtocol(updatedProtocol, { phases: updatedProtocol.phases });
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!currentProtocol) return;
    const updatedProtocol = {
      ...currentProtocol,
      phases: currentProtocol.phases.filter((p: ProtocolPhase) => p.id !== phaseId)
    };
    setCurrentProtocol(updatedProtocol);
    // 只有当配方已经存在于库中时才自动保存阶段删除
    if (protocols.some(p => p.id === updatedProtocol.id)) {
      await updateProtocol(updatedProtocol, { phases: updatedProtocol.phases });
    }
  };

  const handleSelectProduct = async (phaseId: string, productId: string) => {
    if (!currentProtocol) return;
    const phaseIndex = currentProtocol.phases.findIndex((p: ProtocolPhase) => p.id === phaseId);
    if (phaseIndex === -1) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newAction: ProtocolAction = {
      id: `act-${Date.now()}`,
      phase_id: phaseId,
      product_id: productId,
      frequency_per_day: 1,
      dosage_per_time: product.dosage_unit || '1粒',
      timing_tag: 'with_meal',
      usage_instructions: '',
      order: 0
    };

    const newPhases = [...currentProtocol.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      actions: [...newPhases[phaseIndex].actions, newAction]
    };
    
    const updatedProtocol = {
      ...currentProtocol,
      phases: newPhases
    };
    setCurrentProtocol(updatedProtocol);
    // 只有当配方已经存在于库中时才自动保存动作变更
    if (protocols.some(p => p.id === updatedProtocol.id)) {
      await updateProtocol(updatedProtocol, { phases: updatedProtocol.phases });
    }
    setIsProductSelectModalOpen(false);
    setActivePhaseIdForProductSelect(null);
  };

  const handleAddAction = async (phaseId: string) => {
    setActivePhaseIdForProductSelect(phaseId);
    setIsProductSelectModalOpen(true);
    setProductSearchQuery('');
  };

  const handleDeleteAction = async (phaseId: string, actionId: string) => {
    if (!currentProtocol) return;
    const phaseIndex = currentProtocol.phases.findIndex((p: ProtocolPhase) => p.id === phaseId);
    if (phaseIndex === -1) return;

    const newPhases = [...currentProtocol.phases];
    newPhases[phaseIndex] = {
      ...newPhases[phaseIndex],
      actions: newPhases[phaseIndex].actions.filter(a => a.id !== actionId)
    };
    
    const updatedProtocol = {
      ...currentProtocol,
      phases: newPhases
    };
    setCurrentProtocol(updatedProtocol);
    // 只有当配方已经存在于库中时才自动保存删除动作
    if (protocols.some(p => p.id === updatedProtocol.id)) {
      await updateProtocol(updatedProtocol, { phases: updatedProtocol.phases });
    }
  };

  const filteredClients = React.useMemo(() => {
    const baseFiltered = clients.filter((c: Client) => 
      c.name.includes(searchQuery) || c.phone?.includes(searchQuery)
    );
    
    // Sort logic: Highlighted clients (via Action Pool) go to top
    return baseFiltered.sort((a, b) => {
      const aIsHighlighted = allAlerts.some(alert => alert.id === a.id && alert.actionType === 'highlight_client');
      const bIsHighlighted = allAlerts.some(alert => alert.id === b.id && alert.actionType === 'highlight_client');
      
      if (aIsHighlighted && !bIsHighlighted) return -1;
      if (!aIsHighlighted && bIsHighlighted) return 1;
      return 0;
    });
  }, [clients, searchQuery, allAlerts]);

  // --- Dashboard 欢迎区域增强数据 (Enhanced Welcome Metrics) ---
  const todayTotalTodos = allAlerts.length;
  const highValueClients = React.useMemo(() => clients.filter(c => (c.loyalty_points || 0) > 500), [clients]);
  const highValueClientsCount = highValueClients.length;
  const urgentInterventionsCount = allAlerts.filter(a => a.alertType === 'urgent').length;
  const [isHighPotentialModalOpen, setIsHighPotentialModalOpen] = React.useState(false);

  const highPotentialClients = React.useMemo(() => {
    // 获取触发器中的动态阈值
    const stockTrigger = triggers.find(t => t.category === 'inventory' && t.is_enabled);
    const stockThreshold = stockTrigger?.condition?.threshold || 5;

    return clients.filter(c => {
      // 维度 1: 手动标注的高意向 (准成交)
      const isHighIntent = c.conversion_intent === 'high';
      
      // 维度 2: 库存临界 (动态使用触发器设置的阈值)
      const hasStockWarning = c.inventory_status?.some(s => s.remaining_days <= stockThreshold);
      
      // 维度 3: 高依从性 + 情绪高点 (表现优秀的客户最易转化)
      const isPerformingWell = (c.adherence_score || 0) >= 90 && (c.feeling_metrics?.energy_score || 0) >= 8;

      return isHighIntent || hasStockWarning || isPerformingWell;
    });
  }, [clients, triggers]);

  const highConversionPotentialCount = highPotentialClients.length;

  // 1. 补货人数统计 (Replenishment Stats)
  const stockAlertClientsCount = stockAlertClients.length;

  // 2. 体感改善评分逻辑 (Feeling Improvement Logic)
  const feelingImprovementStats = React.useMemo(() => {
    const clientsWithMetrics = clients.filter(c => c.feeling_metrics);
    if (clientsWithMetrics.length === 0) return { avgScore: 0, improvementRate: 0 };

    const totalScore = clientsWithMetrics.reduce((acc, c) => {
      const metrics = c.feeling_metrics!;
      // 综合精力、睡眠、情绪三个维度的平均分
      const clientAvg = (
        (metrics.energy_score || 0) + 
        (metrics.sleep_score || 0) + 
        (metrics.mood_score || 0)
      ) / 3;
      return acc + clientAvg;
    }, 0);
    const avgScore = totalScore / clientsWithMetrics.length;
    
    // 假设基准分为 5.0 (入伙前平均水平)
    const baseline = 5.0;
    const improvementRate = ((avgScore - baseline) / baseline) * 100;

    return { 
      avgScore: avgScore.toFixed(1), 
      improvementRate: Math.max(0, improvementRate).toFixed(0) 
    };
  }, [clients]);

  // 4. 健康指标改善率实时统计 (Health Indicator Improvement Stats)
  const healthImprovementMetrics = React.useMemo(() => {
    const categories = [
      { id: 'blood_sugar', label: '血糖平衡', keywords: ['血糖', '胰岛素', '糖尿病', '代谢'], color: 'bg-blue-500', icon: Activity },
      { id: 'gut_health', label: '肠道微生态', keywords: ['肠道', '消化', '便秘', '腹泻', '胃'], color: 'bg-emerald-500', icon: ShieldCheck },
      { id: 'body_fat', label: '体脂率优化', keywords: ['体脂', '减肥', '瘦身', '体重', '肥胖'], color: 'bg-purple-500', icon: Target },
      { id: 'sleep_quality', label: '睡眠质量提升', keywords: ['睡眠', '失眠', '早睡', '深度睡眠'], color: 'bg-orange-500', icon: Moon },
    ];

    return categories.map(cat => {
      // 筛选出有该项调理目标的客户 (基于 health_goal, health_baseline 或 tags)
      const targetClients = clients.filter(c => {
        const searchText = `${c.health_goal || ''} ${c.health_baseline || ''} ${c.tags?.join(' ') || ''}`.toLowerCase();
        return cat.keywords.some(k => searchText.includes(k));
      });

      if (targetClients.length === 0) return { ...cat, val: 0, total: 0, improved: 0, improvedClients: [], stagnantClients: [] };

      // 判定是否好转 (逻辑：综合评分 > 6 或有正面证据链)
      const improvedClients = targetClients.filter(c => {
        const metrics = c.feeling_metrics;
        if (!metrics) return false;
        
        // 不同维度使用不同评分判定
        if (cat.id === 'sleep_quality') return (metrics.sleep_score || 0) >= 7;
        if (cat.id === 'blood_sugar') return (metrics.energy_score || 0) >= 7;
        if (cat.id === 'gut_health') return (metrics.mood_score || 0) >= 7;
        if (cat.id === 'body_fat') return (metrics.energy_score || 0) >= 7;
        
        return false;
      });

      const stagnantClients = targetClients.filter(c => !improvedClients.find(ic => ic.id === c.id));
      const val = Math.round((improvedClients.length / targetClients.length) * 100);

      return { 
        ...cat, 
        val, 
        total: targetClients.length, 
        improved: improvedClients.length,
        improvedClients,
        stagnantClients
      };
    });
  }, [clients]);

  // 指标详情弹窗状态
   const [selectedMetricId, setSelectedMetricId] = React.useState<string | null>(null);
   const selectedMetric = healthImprovementMetrics.find(m => m.id === selectedMetricId);
 
  // 3. 已激活规则统计 (Active Triggers Stats)
  const activeTriggersCount = triggers.filter(t => t.is_enabled).length;
  const totalTriggersCount = triggers.length;

   const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {/* 欢迎区域 & 动态统计 (Welcome & Dynamic Stats) */}
            <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">早安，健康管理师</h2>
                <p className="text-sm md:text-base text-slate-500 font-medium mt-1">今天有 <span className="text-emerald-600 font-black">{todayTotalTodos}</span> 项干预待办，其中 <span className="text-rose-500 font-black">{urgentInterventionsCount}</span> 项紧急。</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <div className="bg-white px-4 md:px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">重点关注客户</div>
                    <div className="text-lg font-black text-slate-900">{highValueClientsCount} <span className="text-xs text-slate-300 ml-1">人</span></div>
                  </div>
                </div>
                <div className="bg-white px-4 md:px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">总管理客户</div>
                    <div className="text-lg font-black text-slate-900">{clients.length} <span className="text-xs text-slate-300 ml-1">人</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速执行动作条 (Quick Access) */}
            <div className="flex flex-wrap gap-2 md:gap-3 mb-8">
              {[
                { label: '一键提醒补货', icon: Package, count: stockAlertClients.length, color: 'text-orange-600', bg: 'bg-orange-50', targetId: 'replenishment-section' },
                { label: '待处理紧急干预', icon: Zap, count: allAlerts.filter(a => a.alertType === 'urgent').length, color: 'text-rose-600', bg: 'bg-rose-50', targetId: 'alerts-section' },
                { label: '今日关键随访', icon: Calendar, count: sopMilestoneClients.length, color: 'text-blue-600', bg: 'bg-blue-50', targetId: 'alerts-section' },
                { label: '方案调整任务', icon: FlaskConical, count: 2, color: 'text-emerald-600', bg: 'bg-emerald-50', targetId: 'alerts-section' }
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    const element = document.getElementById(action.targetId);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 ${action.bg} rounded-xl md:rounded-2xl border border-transparent hover:border-slate-200 transition-all group`}
                >
                  <action.icon className={`w-3.5 h-3.5 md:w-4 h-4 ${action.color}`} />
                  <span className="text-[9px] md:text-[11px] font-black text-slate-700 uppercase tracking-widest">{action.label}</span>
                  {action.count > 0 && (
                    <span className={`text-[9px] md:text-[10px] font-black ${action.color} bg-white px-1.5 md:px-2 py-0.5 rounded-lg shadow-sm`}>{action.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Dashboard 顶部核心指标 - 销售与转化视角 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              <div 
                onClick={() => setIsHighPotentialModalOpen(true)}
                className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
              >
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">高意向转化潜力</div>
                  <div className="text-3xl font-black tracking-tight">{highConversionPotentialCount} <span className="text-sm text-slate-400 ml-1">人</span></div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">重点跟进</span>
                    <span className="text-[10px] text-slate-400 font-bold">成交意向高 / 待补货</span>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => {
                  const element = document.getElementById('replenishment-section');
                  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
              >
                <div className="absolute right-0 bottom-0 opacity-5 translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                  <Package className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">待处理补货提醒</div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">{stockAlertClientsCount} <span className="text-sm text-slate-400 ml-1">人</span></div>
                  <div className="mt-4">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 rounded-full" 
                        style={{ width: `${Math.min(100, (stockAlertClientsCount / clients.length) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('reports')}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
              >
                <div className="absolute right-0 bottom-0 opacity-5 translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                  <Activity className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">体感改善评分 (Avg)</div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">{feelingImprovementStats.avgScore} <span className="text-sm text-slate-400 ml-1">分</span></div>
                  <div className="mt-4 flex items-center gap-2 text-emerald-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black">较入伙前提升 {feelingImprovementStats.improvementRate}%</span>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setActiveTab('triggers')}
                className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all"
              >
                <div className="absolute right-0 bottom-0 opacity-20 translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                  <Zap className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1">已激活干预规则</div>
                  <div className="text-3xl font-black tracking-tight">{activeTriggersCount} / {totalTriggersCount} <span className="text-sm text-emerald-200 ml-1">项</span></div>
                  <button className="mt-4 text-[10px] font-black bg-white/20 hover:bg-white/30 transition-all px-3 py-1.5 rounded-xl backdrop-blur-md uppercase tracking-widest">
                    管理规则池
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Bottom Section - 核心干预工作台 */}
            <div id="replenishment-section" className="mb-10">
              <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-200">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">实战干预助手</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">基于 PDR 策略引擎自动生成的每日跟进建议</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">静默规则 (48h)</span>
                      <button 
                        onClick={() => setIsSilentRuleEnabled(!isSilentRuleEnabled)}
                        className={`w-12 h-6 rounded-full transition-all relative ${isSilentRuleEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isSilentRuleEnabled ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setNewTaskMode('log');
                        setIsNewTaskModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" />
                      新建手动待办
                    </button>
                  </div>
                </div>

                <div className="p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allAlerts.length > 0 ? (
                      allAlerts.map((alertItem: TriggerAlert, idx: number) => {
                        const group = ALERT_GROUPS[alertItem.alertType as keyof typeof ALERT_GROUPS] || ALERT_GROUPS.followup;
                        const Icon = group.icon;
                        
                        return (
                          <div key={`${alertItem.id}-${idx}`} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all overflow-hidden group/card relative">
                            <div className={`h-2 w-full ${
                              alertItem.priority === 'critical' ? 'bg-rose-500' :
                              alertItem.priority === 'high' ? 'bg-amber-500' : 'bg-slate-300'
                            }`} />
                            <div className="p-8">
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-14 h-14 rounded-2xl ${group.bg} flex items-center justify-center shadow-inner`}>
                                    <Icon className={`w-7 h-7 ${group.color}`} />
                                  </div>
                                  <div>
                                    <div className="text-lg font-black text-slate-900">{alertItem.name}</div>
                                    <div className={`text-[10px] font-black ${group.color} uppercase tracking-[0.2em] mt-0.5`}>{group.label}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                                  alertItem.priority === 'critical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' :
                                  alertItem.priority === 'high' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {alertItem.priority}
                                </span>
                              </div>
                              
                              <div className="mb-8">
                                <div className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                                  <div className="w-1.5 h-5 bg-slate-900 rounded-full"></div>
                                  {alertItem.alertMsg}
                                </div>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative group/script">
                                  <p className="text-xs text-slate-500 italic leading-relaxed font-medium">“{alertItem.actionScript}”</p>
                                  <button 
                                    onClick={() => {
                                      if (alertItem.actionScript) {
                                        navigator.clipboard.writeText(alertItem.actionScript);
                                        alert('话术已复制');
                                      }
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-white rounded-xl shadow-md opacity-0 group-hover/script:opacity-100 transition-all hover:text-emerald-600 hover:scale-110"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <button 
                                  onClick={async () => {
                                    if (alertItem.isUserTask) {
                                      const originalTask = userTasks.find(t => t.id === alertItem.id);
                                      if (originalTask) {
                                        await updateUserTask({ ...originalTask, status: 'completed' }, { status: 'completed' });
                                        alert('待办任务已完成');
                                      }
                                    } else {
                                      const updatedClient = {
                                        ...alertItem,
                                        last_alert_at: new Date().toISOString(),
                                        last_alert_priority: alertItem.priority
                                      };
                                      const partialUpdate: Partial<Client> = {
                                        last_alert_at: updatedClient.last_alert_at,
                                        last_alert_priority: updatedClient.last_alert_priority as any
                                      };
                                      delete (updatedClient as any).alertType;
                                      delete (updatedClient as any).alertMsg;
                                      delete (updatedClient as any).priority;
                                      delete (updatedClient as any).actionLabel;
                                      delete (updatedClient as any).actionScript;
                                      delete (updatedClient as any).triggerId;
                                      delete (updatedClient as any).actionType;
                                      await updateClient(updatedClient as Client, partialUpdate);
                                      alert('已执行干预并进入静默期');
                                    }
                                  }}
                                  className="flex-[2.5] py-4 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/10"
                                >
                                  {alertItem.actionLabel || '执行干预'}
                                </button>
                                <button 
                                  onClick={() => alert(`已通过微信发送话术给 ${alertItem.name}`)}
                                  className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black hover:bg-emerald-100 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                  <Zap className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setSearchQuery(alertItem.name);
                                    setActiveTab('clients');
                                  }}
                                  className="px-4 py-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center"
                                >
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                          <Zap className="w-12 h-12" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 mb-2">今日暂无干预建议</h4>
                        <p className="text-slate-400 font-medium max-w-md mx-auto">系统正在实时监控客户状态，当出现库存不足、体感波动或关键随访节点时，会在此提醒您。</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action */}
            <div className="bg-emerald-600 rounded-[32px] p-10 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-emerald-200/50 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 -translate-y-1/4 translate-x-1/4">
                <ShieldCheck className="w-64 h-64" />
              </div>
              <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                <h3 className="text-2xl font-black mb-2 tracking-tight">准备好开启高效的一天了吗？</h3>
                <p className="text-emerald-100 font-medium">您可以直接进入客户档案库进行管理，或者配置新的调理方案模板。</p>
              </div>
              <button 
                onClick={() => setActiveTab('clients')}
                className="relative z-10 px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black hover:bg-emerald-50 transition-all shadow-xl hover:scale-105 active:scale-95 uppercase tracking-widest text-sm"
              >
                进入客户管理中心
              </button>
            </div>
          </>
        );
      case 'clients':
        return (
          <div className="space-y-10">
            {/* 高价值客户动态雷达 (High-Value Client Dynamic Radar) */}
            <div className="mb-8 md:mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200/50">
                    <Target className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">高价值客户动态雷达</h3>
                    <p className="text-[10px] md:text-xs text-slate-400 font-medium">VIP 客户依从性与价值深度追踪</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
                >
                  查看完整雷达图表 <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {highValueClients.length > 0 ? (
                  highValueClients.slice(0, 4).map((client: Client) => (
                    <div key={client.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-5 md:p-6 group cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      </div>
                      <div className="flex items-center gap-4 mb-5 md:mb-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-base md:text-lg shadow-lg shadow-slate-200 shrink-0">
                          {client.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 truncate">{client.name}</div>
                          <div className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">VIP · {client.tags?.[0] || '长期管理'}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">依从性</span>
                          <span className="text-xs md:text-sm font-black text-emerald-600">{client.adherence_score}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${client.adherence_score}%` }}></div>
                        </div>
                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-tighter">累计价值 (LTV)</span>
                            <span className="text-xs font-black text-slate-900">¥ {client.loyalty_points ? client.loyalty_points * 10 : 0}</span>
                          </div>
                          <Link href={`/clients/plan?id=${client.id}`} className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <ChevronRight className="w-3.5 h-3.5 md:w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
                    <p className="text-slate-400 text-xs font-bold">暂无高价值客户数据</p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Management Table */}
            <div className="bg-white rounded-[32px] md:rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-6 md:px-10 md:py-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">客户 360° 动态档案管理</h2>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">管理您的客户调理方案、实时进度与依从性深度分析</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="w-3.5 h-3.5 md:w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="搜索客户..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs md:text-sm w-full sm:w-48 md:w-64 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setImportType('clients');
                      setImportStep('upload');
                      setIsImportModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-[11px] md:text-sm font-bold shadow-sm shrink-0"
                  >
                    <Database className="w-3.5 h-3.5 md:w-4 h-4 text-emerald-500" />
                    <span className="hidden sm:inline">批量导入</span>
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px] md:min-w-0">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
                      <th className="px-6 md:px-8 py-4">客户信息</th>
                      <th className="px-6 md:px-8 py-4">依从性</th>
                      <th className="px-6 md:px-8 py-4">库存水位</th>
                      <th className="px-6 md:px-8 py-4 hidden sm:table-cell">积分</th>
                      <th className="px-6 md:px-8 py-4 hidden md:table-cell">最后更新</th>
                      <th className="px-6 md:px-8 py-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.map((client: Client) => {
                      const minRemainingDays = client.inventory_status ? Math.min(...client.inventory_status.map(i => i.remaining_days)) : null;
                      const isHighlighted = allAlerts.some(alert => alert.id === client.id && alert.actionType === 'highlight_client');
                      
                      return (
                        <tr 
                          key={client.id} 
                          className={`transition-all duration-300 group ${
                            isHighlighted 
                              ? 'bg-rose-50 hover:bg-rose-100/80 border-l-4 border-l-rose-500' 
                              : 'hover:bg-slate-50/50'
                          }`}
                        >
                          <td className="px-6 md:px-8 py-4 md:py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0 ${
                                isHighlighted ? 'bg-rose-200 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {client.name[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs md:text-sm font-bold text-slate-900 truncate">{client.name}</div>
                                  {isHighlighted && (
                                    <span className="px-1.5 py-0.5 bg-rose-500 text-[8px] text-white rounded font-black uppercase tracking-tighter shrink-0">重点</span>
                                  )}
                                </div>
                                <div className="text-[10px] md:text-xs text-slate-500 truncate">{client.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 md:px-8 py-4 md:py-5">
                            <div className="flex items-center gap-2">
                              <div className={`text-xs md:text-sm font-black ${
                                !client.adherence_score ? 'text-slate-300' :
                                client.adherence_score >= 90 ? 'text-emerald-600' :
                                client.adherence_score >= 70 ? 'text-amber-500' : 'text-rose-500'
                              }`}>
                                {client.adherence_score ? `${client.adherence_score}%` : '--'}
                              </div>
                              {client.adherence_trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                              {client.adherence_trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500" />}
                            </div>
                          </td>
                          <td className="px-6 md:px-8 py-4 md:py-5">
                            {minRemainingDays !== null ? (
                              <div className="flex flex-col gap-1">
                                <span className={`text-[9px] md:text-[10px] font-bold ${minRemainingDays < 3 ? 'text-rose-600' : minRemainingDays < 10 ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {minRemainingDays} 天断货
                                </span>
                                <div className="w-16 md:w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${minRemainingDays < 3 ? 'bg-rose-500' : minRemainingDays < 10 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.min(100, (minRemainingDays / 30) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] md:text-xs text-slate-300">未配置</span>
                            )}
                          </td>
                          <td className="px-6 md:px-8 py-4 md:py-5 hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs md:text-sm font-bold text-slate-700">{client.loyalty_points || 0}</span>
                              {(client.loyalty_points || 0) >= 1000 && (
                                <span className="text-[8px] md:text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">高价值</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-sm text-slate-500 font-medium hidden md:table-cell">
                            {new Date(client.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 md:px-8 py-4 md:py-5 text-right">
                            <div className="flex justify-end items-center gap-1 md:gap-4">
                              <button 
                                onClick={() => handleEditClient(client)}
                                className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-emerald-600 transition-colors"
                                title="编辑客户档案"
                              >
                                <FileEdit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`确定要删除客户 ${client.name} 吗？此操作不可撤销。`)) {
                                    await deleteClient(client.id);
                                  }
                                }}
                                className="p-1.5 md:p-2 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-600 transition-colors hidden sm:block"
                                title="删除客户"
                              >
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <Link 
                                href={`/clients/plan?id=${client.id}`}
                                className="inline-flex items-center gap-0.5 md:gap-1 text-[10px] md:text-sm font-bold text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                              >
                                <span className="hidden sm:inline">查看</span>详情
                                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'products':
        return (
          <div className="space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Add Product Card */}
              <div className="flex flex-col gap-4">
                <button 
                  onClick={handleAddProduct}
                  className="border-2 border-dashed border-slate-200 rounded-3xl p-5 md:p-6 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 hover:border-emerald-300 transition-all group min-h-[120px] md:min-h-[140px]"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <Plus className="w-5 h-5 md:w-6 md:h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs md:text-sm font-black text-slate-400 group-hover:text-emerald-600 transition-colors">录入新产品/成分</div>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setImportType('products');
                    setImportStep('upload');
                    setIsImportModalOpen(true);
                  }}
                  className="border-2 border-slate-200 rounded-3xl p-5 md:p-6 flex flex-col items-center justify-center gap-3 hover:bg-emerald-50 hover:border-emerald-200 transition-all group min-h-[120px] md:min-h-[140px] bg-white"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <Database className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs md:text-sm font-black text-emerald-600">批量导入产品库</div>
                    <p className="text-[9px] md:text-[10px] text-slate-400 font-medium mt-1">支持 Excel 模板快速入库</p>
                  </div>
                </button>
              </div>

              {products.map((product: Product) => (
                <div key={product.id} className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group relative overflow-hidden">
                  <div className="absolute top-4 right-4 flex items-center gap-1 md:gap-2">
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className="p-1.5 md:p-2 bg-slate-50 text-slate-400 rounded-xl md:opacity-0 group-hover:opacity-100 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                      title="编辑产品详情"
                    >
                      <FileEdit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm(`确定要删除产品 ${product.name} 吗？`)) {
                          await deleteProduct(product.id);
                        }
                      }}
                      className="p-1.5 md:p-2 bg-slate-50 text-slate-400 rounded-xl md:opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition-all"
                      title="删除产品"
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-start mb-4 pr-16 md:pr-0">
                    <div className="px-2 py-1 bg-slate-100 rounded text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[120px] md:max-w-none">{product.brand}</div>
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-slate-800 mb-2 truncate" title={product.name}>{product.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.main_efficacy?.map(eff => (
                      <span key={eff} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] md:text-[10px] font-bold rounded border border-emerald-100">
                        {eff}
                      </span>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-2xl p-3 md:p-4">
                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">
                        <FlaskConical className="w-3 h-3" /> 核心成分
                      </div>
                      <div className="space-y-2.5">
                        {product.ingredients?.map(ing => {
                          const ingredientInfo = mockIngredients.find(i => i.id === ing.ingredient_id);
                          return (
                            <div key={ing.ingredient_id} className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-700 truncate mr-4">{ingredientInfo?.name}</span>
                              <span className="text-[11px] md:text-xs font-medium text-slate-500 shrink-0">{ing.amount_per_unit}{ing.unit}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'templates':
        if (!currentProtocol) {
          const emptyProtocolsCount = protocols.filter(p => 
            (!p.name || p.name === '新调理配方 SOP' || p.name.trim() === '') && 
            p.phases.length === 0 && 
            p.triggers.length === 0
          ).length;

          return (
            <div className="space-y-6">
              {emptyProtocolsCount > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-amber-900">发现 {emptyProtocolsCount} 个空白配方</div>
                      <div className="text-xs text-amber-700">这些配方没有名称或内容，可能是误点击创建的。</div>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const count = await cleanEmptyProtocols();
                      alert(`已清理 ${count} 个空白配方`);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                  >
                    立即清理
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                  onClick={() => {
                    const newProtocol: Protocol = {
                      id: `p-${Date.now()}`,
                      name: '',
                      description: '',
                      phases: [],
                      triggers: [],
                      practitioner_id: 'p-001',
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    // 不立即调用 addProtocol，只在保存时调用
                    setCurrentProtocol(newProtocol);
                  }}
                  className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 hover:border-emerald-300 transition-all group min-h-[200px]"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <Plus className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-black text-slate-400 group-hover:text-emerald-600 transition-colors">建立新配方</div>
                  </div>
                </button>
                {protocols.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative" onClick={() => setCurrentProtocol(p)}>
                    <div className="flex items-center gap-2 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentProtocol(p);
                        }}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                        title="编辑配方"
                      >
                        <FileEdit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`确定要删除配方 ${p.name} 吗？`)) {
                            await deleteProtocol(p.id);
                          }
                        }}
                        className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                        title="删除配方"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{p.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{p.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                      <Layers className="w-4 h-4" />
                      {p.phases.length} 个阶段
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <button 
                onClick={() => setCurrentProtocol(null)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold text-sm"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                返回配方列表
              </button>

              <div className="flex items-center gap-3">
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 md:mb-8 border-b border-slate-100 pb-6 md:pb-8 gap-6">
                <div className="w-full space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">配方名称</label>
                    <input 
                      type="text" 
                      value={currentProtocol.name} 
                      onChange={(e) => {
                        const updated = { ...currentProtocol, name: e.target.value };
                        setCurrentProtocol(updated);
                      }}
                      className="w-full text-xl md:text-2xl font-black text-slate-900 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300"
                      placeholder="输入配方名称 (如: 12周肝脏修复方案)"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">配方描述/核心逻辑</label>
                    <textarea 
                      value={currentProtocol.description} 
                      onChange={(e) => {
                        const updated = { ...currentProtocol, description: e.target.value };
                        setCurrentProtocol(updated);
                      }}
                      className="w-full text-slate-500 text-xs md:text-sm bg-transparent border-none focus:ring-0 p-0 resize-none placeholder-slate-300"
                      placeholder="输入配方描述..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-slate-100"></div>
                <div className="space-y-8 md:space-y-12">
                  {currentProtocol.phases.map((phase: ProtocolPhase, idx: number) => (
                    <div key={phase.id} className="relative pl-10 md:pl-20">
                      <div className="absolute left-2 md:left-6 top-1 w-4 h-4 rounded-full bg-white border-4 border-emerald-500 z-10"></div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] md:text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest shrink-0">Phase {idx + 1}</span>
                          <h4 className="text-lg md:text-xl font-bold text-slate-800 truncate">{phase.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 font-medium">
                          <Calendar className="w-4 h-4 shrink-0" /> 持续 
                          <input 
                            type="number" 
                            value={phase.duration_days} 
                            onChange={async (e) => {
                              const newDuration = parseInt(e.target.value) || 0;
                              const updatedPhases = currentProtocol.phases.map(p => 
                                p.id === phase.id ? { ...p, duration_days: newDuration } : p
                              );
                              const updatedProtocol = { ...currentProtocol, phases: updatedPhases };
                              setCurrentProtocol(updatedProtocol);
                              if (protocols.some(p => p.id === updatedProtocol.id)) {
                                await updateProtocol(updatedProtocol, { phases: updatedPhases });
                              }
                            }}
                            className="w-10 md:w-12 bg-transparent border-b border-slate-200 focus:border-emerald-500 focus:ring-0 p-0 text-center font-bold text-slate-700"
                          /> 天
                          <button 
                            onClick={() => handleDeletePhase(phase.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg group/del transition-colors ml-auto sm:hidden"
                            title="删除阶段"
                          >
                            <Trash2 className="w-4 h-4 text-slate-300 group-hover/del:text-rose-500 transition-colors" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleDeletePhase(phase.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg group/del transition-colors ml-auto hidden sm:block"
                          title="删除阶段"
                        >
                          <Trash2 className="w-4 h-4 text-slate-300 group-hover/del:text-rose-500 transition-colors" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {phase.actions.map((action: ProtocolAction) => {
                          const product = products.find(p => p.id === action.product_id);
                          return (
                            <div key={action.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 md:gap-4">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs md:text-sm font-bold text-slate-700 mb-2 truncate">{product?.name || '未知产品'}</div>
                                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                                  {/* 一日几次 */}
                                  <div className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-1 rounded-xl shadow-sm">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter">一日</span>
                                    <input 
                                      type="number" 
                                      value={action.frequency_per_day || 1} 
                                      onChange={async (e) => {
                                        const newVal = parseInt(e.target.value) || 1;
                                        const newPhases = [...currentProtocol.phases];
                                        const pIdx = newPhases.findIndex(p => p.id === phase.id);
                                        const aIdx = newPhases[pIdx].actions.findIndex(a => a.id === action.id);
                                        newPhases[pIdx].actions[aIdx] = { ...action, frequency_per_day: newVal };
                                        const updatedProtocol = { ...currentProtocol, phases: newPhases };
                                        setCurrentProtocol(updatedProtocol);
                                        if (protocols.some(p => p.id === updatedProtocol.id)) {
                                          await updateProtocol(updatedProtocol, { phases: newPhases });
                                        }
                                      }}
                                      className="w-5 md:w-6 text-center text-[10px] md:text-[11px] font-black text-emerald-600 bg-transparent border-none p-0 focus:ring-0"
                                    />
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter">次</span>
                                  </div>

                                  {/* 一次几粒 */}
                                  <div className="flex items-center gap-1 bg-white border border-slate-100 px-2 py-1 rounded-xl shadow-sm">
                                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter">一次</span>
                                    <input 
                                      type="text" 
                                      value={action.dosage_per_time || product?.dosage_unit || '1粒'} 
                                      onChange={async (e) => {
                                        const newVal = e.target.value;
                                        const newPhases = [...currentProtocol.phases];
                                        const pIdx = newPhases.findIndex(p => p.id === phase.id);
                                        const aIdx = newPhases[pIdx].actions.findIndex(a => a.id === action.id);
                                        newPhases[pIdx].actions[aIdx] = { ...action, dosage_per_time: newVal };
                                        const updatedProtocol = { ...currentProtocol, phases: newPhases };
                                        setCurrentProtocol(updatedProtocol);
                                        if (protocols.some(p => p.id === updatedProtocol.id)) {
                                          await updateProtocol(updatedProtocol, { phases: newPhases });
                                        }
                                      }}
                                      className="w-8 md:w-10 text-center text-[10px] md:text-[11px] font-black text-emerald-600 bg-transparent border-none p-0 focus:ring-0"
                                    />
                                  </div>
                                  
                                  {/* 服用时机 */}
                                  <select 
                                    value={action.timing_tag}
                                    onChange={async (e) => {
                                      const newTiming = e.target.value as any;
                                      const newPhases = [...currentProtocol.phases];
                                      const pIdx = newPhases.findIndex(p => p.id === phase.id);
                                      const aIdx = newPhases[pIdx].actions.findIndex(a => a.id === action.id);
                                      newPhases[pIdx].actions[aIdx] = { ...action, timing_tag: newTiming };
                                      const updatedProtocol = { ...currentProtocol, phases: newPhases };
                                      setCurrentProtocol(updatedProtocol);
                                      if (protocols.some(p => p.id === updatedProtocol.id)) {
                                        await updateProtocol(updatedProtocol, { phases: newPhases });
                                      }
                                    }}
                                    className="text-[9px] md:text-[10px] font-black text-slate-600 bg-white border border-slate-100 px-2 py-1 rounded-xl shadow-sm focus:ring-0 outline-none cursor-pointer hover:border-emerald-200 transition-colors"
                                  >
                                    <option value="with_meal">随餐</option>
                                    <option value="empty_stomach">空腹</option>
                                    <option value="before_meal">餐前</option>
                                    <option value="after_meal">餐后</option>
                                    <option value="before_bed">睡前</option>
                                    <option value="any_time">任意</option>
                                  </select>

                                  <button 
                                    onClick={() => handleDeleteAction(phase.id, action.id)}
                                    className="p-1.5 hover:bg-rose-50 rounded-lg group/del transition-colors ml-auto"
                                    title="删除产品"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover/del:text-rose-500 transition-colors" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <button 
                          onClick={() => handleAddAction(phase.id)}
                          className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-emerald-300 transition-all group min-h-[80px]"
                        >
                          <Plus className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                          <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">添加产品</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleAddPhase}
                    className="w-full py-3 md:py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-emerald-300 transition-all group"
                  >
                    <Plus className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-xs md:text-sm font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">添加新阶段</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button 
                onClick={async () => {
                  if (!currentProtocol.name.trim()) {
                    alert('请先输入配方名称');
                    return;
                  }
                  await addProtocol(currentProtocol);
                  alert('配方已保存');
                  setCurrentProtocol(null);
                }}
                className="flex items-center gap-2 md:gap-3 px-8 md:px-12 py-3 md:py-4 bg-emerald-600 text-white rounded-2xl font-black text-base md:text-lg hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-600/40 group w-full sm:w-auto justify-center"
              >
                <Save className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
                保存配方
              </button>
            </div>
          </div>
        );
      case 'triggers':
        return (
          <div className="space-y-6 md:space-y-8">
            {/* 全局静默规则提示 (PDR 2.0 中心化引擎) */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between overflow-hidden relative group gap-6">
              <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                <Target className="w-48 h-48" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                <div className={`w-12 h-12 md:w-14 md:h-14 ${isSilentRuleEnabled ? 'bg-emerald-500' : 'bg-slate-700'} rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-500 shadow-emerald-500/20 shrink-0`}>
                  <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base md:text-lg font-black tracking-tight">PDR 2.0 策略引擎</h3>
                    <span className={`text-[8px] md:text-[10px] font-black ${isSilentRuleEnabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'} px-2 py-0.5 rounded-full border uppercase transition-colors`}>
                      {isSilentRuleEnabled ? 'Running' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px] md:text-xs font-medium max-w-md">
                    当前运行中心化逻辑引擎。同一客户在 <span className="text-white font-bold">48 小时内</span> 最多触发 <span className="text-white font-bold">1 个非紧急</span> 告警。
                    系统已自动合并同类项，确保您的工作台保持高效。
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex items-center justify-between sm:justify-end gap-6 border-t border-slate-800 pt-4 sm:border-t-0 sm:pt-0">
                <div className="text-left md:text-right">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">静默周期</div>
                  <div className="text-xl md:text-2xl font-black text-white">48h</div>
                </div>
                <button 
                  onClick={() => setIsSilentRuleEnabled(!isSilentRuleEnabled)}
                  className={`w-12 h-7 md:w-14 md:h-8 rounded-full relative transition-colors duration-300 ${isSilentRuleEnabled ? 'bg-emerald-500' : 'bg-slate-700'} shrink-0`}
                >
                  <div className={`absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full transition-all duration-300 ${isSilentRuleEnabled ? 'left-6 md:left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* 触发器逻辑模拟器 (Trigger Logic Simulator) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden relative group">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">逻辑模拟实验室</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">模拟不同客户场景，即时验证自动化干预规则的触发效果</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
                  className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isSimulatorOpen 
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200'
                  }`}
                >
                  {isSimulatorOpen ? '关闭模拟器' : '开启模拟测试'}
                  {isSimulatorOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isSimulatorOpen && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Mock Client Config */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Users className="w-3.5 h-3.5" />
                        配置测试客户画像
                      </div>
                      
                      <div className="space-y-4 bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">连续断服天数 (Adherence)</label>
                          <input 
                            type="number" 
                            value={mockClient.missed_days}
                            onChange={(e) => setMockClient({ ...mockClient, missed_days: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="例如: 3"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">当前体感评分 (Energy Score)</label>
                          <div className="flex items-center gap-4">
                            <input 
                              type="range" 
                              min="0" 
                              max="100"
                              value={mockClient.feeling_metrics?.energy_score || 80}
                              onChange={(e) => setMockClient({ 
                                ...mockClient, 
                                feeling_metrics: { 
                                  ...mockClient.feeling_metrics!, 
                                  energy_score: parseInt(e.target.value) 
                                } 
                              })}
                              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="text-sm font-black text-slate-700 w-8">{mockClient.feeling_metrics?.energy_score || 80}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-600">体感出现剧烈波动?</span>
                          <button 
                            onClick={() => setMockClient({ 
                              ...mockClient, 
                              feeling_metrics: { 
                                ...mockClient.feeling_metrics!, 
                                trend_pivot: !mockClient.feeling_metrics?.trend_pivot 
                              } 
                            })}
                            className={`w-10 h-5 rounded-full relative transition-colors ${mockClient.feeling_metrics?.trend_pivot ? 'bg-indigo-500' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${mockClient.feeling_metrics?.trend_pivot ? 'left-5.5' : 'left-0.5'}`} />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">方案执行天数</label>
                          <input 
                            type="number" 
                            defaultValue="0"
                            onChange={(e) => {
                              const days = parseInt(e.target.value) || 0;
                              const date = new Date();
                              date.setDate(date.getDate() - days);
                              setMockClient({ ...mockClient, created_at: date.toISOString() });
                            }}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="例如: 7"
                          />
                        </div>

                        <button 
                          onClick={handleSimulate}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" />
                          运行逻辑仿真
                        </button>
                      </div>
                    </div>

                    {/* Simulation Results */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Activity className="w-3.5 h-3.5" />
                        规则引擎判定结果
                      </div>

                      <div className="bg-slate-900 rounded-[24px] p-8 min-h-[360px] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(79,70,229,0.15),transparent_50%)]"></div>
                        
                        {simulationResults.length > 0 ? (
                          <div className="relative z-10 space-y-4">
                            <div className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4" />
                              命中 {simulationResults.length} 条干预规则
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {simulationResults.map((result, idx) => {
                                const group = ALERT_GROUPS[result.trigger.category as keyof typeof ALERT_GROUPS] || ALERT_GROUPS.followup;
                                return (
                                  <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md hover:bg-white/10 transition-all group/res">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className={`w-8 h-8 rounded-lg ${group.bg} flex items-center justify-center`}>
                                        <group.icon className={`w-4 h-4 ${group.color}`} />
                                      </div>
                                      <div className="text-white font-black text-xs truncate">{result.trigger.name}</div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="text-[10px] text-slate-400 font-medium">触发动作: {result.trigger.action.label}</div>
                                      <div className="text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded inline-block">
                                        判定依据: {result.trigger.condition.type} ({result.trigger.condition.threshold})
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center py-20">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                              <Zap className="w-10 h-10 text-slate-700" />
                            </div>
                            <h4 className="text-white text-lg font-black mb-2">静默中 - 无规则命中</h4>
                            <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto">
                              当前模拟数据未触及任何自动化规则的阈值。您可以尝试增加断服天数或降低体感评分来测试。
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6">
              {['compliance', 'inventory', 'symptom', 'growth'].map(category => (
                <div key={category} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
                  <h3 className="text-base md:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    {category === 'compliance' && <Activity className="w-5 h-5 text-indigo-500" />}
                    {category === 'inventory' && <Package className="w-5 h-5 text-orange-500" />}
                    {category === 'symptom' && <Activity className="w-5 h-5 text-rose-500" />}
                    {category === 'growth' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
                    {category === 'compliance' ? '依从性干预机制' : 
                     category === 'inventory' ? '库存预警机制' : 
                     category === 'symptom' ? '体感风险干预' : '增长与关系维护'}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {triggers.filter(t => t.category === category).map(trigger => (
                      <div key={trigger.id} className="p-4 md:p-5 bg-slate-50 rounded-2xl border border-slate-100 group relative overflow-hidden hover:shadow-md transition-all">
                        <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                        
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0">
                              <div className="font-black text-slate-800 text-xs md:text-sm tracking-tight mb-0.5 truncate">{trigger.name}</div>
                              <div className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate">{trigger.description || '自定义自动化干预规则'}</div>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                              <span className={`text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                trigger.action?.priority === 'critical' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' :
                                trigger.action?.priority === 'high' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {trigger.action?.priority}
                              </span>
                              <button 
                                onClick={() => {
                                  setEditingTrigger(trigger);
                                  setIsTriggerModalOpen(true);
                                }}
                                className="p-1 md:p-1.5 bg-white text-slate-400 rounded-lg shadow-sm hover:text-emerald-600 hover:scale-110 transition-all"
                              >
                                <FileEdit className="w-3 md:w-3.5 h-3 md:h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* IF Condition */}
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:bg-indigo-500 group-hover:border-indigo-500 transition-colors duration-300">
                                <span className="text-[9px] md:text-[10px] font-black text-indigo-600 group-hover:text-white">如果</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  条件池
                                  <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="text-[10px] md:text-xs font-bold text-slate-700 bg-white border border-slate-100 px-2 md:px-3 py-1.5 md:py-2 rounded-xl inline-block shadow-sm group-hover:border-indigo-200 transition-colors truncate max-w-full">
                                  {trigger.condition?.type === 'adherence_streak' && `连续 ${trigger.condition?.threshold} 天断服`}
                                  {trigger.condition?.type === 'stock_level' && `库存水位 <= ${trigger.condition?.threshold} 天`}
                                  {trigger.condition?.type === 'vital_trend' && `趋势指标下降 ${trigger.condition?.threshold} 次`}
                                  {trigger.condition?.type === 'protocol_duration' && `方案执行满 ${trigger.condition?.threshold} 天`}
                                </div>
                              </div>
                            </div>

                            {/* THEN Action */}
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors duration-300">
                                <span className="text-[9px] md:text-[10px] font-black text-emerald-600 group-hover:text-white">就</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                  动作池
                                  <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] md:text-[9px] font-black bg-slate-900 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded uppercase leading-none tracking-tighter shadow-sm">
                                      {trigger.action?.type === 'push_red_dot' ? '红点通知' : 
                                       trigger.action?.type === 'send_template' ? '模版推送' : '列表高亮'}
                                    </span>
                                    <span className="text-[10px] md:text-xs font-black text-slate-700 truncate">{trigger.action?.label}</span>
                                  </div>
                                  <div className="text-[10px] md:text-[11px] text-slate-500 italic bg-slate-100/50 p-2 md:p-3 rounded-xl border border-slate-200/50 line-clamp-2 leading-relaxed" title={trigger.action?.payload_template}>
                                    “{trigger.action?.payload_template}”
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'knowledge':
        return (
          <div className="bg-white p-6 md:p-12 rounded-[32px] border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <Database className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">营养学知识库 (Scientific Knowledge Base)</h2>
            <p className="text-xs md:text-base text-slate-500 mb-6 md:mb-8 max-w-md mx-auto font-medium leading-relaxed px-4">
              汇集最新国际营养学研究成果与临床指南，为您的个性化调理方案提供严谨、前沿的科学依据。
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all cursor-pointer text-sm md:text-base shadow-xl shadow-emerald-600/20 active:scale-95 group">
              <Search className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
              检索科研文献库
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. 核心业务漏斗与来源分析 (Sales, Conversion & Sources) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-6 md:mb-8 gap-4">
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-800">补货转化与复购漏斗</h3>
                    <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">分析从“库存预警”到“完成订单”的转化路径</p>
                  </div>
                  <select className="bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto">
                    <option>过去 30 天</option>
                    <option>过去 90 天</option>
                  </select>
                </div>
                
                <div className="relative pt-2 md:pt-4">
                  {[
                    { label: '库存预警生成', value: 124, color: 'bg-slate-900', width: '100%' },
                    { label: '有效随访触达', value: 98, color: 'bg-slate-700', width: '79%' },
                    { label: '意向确认', value: 65, color: 'bg-emerald-600', width: '52%' },
                    { label: '订单支付完成', value: 42, color: 'bg-emerald-400', width: '34%' },
                  ].map((step, i) => (
                    <div key={i} className="mb-4 md:mb-6 last:mb-0">
                      <div className="flex justify-between items-end mb-1.5 md:mb-2">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{step.label}</span>
                        <span className="text-base md:text-lg font-black text-slate-800">{step.value} <span className="text-[10px] text-slate-400 font-bold ml-0.5 md:ml-1">个</span></span>
                      </div>
                      <div className="h-3 md:h-4 bg-slate-50 rounded-full overflow-hidden flex items-center p-0.5 md:p-1">
                        <div className={`h-full ${step.color} rounded-full transition-all duration-1000`} style={{ width: step.width }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-900 rounded-[32px] p-6 md:p-8 text-white flex flex-col justify-between overflow-hidden relative group h-[240px] md:h-[280px]">
                  <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform duration-700">
                    <TrendingUp className="w-48 h-48 md:w-64 md:h-64" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-lg md:text-xl font-black mb-1">复购增长预测</h3>
                    <p className="text-slate-400 text-[10px] md:text-xs font-medium">下月预计补货业绩规模</p>
                    <div className="mt-6 md:mt-8">
                      <div className="text-3xl md:text-4xl font-black tracking-tight">¥ 28,400</div>
                      <div className="flex items-center gap-2 mt-2 text-emerald-400 text-[10px] md:text-xs font-bold">
                        <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        预计比本月提升 15.4%
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 mt-4 md:mt-6">
                    <button className="w-full py-2.5 md:py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] md:text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest">
                      查看详情预测报告
                    </button>
                  </div>
                </div>

                {/* 客户来源分布 (从 Dashboard 迁移) */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200 shadow-sm flex-1">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      客户来源分布
                    </h3>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">规模分析</span>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(sourceLabels).map(([key, label]) => {
                      const count = sourceDistribution[key] || 0;
                      const percentage = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;
                      
                      return (
                        <div key={key} className="space-y-1.5 md:space-y-2">
                          <div className="flex justify-between items-center text-[9px] md:text-[10px]">
                            <span className="font-bold text-slate-600">{label}</span>
                            <span className="font-black text-slate-900">{count} 人 <span className="text-slate-300 ml-1">({percentage}%)</span></span>
                          </div>
                          <div className="w-full h-1 md:h-1.5 bg-slate-50 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-1000" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>


            {/* 2. 交付质量：健康指标改善明细 (Delivery Quality: Health Improvement Detail) */}
            <div className="bg-white p-5 md:p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <div className="flex flex-col xl:flex-row justify-between xl:items-center mb-6 md:mb-8 gap-6">
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800">交付质量：健康指标改善深度分析</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">基于 PDR 的好转客户明细与趋势分析</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {healthImprovementMetrics.map(metric => (
                    <button 
                      key={metric.id}
                      onClick={() => setSelectedMetricId(metric.id)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedMetricId === metric.id 
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                {/* 改善概览列表 (从 Dashboard 迁移) */}
                <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-50 pb-6 lg:pb-0 lg:pr-8">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    各维度好转率概览
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
                    {healthImprovementMetrics.map((item, i) => (
                      <div 
                        key={i}
                        onClick={() => setSelectedMetricId(item.id)}
                        className={`group cursor-pointer p-3 -mx-2 rounded-2xl transition-all ${
                          selectedMetricId === item.id ? 'bg-slate-50 border border-slate-100' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex justify-between text-[9px] md:text-[10px] font-bold mb-1.5 md:mb-2">
                          <span className={`truncate mr-2 ${selectedMetricId === item.id ? 'text-emerald-600' : 'text-slate-700'}`}>{item.label}</span>
                          <span className="text-slate-500 shrink-0">{item.val}%</span>
                        </div>
                        <div className="h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                            style={{ width: `${item.val}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-3">
                  {selectedMetric ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                      {/* 左侧：统计卡片 */}
                      <div className="space-y-4 md:col-span-1">
                        <div className="p-5 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">当前改善率</div>
                          <div className="flex items-end gap-2">
                            <div className="text-3xl md:text-4xl font-black text-slate-900">{selectedMetric.val}%</div>
                            <div className="text-[10px] md:text-xs font-bold text-emerald-600 mb-1 md:mb-1.5 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              +4.2%
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">
                            <span>好转: {selectedMetric.improved} 人</span>
                            <span>目标: {selectedMetric.total} 人</span>
                          </div>
                          <div className="w-full h-1 md:h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                            <div className={`h-full ${selectedMetric.color} rounded-full`} style={{ width: `${selectedMetric.val}%` }}></div>
                          </div>
                        </div>

                        {/* 模拟趋势图 (SVG) */}
                        <div className="p-5 md:p-6 bg-slate-50 rounded-2xl border border-slate-100 hidden md:block">
                          <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">近 6 个月改善趋势</div>
                          <div className="h-32 flex items-end justify-between gap-2 px-2">
                            {[45, 52, 48, 65, 72, selectedMetric.val].map((v, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center group">
                                <div 
                                  className={`w-full rounded-t-lg transition-all duration-700 ${i === 5 ? selectedMetric.color : 'bg-slate-200'}`}
                                  style={{ height: `${v}%` }}
                                ></div>
                                <span className="text-[8px] text-slate-400 mt-2 font-black uppercase tracking-tighter">M{i + 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 右侧：分客户明细 */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            已好转客户 (Improved) - {selectedMetric.improvedClients.length}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedMetric.improvedClients.map(client => (
                              <div key={client.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white border border-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                                    {client.name[0]}
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">{client.name}</span>
                                </div>
                                <Link href={`/clients/${client.id}/plan`} className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors">
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" />
                            待提升客户 (Stagnant) - {selectedMetric.stagnantClients.length}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedMetric.stagnantClients.map(client => (
                              <div key={client.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                    {client.name[0]}
                                  </div>
                                  <span className="text-xs font-bold text-slate-700">{client.name}</span>
                                </div>
                                <Link href={`/clients/${client.id}/plan`} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              </div>
                            ))}
                            {selectedMetric.stagnantClients.length === 0 && (
                              <div className="col-span-full py-4 text-center text-[10px] font-bold text-slate-400 italic">暂无数据</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <Activity className="w-12 h-12 text-slate-200 mb-4" />
                      <div className="text-sm font-bold text-slate-400">选择左侧或上方维度，查看详细的交付质量报告</div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* 3. 方案有效性排行 (Top Protocols) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-8">健康调理方案有效性排行</h3>
                <div className="space-y-6">
                  {[
                    { name: '深度肠道修复 SOP', clients: 45, score: 94, trend: 'up' },
                    { name: '压力性失眠调理', clients: 32, score: 88, trend: 'up' },
                    { name: '女性代谢平衡方案', clients: 28, score: 82, trend: 'down' },
                    { name: '高强度脑力补剂组', clients: 15, score: 76, trend: 'up' },
                  ].map((protocol, i) => (
                    <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-4 -mx-4 rounded-2xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800">{protocol.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{protocol.clients} 位客户正在执行</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-600">{protocol.score}%</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">平均改善评分</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">客户流失风险分析</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">基于执行周期的流失概率分布</p>
                  </div>
                  <div className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full border border-rose-100">
                    CRITICAL: 第 21 天
                  </div>
                </div>
                
                <div className="h-48 flex items-end justify-between gap-4 px-4">
                  {[12, 18, 25, 68, 42, 15, 8].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group">
                      <div 
                        className={`w-full rounded-t-xl transition-all duration-700 relative group ${i === 3 ? 'bg-rose-500' : 'bg-slate-200 hover:bg-slate-300'}`}
                        style={{ height: `${val}%` }}
                      >
                        {i === 3 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-black py-1.5 px-3 rounded-lg shadow-xl shadow-rose-200 whitespace-nowrap">
                            流失高峰点
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-4 font-black uppercase tracking-widest">
                        D{(i + 1) * 7}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                    <span className="text-rose-500 font-black">专家洞察：</span> 
                    大部分客户在执行到第 21 天（第三周）时会出现“体感平台期”，建议在第 20 天自动触发一个“激励型随访”以降低流失率。
                  </p>
                </div>
              </div>
            </div>

            {/* 4. 客户分层 LTV 分析 (Customer Segments) */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-8">客户画像与 LTV 价值矩阵</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { tag: '高净值/VIP', count: 12, avgLtv: '¥ 12,400', color: 'text-amber-600', bg: 'bg-amber-50' },
                  { tag: '慢病长期管理', count: 48, avgLtv: '¥ 8,600', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { tag: '产后/备孕', count: 25, avgLtv: '¥ 5,200', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { tag: '职场减压', count: 64, avgLtv: '¥ 2,800', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((segment, i) => (
                  <div key={i} className={`${segment.bg} p-6 rounded-[24px] border border-transparent hover:border-slate-200 transition-all cursor-pointer`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${segment.color}`}>{segment.tag}</div>
                    <div className="text-2xl font-black text-slate-900 mb-1">{segment.avgLtv}</div>
                    <div className="text-[11px] text-slate-400 font-bold">{segment.count} 位有效客户</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 全局 Modals */}
      {isProductSelectModalOpen && activePhaseIdForProductSelect && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-[32px] w-full max-w-2xl max-h-[90vh] md:max-h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight truncate">选择产品 (Select Product)</h3>
                <p className="text-slate-500 text-[10px] md:text-sm font-medium mt-0.5 md:mt-1 truncate">从产品库中选择要添加到此阶段的产品</p>
              </div>
              <button 
                onClick={() => {
                  setIsProductSelectModalOpen(false);
                  setActivePhaseIdForProductSelect(null);
                }}
                className="p-2 md:p-3 hover:bg-slate-100 rounded-xl md:rounded-2xl text-slate-400 hover:text-slate-600 transition-all shrink-0"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            
            <div className="p-4 md:p-8 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-2.5 md:top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="搜索产品名称、品牌或功效..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl py-2 md:py-3 pl-10 md:pl-12 pr-4 text-xs md:text-sm focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 md:px-8 md:pb-8 custom-scrollbar">
              <div className="grid grid-cols-1 gap-2 md:gap-3">
                {products
                  .filter(p => {
                    const searchLower = productSearchQuery.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(searchLower) ||
                      p.brand?.toLowerCase().includes(searchLower) ||
                      p.main_efficacy?.some(e => e.toLowerCase().includes(searchLower)) ||
                      p.category?.toLowerCase().includes(searchLower)
                    );
                  })
                  .map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(activePhaseIdForProductSelect, product.id)}
                      className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-slate-50 border-2 border-slate-50 rounded-xl md:rounded-2xl hover:bg-white hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/5 transition-all text-left group"
                    >
                      <div className="w-9 h-9 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center justify-center border border-slate-100 group-hover:border-emerald-100 transition-colors shrink-0">
                        <Package className="w-4 h-4 md:w-6 md:h-6 text-slate-300 group-hover:text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs md:text-sm font-black text-slate-800 truncate">{product.name}</span>
                          <span className="shrink-0 text-[8px] md:text-[10px] font-bold text-slate-400 bg-white px-1.5 md:px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest">{product.brand}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                          <span className="shrink-0 text-[8px] md:text-[10px] font-bold text-slate-400">规格: {product.spec_quantity}{product.spec_unit}</span>
                          <span className="text-slate-200">|</span>
                          <div className="flex gap-1 overflow-hidden">
                            {product.main_efficacy?.slice(0, 2).map((eff, i) => (
                              <span key={i} className="shrink-0 text-[8px] md:text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 md:px-1.5 py-0.5 rounded whitespace-nowrap">#{eff}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="hidden sm:inline-block text-[8px] md:text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 md:px-2 py-0.5 rounded uppercase tracking-tighter">
                          {product.category || '未分类'}
                        </span>
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-emerald-500 transition-all transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  ))}
                {products.filter(p => {
                  const searchLower = productSearchQuery.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(searchLower) ||
                    p.brand?.toLowerCase().includes(searchLower) ||
                    p.main_efficacy?.some(e => e.toLowerCase().includes(searchLower)) ||
                    p.category?.toLowerCase().includes(searchLower)
                  );
                }).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Package className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-bold">未找到匹配的产品</p>
                    <p className="text-xs mt-1">请尝试其他关键词搜索</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar Container */}
          <div className="absolute left-0 top-0 bottom-0 w-64 md:w-72 bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="h-full flex flex-col">
              <div className="p-5 md:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Activity className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <span className="font-black text-white tracking-tight text-base md:text-lg">PDR <span className="text-emerald-500">v2.0</span></span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 md:p-2 hover:bg-slate-800 rounded-lg md:rounded-xl transition-colors text-slate-400"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar 
                  activeTab={activeTab} 
                  onTabChange={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-slate-900 text-slate-300 flex flex-col"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg md:rounded-xl lg:hidden text-slate-600 transition-colors shrink-0"
            >
              <Menu className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <h2 className="text-xs md:text-lg font-bold text-slate-800 truncate">
              {activeTab === 'dashboard' && '工作台 Dashboard'}
              {activeTab === 'clients' && '客户 360° 动态档案'}
              {activeTab === 'products' && '产品与成分元数据库'}
              {activeTab === 'templates' && '健康调理配方库'}
              {activeTab === 'triggers' && '全局干预触发器配置 (System Triggers)'}
              {activeTab === 'reports' && '数据分析报告 (Data Reports)'}
              {activeTab === 'knowledge' && '营养学知识库 (Nutrition Knowledge)'}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2 md:ml-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索全局元数据..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-24 md:w-64 bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            {activeTab !== 'templates' && (
              <button 
                  onClick={async () => {
                    if (activeTab === 'dashboard') {
                      setNewTaskMode('log');
                      setIsNewTaskModalOpen(true);
                    }
                    if (activeTab === 'clients') await handleAddClient();
                    if (activeTab === 'products') await handleAddProduct();
                    if (activeTab === 'triggers') setIsTriggerModalOpen(true);
                  }}
                className="flex items-center justify-center w-9 h-9 md:w-auto md:px-6 md:py-2 bg-slate-900 text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline ml-2">
                  {activeTab === 'dashboard' && '新建待办/日志'}
                  {activeTab === 'clients' && '新增客户档案'}
                  {activeTab === 'products' && '新增产品/成分'}
                  {activeTab === 'triggers' && '配置干预规则'}
                  {activeTab === 'reports' && '生成分析报告'}
                  {activeTab === 'knowledge' && '发布知识内容'}
                </span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderContent()}
        </main>
      </div>
      {/* Modal Definitions */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col my-8 max-h-[90vh]">
            <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl ${newTaskMode === 'log' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                  {newTaskMode === 'log' ? <FileEdit className="w-5 h-5 md:w-6 md:h-6" /> : <Bell className="w-5 h-5 md:w-6 md:h-6" />}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800">
                    {newTaskMode === 'log' ? '新建跟进日志' : '新建待办提醒'}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-0.5 md:mt-1">
                    {newTaskMode === 'log' ? '记录客户沟通情况，更新标签' : '设置定时提醒，系统自动触发告警'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 md:p-8 space-y-5 md:space-y-6 flex-1 overflow-y-auto max-h-[70vh] md:max-h-none">
              {/* 模式切换 */}
              <div className="flex p-1 bg-slate-100 rounded-xl md:rounded-2xl shrink-0">
                <button
                  onClick={() => setNewTaskMode('log')}
                  className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all ${
                    newTaskMode === 'log' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  日志模式 (无提醒)
                </button>
                <button
                  onClick={() => setNewTaskMode('todo')}
                  className={`flex-1 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all ${
                    newTaskMode === 'todo' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  提醒模式 (定时告警)
                </button>
              </div>

              <form id="newTaskForm" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const clientId = formData.get('clientId') as string;
                const content = formData.get('content') as string;
                
                if (!clientId || !content) {
                  alert('请选择客户并填写内容');
                  return;
                }

                if (newTaskMode === 'log') {
                  const tagsRaw = formData.get('tags') as string;
                  const tags = tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean) : undefined;
                  
                  await addUserLog(clientId, {
                    content,
                    type: 'regular',
                    date: new Date().toISOString().split('T')[0]
                  }, tags);
                  
                  // 联动逻辑：如果勾选了“同步创建待办”
                  const syncTodo = formData.get('syncTodo') === 'on';
                  if (syncTodo) {
                    const dueDate = formData.get('dueDate') as string;
                    if (dueDate) {
                      await addUserTask({
                        id: `task-${Date.now()}`,
                        clientId,
                        type: 'manual_todo',
                        content: `[由日志同步] ${content}`,
                        dueDate,
                        priority: (formData.get('priority') as any) || 'medium',
                        status: 'pending',
                        createdAt: new Date().toISOString()
                      });
                    }
                  }
                } else {
                  const dueDate = formData.get('dueDate') as string;
                  if (!dueDate) {
                    alert('请选择到期日期');
                    return;
                  }
                  
                  await addUserTask({
                    id: `task-${Date.now()}`,
                    clientId,
                    type: 'manual_todo',
                    content,
                    dueDate,
                    priority: (formData.get('priority') as any) || 'medium',
                    status: 'pending',
                    createdAt: new Date().toISOString()
                  });
                }
                
                setIsNewTaskModalOpen(false);
                alert(newTaskMode === 'log' ? '日志已记录' : '待办已创建');
              }} className="space-y-4 md:space-y-5">
                {/* 客户选择 */}
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">关联客户</label>
                  <select 
                    name="clientId"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-slate-900 outline-none transition-all font-bold"
                    required
                  >
                    <option value="">选择客户...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                {/* 内容输入 */}
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {newTaskMode === 'log' ? '日志内容' : '待办内容'}
                  </label>
                  <textarea 
                    name="content"
                    placeholder={newTaskMode === 'log' ? "输入本次沟通详情..." : "输入需要提醒的事项..."}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-slate-900 outline-none transition-all font-bold min-h-[80px] md:min-h-[100px]"
                    required
                  />
                </div>

                {newTaskMode === 'log' ? (
                  <>
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">更新标签 (逗号分隔)</label>
                      <input 
                        name="tags"
                        type="text"
                        placeholder="例如: 意向强烈, 补货意向, 能量低"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-slate-900 outline-none transition-all font-bold"
                      />
                    </div>
                    <div className="bg-blue-50/50 p-4 rounded-xl md:rounded-2xl border border-blue-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            name="syncTodo" 
                            id="syncTodo"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          />
                          <label htmlFor="syncTodo" className="text-xs font-black text-blue-700">同步创建后续提醒待办</label>
                        </div>
                        <Zap className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">提醒日期</label>
                          <input 
                            name="dueDate"
                            type="date"
                            className="w-full bg-white/80 border border-blue-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400 font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">优先级</label>
                          <select 
                            name="priority"
                            className="w-full bg-white/80 border border-blue-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400 font-bold"
                          >
                            <option value="medium">中</option>
                            <option value="high">高</option>
                            <option value="critical">紧急</option>
                            <option value="low">低</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">提醒日期</label>
                      <input 
                        name="dueDate"
                        type="date"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-slate-900 outline-none transition-all font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 md:space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">优先级</label>
                      <select 
                        name="priority"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-xs md:text-sm focus:border-slate-900 outline-none transition-all font-bold"
                      >
                        <option value="medium">中 (Medium)</option>
                        <option value="high">高 (High)</option>
                        <option value="critical">紧急 (Critical)</option>
                        <option value="low">低 (Low)</option>
                      </select>
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="px-5 py-4 md:px-8 md:py-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsNewTaskModalOpen(false)}
                className="px-4 py-2 md:px-6 md:py-3 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
              >
                取消
              </button>
              <button 
                type="submit"
                form="newTaskForm"
                className={`px-6 py-2.5 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl transition-all ${
                  newTaskMode === 'log' 
                    ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700' 
                    : 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700'
                }`}
              >
                {newTaskMode === 'log' ? '保存日志' : '创建提醒'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Definitions */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-[32px] w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl text-emerald-600">
                  <Database className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-800">
                    {importType === 'clients' ? '客户档案批量导入' : '产品库批量导入'}
                  </h3>
                  <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                    <span className={`text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full ${
                      importStep === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>1. 上传</span>
                    <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-300" />
                    <span className={`text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full ${
                      importStep === 'preview' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>2. 预览</span>
                    <ChevronRight className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-300" />
                    <span className={`text-[8px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full ${
                      importStep === 'history' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>3. 历史</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <button 
                  onClick={() => setImportStep('history')}
                  className="px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg md:rounded-xl transition-all"
                >
                  <span className="hidden md:inline">查看历史记录</span>
                  <span className="md:hidden">历史</span>
                </button>
                <button onClick={() => setIsImportModalOpen(false)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8">
              {importStep === 'upload' && (
                <div className="space-y-6 md:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3 md:space-y-4">
                      <h4 className="text-xs md:text-sm font-bold text-slate-700">步骤 1：下载标准模板</h4>
                      <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed">
                        请务必使用系统提供的标准 Excel 模板，不要修改表头结构，否则可能导致数据对齐失败。
                      </p>
                      <button 
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-slate-100 text-slate-700 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold hover:bg-slate-200 transition-all w-full justify-center"
                      >
                        <Package className="w-4 h-4 md:w-5 md:h-5" />
                        下载 {importType === 'clients' ? '客户档案' : '产品库'} 模板
                      </button>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      <h4 className="text-xs md:text-sm font-bold text-slate-700">步骤 2：上传填好的 Excel</h4>
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="border-2 border-dashed border-slate-200 rounded-xl md:rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center gap-2 md:gap-3 group-hover:border-emerald-300 group-hover:bg-emerald-50/30 transition-all">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-lg md:rounded-xl flex items-center justify-center group-hover:bg-emerald-100">
                            <Plus className="w-5 h-5 md:w-6 md:h-6 text-slate-300 group-hover:text-emerald-500" />
                          </div>
                          <div className="text-center">
                            <div className="text-xs md:text-sm font-bold text-slate-400 group-hover:text-emerald-600">点击或拖拽上传文件</div>
                            <p className="text-[9px] md:text-[10px] text-slate-400 mt-1">支持 .xlsx, .xls, .csv 格式</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-amber-100">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs md:text-sm mb-2">
                      <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" /> 导入注意事项
                    </div>
                    <ul className="text-[10px] md:text-xs text-amber-600 space-y-1.5 md:space-y-2 list-disc pl-4 font-medium">
                      {importType === 'clients' ? (
                        <>
                          <li>手机号是客户的唯一标识，重复手机号将无法导入。</li>
                          <li>日期格式建议为 YYYY-MM-DD (例如: 1990-01-01)。</li>
                          <li>身高体重请填写纯数字，不要带单位。</li>
                        </>
                      ) : (
                        <>
                          <li>产品名称和品牌是必填项。</li>
                          <li>成分含量请按格式填写，如“ing-1:500:mg”。</li>
                          <li>企业名称已加入模板，请据实填写。</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {importStep === 'preview' && (
                <div className="space-y-5 md:space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-slate-700">数据对齐预览</h4>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-1">
                        共解析出 <span className="font-bold text-slate-900">{previewData.length}</span> 条记录，
                        其中 <span className="font-bold text-rose-500">{importErrors.length}</span> 条存在格式问题。
                      </p>
                    </div>
                    <button 
                      onClick={() => setImportStep('upload')}
                      className="text-[10px] md:text-xs font-bold text-emerald-600 hover:underline"
                    >
                      重新上传
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto max-h-[300px] md:max-h-[400px]">
                      <table className="w-full text-left text-[10px] md:text-xs">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">行号</th>
                            {importType === 'clients' ? (
                              <>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">姓名</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">手机号</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">性别</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">生日</th>
                              </>
                            ) : (
                              <>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">产品名称</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">品牌</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">企业名称</th>
                                <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">规格</th>
                              </>
                            )}
                            <th className="px-3 py-2 md:px-4 md:py-3 font-black text-slate-400 uppercase tracking-widest">校验</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.map((row, idx) => {
                            const rowErrors = importErrors.filter(e => e.row === idx);
                            const isError = rowErrors.length > 0;
                            
                            return (
                              <tr key={idx} className={isError ? 'bg-rose-50/50' : 'hover:bg-slate-50 transition-colors'}>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-slate-400 font-bold">{idx + 1}</td>
                                {importType === 'clients' ? (
                                  <>
                                    <td className="px-3 py-2 md:px-4 md:py-3 font-bold text-slate-700">{row.name}</td>
                                    <td className={`px-3 py-2 md:px-4 md:py-3 font-bold ${rowErrors.some(e => e.field === 'phone') ? 'text-rose-600' : 'text-slate-700'}`}>
                                      {row.phone}
                                    </td>
                                    <td className="px-3 py-2 md:px-4 md:py-3 text-slate-500">{row.gender === 'male' ? '男' : '女'}</td>
                                    <td className={`px-3 py-2 md:px-4 md:py-3 hidden md:table-cell ${rowErrors.some(e => e.field === 'birthday') ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                      {row.birthday}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-2 md:px-4 md:py-3 font-bold text-slate-700">{row.name}</td>
                                    <td className="px-3 py-2 md:px-4 md:py-3 text-slate-700">{row.brand}</td>
                                    <td className="px-3 py-2 md:px-4 md:py-3 text-slate-500 hidden md:table-cell">{row.enterprise_name}</td>
                                    <td className={`px-3 py-2 md:px-4 md:py-3 font-bold ${rowErrors.some(e => e.field === 'spec_quantity') ? 'text-rose-600' : 'text-slate-700'}`}>
                                      {row.spec_quantity}
                                    </td>
                                  </>
                                )}
                                <td className="px-3 py-2 md:px-4 md:py-3">
                                  {isError ? (
                                    <div className="flex flex-col gap-0.5">
                                      {rowErrors.map((err, i) => (
                                        <span key={i} className="text-[8px] md:text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                                          <X className="w-2 h-2" /> {err.msg}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[8px] md:text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                                      <ShieldCheck className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden md:inline">校验通过</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {importStep === 'history' && (
                <div className="space-y-5 md:space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-slate-700">导入批次历史</h4>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-1">记录所有批量操作，支持一键撤回错误导入的数据。</p>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    {importBatches.length === 0 ? (
                      <div className="py-8 md:py-12 text-center bg-slate-50 rounded-xl md:rounded-2xl border border-dashed border-slate-200">
                        <Database className="w-8 h-8 md:w-10 md:h-10 text-slate-200 mx-auto mb-2 md:mb-3" />
                        <p className="text-xs md:text-sm text-slate-400 font-medium">暂无导入记录</p>
                      </div>
                    ) : (
                      importBatches.map((batch: ImportBatch) => (
                        <div key={batch.id} className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-5 flex items-center justify-between hover:shadow-md transition-all">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center ${
                              batch.type === 'clients' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                            }`}>
                              {batch.type === 'clients' ? <Users className="w-5 h-5 md:w-6 md:h-6" /> : <Package className="w-5 h-5 md:w-6 md:h-6" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="text-xs md:text-sm font-bold text-slate-800">
                                  {batch.type === 'clients' ? '客户' : '产品'} 导入
                                </span>
                                <span className="text-[8px] md:text-[10px] bg-slate-100 text-slate-500 px-1.5 md:px-2 py-0.5 rounded-full font-bold">
                                  {batch.count} 条
                                </span>
                              </div>
                              <div className="text-[10px] md:text-xs text-slate-400 mt-0.5 md:mt-1 font-medium">
                                {new Date(batch.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              if (confirm('确定要撤回该批次的所有数据吗？此操作不可恢复。')) {
                                rollbackBatch(batch.id);
                                alert('批次已撤回');
                              }
                            }}
                            className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-rose-600 hover:bg-rose-50 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all border border-transparent hover:border-rose-100"
                          >
                            <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden md:inline">一键撤回</span>
                            <span className="md:hidden">撤回</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 md:px-8 md:py-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-[10px] md:text-xs text-slate-400 font-medium">
                {importStep === 'preview' && `包含 ${importErrors.length} 个错误`}
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
                >
                  取消
                </button>
                {importStep === 'preview' && (
                  <button 
                    onClick={handleConfirmImport}
                    disabled={importErrors.length > 0}
                    className={`px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl transition-all ${
                      importErrors.length > 0 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                    }`}
                  >
                    确认入库
                  </button>
                )}
                {importStep === 'history' && (
                  <button 
                    onClick={() => setImportStep('upload')}
                    className="px-4 md:px-8 py-2 md:py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
                  >
                    开始新导入
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg md:text-xl font-black text-slate-800">{editingClient ? '编辑客户档案' : '录入新客户'}</h3>
              <button onClick={() => setIsClientModalOpen(false)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-5 md:p-8 space-y-4 md:space-y-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">客户姓名</label>
                <input name="name" type="text" placeholder="请输入姓名" defaultValue={editingClient?.name} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" required />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">联系电话</label>
                <input name="phone" type="text" placeholder="请输入手机号" defaultValue={editingClient?.phone} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">性别</label>
                    <select name="gender" defaultValue={editingClient?.gender || 'female'} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                      <option value="female">女</option>
                      <option value="male">男</option>
                      <option value="other">其他</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">出生日期</label>
                    <input name="birthday" type="date" defaultValue={editingClient?.birthday} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">身高 (cm)</label>
                    <input name="height_cm" type="number" placeholder="cm" defaultValue={editingClient?.height_cm} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">体重 (kg)</label>
                    <input name="weight_kg" type="number" placeholder="kg" defaultValue={editingClient?.weight_kg} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">调理目标</label>
                <input name="health_goal" type="text" placeholder="如: 改善睡眠, 降低尿酸, 减脂10kg" defaultValue={editingClient?.health_goal} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">获客来源</label>
                  <select name="source" defaultValue={editingClient?.source || 'direct'} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none">
                    <option value="direct">自然到访</option>
                    <option value="wechat_moments">微信朋友圈</option>
                    <option value="referral">客户推荐</option>
                    <option value="tiktok">抖音/小红书</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-rose-500">成交意向</label>
                  <select name="conversion_intent" defaultValue={editingClient?.conversion_intent || 'low'} className="w-full bg-rose-50/50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-rose-500 outline-none appearance-none font-bold text-rose-700">
                    <option value="low">低 (常规维护)</option>
                    <option value="medium">中 (意向跟进)</option>
                    <option value="high">高 (准成交/立即跟进)</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all mt-2 md:mt-4">
                {editingClient ? '保存修改' : '确认录入'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="px-5 py-4 md:px-8 md:py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg md:text-xl font-black text-slate-800">{editingProduct ? '编辑产品详情' : '录入新产品/成分'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-5 md:p-8 space-y-4 md:space-y-6">
              <div className="space-y-1.5 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">产品名称</label>
                <input name="name" type="text" placeholder="请输入产品全称" defaultValue={editingProduct?.name} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">品牌</label>
                  <input name="brand" type="text" placeholder="品牌名称" defaultValue={editingProduct?.brand} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">企业名称</label>
                  <input name="enterprise_name" type="text" placeholder="企业/厂商名称" defaultValue={editingProduct?.enterprise_name} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">单次剂量单位</label>
                  <input name="dosage_unit" type="text" placeholder="如: 粒/袋/ml" defaultValue={editingProduct?.dosage_unit} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">规格数量</label>
                  <input name="spec_quantity" type="number" placeholder="如: 60" defaultValue={editingProduct?.spec_quantity} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">规格单位</label>
                  <input name="spec_unit" type="text" placeholder="如: 瓶/盒" defaultValue={editingProduct?.spec_unit} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 px-4 md:py-4 md:px-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                </div>
              </div>
                <div className="space-y-3 md:space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">核心成分 (搜索添加)</label>
                  
                  {/* 已选成分列表 */}
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
                    {selectedIngredients.map((ing, idx) => {
                      const ingDetail = ingredients.find(i => i.id === ing.ingredient_id);
                      return (
                        <div key={idx} className="bg-emerald-50 border border-emerald-100 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 group">
                          <div className="flex flex-col">
                            <span className="text-[10px] md:text-xs font-bold text-emerald-700">{ingDetail?.name || ing.ingredient_id}</span>
                            <span className="text-[8px] md:text-[10px] text-emerald-600/70">{ing.amount_per_unit} {ing.unit}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setSelectedIngredients(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-400 group-hover:text-emerald-600 transition-colors"
                          >
                            <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* 搜索输入框 */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
                      <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="搜索成分名称 (如: 鱼油, Q10...)"
                      value={ingredientSearch}
                      onChange={(e) => setIngredientSearch(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 pl-10 pr-4 md:py-4 md:pl-12 md:pr-6 text-xs md:text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    />
                    
                    {/* 搜索结果下拉框 */}
                    {ingredientSearch && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl md:rounded-2xl shadow-2xl border border-slate-100 z-20 max-h-48 overflow-y-auto p-1.5 md:p-2">
                        {ingredients.filter(ing => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase())).map(ing => (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => {
                              if (!selectedIngredients.find(s => s.ingredient_id === ing.id)) {
                                setSelectedIngredients(prev => [...prev, { ingredient_id: ing.id, amount_per_unit: 0, unit: 'mg' }]);
                              }
                              setIngredientSearch('');
                            }}
                            className="w-full text-left px-3 py-2 md:px-4 md:py-3 hover:bg-slate-50 rounded-lg md:rounded-xl transition-colors flex items-center justify-between group"
                          >
                            <span className="text-xs md:text-sm font-medium text-slate-700">{ing.name}</span>
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 group-hover:text-emerald-500" />
                          </button>
                        ))}
                        {/* 允许添加自定义成分 */}
                        {!ingredients.some(ing => ing.name.toLowerCase() === ingredientSearch.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={async () => {
                              const newId = `custom-${Date.now()}`;
                              const newIngredient = { id: newId, name: ingredientSearch, description: '自定义添加' };
                              await addIngredient(newIngredient);
                              setSelectedIngredients(prev => [...prev, { ingredient_id: newId, amount_per_unit: 0, unit: 'mg' }]);
                              setIngredientSearch('');
                            }}
                            className="w-full text-left px-3 py-2 md:px-4 md:py-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg md:rounded-xl transition-colors flex items-center justify-between group border border-dashed border-emerald-200"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs md:text-sm font-bold text-emerald-700">添加: "{ingredientSearch}"</span>
                              <span className="text-[8px] md:text-[10px] text-emerald-600">数据库未找到，点击直接创建</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 选定成分的含量编辑 */}
                  {selectedIngredients.length > 0 && (
                    <div className="bg-slate-50/50 rounded-xl md:rounded-2xl p-3 md:p-4 space-y-2 md:space-y-3">
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">调整含量与单位</p>
                      {selectedIngredients.map((ing, idx) => {
                        const ingDetail = ingredients.find(i => i.id === ing.ingredient_id);
                        return (
                          <div key={idx} className="flex items-center gap-2 md:gap-3 bg-white p-2 md:p-3 rounded-lg md:rounded-xl border border-slate-100">
                            <span className="text-[10px] md:text-xs font-bold text-slate-600 min-w-[60px] md:min-w-[80px] truncate">{ingDetail?.name}</span>
                            <input 
                              type="number" 
                              placeholder="含量"
                              value={ing.amount_per_unit || ''}
                              onChange={(e) => {
                                const newIngs = [...selectedIngredients];
                                newIngs[idx].amount_per_unit = Number(e.target.value);
                                setSelectedIngredients(newIngs);
                              }}
                              className="w-16 md:w-20 bg-slate-50 border-none rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                            <input 
                              type="text" 
                              placeholder="单位"
                              value={ing.unit}
                              onChange={(e) => {
                                const newIngs = [...selectedIngredients];
                                newIngs[idx].unit = e.target.value;
                                setSelectedIngredients(newIngs);
                              }}
                              className="w-12 md:w-16 bg-slate-50 border-none rounded-lg py-1.5 md:py-2 px-2 md:px-3 text-[10px] md:text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              <button type="submit" className="w-full py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all mt-2 md:mt-4">
                {editingProduct ? '保存修改' : '确认录入'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isTriggerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl md:rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-black text-slate-800">{editingTrigger ? '编辑干预规则' : '配置新干预规则'}</h3>
              <button onClick={() => setIsTriggerModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveTrigger} className="p-5 md:p-8 space-y-4 md:space-y-6 overflow-y-auto max-h-[85vh] md:max-h-[70vh]">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">规则名称</label>
                <input name="name" type="text" placeholder="如：连续断服预警" defaultValue={editingTrigger?.name} className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分类</label>
                  <select name="category" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none" defaultValue={editingTrigger?.category || 'compliance'}>
                    <option value="compliance">依从性干预</option>
                    <option value="inventory">库存与复购</option>
                    <option value="symptom">体感与风险</option>
                    <option value="growth">商业增长</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">告警优先级</label>
                  <select name="action_priority" className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none" defaultValue={editingTrigger?.action?.priority || 'medium'}>
                    <option value="low">低 (Low)</option>
                    <option value="medium">中 (Medium)</option>
                    <option value="high">高 (High)</option>
                    <option value="critical">紧急 (Critical)</option>
                  </select>
                </div>
              </div>

              {/* A. Condition Pool */}
              <div className="p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 space-y-4">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  如果满足以下条件 (Condition)
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">判定逻辑</label>
                  <select name="condition_type" className="w-full bg-white border-none rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none" defaultValue={editingTrigger?.condition?.type || 'adherence_streak'}>
                    <option value="adherence_streak">行为维度：连续 N 天断服</option>
                    <option value="stock_level">库存维度：库存水位低于 N 天</option>
                    <option value="vital_trend">体感维度：趋势指标连续下降 N 次</option>
                    <option value="protocol_duration">时间维度：方案执行满 N 天周期</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">判定阈值 (N)</label>
                    <input name="condition_threshold" type="number" defaultValue={editingTrigger?.condition?.threshold || 2} className="w-full bg-white border-none rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">统计周期 (可选)</label>
                    <input name="condition_period_days" type="number" placeholder="天数" defaultValue={editingTrigger?.condition?.period_days} className="w-full bg-white border-none rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                  </div>
                </div>
              </div>

              {/* B. Action Pool */}
              <div className="p-4 bg-slate-900 rounded-xl md:rounded-2xl space-y-4">
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  则执行以下动作 (Action)
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">动作类型</label>
                  <select name="action_type" className="w-full bg-slate-800 border-none text-white rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none" defaultValue={editingTrigger?.action?.type || 'push_red_dot'}>
                    <option value="push_red_dot">红点通知：生成待办事项</option>
                    <option value="send_template">模版推送：自动选择话术</option>
                    <option value="highlight_client">状态标记：列表高亮置顶</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">动作标签 (如: 【沉默关怀】)</label>
                  <input name="action_label" type="text" placeholder="显示在动作前的简短标签" defaultValue={editingTrigger?.action?.label} className="w-full bg-slate-800 border-none text-white rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">自动化话术模版</label>
                  <textarea name="action_payload_template" placeholder="支持变量：{{client_name}}, {{product_name}}, {{threshold}}..." className="w-full bg-slate-800 border-none text-white rounded-xl md:rounded-2xl py-3 md:py-4 px-4 md:px-6 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none min-h-[80px]" defaultValue={editingTrigger?.action?.payload_template} required />
                </div>
              </div>

              <button type="submit" className="w-full py-3 md:py-4 bg-emerald-600 text-white rounded-xl md:rounded-2xl font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all mt-4">
                {editingTrigger ? '更新规则配置' : '激活干预规则'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">加载中...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
