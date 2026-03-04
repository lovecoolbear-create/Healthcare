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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: phase.id });

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
  const { products } = useData();
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

export default function PlanClient() {
  const { clients, products, updateClient, triggers, updateTrigger: persistUpdateTrigger, deleteTrigger } = useData();
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const initialTab = (searchParams.get('tab') as ActiveTab) || 'plan';
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab); 
  
  // 当 URL 参数变化时更新 tab
  React.useEffect(() => {
    const tab = searchParams.get('tab') as ActiveTab;
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [isAddingTag, setIsAddingTag] = useState(false);
  const selectedClientId = id as string;
  const [clientDetailTab, setClientDetailTab] = useState<'status' | 'plan' | 'inventory' | 'notes' | 'evidence' | 'assets' | 'orders'>('status');

  // Protocol Editor State
  const [protocol, setProtocol] = useState(initialProtocol);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // 这里的 ALERT_GROUPS 需要与工作台 Dashboard 保持一致
  const ALERT_GROUPS = {
    'urgent': { label: '紧急干预', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
    'inventory': { label: '补货转化', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
    'followup': { label: '常规随访', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    'growth': { label: '关系维护', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' }
  };

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
                  <div className="flex flex-wrap items-center gap-4 mb-6">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{selectedClient.name}</h1>
                    <div className="flex gap-2">
                      {selectedClient.tags?.map((tag, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200/50">{tag}</span>
                      ))}
                      <button 
                        onClick={() => setIsAddingTag(true)}
                        className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                      >
                        + Add Tag
                      </button>
                    </div>
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
                              <button className="px-2 py-1 text-[10px] font-black text-rose-400 hover:text-rose-600 transition-colors">+ Add</button>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">禁忌/冲突</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedClient.contraindications?.map((item, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-xl border border-amber-100">{item}</span>
                              ))}
                              <button className="px-2 py-1 text-[10px] font-black text-amber-400 hover:text-amber-600 transition-colors">+ Add</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl shadow-slate-900/20">
                        <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-emerald-400" />
                          智能干预触发器
                        </h3>
                        <div className="space-y-4">
                          {triggers.filter(t => t.client_id === selectedClient.id || t.is_global).map(trigger => {
                            const group = ALERT_GROUPS[getAlertGroup(trigger) as keyof typeof ALERT_GROUPS];
                            return (
                              <div key={trigger.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all group">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <group.icon className={`w-4 h-4 ${group.color}`} />
                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">{group.label}</span>
                                  </div>
                                  <div className={`w-2 h-2 rounded-full ${trigger.is_enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                </div>
                                <div className="text-xs font-bold mb-1">{trigger.name}</div>
                                <div className="text-[10px] opacity-40 leading-relaxed">{trigger.action.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 关键生命体征动态 */}
                    <div className="col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-10">
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">生命体征监控 (Vital Trends)</h3>
                          <p className="text-xs text-slate-400 font-medium mt-1">最近 30 天关键健康指标波动情况</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-100">周报</button>
                          <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">月报</button>
                        </div>
                      </div>
                      
                      {/* 模拟图表区域 */}
                      <div className="h-80 flex items-end justify-between gap-4 px-4">
                        {[45, 52, 48, 65, 58, 72, 68, 85, 78, 92, 88, 95].map((val, i) => (
                          <div key={i} className="flex-1 group relative">
                            <div 
                              className="w-full bg-emerald-500 rounded-t-xl opacity-20 group-hover:opacity-100 transition-all duration-500 cursor-pointer"
                              style={{ height: `${val}%` }}
                            >
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {val}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-6 px-4">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                          <span key={m} className="text-[10px] font-black text-slate-300 uppercase">{m}</span>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-8 mt-12 pt-10 border-t border-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
                            <Activity className="w-6 h-6 text-rose-500" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">平均心率 (RHR)</div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-slate-800">72</span>
                              <span className="text-xs font-bold text-slate-400">bpm</span>
                              <TrendingDown className="w-4 h-4 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <Moon className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">深睡占比 (Deep)</div>
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-slate-800">24%</span>
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
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
