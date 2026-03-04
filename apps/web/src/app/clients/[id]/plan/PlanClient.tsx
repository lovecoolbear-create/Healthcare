'use client';

import React, { useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Activity,
  Settings,
  Search,
  Package,
  Layers,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Moon,
  MessageSquare,
  Share2,
  ShieldCheck,
  MousePointer2,
  FileEdit,
  Save,
  X,
  User,
  Users,
  Tag,
  StickyNote,
  Camera,
  Lock,
  ExternalLink,
  Eye,
  ShoppingBag,
  BarChart3,
  Database,
  GripVertical,
  Trash2,
  Download,
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
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Client, Product, ProtocolPhase, ProtocolAction, ProtocolTrigger, EvidenceRecord, FollowUpNote, OrderRecord, MarketingAsset } from '@healthcare/shared';
import { 
  mockIngredients,
  mockProtocol as initialProtocol
} from '../../../../../../mp/src/mocks/data'; 
import { useData } from '../../../../context/DataContext';

import { Sidebar } from '../../../../components/Sidebar';
import { ActiveTab } from '../../../../types';

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

export default function ClientPlanPage() {
  const { clients, products, updateClient, triggers, updateTrigger: persistUpdateTrigger, deleteTrigger } = useData();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  
  const searchParams = useSearchParams();
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
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(id as string);
  const [clientDetailTab, setClientDetailTab] = useState<'status' | 'plan' | 'inventory' | 'notes' | 'evidence' | 'assets' | 'orders'>('status');

  // Tag Editing State
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Health Baseline State
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);
  const [newAllergyName, setNewAllergyName] = useState('');
  const [isAddingContra, setIsAddingContra] = useState(false);
  const [newContraName, setNewContraName] = useState('');

  // Follow-up Notes State
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTag, setNewNoteTag] = useState('');

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

  const getAlertGroup = (trigger: any) => {
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
      dosage_per_time: products[0]?.dosage_unit || '1粒',
      timing_tag: 'empty_stomach',
      usage_instructions: '',
      order: 0
    };
    setProtocol(prev => ({
      ...prev,
      phases: prev.phases.map(p => 
        p.id === phaseId ? { ...p, actions: [...p.actions, newAction] } : p
      )
    }));
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

  const saveAsGlobalTemplate = () => {
    alert('已成功将当前配方保存为全局模板 PROTO-NEW-001');
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
    
    setEditingTriggerId(null);
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
            <button 
              onClick={() => {
                if (activeTab === 'templates') {
                   setProtocol({
                     id: `p-${Date.now()}`,
                     name: '新调理配方 SOP',
                     description: '请在这里输入配方的核心逻辑与目标...',
                     phases: [],
                     triggers: [],
                     practitioner_id: 'p-001',
                     created_at: new Date().toISOString(),
                     updated_at: new Date().toISOString()
                   });
                 }
              }}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'clients' && '新增客户档案'}
              {activeTab === 'products' && '新增产品/成分'}
              {activeTab === 'templates' && '建立新配方'}
              {activeTab === 'triggers' && '配置干预规则'}
              {activeTab === 'reports' && '生成分析报告'}
              {activeTab === 'knowledge' && '发布知识内容'}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto pb-20">
            
            {/* 1. 客户 360° 档案视图 */}
            {activeTab === 'clients' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  {/* 左侧：待办事项 (Intervention To-Do) */}
                  <div className="col-span-1 space-y-4">
                    <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-2xl shadow-slate-900/20">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-black text-sm tracking-tight">干预待办 (To-Do)</h3>
                        </div>
                        <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-full text-emerald-400">3 待处理</span>
                      </div>

                      <div className="space-y-3">
                        {/* 待办项 1: 依从性告警 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">依从性风险</span>
                          </div>
                          <p className="text-xs font-bold text-slate-100 mb-1">张大民 · 连续 3 天断服</p>
                          <p className="text-[10px] text-slate-400">方案：肠道微生态修复期</p>
                          <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg">即刻微信干预</button>
                          </div>
                        </div>

                        {/* 待办项 2: 库存预警 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">复购预警</span>
                          </div>
                          <p className="text-xs font-bold text-slate-100 mb-1">李小梅 · 辅酶 Q10 库存不足</p>
                          <p className="text-[10px] text-slate-400">预计 2 天后断货</p>
                          <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-3 py-1 bg-white/20 text-white text-[10px] font-black rounded-lg">发送复购链接</button>
                          </div>
                        </div>

                        {/* 待办项 3: 体感反馈 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all cursor-pointer group">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">体感异常</span>
                          </div>
                          <p className="text-xs font-bold text-slate-100 mb-1">王建国 · 睡眠质量骤降</p>
                          <p className="text-[10px] text-slate-400">评分从 8.5 降至 4.2</p>
                          <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="px-3 py-1 bg-white/20 text-white text-[10px] font-black rounded-lg">查看详细数据</button>
                          </div>
                        </div>
                      </div>

                      <button className="w-full mt-6 py-3 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white hover:border-white/30 transition-all">
                        查看全部历史干预记录
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">今日随访建议</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">周</div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-slate-700">周女士 · 方案第 14 天</div>
                            <div className="text-[10px] text-slate-400">建议询问第 2 阶段体感反馈</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：360° 核心看板汇总 + 列表 */}
                  <div className="col-span-3 space-y-6">
                    {/* 360° 核心看板汇总 */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                          <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">HIGH</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">82%</div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">平均依从性</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertCircle className="w-5 h-5" /></div>
                          <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">ALERT</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">5 位</div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">库存告急 (&lt; 5天)</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp className="w-5 h-5" /></div>
                          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">TRENDING</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">12 位</div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">体感显著好转</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Zap className="w-5 h-5" /></div>
                          <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">CRITICAL</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900">2 位</div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">情绪/体感拐点</div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">客户档案 (Golden Record)</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">依从性 (Adherence)</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">库存水位 (Inventory)</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">体感指标 (Feeling)</th>
                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">管理操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredClients.map((client: Client) => {
                            const minRemainingDays = client.inventory_status ? Math.min(...client.inventory_status.map(i => i.remaining_days)) : null;
                            
                            return (
                              <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                                      {client.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-700">{client.name}</div>
                                      <div className="flex gap-1 mt-0.5">
                                        {client.allergies?.map(a => <span key={a} className="text-[8px] font-black px-1 bg-red-50 text-red-500 rounded border border-red-100 uppercase">禁:{a}</span>)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`text-sm font-black ${
                                      !client.adherence_score ? 'text-slate-300' :
                                      client.adherence_score >= 90 ? 'text-emerald-600' :
                                      client.adherence_score >= 70 ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                      {client.adherence_score ? `${client.adherence_score}%` : '--'}
                                    </div>
                                    {client.adherence_trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                                    {client.adherence_trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500" />}
                                    {client.adherence_trend === 'stable' && <Minus className="w-3 h-3 text-slate-300" />}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {minRemainingDays !== null ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex justify-between items-end">
                                        <span className={`text-[10px] font-bold ${minRemainingDays < 3 ? 'text-rose-600' : minRemainingDays < 10 ? 'text-amber-600' : 'text-slate-400'}`}>
                                          最快 {minRemainingDays} 天后断货
                                        </span>
                                      </div>
                                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${minRemainingDays < 3 ? 'bg-rose-500' : minRemainingDays < 10 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                          style={{ width: `${Math.min(100, (minRemainingDays / 30) * 100)}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-300">未配置库存</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  {client.feeling_metrics ? (
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1" title="精力">
                                        <Zap className={`w-3 h-3 ${client.feeling_metrics.energy_score > 7 ? 'text-amber-500' : 'text-slate-300'}`} />
                                        <span className="text-[10px] font-bold text-slate-600">{client.feeling_metrics.energy_score}</span>
                                      </div>
                                      <div className="flex items-center gap-1" title="睡眠">
                                        <Moon className={`w-3 h-3 ${client.feeling_metrics.sleep_score > 7 ? 'text-indigo-400' : 'text-slate-300'}`} />
                                        <span className="text-[10px] font-bold text-slate-600">{client.feeling_metrics.sleep_score}</span>
                                      </div>
                                      {client.feeling_metrics.trend_pivot && (
                                        <div className="ml-2 animate-pulse">
                                          <AlertCircle className="w-4 h-4 text-rose-500" />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-300">暂无体感数据</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {}}
                                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                                      title="编辑客户"
                                    >
                                      <FileEdit className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setSelectedClientId(client.id)}
                                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black hover:bg-slate-800 transition-all shadow-sm"
                                    >
                                      360° 详情
                                    </button>
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
              </div>
            )}

            {/* 2. 产品与成分库 */}
            {activeTab === 'products' && (
              <div className="space-y-8">
                {/* 产品统计概览 */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-2xl font-black text-slate-900">{products.length}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">在库产品总数</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-2xl font-black text-slate-900">{mockIngredients.length}</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">核心成分元数据</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-2xl font-black text-emerald-600">3</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">常用品牌</div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="text-2xl font-black text-amber-500">2</div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">冲突高风险产品</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {products.map((product: Product) => (
                    <div key={product.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="px-3 py-1 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200/50">{product.brand}</div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {}}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-slate-600 transition-all"
                          >
                            <FileEdit className="w-4 h-4" />
                          </button>
                          <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-rose-500 transition-all">
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">{product.name}</h3>
                          <p className="text-xs text-slate-400 font-medium">规格: {product.spec_quantity}{product.spec_unit}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {product.main_efficacy?.map(eff => (
                          <span key={eff} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-100/50 uppercase">
                            {eff}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-4">
                          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <FlaskConical className="w-3.5 h-3.5" /> 核心成分含量
                              </div>
                              <span className="text-[10px] font-bold text-slate-300 uppercase">Per {product.dosage_unit}</span>
                            </div>
                            <div className="space-y-3">
                              {product.ingredients?.map((ing, i) => {
                                const ingredientInfo = mockIngredients.find(m => m.id === ing.ingredient_id);
                                return (
                                  <div key={i}>
                                    <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-xs font-bold text-slate-700">{ingredientInfo?.name || ing.ingredient_id}</span>
                                      <span className="text-xs font-black text-slate-900">{ing.amount_per_unit}{ing.unit}</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }}></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/30">
                          <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase mb-2 tracking-widest">
                            <ShieldAlert className="w-3.5 h-3.5" /> 禁忌冲突与注意事项
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">“{product.precautions}”</p>
                        </div>

                        <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                              <ShieldAlert className="w-3.5 h-3.5" /> 库存预警阈值
                            </div>
                            <span className="text-[10px] font-black text-rose-500">2 天</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" 
                              min="1" 
                              max="15" 
                              defaultValue="2" 
                              className="flex-1 h-1 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <button className="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2">
                        <Database className="w-4 h-4" />
                        查看详细元数据
                      </button>
                    </div>
                  ))}

                  {/* 新增产品占位卡片 */}
                  <button 
                    onClick={() => {}}
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 hover:border-emerald-300 transition-all group min-h-[400px]"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Plus className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-slate-400 group-hover:text-emerald-600 transition-colors">录入新产品/成分</div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">支持从现有元数据库关联</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 3. SOP 方案引擎 */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-emerald-900 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/10">
                    <div className="text-3xl font-black mb-1">{protocol.phases.length}</div>
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">当前方案阶段数</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {protocol.phases.reduce((acc, p) => acc + p.actions.length, 0)}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">执行指令总数</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="text-3xl font-black text-slate-900 mb-1">
                      {protocol.phases.reduce((acc, p) => acc + p.duration_days, 0)} 天
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">方案总周期</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="text-3xl font-black text-amber-500 mb-1">SOP</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">标准化作业程序</div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
                  
                  <div className="relative z-10 flex justify-between items-start mb-12">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-200">Interactive Editor</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {protocol.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="text" 
                          value={protocol.name}
                          onChange={(e) => setProtocol(prev => ({ ...prev, name: e.target.value }))}
                          className="text-3xl font-black text-slate-900 tracking-tight bg-transparent border-none focus:ring-0 p-0 w-auto min-w-[300px]"
                        />
                        <FileEdit className="w-5 h-5 text-slate-300" />
                      </div>
                      <textarea 
                        value={protocol.description}
                        onChange={(e) => setProtocol(prev => ({ ...prev, description: e.target.value }))}
                        className="text-slate-500 text-sm max-w-2xl leading-relaxed mt-3 bg-transparent border-none focus:ring-0 p-0 w-full resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={saveAsGlobalTemplate}
                        className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        另存为全局模板
                      </button>
                      <button 
                        onClick={addPhase}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        添加调理阶段
                      </button>
                    </div>
                  </div>

                  {/* 阶段时间轴设计 */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                  >
                    <div className="relative">
                      <div className="absolute left-[39px] top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500 via-slate-100 to-slate-50 rounded-full"></div>
                      <div className="space-y-16">
                        <SortableContext 
                          items={protocol.phases.map(p => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {protocol.phases.map((phase: ProtocolPhase, idx: number) => (
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
                      </div>
                    </div>
                    
                    <DragOverlay>
                      {activeDragId && activeDragId.startsWith('phase-') ? (
                        <div className="opacity-80 scale-105">
                          <SortablePhase 
                            phase={protocol.phases.find(p => p.id === activeDragId)!} 
                            index={protocol.phases.findIndex(p => p.id === activeDragId)}
                            isOverlay
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  {/* 自动化触发器预览 - 重新设计 */}
                  <div className="mt-20 pt-10 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                          <Zap className="w-6 h-6 fill-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-800 tracking-tight">内置 SOP 触发规则 (Triggers)</h4>
                          <p className="text-xs text-slate-400 font-medium">当方案应用于客户时，以下规则将自动生效</p>
                        </div>
                      </div>
                      <button className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">管理关联规则</button>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      {protocol.triggers.map((trigger: ProtocolTrigger) => {
                        const groupKey = getAlertGroup(trigger) as keyof typeof ALERT_GROUPS;
                        const group = ALERT_GROUPS[groupKey];
                        return (
                          <div key={trigger.id} className={`bg-slate-50/80 border ${group.border} rounded-3xl p-6 hover:bg-white hover:shadow-xl transition-all group`}>
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`p-2 rounded-lg ${group.bg} ${group.color}`}>
                                {React.createElement(group.icon, { className: "w-4 h-4" })}
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {group.label}
                              </span>
                            </div>
                            <h5 className="text-sm font-black text-slate-800 mb-3 leading-snug">“{trigger.action.label}”</h5>
                            <div className="flex items-center justify-between mt-auto">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                {trigger.condition.threshold ? `THRESHOLD: ${trigger.condition.threshold}` : 'AUTO DETECT'}
                              </div>
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Settings className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. 全局干预触发器配置 (System Support) */}
            {activeTab === 'triggers' && (
              <div className="space-y-8">
                {/* 顶部全局配置面板 */}
                <div className="bg-emerald-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-md border border-emerald-400/30">
                          <ShieldCheck className="w-6 h-6 text-emerald-300" />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">全局静默规则 (Global Silent Rule)</h3>
                      </div>
                      <p className="text-emerald-100/70 text-sm leading-relaxed mb-6">
                        为了防止营养师端产生“红点疲劳”，系统会自动合并同类项。同一客户在 48 小时内，最多只能触发 1 个非紧急红点。
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-emerald-800/50 px-4 py-2 rounded-xl border border-emerald-700">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-100">静默周期：48 小时</span>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-800/50 px-4 py-2 rounded-xl border border-emerald-700">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span className="text-xs font-bold text-emerald-100">紧急情况不受限制</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status</div>
                        <div className="text-sm font-bold">规则已激活</div>
                      </div>
                      <button className="px-6 py-3 bg-white text-emerald-900 rounded-2xl font-black text-sm hover:bg-emerald-50 transition-all">
                        配置详情
                      </button>
                    </div>
                  </div>
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/5 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* 1. 依从性干预 */}
                  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 ${ALERT_GROUPS.followup.bg} rounded-2xl ${ALERT_GROUPS.followup.color}`}>
                          {React.createElement(ALERT_GROUPS.followup.icon, { className: "w-8 h-8" })}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-800">{ALERT_GROUPS.followup.label} (Compliance)</h4>
                          <p className="text-xs text-slate-400 mt-1 font-medium">目标：解决“买了不吃”的问题</p>
                        </div>
                      </div>
                      <button className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                        <Settings className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {triggers.filter(t => t.category === 'compliance').map(trigger => {
                        const groupKey = getAlertGroup(trigger) as keyof typeof ALERT_GROUPS;
                        const group = ALERT_GROUPS[groupKey];
                        const baseColor = group.color.split('-')[1];
                        return (
                          <div key={trigger.id} className={`group p-6 rounded-2xl border transition-all ${
                            trigger.is_enabled 
                              ? `bg-slate-50 ${group.border} hover:${group.bg}/30` 
                              : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale'
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleToggleTrigger(trigger.id)}
                                  className={`w-8 h-4 rounded-full relative transition-colors ${trigger.is_enabled ? group.color.replace('text-', 'bg-') : 'bg-slate-300'}`}
                                >
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${trigger.is_enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                </button>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                  trigger.action.priority === 'critical' ? 'bg-rose-100 text-rose-600' :
                                  trigger.action.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {trigger.action.priority}
                                </span>
                                <h5 className="font-bold text-slate-700">{trigger.name}</h5>
                              </div>
                            {editingTriggerId === trigger.id ? (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleUpdateTrigger(trigger.id)}
                                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all group/save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingTriggerId(null)}
                                  className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => {
                                    setEditingTriggerId(trigger.id);
                                    setEditingValues({
                                      [trigger.id]: {
                                        name: trigger.name,
                                        action_label: trigger.action.label,
                                        condition_threshold: trigger.condition.threshold
                                      }
                                    });
                                  }}
                                  className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                >
                                  <FileEdit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTrigger(trigger.id)}
                                  className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">判定逻辑:</span>
                              {editingTriggerId === trigger.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <input 
                                    type="number" 
                                    value={editingValues[trigger.id]?.condition_threshold ?? (trigger.condition.type === 'adherence_streak' ? (trigger.name.includes('连续') ? 2 : 80) : 5)}
                                    onChange={(e) => handleValueChange(trigger.id, 'condition_threshold', parseInt(e.target.value))}
                                    className={`w-16 px-2 py-1 bg-white border ${group.border} rounded-lg text-sm font-bold ${group.color} focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/20`}
                                  />
                                  <span className="text-xs font-bold text-slate-600">
                                    {trigger.name.includes('连续') ? '天断服' : '% 打卡率'}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-slate-700">
                                  {trigger.name.includes('连续') ? `连续 ${trigger.condition.threshold || 2} 天断服` : `7天内打卡率 < ${trigger.condition.threshold || 80}%`}
                                </p>
                              )}
                            </div>
                            <div className="p-4 bg-white/40 rounded-xl border border-white/60">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className={`w-3.5 h-3.5 ${group.color}`} />
                                <span className="text-[10px] font-black text-slate-400 uppercase">干预话术</span>
                              </div>
                              {editingTriggerId === trigger.id ? (
                                <textarea 
                                  value={editingValues[trigger.id]?.action_label ?? trigger.action.label}
                                  onChange={(e) => handleValueChange(trigger.id, 'action_label', e.target.value)}
                                  className={`w-full p-3 bg-white border ${group.border} rounded-xl text-xs text-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/10 h-20`}
                                />
                              ) : (
                                <p className="text-[11px] text-slate-500 italic leading-relaxed">“{trigger.action.label}”</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 ${group.bg} ${group.color} text-[10px] font-black rounded-lg`}>
                                {trigger.action.type === 'push_red_dot' ? '红点通知' : trigger.action.type === 'send_template' ? '模版推送' : '状态标记'}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                {/* 2. 库存与复购干预 */}
                  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 ${ALERT_GROUPS.inventory.bg} rounded-2xl ${ALERT_GROUPS.inventory.color}`}>
                          {React.createElement(ALERT_GROUPS.inventory.icon, { className: "w-8 h-8" })}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-800">{ALERT_GROUPS.inventory.label} (Inventory)</h4>
                          <p className="text-xs text-slate-400 mt-1 font-medium">目标：解决“吃完不买”的问题</p>
                        </div>
                      </div>
                      <button className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                        <Settings className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {triggers.filter(t => t.category === 'inventory').map(trigger => {
                        const groupKey = getAlertGroup(trigger) as keyof typeof ALERT_GROUPS;
                        const group = ALERT_GROUPS[groupKey];
                        const baseColor = group.color.split('-')[1];
                        return (
                          <div key={trigger.id} className={`group p-6 rounded-2xl border transition-all ${
                            trigger.is_enabled 
                              ? `bg-slate-50 ${group.border} hover:${group.bg}/30` 
                              : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale'
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleToggleTrigger(trigger.id)}
                                  className={`w-8 h-4 rounded-full relative transition-colors ${trigger.is_enabled ? group.color.replace('text-', 'bg-') : 'bg-slate-300'}`}
                                >
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${trigger.is_enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                </button>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                  trigger.action.priority === 'critical' ? 'bg-rose-100 text-rose-600' :
                                  trigger.action.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {trigger.action.priority}
                                </span>
                                <h5 className="font-bold text-slate-700">{trigger.name}</h5>
                              </div>
                            {editingTriggerId === trigger.id ? (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleUpdateTrigger(trigger.id)}
                                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all group/save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditingTriggerId(null)}
                                  className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => {
                                    setEditingTriggerId(trigger.id);
                                    setEditingValues({
                                      [trigger.id]: {
                                        name: trigger.name,
                                        action_label: trigger.action.label,
                                        condition_threshold: trigger.condition.threshold
                                      }
                                    });
                                  }}
                                  className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                >
                                  <FileEdit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTrigger(trigger.id)}
                                  className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">判定逻辑:</span>
                              {editingTriggerId === trigger.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xs font-bold text-slate-600">库存 &lt;=</span>
                                  <input 
                                    type="number" 
                                    value={editingValues[trigger.id]?.condition_threshold ?? (trigger.name.includes('首轮') ? 7 : 2)}
                                    onChange={(e) => handleValueChange(trigger.id, 'condition_threshold', parseInt(e.target.value))}
                                    className={`w-16 px-2 py-1 bg-white border ${group.border} rounded-lg text-sm font-bold ${group.color} focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/20`}
                                  />
                                  <span className="text-xs font-bold text-slate-600">天</span>
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-slate-700">
                                  库存水位 &lt;= {trigger.condition.threshold ?? (trigger.name.includes('首轮') ? '7' : '2')} 天
                                </p>
                              )}
                            </div>
                            <div className="p-4 bg-white/40 rounded-xl border border-white/60">
                              <div className="flex items-center gap-2 mb-2">
                                <MousePointer2 className={`w-3.5 h-3.5 ${group.color}`} />
                                <span className="text-[10px] font-black text-slate-400 uppercase">干预话术</span>
                              </div>
                              {editingTriggerId === trigger.id ? (
                                <textarea 
                                  value={editingValues[trigger.id]?.action_label ?? trigger.action.label}
                                  onChange={(e) => handleValueChange(trigger.id, 'action_label', e.target.value)}
                                  className={`w-full p-3 bg-white border ${group.border} rounded-xl text-xs text-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/10 h-20`}
                                />
                              ) : (
                                <p className="text-[11px] text-slate-500 italic leading-relaxed">“{trigger.action.label}”</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1 ${group.bg} ${group.color} text-[10px] font-black rounded-lg`}>
                                {trigger.action.type === 'push_red_dot' ? '红点通知' : trigger.action.type === 'send_template' ? '模版推送' : '状态标记'}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                {/* 3. 体感与风险干预 */}
                  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 ${ALERT_GROUPS.urgent.bg} rounded-2xl ${ALERT_GROUPS.urgent.color}`}>
                          {React.createElement(ALERT_GROUPS.urgent.icon, { className: "w-8 h-8" })}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-800">{ALERT_GROUPS.urgent.label} (Symptom)</h4>
                          <p className="text-xs text-slate-400 mt-1 font-medium">目标：建立专业信任的护城河</p>
                        </div>
                      </div>
                      <button className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                        <Settings className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {triggers.filter(t => t.category === 'symptom').map(trigger => {
                        const groupKey = getAlertGroup(trigger) as keyof typeof ALERT_GROUPS;
                        const group = ALERT_GROUPS[groupKey];
                        const baseColor = group.color.split('-')[1];
                        return (
                          <div key={trigger.id} className={`group p-6 rounded-2xl border transition-all ${
                            trigger.is_enabled 
                              ? `bg-slate-50 ${group.border} hover:${group.bg}/30` 
                              : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale'
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleToggleTrigger(trigger.id)}
                                  className={`w-8 h-4 rounded-full relative transition-colors ${trigger.is_enabled ? group.color.replace('text-', 'bg-') : 'bg-slate-300'}`}
                                >
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${trigger.is_enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                </button>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                  trigger.action.priority === 'critical' ? 'bg-rose-100 text-rose-600' :
                                  trigger.action.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {trigger.action.priority}
                                </span>
                                <h5 className="font-bold text-slate-700">{trigger.name}</h5>
                              </div>
                              {editingTriggerId === trigger.id ? (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleUpdateTrigger(trigger.id)}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all group/save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingTriggerId(null)}
                                    className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => {
                                      setEditingTriggerId(trigger.id);
                                      setEditingValues({
                                        [trigger.id]: {
                                          name: trigger.name,
                                          action_label: trigger.action.label,
                                          condition_threshold: trigger.condition.threshold
                                        }
                                      });
                                    }}
                                    className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                  >
                                    <FileEdit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTrigger(trigger.id)}
                                    className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              <div className="flex flex-col gap-3 bg-white/60 p-3 rounded-xl border border-white">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">判定逻辑:</span>
                                {editingTriggerId === trigger.id ? (
                                  <div className="space-y-2">
                                    {trigger.condition.type === 'vital_trend' ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600">连续</span>
                                        <input 
                                          type="number" 
                                          value={editingValues[trigger.id]?.condition_threshold ?? trigger.condition.threshold}
                                          onChange={(e) => handleValueChange(trigger.id, 'condition_threshold', parseInt(e.target.value))}
                                          className={`w-12 px-2 py-1 bg-white border ${group.border} rounded-lg text-sm font-bold ${group.color} focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/20`}
                                        />
                                        <span className="text-xs font-bold text-slate-600">次下滑</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-2">
                                        {['头晕', '拉稀'].map(tag => (
                                          <span key={tag} className={`px-2 py-1 ${group.bg} ${group.color} text-[10px] font-bold rounded-lg flex items-center gap-1`}>
                                            {tag}
                                            <X className="w-3 h-3 cursor-pointer" />
                                          </span>
                                        ))}
                                        <input 
                                          type="text" 
                                          placeholder="+ 关键字"
                                          className={`px-2 py-1 bg-white border ${group.border} rounded-lg text-[10px] w-20 focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/20`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {trigger.condition.type === 'vital_trend' ? (
                                      <p className="text-sm font-bold text-slate-700">体感分连续 {trigger.condition.threshold || 3} 次下滑</p>
                                    ) : (
                                      <>
                                        <span className="text-xs font-bold text-slate-400 mr-1">匹配关键词:</span>
                                        {['头晕', '拉稀'].map(tag => (
                                          <span key={tag} className={`px-2 py-1 ${group.bg} ${group.color} text-[10px] font-bold rounded-lg`}>{tag}</span>
                                        ))}
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="p-4 bg-white/40 rounded-xl border border-white/60">
                                <div className="flex items-center gap-2 mb-2">
                                  <FlaskConical className={`w-3.5 h-3.5 ${group.color}`} />
                                  <span className="text-[10px] font-black text-slate-400 uppercase">干预动作</span>
                                </div>
                                {editingTriggerId === trigger.id ? (
                                  <textarea 
                                    value={editingValues[trigger.id]?.action_label ?? trigger.action.label}
                                    onChange={(e) => handleValueChange(trigger.id, 'action_label', e.target.value)}
                                    className={`w-full p-3 bg-white border ${group.border} rounded-xl text-xs text-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/10 h-20`}
                                  />
                                ) : (
                                  <p className="text-[11px] text-slate-500 italic leading-relaxed">“{trigger.action.label}”</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 ${group.bg} ${group.color} text-[10px] font-black rounded-lg`}>
                                  {trigger.action.type === 'push_red_dot' ? '红点通知' : trigger.action.type === 'send_template' ? '模版推送' : '状态标记'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. 商业增长与关系 */}
                  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 ${ALERT_GROUPS.growth.bg} rounded-2xl ${ALERT_GROUPS.growth.color}`}>
                          {React.createElement(ALERT_GROUPS.growth.icon, { className: "w-8 h-8" })}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-800">{ALERT_GROUPS.growth.label} (Growth)</h4>
                          <p className="text-xs text-slate-400 mt-1 font-medium">目标：低成本获客的关键</p>
                        </div>
                      </div>
                      <button className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                        <Settings className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {triggers.filter(t => t.category === 'growth').map(trigger => {
                        const groupKey = getAlertGroup(trigger) as keyof typeof ALERT_GROUPS;
                        const group = ALERT_GROUPS[groupKey];
                        const baseColor = group.color.split('-')[1];
                        return (
                          <div key={trigger.id} className={`group p-6 rounded-2xl border transition-all ${
                            trigger.is_enabled 
                              ? `bg-slate-50 ${group.border} hover:${group.bg}/30` 
                              : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale'
                          }`}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleToggleTrigger(trigger.id)}
                                  className={`w-8 h-4 rounded-full relative transition-colors ${trigger.is_enabled ? group.color.replace('text-', 'bg-') : 'bg-slate-300'}`}
                                >
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${trigger.is_enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                                </button>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${
                                  trigger.action.priority === 'critical' ? 'bg-rose-100 text-rose-600' :
                                  trigger.action.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {trigger.action.priority}
                                </span>
                                <h5 className="font-bold text-slate-700">{trigger.name}</h5>
                              </div>
                              {editingTriggerId === trigger.id ? (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => handleUpdateTrigger(trigger.id)}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all group/save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingTriggerId(null)}
                                    className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-all"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button 
                                    onClick={() => {
                                      setEditingTriggerId(trigger.id);
                                      setEditingValues({
                                        [trigger.id]: {
                                          name: trigger.name,
                                          action_label: trigger.action.label,
                                          condition_threshold: trigger.condition.threshold
                                        }
                                      });
                                    }}
                                    className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                  >
                                    <FileEdit className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTrigger(trigger.id)}
                                    className={`p-2 hover:bg-white rounded-lg text-slate-300 hover:${group.color} transition-all shadow-sm`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">判定逻辑:</span>
                                {editingTriggerId === trigger.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                  {trigger.condition.type === 'protocol_duration' ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-600">第</span>
                                      <input 
                                        type="text" 
                                        value={editingValues[trigger.id]?.condition_threshold || trigger.condition.threshold || "30, 90, 180"}
                                        onChange={(e) => handleValueChange(trigger.id, 'condition_threshold', e.target.value)}
                                        className={`w-24 px-2 py-1 bg-white border ${group.border} rounded-lg text-sm font-bold ${group.color} focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/20`}
                                      />
                                      <span className="text-xs font-bold text-slate-600">天回访</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-600">依从 &gt; 90% & 21天向上</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-slate-700">
                                  {trigger.condition.type === 'protocol_duration' ? `方案满 ${trigger.condition.threshold || '30, 90, 180'} 天` : '依从性 > 90% 且体感连续 21 天向上'}
                                </p>
                              )}
                            </div>
                              <div className="p-4 bg-white/40 rounded-xl border border-white/60">
                                <div className="flex items-center gap-2 mb-2">
                                  <Share2 className={`w-3.5 h-3.5 ${group.color}`} />
                                  <span className="text-[10px] font-black text-slate-400 uppercase">干预动作</span>
                                </div>
                                {editingTriggerId === trigger.id ? (
                                  <textarea 
                                    value={editingValues[trigger.id]?.action_label ?? trigger.action.label}
                                    onChange={(e) => handleValueChange(trigger.id, 'action_label', e.target.value)}
                                    className={`w-full p-3 bg-white border ${group.border} rounded-xl text-xs text-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-${baseColor}-500/10 h-20`}
                                  />
                                ) : (
                                  <p className="text-[11px] text-slate-500 italic leading-relaxed">“{trigger.action.label}”</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 ${group.bg} ${group.color} text-[10px] font-black rounded-lg`}>
                                  {trigger.action.type === 'push_red_dot' ? '红点通知' : trigger.action.type === 'send_template' ? '模版推送' : '状态标记'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. 数据分析报告 (MVP) */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                {/* 顶部核心指标 */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">平均干预有效率</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-black text-slate-900">76.4%</div>
                      <div className="text-xs font-bold text-emerald-500 mb-1">↑ 4.2%</div>
                    </div>
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '76.4%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">高依从性客户占比</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-black text-slate-900">62.8%</div>
                      <div className="text-xs font-bold text-blue-500 mb-1">↑ 2.1%</div>
                    </div>
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '62.8%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">产品消耗周转率</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-black text-slate-900">4.2x</div>
                      <div className="text-xs font-bold text-amber-500 mb-1">STABLE</div>
                    </div>
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">触发干预响应时效</span>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-black text-slate-900">2.4h</div>
                      <div className="text-xs font-bold text-rose-500 mb-1">↓ 0.8h</div>
                    </div>
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </div>

                {/* 图表区域 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-xl font-black text-slate-800 tracking-tight">依从性与体感评分趋势</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">关联分析：高依从性与正面反馈的相关性为 0.82</p>
                      </div>
                      <select className="bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-0">
                        <option>最近 30 天</option>
                        <option>最近 90 天</option>
                      </select>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                      {[65, 72, 68, 85, 92, 88, 95].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="relative w-full">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {val}%
                            </div>
                            <div 
                              className="w-full bg-emerald-500/20 rounded-t-lg group-hover:bg-emerald-500/40 transition-colors" 
                              style={{ height: `${val * 2}px` }}
                            ></div>
                            <div 
                              className="absolute bottom-0 left-0 w-full bg-emerald-500 rounded-t-lg" 
                              style={{ height: `${val * 1.2}px` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase">W{i+1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">体感评分</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500/20 rounded-sm"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">依从性</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-xl font-black text-slate-800 tracking-tight">产品成分有效性分布</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">基于 1200+ 份随访报告的统计结果</p>
                      </div>
                      <button className="p-2 hover:bg-slate-50 rounded-xl text-slate-300">
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-6">
                      {[
                        { name: '益生菌 (L. rhamnosus)', score: 92, status: 'positive' },
                        { name: 'Omega-3 (EPA/DHA)', score: 85, status: 'positive' },
                        { name: '维生素 D3', score: 78, status: 'neutral' },
                        { name: '镁 (螯合镁)', score: 64, status: 'neutral' }
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-700">{item.name}</span>
                            <span className="text-xs font-black text-slate-900">{item.score}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.status === 'positive' ? 'bg-blue-500' : 'bg-slate-300'}`}
                              style={{ width: `${item.score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[
                    { title: '客户依从性与体感关联分析周报', date: '2026-03-01', type: '依从性分析', status: 'ready' },
                    { title: '3月调理效果阶段性总结报告', date: '2026-02-28', type: '阶段性总结', status: 'generating' },
                    { title: '年度营养干预 ROI 分析报告', date: '2026-01-15', type: '商业价值', status: 'ready' }
                  ].map((report, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          report.status === 'ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'
                        }`}>
                          {report.status === 'ready' ? '已生成' : '生成中...'}
                        </div>
                        <BarChart3 className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <h4 className="text-lg font-black text-slate-800 mb-2 leading-tight">{report.title}</h4>
                      <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-widest">{report.type} · {report.date}</p>
                      
                      <div className="flex items-center gap-3">
                        <button className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          report.status === 'ready' 
                          ? 'bg-slate-900 text-white hover:bg-emerald-600 shadow-lg shadow-slate-900/10' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}>
                          查看详情
                        </button>
                        <button className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl shadow-slate-900/20 overflow-hidden relative">
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="max-w-md">
                      <h3 className="text-3xl font-black mb-4 leading-tight">自动化智能分析引擎</h3>
                      <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                        系统正在基于全量客户的 <span className="text-emerald-400">依从性、体感反馈、实验室指标</span> 以及 <span className="text-emerald-400">干预强度</span> 自动构建关联性模型，为您提供更精准的调理决策支持。
                      </p>
                      <button className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20">
                        开启实时数据大屏
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                        <div className="text-3xl font-black text-emerald-400 mb-1">94%</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">分析准确率</div>
                      </div>
                      <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                        <div className="text-3xl font-black text-blue-400 mb-1">1.2k</div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">关联规则数</div>
                      </div>
                    </div>
                  </div>
                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -mr-20 -mt-20"></div>
                </div>
              </div>
            )}

            {/* 5. 营养学知识库预览 (MVP Placeholder) */}
            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  {[
                    { title: '鱼油与打嗝', category: '科普短文', views: 1240 },
                    { title: '胰岛素抵抗调理 SOP', category: '专业方案', views: 856 },
                    { title: '辅酶 Q10 备孕建议', category: '禁忌说明', views: 2100 }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded uppercase tracking-wider">{item.category}</span>
                        <ExternalLink className="w-4 h-4 text-slate-300" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <Eye className="w-3.5 h-3.5" />
                        {item.views} 次阅读
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 3. 客户 360° 详情抽屉/弹窗 */}
      {selectedClientId && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => router.push('/?tab=clients')}
          ></div>
          <div className="relative w-full max-w-5xl bg-white h-full max-h-[90vh] rounded-[32px] shadow-2xl flex flex-col animate-in zoom-in duration-300 overflow-hidden">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[32px] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center border-4 border-white overflow-hidden">
                  {selectedClient.avatar_url ? (
                    <img src={selectedClient.avatar_url} alt={selectedClient.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedClient.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedClient.gender === 'male' ? '男' : '女'} · {selectedClient.phone}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">入伙 {Math.floor((Date.now() - new Date(selectedClient.created_at).getTime()) / (1000 * 60 * 60 * 24))} 天</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => router.push('/?tab=clients')}
                className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 客户画像标签 (360 Tags) */}
            <div className="px-8 py-4 bg-white border-b border-slate-50 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-slate-300 mr-1" />
              {selectedClient.tags?.map(tag => (
                <span key={tag} className="group relative px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full border border-slate-200/50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all cursor-default">
                  {tag}
                  <button 
                    onClick={async () => {
                      const updatedTags = selectedClient.tags?.filter(t => t !== tag) || [];
                      await updateClient({ ...selectedClient, tags: updatedTags }, { tags: updatedTags });
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </span>
              ))}
              
              {isAddingTag ? (
                <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-200">
                  <input 
                    type="text"
                    autoFocus
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newTagName.trim()) {
                        const updatedTags = [...(selectedClient.tags || []), newTagName.trim()];
                        await updateClient({ ...selectedClient, tags: updatedTags }, { tags: updatedTags });
                        setNewTagName('');
                        setIsAddingTag(false);
                      } else if (e.key === 'Escape') {
                        setIsAddingTag(false);
                        setNewTagName('');
                      }
                    }}
                    onBlur={() => {
                      if (!newTagName.trim()) {
                        setIsAddingTag(false);
                      }
                    }}
                    placeholder="输入标签并回车..."
                    className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-200 outline-none w-32"
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingTag(true)}
                  className="px-3 py-1 border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold rounded-full hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-500 transition-all"
                >
                  + 添加画像
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="px-8 border-b border-slate-100 flex gap-8">
              {[
                { id: 'status', label: '健康基准', icon: Activity },
                { id: 'plan', label: '调理方案', icon: Layers },
                { id: 'inventory', label: '库存管理', icon: Package },
                { id: 'notes', label: '随访笔记', icon: StickyNote },
                { id: 'evidence', label: '证据对比', icon: Camera },
                { id: 'assets', label: '营销素材', icon: ImageIcon },
                { id: 'orders', label: '补货记录', icon: ShoppingBag },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setClientDetailTab(tab.id as any)}
                  className={`py-4 text-sm font-black flex items-center gap-2 transition-all relative ${
                    clientDetailTab === tab.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {clientDetailTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {clientDetailTab === 'status' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">核心基准 (Baselines)</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 group">
                        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">身高 (cm) / 体重 (kg)</div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            defaultValue={selectedClient.height_cm}
                            onBlur={async (e) => {
                              const height = Number(e.target.value);
                              await updateClient({ ...selectedClient, height_cm: height }, { height_cm: height });
                            }}
                            className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-lg font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                          <span className="text-slate-300">/</span>
                          <input 
                            type="number" 
                            defaultValue={selectedClient.weight_kg}
                            onBlur={async (e) => {
                              const weight = Number(e.target.value);
                              await updateClient({ ...selectedClient, weight_kg: weight }, { weight_kg: weight });
                            }}
                            className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-lg font-black text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100 group">
                        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">健康基准描述</div>
                        <textarea 
                          defaultValue={selectedClient.health_baseline}
                          onBlur={async (e) => {
                            const baseline = e.target.value;
                            await updateClient({ ...selectedClient, health_baseline: baseline }, { health_baseline: baseline });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all min-h-[44px] resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">禁忌与冲突 (Safety)</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-rose-50/50 rounded-[24px] border border-rose-100">
                        <div className="text-[10px] font-bold text-rose-400 mb-4 uppercase tracking-widest">过敏史 / 禁忌</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedClient.allergies?.map(a => (
                            <span key={a} className="group relative px-2 py-1 bg-rose-100 text-rose-600 text-[10px] font-black rounded-lg">
                              禁:{a}
                              <button 
                                onClick={async () => {
                                  const updated = selectedClient.allergies?.filter(i => i !== a) || [];
                                  await updateClient({ ...selectedClient, allergies: updated }, { allergies: updated });
                                }}
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {isAddingAllergy ? (
                            <input 
                              autoFocus
                              value={newAllergyName}
                              onChange={(e) => setNewAllergyName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newAllergyName.trim()) {
                                  const allergy = newAllergyName.trim();
                                  const updated = [...(selectedClient.allergies || []), allergy];
                                  await updateClient({ ...selectedClient, allergies: updated }, { allergies: updated });
                                  setNewAllergyName('');
                                  setIsAddingAllergy(false);
                                } else if (e.key === 'Escape') {
                                  setIsAddingAllergy(false);
                                }
                              }}
                              className="px-2 py-1 bg-white border border-rose-200 text-rose-600 text-[10px] font-black rounded-lg outline-none w-20"
                              placeholder="输入..."
                            />
                          ) : (
                            <button 
                              onClick={() => setIsAddingAllergy(true)}
                              className="px-2 py-1 border border-dashed border-rose-200 text-rose-400 text-[10px] font-bold rounded-lg hover:bg-white transition-all"
                            >
                              + 添加
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-6 bg-amber-50/50 rounded-[24px] border border-amber-100">
                        <div className="text-[10px] font-bold text-amber-500 mb-4 uppercase tracking-widest">身体状况 / 禁忌</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedClient.contraindications?.map(c => (
                            <span key={c} className="group relative px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg">
                              {c}
                              <button 
                                onClick={async () => {
                                  const updated = selectedClient.contraindications?.filter(i => i !== c) || [];
                                  await updateClient({ ...selectedClient, contraindications: updated }, { contraindications: updated });
                                }}
                                className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {isAddingContra ? (
                            <input 
                              autoFocus
                              value={newContraName}
                              onChange={(e) => setNewContraName(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && newContraName.trim()) {
                                  const contra = newContraName.trim();
                                  const updated = [...(selectedClient.contraindications || []), contra];
                                  await updateClient({ ...selectedClient, contraindications: updated }, { contraindications: updated });
                                  setNewContraName('');
                                  setIsAddingContra(false);
                                } else if (e.key === 'Escape') {
                                  setIsAddingContra(false);
                                }
                              }}
                              className="px-2 py-1 bg-white border border-amber-200 text-amber-700 text-[10px] font-black rounded-lg outline-none w-20"
                              placeholder="输入..."
                            />
                          ) : (
                            <button 
                              onClick={() => setIsAddingContra(true)}
                              className="px-2 py-1 border border-dashed border-amber-200 text-amber-400 text-[10px] font-bold rounded-lg hover:bg-white transition-all"
                            >
                              + 添加
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 依从性日历 (Adherence Calendar) */}
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">服用依从性看板 (Adherence Calendar)</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">完全服用</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">部分服用</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">未打卡</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const status = i < 15 ? 'full' : i < 18 ? 'partial' : 'none';
                        return (
                          <div 
                            key={i} 
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all ${
                              status === 'full' ? 'bg-white border-emerald-100 shadow-sm' :
                              status === 'partial' ? 'bg-white border-amber-100 shadow-sm' :
                              'bg-slate-100/50 border-transparent'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-slate-400 mb-1">{i + 1}</span>
                            {status === 'full' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            {status === 'partial' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                            {status === 'none' && <div className="w-1 h-1 rounded-full bg-slate-300"></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {clientDetailTab === 'plan' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* 方案执行核心指标 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl">
                      <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">当前阶段依从性</div>
                      <div className="flex items-end gap-2">
                        <div className="text-2xl font-black text-emerald-700">92%</div>
                        <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                      </div>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
                      <div className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">方案已执行</div>
                      <div className="flex items-end gap-2">
                        <div className="text-2xl font-black text-blue-700">18 <span className="text-sm font-bold">天</span></div>
                      </div>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                      <div className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">预计结束日期</div>
                      <div className="flex items-end gap-2">
                        <div className="text-lg font-black text-amber-700">2024-05-20</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">当前执行方案 (Active Protocol)</h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          let sticker = `【${selectedClient?.name} 的调理方案贴条】\n`;
                          sticker += `日期: ${new Date().toLocaleDateString()}\n\n`;
                          
                          protocol.phases.forEach((phase: ProtocolPhase, idx: number) => {
                            sticker += `第 ${idx + 1} 阶段: ${phase.name} (${phase.duration_days} 天)\n`;
                            phase.actions.forEach((action: ProtocolAction) => {
                              const product = products.find(p => p.id === action.product_id);
                              const timingMap: any = { 
                                with_meal: '随餐', 
                                empty_stomach: '空腹', 
                                before_bed: '睡前', 
                                after_meal: '饭后', 
                                any_time: '任意时间' 
                              };
                              sticker += `- ${product?.name}: ${action.dosage_per_time} (${action.frequency_per_day}次/天, ${timingMap[action.timing_tag] || action.timing_tag})\n`;
                            });
                            sticker += '\n';
                          });
                          
                          sticker += `注意: 请严格遵守服用频次，如有不适请及时联系。`;
                          navigator.clipboard.writeText(sticker);
                          alert('方案贴条已复制到剪贴板！');
                        }}
                        className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                      >
                        <Download className="w-3.5 h-3.5" />
                        复制方案贴条
                      </button>
                      <button 
                        onClick={() => {
                          let script = `你好 ${selectedClient?.name}，我是你的营养师。\n\n`;
                          
                          // 1. SOP 阶段模板检测
                          const daysSinceStart = selectedClient?.created_at 
                            ? Math.floor((new Date().getTime() - new Date(selectedClient.created_at).getTime()) / (1000 * 60 * 60 * 24))
                            : 0;
                          
                          const sopTemplates: Record<number, string> = {
                            3: "入伙第 3 天，主要是看看你服用产品后是否有肠道不适或吞咽上的困难？如果有任何体感反应记得及时告诉我哦。",
                            7: "入伙第 7 天，这个阶段身体正在初步适应营养素。你最近的精力值或者睡眠有没有微小的变化？哪怕是一点点改善也可以记录下来。",
                            14: "入伙第 14 天，通常这个阶段会进入体感拐点。我会根据你最近的打卡记录和体感曲线，看看是否需要微调服用剂量。",
                            28: "入伙满一个月啦！这是我们第一个周期的里程碑。我们需要对比一下入伙前的基准指标，看看各项数值的改善情况。"
                          };

                          if (sopTemplates[daysSinceStart]) {
                            script += `【SOP 第 ${daysSinceStart} 天提醒】\n${sopTemplates[daysSinceStart]}\n\n`;
                          } else if ((selectedClient?.adherence_score || 0) < 80) {
                            script += `观察到你最近的服用依从性稍有下降（目前 ${selectedClient?.adherence_score}%），是有遇到什么不便吗？保持规律服用对效果很关键哦。\n\n`;
                          } else {
                            script += `看到你最近服用非常准时，继续保持！这种良好的习惯是改善健康的基础。\n\n`;
                          }
                          
                          const lowStockItems = selectedClient?.inventory_status?.filter(item => item.remaining_days <= 3) || [];
                          if (lowStockItems.length > 0) {
                            script += `另外，我看到你的库存中：\n`;
                            lowStockItems.forEach(item => {
                              const product = products.find(p => p.id === item.product_id);
                              // 模拟购买链接，实际可从产品数据库获取
                              const purchaseUrl = `https://shop.example.com/p/${item.product_id}`;
                              script += `- ${product?.name} 预计还剩 ${item.remaining_days} 天 (补货链接: ${purchaseUrl})\n`;
                            });
                            script += `为了避免断服影响效果，建议这两天提前补货哦。\n\n`;
                          }
                          
                          script += `如果有任何体感上的变化，随时告诉我。`;
                          navigator.clipboard.writeText(script);
                          alert('随访话术已生成并复制到剪贴板！');
                        }}
                        className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-amber-100 transition-all border border-amber-100"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        生成随访话术
                      </button>
                      <div className="w-px h-6 bg-slate-200 mx-1"></div>
                      <button className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all">
                        <Layers className="w-3.5 h-3.5" />
                        应用模板
                      </button>
                      <button className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                        <Plus className="w-3.5 h-3.5" />
                        添加产品
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-100"></div>
                    <div className="space-y-12">
                      {protocol.phases.map((phase: ProtocolPhase, phaseIdx: number) => (
                        <div key={phase.id} className="relative pl-20 group">
                          <div className="absolute left-6 top-1 w-4 h-4 rounded-full bg-white border-4 border-emerald-500 z-10 group-hover:scale-125 transition-transform"></div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest">Phase {phaseIdx + 1}</span>
                              <input 
                                value={phase.name}
                                onChange={(e) => {
                                  const newPhases = [...protocol.phases];
                                  newPhases[phaseIdx].name = e.target.value;
                                  setProtocol({ ...protocol, phases: newPhases });
                                }}
                                className="text-lg font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0"
                              />
                              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                <Calendar className="w-4 h-4" /> 
                                <input 
                                  type="number"
                                  value={phase.duration_days}
                                  onChange={(e) => {
                                    const newPhases = [...protocol.phases];
                                    newPhases[phaseIdx].duration_days = Number(e.target.value);
                                    setProtocol({ ...protocol, phases: newPhases });
                                  }}
                                  className="w-12 bg-transparent border-b border-slate-200 text-center focus:outline-none focus:border-emerald-500"
                                /> 
                                天
                              </span>
                            </div>
                            <button 
                              onClick={() => {
                                const newPhases = protocol.phases.filter(p => p.id !== phase.id);
                                setProtocol({ ...protocol, phases: newPhases });
                              }}
                              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 text-rose-400 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            {phase.actions.map((action: ProtocolAction, actionIdx: number) => {
                              const product = products.find(p => p.id === action.product_id);
                              return (
                                <div key={action.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between group/action">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                                      <Package className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-700">{product?.name || '未知产品'}</div>
                                      <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-100">
                                          剂量: 
                                          <input 
                                            type="number"
                                            value={action.dosage}
                                            onChange={(e) => {
                                              const newPhases = [...protocol.phases];
                                              newPhases[phaseIdx].actions[actionIdx].dosage = Number(e.target.value);
                                              setProtocol({ ...protocol, phases: newPhases });
                                            }}
                                            className="w-12 bg-transparent border-none focus:ring-0 p-0 text-emerald-600 font-black"
                                          />
                                          {product?.dosage_unit}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-100">
                                          时段:
                                          <select 
                                            value={action.time_slot}
                                            onChange={(e) => {
                                              const newPhases = [...protocol.phases];
                                              newPhases[phaseIdx].actions[actionIdx].time_slot = e.target.value as any;
                                              setProtocol({ ...protocol, phases: newPhases });
                                            }}
                                            className="bg-transparent border-none focus:ring-0 p-0 text-blue-600 font-black"
                                          >
                                            <option value="morning">早</option>
                                            <option value="noon">午</option>
                                            <option value="evening">晚</option>
                                            <option value="night">睡前</option>
                                          </select>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-100">
                                          时机:
                                          <select 
                                            value={action.timing_tag}
                                            onChange={(e) => {
                                              const newPhases = [...protocol.phases];
                                              newPhases[phaseIdx].actions[actionIdx].timing_tag = e.target.value as any;
                                              setProtocol({ ...protocol, phases: newPhases });
                                            }}
                                            className="bg-transparent border-none focus:ring-0 p-0 text-amber-600 font-black"
                                          >
                                            <option value="with_meal">随餐</option>
                                            <option value="empty_stomach">空腹</option>
                                            <option value="before_bed">睡前</option>
                                            <option value="after_meal">餐后</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover/action:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        const newPhases = [...protocol.phases];
                                        newPhases[phaseIdx].actions = newPhases[phaseIdx].actions.filter(a => a.id !== action.id);
                                        setProtocol({ ...protocol, phases: newPhases });
                                      }}
                                      className="p-2 hover:bg-white rounded-lg text-slate-300 hover:text-rose-500 transition-all"
                                      title="从方案中移除"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <button 
                              onClick={() => {
                                const newAction: ProtocolAction = {
                                  id: `action-${Date.now()}`,
                                  phase_id: phase.id,
                                  product_id: products[0]?.id || 'prod-001',
                                  frequency_per_day: 1,
                                  dosage_per_time: products[0]?.dosage_unit || '1粒',
                                  timing_tag: 'with_meal',
                                  usage_instructions: '',
                                  order: 0
                                };
                                const newPhases = [...protocol.phases];
                                newPhases[phaseIdx].actions.push(newAction);
                                setProtocol({ ...protocol, phases: newPhases });
                              }}
                              className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:border-emerald-200 hover:text-emerald-500 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                              添加产品动作
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={addPhase}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[24px] text-sm font-black text-slate-400 hover:border-emerald-200 hover:text-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-center gap-2 ml-20 max-w-[calc(100%-80px)]"
                      >
                        <Plus className="w-5 h-5" />
                        添加新的调理阶段
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {clientDetailTab === 'inventory' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">人工库存校准 (Inventory Calibration)</h4>
                        <p className="text-xs text-slate-500 font-medium">手动修正系统预估水位，确保随访提醒准确性</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">最后同步: {new Date().toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={async () => {
                          const availableProducts = products.filter(p => !selectedClient.inventory_status?.some(inv => inv.product_id === p.id));
                          if (availableProducts.length === 0) {
                            alert('所有产品均已在库存追踪中');
                            return;
                          }
                          const prod = availableProducts[0];
                          const newItem = {
                            product_id: prod.id,
                            current_stock: 30, // 默认初始库存
                            remaining_days: 30,
                            last_calibration_date: new Date().toISOString().split('T')[0]
                          };
                          const updatedInventory = [...(selectedClient.inventory_status || []), newItem];
                          await updateClient({
                            ...selectedClient,
                            inventory_status: updatedInventory
                          }, { inventory_status: updatedInventory });
                        }}
                        className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        添加追踪产品
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {selectedClient.inventory_status?.map((item) => {
                      const product = products.find(p => p.id === item.product_id);
                      if (!product) return null;
                      
                      return (
                        <div key={item.product_id} className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:border-amber-100 transition-all group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-105 transition-transform">
                                <Package className="w-8 h-8 text-slate-300" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-black text-slate-800 tracking-tight">{product.name}</h5>
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded uppercase tracking-widest">{product.category}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    上次校准: {item.last_calibration_date || '从未校准'}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    日均消耗: {product.dosage_per_day}{product.unit}/天
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-8">
                              <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">系统预估剩余</div>
                                <div className={`text-2xl font-black tabular-nums ${
                                  item.remaining_days <= 3 ? 'text-rose-500' : 
                                  item.remaining_days <= 7 ? 'text-amber-500' : 'text-emerald-500'
                                }`}>
                                  {item.remaining_days} <span className="text-xs text-slate-400 ml-0.5">天</span>
                                </div>
                              </div>

                              <div className="w-px h-12 bg-slate-100"></div>

                              <div className="flex flex-col gap-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">人工修正 (Correction)</div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 focus-within:border-emerald-500/50 focus-within:bg-white transition-all">
                                    <button 
                                      onClick={async () => {
                                        const newRemainingDays = Math.max(0, item.remaining_days - 1);
                                        const updatedInventory = selectedClient.inventory_status?.map(inv => 
                                          inv.product_id === item.product_id 
                                            ? { ...inv, current_stock: Math.max(0, inv.current_stock - 1), remaining_days: newRemainingDays, last_calibration_date: new Date().toISOString().split('T')[0] }
                                            : inv
                                        );
                                        await updateClient({ ...selectedClient, inventory_status: updatedInventory }, { inventory_status: updatedInventory });
                                      }}
                                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-white rounded-lg transition-all"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <input 
                                      type="number"
                                      value={item.remaining_days}
                                      onChange={async (e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        const updatedInventory = selectedClient.inventory_status?.map(inv => 
                                          inv.product_id === item.product_id 
                                            ? { ...inv, current_stock: inv.current_stock, remaining_days: val, last_calibration_date: new Date().toISOString().split('T')[0] }
                                            : inv
                                        );
                                        await updateClient({ ...selectedClient, inventory_status: updatedInventory }, { inventory_status: updatedInventory });
                                      }}
                                      className="w-12 bg-transparent text-center font-black text-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button 
                                      onClick={async () => {
                                        const newRemainingDays = item.remaining_days + 1;
                                        const updatedInventory = selectedClient.inventory_status?.map(inv => 
                                          inv.product_id === item.product_id 
                                            ? { ...inv, current_stock: Math.max(0, inv.current_stock + 1), remaining_days: newRemainingDays, last_calibration_date: new Date().toISOString().split('T')[0] }
                                            : inv
                                        );
                                        await updateClient({ ...selectedClient, inventory_status: updatedInventory }, { inventory_status: updatedInventory });
                                      }}
                                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-white rounded-lg transition-all"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <span className="text-xs font-bold text-slate-400">天</span>
                                </div>
                              </div>
                              <button 
                                onClick={async () => {
                                  const updated = selectedClient.inventory_status?.filter(i => i.product_id !== item.product_id);
                                  await updateClient({ ...selectedClient, inventory_status: updated }, { inventory_status: updated });
                                }}
                                className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-6 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.remaining_days <= 3 ? 'bg-rose-500' : 
                                item.remaining_days <= 7 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (item.remaining_days / 30) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}

                    {(!selectedClient.inventory_status || selectedClient.inventory_status.length === 0) && (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[32px] p-12 text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 mx-auto mb-4">
                          <Package className="w-8 h-8 text-slate-200" />
                        </div>
                        <h5 className="font-black text-slate-800 mb-1">暂无库存记录</h5>
                        <p className="text-xs text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                          当前方案中未关联任何产品，或尚未初始化库存追踪。
                        </p>
                        <button className="mt-6 px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all">
                          关联方案产品
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {clientDetailTab === 'notes' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* 新增随访笔记 */}
                  <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <StickyNote className="w-5 h-5 text-emerald-500" />
                        写新随访笔记
                      </h4>
                      <div className="flex gap-2">
                        {['服用反馈', '体感变化', '剂量调整', '生活方式'].map(tag => (
                          <button 
                            key={tag}
                            onClick={() => setNewNoteTag(tag)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                              newNoteTag === tag 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea 
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="记录本次随访的核心发现、客户反馈或方案调整建议..."
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all min-h-[120px] resize-none"
                    />
                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={async () => {
                          if (!newNoteContent.trim()) return;
                          const newNote: FollowUpNote = {
                            id: `note-${Date.now()}`,
                            client_id: selectedClient.id,
                            practitioner_id: 'p-001',
                            content: newNoteContent,
                            date: new Date().toISOString().split('T')[0],
                            type: 'regular',
                            created_at: new Date().toISOString()
                          };
                          const updatedNotes = [newNote, ...(selectedClient.follow_up_notes || [])];
                          await updateClient({
                            ...selectedClient,
                            follow_up_notes: updatedNotes
                          }, { follow_up_notes: updatedNotes });
                          setNewNoteContent('');
                          setNewNoteTag('');
                        }}
                        disabled={!newNoteContent.trim()}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/10"
                      >
                        保存笔记
                      </button>
                    </div>
                  </div>

                  {/* 体感趋势可视化看板 */}
                  <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                      <div>
                        <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <TrendingUp className="w-6 h-6 text-emerald-500" />
                          体感改善趋势 (Feeling Trends)
                        </h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">基于客户每日打卡上报的主观感受数据</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={async () => {
                            // 模拟海报生成逻辑
                            alert('正在生成脱敏好转海报...\n已自动隐藏客户真实姓名与敏感信息。');
                            setTimeout(() => {
                              alert('海报生成成功！已为您下载。');
                            }, 1000);
                          }}
                          className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <Share2 className="w-4 h-4" />
                          生成好转海报
                        </button>
                        <div className="w-px h-8 bg-slate-100 mx-2"></div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">精力值</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">睡眠</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">情绪</span>
                        </div>
                      </div>
                    </div>

                    {/* 模拟图表区域 */}
                    <div className="h-48 w-full relative flex items-end justify-between gap-1 px-2">
                      {/* 背景网格 */}
                      <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="w-full h-px bg-slate-50"></div>
                        ))}
                      </div>
                      
                      {/* 模拟数据柱状/曲线图 */}
                      {Array.from({ length: 14 }).map((_, i) => {
                        const energyHeight = 40 + Math.random() * 50;
                        const sleepHeight = 30 + Math.random() * 60;
                        const moodHeight = 50 + Math.random() * 40;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar relative h-full justify-end">
                            <div className="flex gap-0.5 items-end w-full justify-center px-0.5 h-full">
                              <div 
                                className="w-1.5 bg-emerald-500/80 rounded-t-full transition-all group-hover/bar:bg-emerald-600" 
                                style={{ height: `${energyHeight}%` }}
                              ></div>
                              <div 
                                className="w-1.5 bg-blue-500/80 rounded-t-full transition-all group-hover/bar:bg-blue-600" 
                                style={{ height: `${sleepHeight}%` }}
                              ></div>
                              <div 
                                className="w-1.5 bg-amber-500/80 rounded-t-full transition-all group-hover/bar:bg-amber-600" 
                                style={{ height: `${moodHeight}%` }}
                              ></div>
                            </div>
                            <span className="text-[8px] font-black text-slate-300 mt-2 uppercase">{3 + i}日</span>
                            
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white p-2 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity z-20 pointer-events-none min-w-[80px]">
                              <div className="text-[8px] font-black text-slate-400 mb-1">3月{3+i}日 反馈</div>
                              <div className="flex justify-between gap-2">
                                <span className="text-[10px] font-bold text-emerald-400">精力: {Math.floor(energyHeight/10)}</span>
                                <span className="text-[10px] font-bold text-blue-400">睡眠: {Math.floor(sleepHeight/10)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Zap className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs font-bold text-emerald-800">
                          <span className="font-black">系统洞察：</span>该客户在第 7 天（3月9日）后，精力值与睡眠质量呈显著正相关同步上升。
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={async () => {
                            // 模拟生成海报逻辑
                            alert('正在生成脱敏好转海报...\n已自动隐藏客户姓名和敏感信息。');
                          }}
                          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          一键生成分享海报
                        </button>
                        <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline">查看深度报告</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">随访笔记资产 (Notes)</h4>
                    <button 
                      onClick={async () => {
                        const newNote: FollowUpNote = {
                          id: `note-${Date.now()}`,
                          client_id: selectedClient.id,
                          practitioner_id: 'pract-1',
                          date: new Date().toISOString().split('T')[0],
                          type: 'regular',
                          content: '新随访记录...',
                          created_at: new Date().toISOString()
                        };
                        const updatedNotes = [newNote, ...(selectedClient.follow_up_notes || [])];
                        await updateClient({
                          ...selectedClient,
                          follow_up_notes: updatedNotes
                        }, { follow_up_notes: updatedNotes });
                      }}
                      className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      记录随访笔记
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {selectedClient.follow_up_notes?.map((note, idx) => (
                      <div key={note.id} className="relative pl-8 group">
                        {/* Timeline line */}
                        {idx !== (selectedClient.follow_up_notes?.length || 0) - 1 && (
                          <div className="absolute left-3 top-6 bottom-[-16px] w-px bg-slate-100"></div>
                        )}
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                          note.type === 'milestone' ? 'bg-amber-400' : 
                          note.type === 'adjustment' ? 'bg-blue-400' : 'bg-slate-300'
                        }`}>
                          {note.type === 'milestone' && <Zap className="w-2.5 h-2.5 text-white" />}
                          {note.type === 'adjustment' && <Settings className="w-2.5 h-2.5 text-white" />}
                          {note.type === 'regular' && <MessageSquare className="w-2.5 h-2.5 text-white" />}
                        </div>
                        
                        <div className="bg-slate-50 group-hover:bg-white group-hover:shadow-md transition-all p-4 rounded-2xl border border-slate-100 group-hover:border-emerald-100 relative">
                          <button 
                            onClick={async () => {
                              const updatedNotes = selectedClient.follow_up_notes?.filter(n => n.id !== note.id);
                              await updateClient({ ...selectedClient, follow_up_notes: updatedNotes }, { follow_up_notes: updatedNotes });
                            }}
                            className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-slate-400">{note.date}</span>
                            <div className="flex items-center gap-2 pr-8">
                              <select 
                                value={note.type}
                                onChange={async (e) => {
                                  const updatedNotes = selectedClient.follow_up_notes?.map(n => 
                                    n.id === note.id ? { ...n, type: e.target.value as any } : n
                                  );
                                  await updateClient({ ...selectedClient, follow_up_notes: updatedNotes }, { follow_up_notes: updatedNotes });
                                }}
                                className="bg-transparent border-none focus:ring-0 p-0 text-[8px] font-black uppercase tracking-wider text-slate-500 cursor-pointer"
                              >
                                <option value="regular">常规随访</option>
                                <option value="milestone">关键节点</option>
                                <option value="adjustment">方案调整</option>
                              </select>
                            </div>
                          </div>
                          <textarea 
                            value={note.content}
                            onChange={async (e) => {
                              const updatedNotes = selectedClient.follow_up_notes?.map(n => 
                                n.id === note.id ? { ...n, content: e.target.value } : n
                              );
                              await updateClient({ ...selectedClient, follow_up_notes: updatedNotes }, { follow_up_notes: updatedNotes });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-slate-700 leading-relaxed resize-none"
                            rows={Math.max(1, note.content.split('\n').length)}
                          />
                          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                            <User className="w-3 h-3" />
                            <span>营养师记录</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientDetailTab === 'evidence' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">效果对比证据链 (Evidence)</h4>
                    <button 
                      onClick={async () => {
                        const newRecord: EvidenceRecord = {
                          id: `ev-${Date.now()}`,
                          date: new Date().toISOString().split('T')[0],
                          title: '新效果记录',
                          description: '点击编辑描述...',
                          is_private: false,
                          images: [],
                        };
                        const updatedChain = [newRecord, ...(selectedClient.evidence_chain || [])];
                        await updateClient({
                          ...selectedClient,
                          evidence_chain: updatedChain
                        }, { evidence_chain: updatedChain });
                      }}
                      className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      添加对比证据
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {selectedClient.evidence_chain?.map((record: EvidenceRecord) => (
                      <div key={record.id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-[10px] font-black text-slate-400 mb-1">{record.date}</div>
                            <h5 className="font-black text-slate-800 flex items-center gap-2">
                              <input 
                              value={record.title}
                              onChange={async (e) => {
                                const updatedChain = selectedClient.evidence_chain?.map(r => 
                                  r.id === record.id ? { ...r, title: e.target.value } : r
                                );
                                await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                              }}
                              className="bg-transparent border-none focus:ring-0 p-0 font-black"
                            />
                              {record.is_private && <Lock className="w-3 h-3 text-amber-400" />}
                            </h5>
                          </div>
                          <button 
                            onClick={async () => {
                              const updatedChain = selectedClient.evidence_chain?.filter(r => r.id !== record.id);
                              await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                            }}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-300 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea 
                          value={record.description}
                          onChange={async (e) => {
                            const updatedChain = selectedClient.evidence_chain?.map(r => 
                              r.id === record.id ? { ...r, description: e.target.value } : r
                            );
                            await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                          }}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-500 leading-relaxed mb-6 resize-none"
                        />
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative aspect-video bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 group/img">
                            {record.before_img_url ? (
                              <>
                                <img src={record.before_img_url} className="w-full h-full object-cover" />
                                <button 
                                  onClick={async () => {
                                    const url = prompt('输入图片 URL:', record.before_img_url);
                                    if (url !== null) {
                                      const updatedChain = selectedClient.evidence_chain?.map(r => 
                                        r.id === record.id ? { ...r, before_img_url: url } : r
                                      );
                                      await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                                    }
                                  }}
                                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-[10px] font-black flex items-center justify-center"
                                >
                                  修改 URL
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={async () => {
                                  const url = prompt('输入图片 URL:');
                                  if (url) {
                                    const updatedChain = selectedClient.evidence_chain?.map(r => 
                                      r.id === record.id ? { ...r, before_img_url: url } : r
                                    );
                                    await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                                  }
                                }}
                                className="flex flex-col items-center gap-2"
                              >
                                <Eye className="w-5 h-5 text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">设置服用前图</span>
                              </button>
                            )}
                          </div>
                          <div className="relative aspect-video bg-emerald-50 rounded-xl flex items-center justify-center overflow-hidden border border-emerald-100 group/img">
                            {record.after_img_url ? (
                              <>
                                <img src={record.after_img_url} className="w-full h-full object-cover" />
                                <button 
                                  onClick={async () => {
                                    const url = prompt('输入图片 URL:', record.after_img_url);
                                    if (url !== null) {
                                      const updatedChain = selectedClient.evidence_chain?.map(r => 
                                        r.id === record.id ? { ...r, after_img_url: url } : r
                                      );
                                      await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                                    }
                                  }}
                                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-[10px] font-black flex items-center justify-center"
                                >
                                  修改 URL
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={async () => {
                                  const url = prompt('输入图片 URL:');
                                  if (url) {
                                    const updatedChain = selectedClient.evidence_chain?.map(r => 
                                      r.id === record.id ? { ...r, after_img_url: url } : r
                                    );
                                    await updateClient({ ...selectedClient, evidence_chain: updatedChain }, { evidence_chain: updatedChain });
                                  }
                                }}
                                className="flex flex-col items-center gap-2"
                              >
                                <TrendingUp className="w-5 h-5 text-emerald-300" />
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">设置好转图</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientDetailTab === 'assets' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">营销素材资产 (Marketing Assets)</h4>
                    <button 
                      onClick={async () => {
                        const newAsset: MarketingAsset = {
                          id: `asset-${Date.now()}`,
                          client_id: selectedClient.id,
                          practitioner_id: 'pract-1',
                          type: 'poster',
                          title: '新对比海报',
                          image_url: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?q=80&w=800&auto=format&fit=crop',
                          is_anonymous: true,
                          created_at: new Date().toISOString()
                        };
                        const updatedAssets = [newAsset, ...(selectedClient.marketing_assets || [])];
                        await updateClient({
                          ...selectedClient,
                          marketing_assets: updatedAssets
                        }, { marketing_assets: updatedAssets });
                      }}
                      className="flex items-center gap-1.5 bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      生成对比海报
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {selectedClient.marketing_assets?.map((asset: MarketingAsset) => (
                      <div key={asset.id} className="group relative aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                        <img src={asset.image_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-white text-xs font-black mb-1">{asset.title}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-slate-300 font-bold">{asset.created_at.split('T')[0]}</span>
                                <span className="text-[8px] bg-white/20 text-white px-1.5 py-0.5 rounded uppercase">{asset.type}</span>
                              </div>
                            </div>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                const updatedAssets = selectedClient.marketing_assets?.filter(a => a.id !== asset.id);
                                await updateClient({ ...selectedClient, marketing_assets: updatedAssets }, { marketing_assets: updatedAssets });
                              }}
                              className="p-2 bg-rose-500/20 hover:bg-rose-500 text-white rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientDetailTab === 'orders' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">补货记录 (Order History)</h4>
                    <button 
                      onClick={async () => {
                        const newOrder: OrderRecord = {
                          id: `ord-${Date.now()}`,
                          client_id: selectedClient.id,
                          product_id: products[0]?.id || 'p-1',
                          quantity: 1,
                          status: 'delivered',
                          ordered_at: new Date().toISOString()
                        };
                        const updatedHistory = [newOrder, ...(selectedClient.order_history || [])];
                        await updateClient({
                          ...selectedClient,
                          order_history: updatedHistory
                        }, { order_history: updatedHistory });
                      }}
                      className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      手动补货
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedClient.order_history?.map((order: OrderRecord) => (
                      <div key={order.id} className="p-4 bg-slate-50 hover:bg-white hover:shadow-md transition-all rounded-2xl border border-slate-100 group relative flex items-center justify-between">
                        <button 
                          onClick={async () => {
                            const updatedHistory = selectedClient.order_history?.filter(o => o.id !== order.id);
                            await updateClient({ ...selectedClient, order_history: updatedHistory }, { order_history: updatedHistory });
                          }}
                          className="absolute -top-2 -right-2 p-1.5 bg-white border border-rose-100 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 rounded-full transition-all shadow-sm z-10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <select 
                                value={order.product_id}
                                onChange={async (e) => {
                                  const updatedHistory = selectedClient.order_history?.map(o => 
                                    o.id === order.id ? { ...o, product_id: e.target.value } : o
                                  );
                                  await updateClient({ ...selectedClient, order_history: updatedHistory }, { order_history: updatedHistory });
                                }}
                                className="bg-transparent border-none focus:ring-0 p-0 text-xs font-black text-slate-800 cursor-pointer"
                              >
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <span className="text-[10px] text-slate-300 font-black">×</span>
                              <input 
                                type="number"
                                value={order.quantity}
                                onChange={async (e) => {
                                  const updatedHistory = selectedClient.order_history?.map(o => 
                                    o.id === order.id ? { ...o, quantity: parseInt(e.target.value) || 0 } : o
                                  );
                                  await updateClient({ ...selectedClient, order_history: updatedHistory }, { order_history: updatedHistory });
                                }}
                                className="w-12 bg-transparent border-none focus:ring-0 p-0 text-xs font-black text-slate-800"
                              />
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">{order.ordered_at.split('T')[0]} 下单</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <select 
                            value={order.status}
                            onChange={async (e) => {
                              const updatedHistory = selectedClient.order_history?.map(o => 
                                o.id === order.id ? { ...o, status: e.target.value as any } : o
                              );
                              await updateClient({ ...selectedClient, order_history: updatedHistory }, { order_history: updatedHistory });
                            }}
                            className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-wider cursor-pointer border-none focus:ring-0 ${
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 
                              order.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            <option value="pending">配送中</option>
                            <option value="shipped">已发出</option>
                            <option value="delivered">已签收</option>
                          </select>
                          <div className="text-[8px] text-slate-300 font-bold mt-1">
                            {order.delivered_at ? `${order.delivered_at.split('T')[0]} 送达` : '预计 2-3 天送达'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer Action */}
            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <button className="w-full py-4 bg-emerald-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3">
                <MessageSquare className="w-6 h-6" />
                立即微信发起随访
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
