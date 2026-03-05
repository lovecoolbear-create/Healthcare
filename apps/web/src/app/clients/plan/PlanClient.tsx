'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Activity,
  Search,
  Package,
  ShieldAlert,
  CheckCircle2,
  FlaskConical,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  Moon,
  MessageSquare,
  Share2,
  ShieldCheck,
  Save,
  X,
  Users,
  StickyNote,
  Eye,
  ShoppingBag,
  GripVertical,
  Trash2,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Client, ProtocolPhase, ProtocolAction, ProtocolTrigger } from '@healthcare/shared';
import { 
  mockProtocol as initialProtocol
} from '../../../../../mp/src/mocks/data'; 
import { useData } from '../../../context/DataContext';

import { Sidebar } from '../../../components/Sidebar';
import { ActiveTab } from '../../../types';

// --- Sortable Components for Protocol Editor ---

interface SortablePhaseProps {
  phase: ProtocolPhase;
  index: number;
  onRemove?: () => void;
  onUpdate?: (updates: Partial<ProtocolPhase>) => void;
  onAddAction?: () => void;
  onRemoveAction?: (actionId: string) => void;
  onUpdateAction?: (actionId: string, updates: Partial<ProtocolAction>) => void;
  isOverlay?: boolean;
}

const SortablePhase = ({ phase, index, onRemove, onUpdate, onAddAction, onRemoveAction, onUpdateAction, isOverlay }: SortablePhaseProps) => {
  const { products, ingredients } = useData();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: phase.id });

  const calculatePhaseNutrients = () => {
    const summary: Record<string, { total: number; unit: string }> = {};
    
    phase.actions.forEach((action: ProtocolAction) => {
      const product = products.find(p => p.id === action.product_id);
      if (product && product.ingredients) {
        const timesPerDay = action.frequency_per_day || 1;
        const amountPerTime = parseFloat(action.dosage_per_time) || 1;
        
        product.ingredients.forEach(ing => {
          const ingredientInfo = ingredients.find(i => i.id === ing.ingredient_id);
          const ingredientName = ingredientInfo?.name || ing.ingredient_id;
          
          if (!summary[ingredientName]) {
            summary[ingredientName] = { total: 0, unit: ing.unit };
          }
          summary[ingredientName].total += ing.amount_per_unit * amountPerTime * timesPerDay;
        });
      }
    });
    
    return Object.entries(summary).map(([name, data]) => ({
      name,
      total: data.total,
      unit: data.unit
    }));
  };

  const phaseNutrients = calculatePhaseNutrients();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative pl-24 group ${isOverlay ? 'z-50' : ''}`}>
      {/* 阶段指示器 */}
      <div className="absolute left-0 top-0 flex flex-col items-center">
        <div 
          {...attributes} 
          {...listeners}
          className="w-20 h-20 bg-white border-4 border-slate-50 rounded-[28px] shadow-xl flex flex-col items-center justify-center group-hover:border-emerald-500 transition-all duration-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-slate-300 mb-1" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Phase</span>
          <span className="text-2xl font-black text-slate-900 leading-none">{index + 1}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <input 
            type="text" 
            value={phase.name}
            className="text-2xl font-black text-slate-800 tracking-tight bg-transparent border-none focus:ring-2 focus:ring-emerald-500/20 rounded-lg p-1 w-64"
            onChange={(e) => onUpdate?.({ name: e.target.value })}
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-xl border border-slate-200/50">
              <Calendar className="w-3.5 h-3.5" />
              <input 
                type="number"
                value={phase.duration_days}
                onChange={(e) => onUpdate?.({ duration_days: parseInt(e.target.value) || 0 })}
                className="w-12 bg-transparent border-none p-0 focus:ring-0 text-center font-black"
              />
              <span>天周期</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onRemove}
          className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* 阶段性营养素汇总看板 (专业审查位) */}
      {phaseNutrients.length > 0 && (
        <div className="mb-6 p-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="relative z-10">
            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              本阶段日均营养素汇总 (专业审查)
            </h4>
            <div className="flex flex-wrap gap-4">
              {phaseNutrients.map((n, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500">{n.name}</span>
                  <span className="text-sm font-black text-white">
                    {n.total.toLocaleString()} <span className="text-[10px] text-slate-400 ml-0.5">{n.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <SortableContext 
          items={phase.actions.map(a => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {phase.actions.map((action: ProtocolAction) => (
            <SortableAction 
              key={action.id} 
              action={action} 
              onRemove={() => onRemoveAction?.(action.id)} 
              onUpdate={(updates) => onUpdateAction?.(action.id, updates)}
            />
          ))}
        </SortableContext>
        
        {/* 新增动作占位 */}
        <button 
          onClick={onAddAction}
          className="border-2 border-dashed border-slate-100 rounded-3xl p-6 flex items-center justify-center gap-3 text-slate-300 hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-500 transition-all group/add"
        >
          <Plus className="w-5 h-5 group-hover/add:rotate-90 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">添加产品</span>
        </button>
      </div>
    </div>
  );
};

interface SortableActionProps {
  action: ProtocolAction;
  onRemove: () => void;
  onUpdate?: (updates: Partial<ProtocolAction>) => void;
}

  const SortableAction = ({ action, onRemove, onUpdate }: SortableActionProps) => {
    const { products, ingredients } = useData();
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: action.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    };

    const product = products.find(p => p.id === action.product_id);

    // 逻辑闭环：计算该产品在当前阶段的预计消耗总量与营养素总量
    const calculateNutrients = () => {
      if (!product || !product.ingredients) return null;
      
      // 基础频率逻辑
      const timesPerDay = action.frequency_per_day || 1;
      const amountPerTime = parseFloat(action.dosage_per_time) || 1;
      
      return product.ingredients.map(ing => {
        const ingredientInfo = ingredients.find(i => i.id === ing.ingredient_id);
        return {
          name: ingredientInfo?.name || ing.ingredient_id,
          totalAmount: ing.amount_per_unit * amountPerTime * timesPerDay,
          unit: ing.unit
        };
      });
    };

    const nutrients = calculateNutrients();

    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 flex flex-col gap-4 hover:bg-white hover:shadow-xl hover:border-emerald-100 transition-all duration-300 group/action"
      >
        <div className="flex items-start gap-5">
          <div 
            {...attributes} 
            {...listeners}
            className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm group-hover/action:scale-110 transition-transform cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4 text-slate-200 absolute top-1" />
            <Package className="w-6 h-6 text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <select 
                value={action.product_id}
                onChange={(e) => onUpdate?.({ product_id: e.target.value })}
                className="text-base font-black text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full cursor-pointer hover:text-emerald-600 transition-colors"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                onClick={onRemove}
                className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/action:opacity-100 transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">服用频率</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    value={action.frequency_per_day || 1}
                    onChange={(e) => onUpdate?.({ frequency_per_day: parseInt(e.target.value) || 1 })}
                    className="w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <span className="text-[10px] font-bold text-slate-500">次 / 天</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">单次用量</label>
                <input 
                  type="text"
                  value={action.dosage_per_time || ''}
                  placeholder={product?.dosage_unit || '1粒'}
                  onChange={(e) => onUpdate?.({ dosage_per_time: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>
            </div>

            {/* 营养素汇总逻辑展示 */}
            {nutrients && nutrients.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {nutrients.map((n, i) => (
                  <div key={i} className="px-2 py-0.5 bg-emerald-50 text-[9px] font-bold text-emerald-700 rounded-md border border-emerald-100">
                    {n.name}: {n.totalAmount}{n.unit}/日
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'with_meal', label: '随餐', color: 'bg-emerald-100 text-emerald-700' },
              { id: 'empty_stomach', label: '空腹', color: 'bg-amber-100 text-amber-700' },
              { id: 'before_bed', label: '睡前', color: 'bg-indigo-100 text-indigo-700' },
              { id: 'after_meal', label: '餐后', color: 'bg-blue-100 text-blue-700' },
              { id: 'any_time', label: '不限', color: 'bg-slate-100 text-slate-700' }
            ].map(tag => (
              <button
                key={tag.id}
                onClick={() => onUpdate?.({ timing_tag: tag.id as any })}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  action.timing_tag === tag.id 
                    ? `${tag.color} ring-2 ring-offset-1 ring-current` 
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <div className="relative group/note">
            <MessageSquare className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={action.usage_instructions || ''}
              placeholder="添加使用备注 (如: 温水送服)..."
              onChange={(e) => onUpdate?.({ usage_instructions: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-4 text-[11px] font-medium text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
        </div>
      </div>
    );
  };

import { useTriggers } from '../../../hooks/useTriggers';

export default function PlanClient() {
  const { 
    clients, 
    products, 
    updateClient, 
    triggers, 
    updateTrigger: persistUpdateTrigger, 
    deleteTrigger,
    calibrateInventory,
    checkConflicts
  } = useData();
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'clients';
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab); 
  
  // 使用中心化逻辑 hook
  const { ALERT_GROUPS } = useTriggers();
  
  // 当 URL 参数变化时更新 tab
  React.useEffect(() => {
    const tab = searchParams.get('tab') as ActiveTab;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const selectedClientId = id as string;
  const [clientDetailTab, setClientDetailTab] = useState<'status' | 'plan' | 'inventory' | 'notes' | 'evidence' | 'assets' | 'orders'>('plan');

  // Protocol Editor State
  const [protocol, setProtocol] = useState(initialProtocol);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // 这里的 ALERT_GROUPS 已通过 useTriggers 统一管理

  const getAlertGroup = (trigger: ProtocolTrigger) => {
    if (trigger.action.priority === 'critical' || trigger.category === 'symptom' || trigger.condition.type === 'vital_trend') return 'urgent';
    if (trigger.category === 'inventory' || trigger.condition.type === 'stock_level') return 'inventory';
    if (trigger.category === 'growth') return 'growth';
    return 'followup';
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if we are dragging a phase or an action
      if (activeId.startsWith('phase-') && overId.startsWith('phase-')) {
        setProtocol(prev => {
          const oldIndex = prev.phases.findIndex(p => p.id === activeId);
          const newIndex = prev.phases.findIndex(p => p.id === overId);
          return {
            ...prev,
            phases: arrayMove(prev.phases, oldIndex, newIndex)
          };
        });
      } else if (activeId.startsWith('action-') && overId.startsWith('action-')) {
        // Find which phase these actions belong to
        setProtocol(prev => {
          const newPhases = prev.phases.map(phase => {
            const activeIndex = phase.actions.findIndex(a => a.id === activeId);
            const overIndex = phase.actions.findIndex(a => a.id === overId);
            
            if (activeIndex !== -1 && overIndex !== -1) {
              return {
                ...phase,
                actions: arrayMove(phase.actions, activeIndex, overIndex)
              };
            }
            return phase;
          });
          return { ...prev, phases: newPhases };
        });
      }
    }
    setActiveDragId(null);
  };

  const addPhase = () => {
     const newPhase: ProtocolPhase = {
       id: `phase-${Date.now()}`,
       protocol_id: protocol.id,
       name: '新阶段',
       duration_days: 7,
       order: protocol.phases.length,
       actions: []
     };
     setProtocol(prev => ({
       ...prev,
       phases: [...prev.phases, newPhase]
     }));
   };

   const removePhase = (phaseId: string) => {
     setProtocol(prev => ({
       ...prev,
       phases: prev.phases.filter(p => p.id !== phaseId)
     }));
   };

   const addAction = (phaseId: string) => {
    const newAction: ProtocolAction = {
      id: `action-${Date.now()}`,
      phase_id: phaseId,
      product_id: products[0]?.id || 'prod-001',
      frequency_per_day: 1,
      dosage_per_time: '1粒',
      timing_tag: 'any_time',
      order: 0
    };
    setProtocol(prev => ({
      ...prev,
      phases: prev.phases.map(p => 
        p.id === phaseId ? { ...p, actions: [...p.actions, newAction] } : p
      )
    }));
  };

  const saveAsGlobalTemplate = () => {
    alert('方案已成功另存为全局模板！');
  };

  const updatePhase = (phaseId: string, updates: Partial<ProtocolPhase>) => {
    setProtocol(prev => ({
      ...prev,
      phases: prev.phases.map(p => 
        p.id === phaseId ? { ...p, ...updates } : p
      )
    }));
  };

  const updateAction = (phaseId: string, actionId: string, updates: Partial<ProtocolAction>) => {
    setProtocol(prev => ({
      ...prev,
      phases: prev.phases.map(p => 
        p.id === phaseId ? {
          ...p,
          actions: p.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
        } : p
      )
    }));
  };

  const removeAction = (phaseId: string, actionId: string) => {
    setProtocol(prev => ({
      ...prev,
      phases: prev.phases.map(p => 
        p.id === phaseId ? { ...p, actions: p.actions.filter(a => a.id !== actionId) } : p
      )
    }));
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const activeConflicts = selectedClient ? checkConflicts(selectedClient.id, protocol.id) : [];

  // 逻辑闭环：计算当前方案针对的所有生理指标 (Evidence Closure)
  const getFormulaTargetMetrics = () => {
    const metrics = new Set<string>();
    const { ingredients, products } = useData();
    
    protocol.phases.forEach(phase => {
      phase.actions.forEach(action => {
        const product = products.find(p => p.id === action.product_id);
        product?.ingredients?.forEach(ing => {
          const ingredientInfo = ingredients.find(i => i.id === ing.ingredient_id);
          ingredientInfo?.target_metrics?.forEach(metric => metrics.add(metric));
        });
      });
    });
    
    return Array.from(metrics);
  };

  const formulaTargetMetrics = getFormulaTargetMetrics();

  // 逻辑闭环：更新客户信息（例如添加标签、更新依从性等）
  const handleUpdateClient = async (updates: Partial<Client>) => {
    if (!selectedClient) return;
    const updatedClient = { ...selectedClient, ...updates };
    await updateClient(updatedClient, updates);
  };

  // 逻辑闭环：从证据链自动生成营销素材
  const generateMarketingAssetFromEvidence = async (evidenceTitle: string) => {
    if (!selectedClient) return;
    
    const newAsset = {
      id: `asset-${Date.now()}`,
      client_id: selectedClient.id,
      practitioner_id: selectedClient.practitioner_id,
      type: 'poster' as const,
      title: `${evidenceTitle} - 调理好转真实案例`,
      image_url: '#', // 模拟生成海报的 URL
      is_anonymous: true,
      created_at: new Date().toISOString(),
    };

    const updatedAssets = [...(selectedClient.marketing_assets || []), newAsset];
    await handleUpdateClient({ marketing_assets: updatedAssets });
    alert('已成功基于该检测证据生成匿名脱敏案例海报！');
    setClientDetailTab('assets'); // 自动切换到素材标签页查看
  };

  if (!selectedClient && activeTab === 'clients' && id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">未找到客户档案</h2>
          <p className="text-slate-500 mb-6">该客户可能已被删除或 ID 不正确。</p>
          <button 
            onClick={() => router.push('/?tab=clients')}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20"
          >
            返回客户列表
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateTrigger = async (id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (!trigger) return;

    const updates = editingValues[id] || {};
    const updatedTrigger: ProtocolTrigger = {
      ...trigger,
      name: updates.name || trigger.name,
      condition: {
        ...trigger.condition,
        threshold: updates.condition_threshold !== undefined ? updates.condition_threshold : trigger.condition.threshold,
      },
      action: {
        ...trigger.action,
        label: updates.action_label !== undefined ? updates.action_label : trigger.action.label,
      }
    };

    await persistUpdateTrigger(updatedTrigger);
    
    setEditingValues(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleToggleTrigger = async (id: string) => {
    const trigger = triggers.find(t => t.id === id);
    if (!trigger) return;

    const updatedTrigger = {
      ...trigger,
      is_enabled: !trigger.is_enabled
    };

    await persistUpdateTrigger(updatedTrigger);
  };

  const handleDeleteTrigger = async (id: string) => {
    if (confirm('确定要删除这个触发器吗？')) {
      await deleteTrigger(id);
    }
  };

  const handleValueChange = (id: string, field: string, value: any) => {
    setEditingValues(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const filteredClients = clients.filter((c: Client) => 
    c.name.includes(searchQuery) || c.phone?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {activeTab === 'clients' && '客户 360° 动态档案'}
              {activeTab === 'products' && '产品与成分元数据库'}
              {activeTab === 'templates' && 'SOP 方案与配方库'}
              {activeTab === 'triggers' && '全局干预触发器配置 (System Triggers)'}
              {activeTab === 'reports' && '数据分析报告 (Data Reports)'}
              {activeTab === 'knowledge' && '营养学知识库 (Nutrition Knowledge)'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索全局元数据..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
              <Plus className="w-4 h-4" />
              {activeTab === 'clients' && '新增客户档案'}
              {activeTab === 'products' && '新增产品/成分'}
              {activeTab === 'triggers' && '配置干预规则'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'clients' && selectedClient ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* 客户头部信息 */}
              <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-10 relative overflow-hidden group">
                {/* 装饰性背景 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
                
                <div className="relative z-10 shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-900 rounded-[40px] flex items-center justify-center text-4xl md:text-5xl font-black text-white shadow-2xl shadow-slate-900/20 transform -rotate-3 hover:rotate-0 transition-all duration-500">
                    {selectedClient.name[0]}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="relative z-10 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{selectedClient.name}</h1>
                      <div className="flex gap-2">
                        {selectedClient.tags?.map((tag, idx) => (
                          <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200/50">{tag}</span>
                        ))}
                        <button 
                          onClick={() => {
                            const tag = prompt('请输入新标签名称:');
                            if (tag) {
                              handleUpdateClient({ tags: [...(selectedClient.tags || []), tag] });
                            }
                          }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                        >
                          + Add Tag
                        </button>
                      </div>
                    </div>
                    
                    {/* 返回按钮 */}
                    <button 
                      onClick={() => router.push('/?tab=clients')}
                      className="group flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-slate-200/50 hover:border-rose-100"
                    >
                      <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                      关闭详情 (Back)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-12">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">联系电话</div>
                      <div className="text-lg font-black text-slate-700">{selectedClient.phone}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">入组时间</div>
                      <div className="text-lg font-black text-slate-700">{new Date(selectedClient.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">当前状态</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-lg font-black text-emerald-600">方案执行中</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">累计积分</div>
                      <div className="text-lg font-black text-slate-900">{selectedClient.loyalty_points || 0} pts</div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col justify-between items-end gap-6 border-l border-slate-100 pl-10 hidden lg:flex">
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">依从性评分</div>
                    <div className="text-5xl font-black text-emerald-600 leading-none tracking-tighter">{selectedClient.adherence_score}%</div>
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
                    <Share2 className="w-4 h-4" />
                    导出档案
                  </button>
                </div>
              </div>

              {/* 核心功能切换 */}
              <div className="flex flex-col gap-8">
                <div className="flex gap-1 bg-white p-1.5 rounded-3xl border border-slate-100 shadow-sm w-fit">
                  {[
                    { id: 'status', label: '动态面板', icon: Activity },
                    { id: 'plan', label: '干预配方', icon: FlaskConical },
                    { id: 'inventory', label: '库存追踪', icon: Package },
                    { id: 'notes', label: '跟进日志', icon: StickyNote },
                    { id: 'evidence', label: '检测证据', icon: Eye },
                    { id: 'assets', label: '营销素材', icon: ImageIcon },
                    { id: 'orders', label: '订单记录', icon: ShoppingBag }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setClientDetailTab(tab.id as any)}
                      className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                        clientDetailTab === tab.id 
                          ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {clientDetailTab === 'status' && (
                  <div className="grid grid-cols-3 gap-8">
                    {/* 健康基线与过敏原 */}
                    <div className="col-span-1 space-y-8">
                      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-rose-500" />
                          健康风险基线
                        </h3>
                        <div className="space-y-6">
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">已知过敏原</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedClient.allergies?.map((item, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-xl border border-rose-100">{item}</span>
                              ))}
                              <button 
                                onClick={() => {
                                  const item = prompt('请输入新过敏原:');
                                  if (item) {
                                    handleUpdateClient({ allergies: [...(selectedClient.allergies || []), item] });
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">禁忌/冲突</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedClient.contraindications?.map((item, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-xl border border-amber-100">{item}</span>
                              ))}
                              <button 
                                onClick={() => {
                                  const item = prompt('请输入新禁忌/冲突项:');
                                  if (item) {
                                    handleUpdateClient({ contraindications: [...(selectedClient.contraindications || []), item] });
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-black text-amber-400 hover:text-amber-600 transition-colors"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                          
                          {/* 动态冲突预警 (知识库闭环) */}
                          {activeConflicts.length > 0 && (
                            <div className="mt-8 p-6 bg-rose-50 rounded-[24px] border border-rose-100 animate-pulse shadow-lg shadow-rose-200/20">
                              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" />
                                实时药物-营养素冲突预警
                              </h4>
                              <div className="space-y-4">
                                {activeConflicts.map(conflict => (
                                  <div key={conflict.id} className="bg-white/60 p-4 rounded-2xl border border-rose-200/50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black rounded uppercase">{conflict.severity} Risk</span>
                                      <span className="text-xs font-black text-slate-800">{conflict.medication_keyword} x {conflict.ingredient_keyword}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 leading-relaxed mb-2">{conflict.description}</p>
                                    <div className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      建议：{conflict.suggestion}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">当前用药</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedClient.current_medications?.map((item, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl border border-blue-100">{item}</span>
                              ))}
                              <button 
                                onClick={() => {
                                  const item = prompt('请输入当前用药:');
                                  if (item) {
                                    handleUpdateClient({ current_medications: [...(selectedClient.current_medications || []), item] });
                                  }
                                }}
                                className="px-2 py-1 text-[10px] font-black text-blue-400 hover:text-blue-600 transition-colors"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/20">
                        <h3 className="text-xs font-black uppercase tracking-widest mb-5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-emerald-400" />
                            智能干预触发器
                          </div>
                          <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-md opacity-60 font-medium">Active</span>
                        </h3>
                        <div className="space-y-3">
                          {triggers.filter(t => t.client_id === selectedClient.id || t.is_global).map(trigger => {
                            const group = ALERT_GROUPS[getAlertGroup(trigger) as keyof typeof ALERT_GROUPS];
                            return (
                              <div key={trigger.id} className="bg-white/5 rounded-xl p-3 border border-white/10 hover:bg-white/10 transition-all group/item">
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2">
                                    {group && (
                                      <>
                                        <group.icon className={`w-3.5 h-3.5 ${group.color}`} />
                                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">{group.label}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className={`w-1.5 h-1.5 rounded-full ${trigger.is_enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                                </div>
                                <div className="text-[11px] font-bold mb-0.5 text-slate-100">{trigger.name}</div>
                                <div className="text-[9px] opacity-40 leading-tight line-clamp-1 group-hover/item:line-clamp-none transition-all">{trigger.action.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 关键生命体征动态 */}
                    <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-base font-black text-slate-900 tracking-tight">生命体征监控</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">最近 30 天关键健康指标波动情况</p>
                        </div>
                        <div className="flex bg-slate-50 p-1 rounded-xl">
                          <button className="px-3 py-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white hover:text-slate-600 transition-all">周报</button>
                          <button className="px-3 py-1.5 bg-white text-slate-900 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm">月报</button>
                        </div>
                      </div>
                      
                      {/* 模拟图表区域 */}
                      <div className="h-48 flex items-end justify-between gap-2 px-2">
                        {[45, 52, 48, 65, 58, 72, 68, 85, 78, 92, 88, 95].map((val, i) => (
                          <div key={i} className="flex-1 group relative h-full flex items-end">
                            <div 
                              className="w-full bg-emerald-500 rounded-t-md opacity-20 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                              style={{ height: `${val}%` }}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                {val}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-4 px-2">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                          <span key={m} className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">{m}</span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                          <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center shrink-0">
                            <Activity className="w-5 h-5 text-rose-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">平均心率 (RHR)</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg font-black text-slate-800">72</span>
                              <span className="text-[9px] font-bold text-slate-400">bpm</span>
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                            <Moon className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">深睡占比 (Deep)</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg font-black text-slate-800">24</span>
                              <span className="text-[9px] font-bold text-slate-400">%</span>
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {clientDetailTab === 'plan' && (
                  <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
                    {/* 配方编辑器头部 */}
                    <div className="flex items-center justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200">
                          <FlaskConical className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{protocol.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-lg uppercase tracking-widest">Core Logic</span>
                            <p className="text-xs text-slate-500 font-medium">{protocol.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={saveAsGlobalTemplate}
                          className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          另存为全局模板
                        </button>
                        <button className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          执行此方案
                        </button>
                      </div>
                    </div>

                    {/* 配方冲突实时预警 (Plan Tab) */}
                    {activeConflicts.length > 0 && (
                      <div className="p-6 bg-rose-50 rounded-[32px] border border-rose-100 flex items-start gap-6 shadow-xl shadow-rose-200/20">
                        <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
                          <ShieldAlert className="w-7 h-7 text-white animate-bounce" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-black text-rose-600 mb-1 tracking-tight">发现配方与用药冲突！</h4>
                          <p className="text-xs text-rose-500 font-bold mb-4">当前方案中的营养素与客户正在服用的药物存在交互风险，请审查并调整：</p>
                          <div className="flex flex-wrap gap-4">
                            {activeConflicts.map(c => (
                              <div key={c.id} className="px-4 py-2 bg-white/60 rounded-xl border border-rose-200 text-[10px] font-black text-slate-800">
                                {c.medication_keyword} + {c.ingredient_keyword} : {c.severity.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 配方阶段列表 (DND) */}
                    <div className="relative">
                      {/* 连接线 */}
                      <div className="absolute left-10 top-20 bottom-20 w-1 bg-slate-100 rounded-full"></div>
                      
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <div className="space-y-12 relative z-10">
                          <SortableContext 
                            items={protocol.phases.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {protocol.phases.map((phase, idx) => (
                              <SortablePhase 
                                key={phase.id} 
                                phase={phase} 
                                index={idx}
                                onRemove={() => removePhase(phase.id)}
                                onUpdate={(updates) => updatePhase(phase.id, updates)}
                                onAddAction={() => addAction(phase.id)}
                                onRemoveAction={(actionId) => removeAction(phase.id, actionId)}
                                onUpdateAction={(actionId, updates) => updateAction(phase.id, actionId, updates)}
                              />
                            ))}
                          </SortableContext>

                          {/* 添加阶段按钮 */}
                          <div className="pl-24">
                            <button 
                              onClick={addPhase}
                              className="w-full py-8 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-3 text-slate-300 hover:bg-white hover:border-emerald-200 hover:text-emerald-500 hover:shadow-2xl transition-all duration-500 group/newphase"
                            >
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover/newphase:bg-emerald-50 transition-colors">
                                <Plus className="w-6 h-6 group-hover/newphase:scale-125 transition-transform" />
                              </div>
                              <span className="text-xs font-black uppercase tracking-[0.3em]">新增调理阶段 (New Phase)</span>
                            </button>
                          </div>
                        </div>

                        <DragOverlay>
                          {activeDragId ? (
                            <div className="opacity-80 scale-105">
                              {activeDragId.startsWith('phase-') ? (
                                <SortablePhase 
                                  phase={protocol.phases.find(p => p.id === activeDragId)!} 
                                  index={protocol.phases.findIndex(p => p.id === activeDragId)}
                                  isOverlay
                                />
                              ) : (
                                <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl w-80">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                      <Package className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="font-black text-slate-800 text-sm">正在移动产品项...</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    </div>
                  </div>
                )}

                {/* 核心功能：库存追踪标签页 */}
                {clientDetailTab === 'inventory' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* 库存概览卡片 */}
                      <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">产品库存实时监控</h3>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">基于当前干预配方的自动损耗计算</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
                              <Plus className="w-3 h-3" />
                              手动入库
                            </button>
                          </div>
                        </div>

                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          {/* 表头 */}
                          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <div className="col-span-4">产品信息</div>
                            <div className="col-span-2 text-center">当前库存</div>
                            <div className="col-span-2 text-center">预估可用</div>
                            <div className="col-span-2 text-center">补货金额</div>
                            <div className="col-span-2 text-right">操作</div>
                          </div>

                          <div className="divide-y divide-slate-50">
                            {protocol.phases.flatMap(p => p.actions).map(action => {
                              const product = products.find(prod => prod.id === action.product_id);
                              if (!product) return null;
                              
                              const invItem = selectedClient.inventory_status?.find(i => i.product_id === product.id);
                              const currentStock = invItem?.current_stock || 0;
                              const dailyUsage = (action.frequency_per_day || 1) * (parseFloat(action.dosage_per_time) || 1);
                              
                              let remainingDays = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : 0;
                              if (invItem?.last_calibration_date) {
                                const lastDate = new Date(invItem.last_calibration_date).getTime();
                                const now = new Date().getTime();
                                const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
                                remainingDays = Math.max(0, remainingDays - daysPassed);
                              }
                              
                              const isLowStock = remainingDays < 7;

                              return (
                                <div key={action.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-slate-50/50 transition-colors group">
                                  <div className="col-span-4 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isLowStock ? 'bg-rose-50' : 'bg-slate-50'}`}>
                                      <Package className={`w-4 h-4 ${isLowStock ? 'text-rose-500' : 'text-slate-400'}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-800 truncate">{product.name}</div>
                                      <div className="text-[9px] text-slate-400 font-medium">ID: {product.id}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="col-span-2 text-center">
                                    <div className="text-xs font-black text-slate-700">{currentStock} <span className="text-[9px] text-slate-400 font-normal">{product.dosage_unit || '粒'}</span></div>
                                  </div>

                                  <div className="col-span-2 text-center">
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-md ${isLowStock ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      {remainingDays} <span className="text-[9px] font-normal opacity-70">天</span>
                                    </span>
                                  </div>

                                  <div className="col-span-2 text-center">
                                    {product.price ? (
                                      <div className="text-xs font-black text-slate-900">
                                        ¥{product.price}
                                        <span className="text-[9px] text-slate-400 font-normal ml-0.5">/{product.packaging_unit || '瓶'}</span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-300">-</span>
                                    )}
                                  </div>

                                  <div className="col-span-2 flex justify-end gap-1">
                                    <button 
                                      onClick={() => {
                                        const stock = prompt(`请输入 ${product.name} 的当前实测库存数量 (${product.dosage_unit || '粒'}):`, currentStock.toString());
                                        if (stock !== null) {
                                          const numStock = parseFloat(stock);
                                          if (!isNaN(numStock)) {
                                            calibrateInventory(selectedClient.id, product.id, numStock);
                                          }
                                        }
                                      }}
                                      title="库存校准"
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
                                      <ShoppingBag className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* 补货决策看板 (闭环核心) */}
                      <div className="space-y-6">
                        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5">
                            <TrendingUp className="w-16 h-16 text-emerald-400" />
                          </div>
                          <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-emerald-400">
                              <Zap className="w-3.5 h-3.5" />
                              本月补货决策
                            </h3>
                            <div className="space-y-4">
                              {(() => {
                                const lowStockActions = protocol.phases.flatMap(p => p.actions).filter(action => {
                                  const product = products.find(prod => prod.id === action.product_id);
                                  const invItem = selectedClient.inventory_status?.find(i => i.product_id === product?.id);
                                  const currentStock = invItem?.current_stock || 0;
                                  const dailyUsage = (action.frequency_per_day || 1) * (parseFloat(action.dosage_per_time) || 1);
                                  
                                  let remainingDays = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : 0;
                                  if (invItem?.last_calibration_date) {
                                    const lastDate = new Date(invItem.last_calibration_date).getTime();
                                    const now = new Date().getTime();
                                    const daysPassed = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
                                    remainingDays = Math.max(0, remainingDays - daysPassed);
                                  }
                                  
                                  return remainingDays < 7;
                                });
                                
                                const totalRestockAmount = lowStockActions.reduce((acc, action) => {
                                  const product = products.find(prod => prod.id === action.product_id);
                                  return acc + (product?.price || 0);
                                }, 0);

                                return (
                                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">预计补货总额</div>
                                    <div className="text-2xl font-black tracking-tighter text-white">¥ {totalRestockAmount.toLocaleString()}</div>
                                    <p className="text-[9px] text-white/40 mt-2 leading-relaxed">基于 {lowStockActions.length} 个低库存产品计算</p>
                                  </div>
                                );
                              })()}
                              <button className="w-full py-3 bg-emerald-500 text-white rounded-xl font-black text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                                <ShoppingBag className="w-3.5 h-3.5" />
                                生成补货订单
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">库存变动日志</h3>
                          <div className="space-y-3">
                            {[
                              { date: '2024-03-20', action: '系统扣减', detail: '深海鱼油 -2 粒', color: 'text-rose-500' },
                              { date: '2024-03-15', action: '手动入库', detail: '益生菌 +60 粒', color: 'text-emerald-500' },
                              { date: '2024-03-10', action: '系统扣减', detail: '辅酶 Q10 -1 粒', color: 'text-rose-500' }
                            ].map((log, i) => (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none">
                                <div>
                                  <div className="text-[9px] font-black text-slate-400">{log.date}</div>
                                  <div className="text-[10px] font-bold text-slate-700">{log.action}</div>
                                </div>
                                <div className={`text-[10px] font-black ${log.color}`}>{log.detail}</div>
                              </div>
                            ))}
                          </div>
                          <button className="w-full mt-4 py-2 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">查看完整日志</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {clientDetailTab === 'notes' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">随访跟进记录</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">关联干预方案执行情况与体感反馈的闭环记录</p>
                      </div>
                      <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all">
                        <Plus className="w-3.5 h-3.5" />
                        新增随访笔记
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      {/* 自动生成的执行摘要 (逻辑闭环) */}
                      <div className="lg:col-span-1 space-y-6">
                        <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-200/20 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="w-12 h-12 text-white" />
                          </div>
                          <div className="relative z-10">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 opacity-60">本周执行摘要</h4>
                            <div className="space-y-4">
                              <div className="flex items-end gap-1.5">
                                <span className="text-3xl font-black leading-none">{selectedClient.adherence_score}%</span>
                                <span className="text-[9px] font-bold opacity-60 mb-1">依从性</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                                  <div className="text-[8px] font-black opacity-60 uppercase mb-0.5">漏服</div>
                                  <div className="text-base font-black">2 <span className="text-[8px] opacity-60">次</span></div>
                                </div>
                                <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                                  <div className="text-[8px] font-black opacity-60 uppercase mb-0.5">体感</div>
                                  <div className="text-base font-black">8.5 <span className="text-[8px] opacity-60">/10</span></div>
                                </div>
                              </div>
                              <p className="text-[10px] leading-relaxed opacity-80 bg-white/5 p-2.5 rounded-lg border border-white/5">
                                <span className="font-black">建议：</span> 漏服多见于睡前，建议调整至晚餐随餐。
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">快速标签筛选</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {['方案调整', '体感好转', '库存提醒', '过敏反应', '依从性高'].map(tag => (
                              <button key={tag} className="px-2 py-1 bg-slate-50 text-slate-500 text-[9px] font-black rounded-lg border border-slate-100 hover:bg-slate-900 hover:text-white transition-all">
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 时间轴记录 */}
                      <div className="lg:col-span-3 space-y-4">
                        {selectedClient.follow_up_notes && selectedClient.follow_up_notes.length > 0 ? (
                          selectedClient.follow_up_notes.map((note, idx) => (
                            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    note.type === 'adjustment' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                                  }`}>
                                    {note.type === 'adjustment' ? <Zap className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[11px] font-black text-slate-800">
                                        {note.type === 'adjustment' ? '方案调整' : note.type === 'milestone' ? '关键里程碑' : '常规随访'}
                                      </span>
                                      <span className="text-[9px] font-medium text-slate-400">{note.date}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">{note.content}</p>
                                    <div className="flex gap-1.5">
                                      {note.tags?.map(tag => (
                                        <span key={tag} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black rounded border border-slate-100 uppercase tracking-tighter">{tag}</span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <button className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><Plus className="w-3.5 h-3.5 rotate-45" /></button>
                                  <button className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-white rounded-2xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-slate-400">
                            <StickyNote className="w-10 h-10 mb-3 opacity-10" />
                            <p className="text-xs font-medium">暂无随访记录</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {clientDetailTab === 'evidence' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">客观检测证据链</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">对比干预前后的客观指标变化，量化干预效果</p>
                      </div>
                      <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-slate-900/10">
                        <Plus className="w-3.5 h-3.5" />
                        上传检测报告
                      </button>
                    </div>

                    {/* 方案指标关联看板 (Evidence Closure Logic) */}
                    <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity className="w-16 h-16 text-emerald-400" />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 opacity-60">
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                          当前方案针对指标 (Targeted Metrics)
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {formulaTargetMetrics.length > 0 ? (
                            formulaTargetMetrics.map((metric, i) => {
                              const hasEvidence = selectedClient.evidence_chain?.some(record => 
                                record.metrics?.some(m => m.name.toLowerCase().includes(metric.toLowerCase()) || metric.toLowerCase().includes(m.name.toLowerCase()))
                              );
                              
                              return (
                                <div key={i} className={`px-4 py-3 rounded-xl border transition-all group ${hasEvidence ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}>
                                  <div className="text-[8px] font-black opacity-40 uppercase mb-0.5 tracking-wider">针对指标</div>
                                  <div className="text-sm font-black flex items-center gap-1.5">
                                    {metric}
                                    {hasEvidence && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                                  </div>
                                  <div className="mt-1.5 text-[8px] font-bold text-emerald-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {hasEvidence ? '已有证据支撑' : '待上传证据'}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-[10px] font-medium opacity-40 italic">当前方案暂无明确关联的生理指标</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedClient.evidence_chain && selectedClient.evidence_chain.length > 0 ? (
                        selectedClient.evidence_chain.map((record, idx) => (
                          <div key={idx} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="p-5 border-b border-slate-50">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg border border-emerald-100">{record.title}</span>
                                  <button 
                                    onClick={() => generateMarketingAssetFromEvidence(record.title)}
                                    className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                                    title="生成营销素材"
                                  >
                                    <Zap className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-[9px] font-black text-slate-300">更新于 {record.date}</span>
                              </div>
                              <h4 className="text-sm font-black text-slate-800">{record.title}</h4>
                              {record.description && <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{record.description}</p>}
                            </div>
                            
                            {record.metrics && record.metrics.length > 0 ? (
                              <div className="grid grid-cols-2 bg-slate-50/50">
                                {record.metrics.map((metric, mIdx) => (
                                  <React.Fragment key={mIdx}>
                                    <div className="p-4 border-r border-slate-100">
                                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">干预前</div>
                                      <div className="flex flex-col items-center justify-center py-4 bg-white rounded-xl border border-slate-100">
                                        <div className="text-xl font-black text-slate-400">{metric.before_value}</div>
                                        <div className="text-[8px] font-bold text-slate-300 uppercase">{metric.unit}</div>
                                      </div>
                                    </div>
                                    <div className="p-4">
                                      <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">干预后</div>
                                      <div className="flex flex-col items-center justify-center py-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <div className="text-xl font-black text-emerald-600">{metric.after_value}</div>
                                        <div className="text-[8px] font-bold text-emerald-400 uppercase">{metric.unit}</div>
                                        <div className="absolute top-0 right-0 p-2">
                                          {metric.trend === 'down' ? <TrendingDown className="w-2.5 h-2.5 text-emerald-500" /> : <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />}
                                        </div>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 bg-slate-50/50">
                                <div className="p-4 border-r border-slate-100">
                                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">干预前</div>
                                  <div className="aspect-video bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                    {record.before_img_url ? (
                                      <img src={record.before_img_url} alt="Before" className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-6 h-6 text-slate-100" />
                                    )}
                                  </div>
                                </div>
                                <div className="p-4">
                                  <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">干预后</div>
                                  <div className="aspect-video bg-white rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                    {record.after_img_url ? (
                                      <img src={record.after_img_url} alt="After" className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-6 h-6 text-slate-100" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-slate-400">
                          <Eye className="w-8 h-8 mb-3 opacity-10" />
                          <p className="text-xs font-medium">暂无对比证据</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 核心功能：营销素材标签页 */}
                {clientDetailTab === 'assets' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">好转案例海报库</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">基于真实数据闭环自动生成的匿名案例海报</p>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-50 transition-all">
                          配置脱敏模板
                        </button>
                        <button className="px-5 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5" />
                          AI 一键生成
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {selectedClient.marketing_assets && selectedClient.marketing_assets.length > 0 ? (
                        selectedClient.marketing_assets.map((asset, i) => (
                          <div key={i} className="group relative aspect-[3/4] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/0 via-slate-900/0 to-slate-900/60 group-hover:via-slate-900/20 transition-all"></div>
                            
                            {/* 海报内容 */}
                            <div className="absolute inset-0 p-4 flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <div className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center shadow-lg">
                                  <ImageIcon className="w-3.5 h-3.5 text-slate-900" />
                                </div>
                                <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur text-white text-[8px] font-black rounded-md border border-white/20 uppercase tracking-tighter">
                                  {asset.type}
                                </span>
                              </div>
                              
                              <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                <div className="text-[8px] font-black text-white/60 mb-0.5">{asset.created_at.split('T')[0]}</div>
                                <h4 className="text-xs font-black text-white mb-3 line-clamp-1">{asset.title}</h4>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <button className="flex-1 py-1.5 bg-white text-slate-900 text-[9px] font-black rounded-lg hover:bg-emerald-500 hover:text-white transition-colors">分享</button>
                                  <button className="p-1.5 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/40 transition-colors">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-4 bg-white rounded-2xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon className="w-10 h-10 mb-3 opacity-10" />
                          <p className="text-xs font-medium">暂无营销素材</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 核心功能：订单记录标签页 */}
                {clientDetailTab === 'orders' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">订单流水记录</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">关联补货决策与真实交易流水</p>
                      </div>
                      <button className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/10">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        录入新订单
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">订单日期</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">产品详情</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">数量</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">状态</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedClient.order_history && selectedClient.order_history.length > 0 ? (
                            selectedClient.order_history.map((order, i) => {
                              const product = products.find(p => p.id === order.product_id);
                              return (
                                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="text-xs font-black text-slate-700">{order.ordered_at.split('T')[0]}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-slate-600">{product?.name || '未知产品'}</div>
                                    <div className="text-[9px] text-slate-400">{product?.brand}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-xs font-black text-slate-900">{order.quantity} <span className="text-[9px] text-slate-400">{product?.packaging_unit || '瓶'}</span></div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-md border uppercase ${
                                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      order.status === 'shipped' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                      order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                      'bg-slate-50 text-slate-400 border-slate-100'
                                    }`}>
                                      {order.status === 'delivered' ? '已送达' :
                                       order.status === 'shipped' ? '已发货' :
                                       order.status === 'pending' ? '待处理' : '已取消'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button className="text-[9px] font-black text-slate-400 hover:text-slate-900 transition-colors">查看详情</button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                <div className="flex flex-col items-center">
                                  <ShoppingBag className="w-10 h-10 mb-3 opacity-10" />
                                  <p className="text-xs font-medium">暂无订单记录</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 补充其他 Tab 的占位内容 */}
                {/* 已经全部完善 */}
                {![ 'status', 'plan', 'inventory', 'notes', 'evidence', 'assets', 'orders'].includes(clientDetailTab) && (
                  <div className="bg-white rounded-[40px] p-20 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-slate-400 animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 opacity-20" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">
                      功能模块正在集成中
                    </h3>
                    <p className="text-sm font-medium text-slate-400">请选择上方的核心板块</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'clients' ? (
             <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
               <Users className="w-16 h-16 mb-4 opacity-10" />
               <p className="text-lg font-bold">请选择一位客户查看详情</p>
               <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-2xl">
                 {filteredClients.slice(0, 4).map(c => (
                   <button 
                     key={c.id}
                     onClick={() => router.push(`/clients/plan?id=${c.id}`)}
                     className="bg-white border border-slate-100 p-6 rounded-[32px] text-left hover:shadow-xl transition-all group"
                   >
                     <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-4 group-hover:scale-110 transition-transform">
                       {c.name[0]}
                     </div>
                     <div className="font-black text-slate-900">{c.name}</div>
                     <div className="text-xs text-slate-400 mt-1">{c.phone}</div>
                   </button>
                 ))}
               </div>
             </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-300">
              <p className="text-xl font-bold">页面开发中...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
