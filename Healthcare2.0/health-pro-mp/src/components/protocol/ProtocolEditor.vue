<template>
  <div class="space-y-10 animate-in fade-in zoom-in-95 duration-500">
    <!-- 配方编辑器头部 -->
    <div class="flex items-center justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
      <div class="flex items-center gap-6">
        <div class="w-16 h-16 bg-emerald-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200">
          <FlaskConical class="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 class="text-2xl font-black text-slate-900 tracking-tight">{{ protocol.name }}</h3>
          <div class="flex items-center gap-3 mt-1">
            <span class="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-lg uppercase tracking-widest">Core Logic</span>
            <p class="text-xs text-slate-500 font-medium">{{ protocol.description }}</p>
          </div>
        </div>
      </div>
      <div class="flex gap-4">
        <button 
          class="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <Save class="w-4 h-4" />
          另存为全局模板
        </button>
        <button class="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4" />
          执行此方案
        </button>
      </div>
    </div>

      <!-- 阶段列表 (Standard List) -->
    <div class="relative">
      <!-- 连接线 -->
      <div class="absolute left-[39px] top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500 via-slate-100 to-slate-50 rounded-full"></div>
      
      <div class="space-y-12 relative z-10">
        <div 
          v-for="(phase, index) in protocol.phases" 
          :key="phase.id"
          class="relative pl-24 group"
        >
            <!-- 阶段指示器 -->
            <div class="absolute left-0 top-0 flex flex-col items-center gap-4">
              <div class="drag-handle w-20 h-20 bg-white border-4 border-slate-50 text-slate-900 rounded-[28px] shadow-xl flex flex-col items-center justify-center transition-all cursor-grab active:cursor-grabbing group-hover:border-emerald-500">
                <GripVertical class="w-4 h-4 mb-1 text-slate-300" />
                <span class="text-[10px] font-black uppercase tracking-tighter text-slate-400">Phase</span>
                <span class="text-2xl font-black leading-none">{{ index + 1 }}</span>
              </div>
            </div>

            <!-- 阶段头部 -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-6">
                <input 
                  v-model="phase.name"
                  type="text" 
                  class="text-2xl font-black text-slate-800 tracking-tight bg-transparent border-none focus:ring-2 focus:ring-emerald-500/20 rounded-lg p-1 w-64"
                />
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-xl border border-slate-200/50">
                    <Calendar class="w-3.5 h-3.5" />
                    <input 
                      v-model.number="phase.duration_days"
                      type="number"
                      class="w-12 bg-transparent border-none p-0 focus:ring-0 text-center font-black"
                    />
                    <span>天周期</span>
                  </div>
                </div>
              </div>
              <button 
                @click="removePhase(index)"
                class="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>

            <!-- 动作列表 (Standard Grid) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                v-for="(action, actionIndex) in phase.actions" 
                :key="action.id"
                class="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 flex flex-col gap-4 hover:bg-white hover:shadow-xl hover:border-emerald-100 transition-all duration-300 group/action"
              >
                    <div class="flex items-start gap-5">
                      <div class="action-drag-handle w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm cursor-grab active:cursor-grabbing shrink-0">
                        <Package class="w-6 h-6 text-slate-300" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-2">
                          <picker 
                            :range="products" 
                            range-key="name" 
                            :value="getProductIndex(action.product_id)"
                            @change="handleProductChange($event, action)"
                            class="w-full"
                          >
                            <div class="text-base font-black text-slate-800 bg-transparent border-none focus:ring-0 p-0 w-full cursor-pointer hover:text-emerald-600 transition-colors flex items-center justify-between">
                              {{ getProductName(action.product_id) }}
                              <span class="text-xs text-slate-400">▼</span>
                            </div>
                          </picker>

                          <button 
                            @click="removeAction(index, actionIndex)"
                            class="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover/action:opacity-100 transition-all shrink-0 ml-2"
                          >
                            <X class="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3 mt-4">
                          <div class="space-y-1">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">服用频率</label>
                            <div class="flex items-center gap-2">
                              <input 
                                v-model.number="action.frequency_per_day"
                                type="number"
                                class="w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              />
                              <span class="text-[10px] font-bold text-slate-500">次 / 天</span>
                            </div>
                          </div>
                          <div class="space-y-1">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">单次用量</label>
                            <input 
                              v-model="action.dosage_per_time"
                              type="text"
                              class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              
              <!-- 新增动作按钮 -->
              <button 
                @click="addAction(index)"
                class="col-span-1 md:col-span-2 border-2 border-dashed border-slate-100 rounded-3xl p-6 flex items-center justify-center gap-3 text-slate-300 hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-500 transition-all group/add"
              >
                <Plus class="w-5 h-5 group-hover/add:rotate-90 transition-transform" />
                <span class="text-xs font-black uppercase tracking-widest">添加产品</span>
              </button>
            </div>
        </div>
      </div>

      <!-- 添加阶段按钮 -->
      <div class="pl-24 mt-12">
        <button 
          @click="addPhase"
          class="w-full py-8 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-3 text-slate-300 hover:bg-white hover:border-emerald-200 hover:text-emerald-500 hover:shadow-2xl transition-all duration-500 group/newphase"
        >
          <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover/newphase:bg-emerald-50 transition-colors">
            <Plus class="w-6 h-6 group-hover/newphase:scale-125 transition-transform" />
          </div>
          <span class="text-xs font-black uppercase tracking-[0.3em]">新增调理阶段 (New Phase)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { FlaskConical, Save, CheckCircle2, GripVertical, Calendar, Trash2, Package, X, Plus } from 'lucide-vue-next';

const props = defineProps<{
  clientId: string;
}>();

// Mock Data
const products = ref([
  { id: 'prod-001', name: '维生素C (VitC)' },
  { id: 'prod-002', name: '益生菌 (Probiotics)' },
  { id: 'prod-003', name: '深海鱼油 (Omega-3)' },
]);

const getProductIndex = (id: string) => {
  return products.value.findIndex(p => p.id === id);
};

const getProductName = (id: string) => {
  const product = products.value.find(p => p.id === id);
  return product ? product.name : '请选择产品';
};

const handleProductChange = (e: any, action: any) => {
  const index = e.detail.value;
  if (index >= 0 && index < products.value.length) {
    action.product_id = products.value[index].id;
  }
};

const protocol = ref({
  id: 'proto-001',
  name: '免疫力提升基础方案',
  description: '针对换季易感冒体质的基础调理',
  phases: [
    {
      id: 'phase-1',
      name: '肠道净化期',
      duration_days: 7,
      actions: [
        { id: 'act-1', product_id: 'prod-002', frequency_per_day: 2, dosage_per_time: '1包' }
      ]
    }
  ]
});

const addPhase = () => {
  protocol.value.phases.push({
    id: `phase-${Date.now()}`,
    name: '新阶段',
    duration_days: 7,
    actions: []
  });
};

const removePhase = (index: number) => {
  protocol.value.phases.splice(index, 1);
};

const addAction = (phaseIndex: number) => {
  protocol.value.phases[phaseIndex].actions.push({
    id: `act-${Date.now()}`,
    product_id: products.value[0].id,
    frequency_per_day: 1,
    dosage_per_time: '1粒'
  });
};

const removeAction = (phaseIndex: number, actionIndex: number) => {
  protocol.value.phases[phaseIndex].actions.splice(actionIndex, 1);
};
</script>
