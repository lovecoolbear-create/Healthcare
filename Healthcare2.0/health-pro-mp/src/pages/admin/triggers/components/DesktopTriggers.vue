<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="triggers" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">干预触发器配置</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">共 {{ triggers.length }} 个活跃规则</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">自动监控客户状态并预警</span>
          </div>
        </div>
      </div>

      <!-- Triggers Grid -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>

      <div v-else>
        <!-- Scoring Config Section -->
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Calculator class="w-4 h-4" />
            </div>
            <h2 class="text-lg font-bold text-slate-900">核心评分参数配置</h2>
            <span class="text-xs text-slate-400">WROM & RPS 计算权重与阈值</span>
          </div>
          
          <div class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- WROM Config -->
              <div class="border border-slate-100 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    WROM 健康评分
                  </h3>
                  <button 
                    @click="openScoringModal('wrom')"
                    class="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    修改配置
                  </button>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs text-slate-500">依从性权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.wrom?.weights?.adherence || 40 }}%</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs text-slate-500">库存权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.wrom?.weights?.inventory || 30 }}%</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs text-slate-500">体感权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.wrom?.weights?.symptom || 20 }}%</span>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-xs text-slate-500">互动权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.wrom?.weights?.engagement || 10 }}%</span>
                  </div>
                </div>
              </div>

              <!-- RPS Config -->
              <div class="border border-slate-100 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-bold text-slate-900 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                    RPS 复购评分
                  </h3>
                  <button 
                    @click="openScoringModal('rps')"
                    class="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    修改配置
                  </button>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs text-slate-500">取消率权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.rps?.weights?.cancel_rate || 30 }}%</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs text-slate-500">收货时延权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.rps?.weights?.receipt_delay || 25 }}%</span>
                  </div>
                  <div class="flex justify-between items-center py-2 border-b border-slate-50">
                    <span class="text-xs text-slate-500">复购周期权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.rps?.weights?.repurchase_cycle || 30 }}%</span>
                  </div>
                  <div class="flex justify-between items-center py-2">
                    <span class="text-xs text-slate-500">效果权重</span>
                    <span class="text-sm font-bold text-slate-700">{{ scoringConfig?.rps?.weights?.effect || 15 }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Triggers Grid -->
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Zap class="w-4 h-4" />
          </div>
          <h2 class="text-lg font-bold text-slate-900">预警触发器</h2>
          <span class="text-xs text-slate-400">自动监控客户状态并预警</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div 
          v-for="trigger in triggers" 
          :key="trigger._id"
          class="bg-white p-6 rounded-3xl border transition-all hover:shadow-lg hover:-translate-y-1"
          :class="trigger.enabled ? 'border-emerald-100 shadow-sm' : 'border-slate-100 opacity-75 grayscale-[0.5]'"
        >
          <!-- Card Header -->
          <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-4">
              <div 
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                :class="trigger.enabled ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-slate-100 text-slate-400'"
              >
                {{ getIcon(trigger.type) }}
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-lg">{{ trigger.name }}</h3>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1" 
                  :class="trigger.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'">
                  {{ trigger.enabled ? '运行中' : '已停用' }}
                </span>
              </div>
            </div>
            <switch 
              :checked="trigger.enabled" 
              color="#10b981" 
              style="transform: scale(0.8)"
              @change="(e: any) => toggleTrigger(trigger, e.detail.value)"
            />
          </div>

          <!-- Description -->
          <p class="text-xs text-slate-400 mb-6 min-h-[40px] leading-relaxed">{{ trigger.description }}</p>

          <!-- Config Preview -->
          <div class="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
            <div class="flex justify-between items-center mb-1">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Settings2 class="w-3 h-3" />
                规则参数
              </span>
              <button 
                @click="openEditModal(trigger)"
                class="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-colors"
              >
                修改配置
              </button>
            </div>
            <div class="grid grid-cols-2 gap-y-4 gap-x-2">
              <div v-for="(val, key) in trigger.config" :key="key" class="flex flex-col">
                <span class="text-[10px] text-slate-400 mb-0.5">{{ formatKey(String(key)) }}</span>
                <span class="text-sm font-bold text-slate-700 truncate" :title="String(formatValue(val))">{{ formatValue(val) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Edit Modal - Unified UI -->
    <AdminModal
      v-model="showModal"
      title="修改触发规则参数"
      size="md"
      :loading="submitting"
      confirm-text="确认修改"
      @confirm="handleSave"
      @cancel="closeModal"
    >
      <div class="space-y-6">
        <div v-for="(val, key) in editData.config" :key="key" class="space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
            {{ formatKey(String(key)) }}
          </label>
          
          <!-- Number Input -->
          <input 
            v-if="typeof val === 'number'"
            v-model.number="editData.config[key]"
            type="number"
            class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          
          <!-- Boolean Switch -->
          <div v-else-if="typeof val === 'boolean'" class="flex items-center h-12 bg-slate-50 border border-slate-200 rounded-xl px-4">
            <switch 
              :checked="val" 
              color="#10b981" 
              @change="(e: any) => editData.config[key] = e.detail.value"
            />
            <span class="ml-3 text-sm font-bold text-slate-700">{{ editData.config[key] ? '是' : '否' }}</span>
          </div>

          <!-- Select for Level -->
          <div v-else-if="String(key) === 'level'" class="flex gap-3">
            <button 
              v-for="opt in ['low', 'medium', 'high']" 
              :key="opt"
              @click="editData.config[key] = opt"
              class="flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-2"
              :class="editData.config[key] === opt ? 
                (opt === 'high' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                 opt === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-600' : 
                 'bg-emerald-50 border-emerald-200 text-emerald-600') : 
                'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'"
            >
              {{ formatValue(opt) }}
            </button>
          </div>

          <!-- Text Input (Fallback) -->
          <input 
            v-else
            v-model="editData.config[key]"
            type="text"
            class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>
    </AdminModal>

    <!-- Scoring Config Edit Modal - Unified UI -->
    <AdminModal
      v-model="showScoringModal"
      :title="currentEditingType === 'wrom' ? 'WROM 健康评分配置' : 'RPS 复购评分配置'"
      size="md"
      :loading="scoringSubmitting"
      confirm-text="确认修改"
      @confirm="handleScoringSave"
      @cancel="closeScoringModal"
    >
      <div class="space-y-6">
        <!-- Weight Configuration -->
        <div class="space-y-4">
          <h3 class="text-sm font-bold text-slate-900">权重配置 (总计应为100%)</h3>
          <div v-for="(val, key) in scoringEditData.weights" :key="key" class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ key }}</label>
            <div class="flex items-center gap-3">
              <input 
                v-model.number="scoringEditData.weights[key]"
                type="range"
                min="0"
                max="100"
                class="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span class="w-16 text-right text-sm font-bold text-slate-700">{{ val }}%</span>
            </div>
          </div>
        </div>

        <!-- Threshold Configuration (WROM) -->
        <div v-if="currentEditingType === 'wrom' && scoringEditData.inventory" class="space-y-4 pt-4 border-t border-slate-100">
          <h3 class="text-sm font-bold text-slate-900">库存分段阈值 (天)</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-500">低风险阈值</label>
              <input 
                v-model.number="scoringEditData.inventory.low_days"
                type="number"
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-500">囤货警戒线</label>
              <input 
                v-model.number="scoringEditData.inventory.high_days"
                type="number"
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
        </div>

        <!-- Symptom Configuration (WROM) -->
        <div v-if="currentEditingType === 'wrom' && scoringEditData.symptom" class="space-y-4 pt-4 border-t border-slate-100">
          <h3 class="text-sm font-bold text-slate-900">体感趋势系数</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-500">进步奖励系数</label>
              <input 
                v-model.number="scoringEditData.symptom.progress_multiplier"
                type="number"
                step="0.1"
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-500">退步惩罚系数</label>
              <input 
                v-model.number="scoringEditData.symptom.regression_multiplier"
                type="number"
                step="0.1"
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
        </div>

        <!-- Thresholds (RPS) -->
        <div v-if="currentEditingType === 'rps' && scoringEditData.thresholds" class="space-y-4 pt-4 border-t border-slate-100">
          <h3 class="text-sm font-bold text-slate-900">预警阈值</h3>
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500">低分预警线</label>
            <input 
              v-model.number="scoringEditData.thresholds.low_score"
              type="number"
              min="0"
              max="100"
              class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud } from '@/utils/cloud';
import { ref, onMounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import AdminModal from '@/components/ui/AdminModal.vue';
import { Settings2, X, Calculator, Zap } from 'lucide-vue-next';

const triggers = ref<any[]>([]);
const scoringConfig = ref<any>(null);
const loadingScoring = ref(false);

const loading = ref(false);
const showModal = ref(false);
const submitting = ref(false);
const editData = ref<any>({});
const showScoringModal = ref(false);
const scoringEditData = ref<any>({});
const scoringSubmitting = ref(false);
const currentEditingType = ref<'wrom' | 'rps'>('wrom');

const keyMap: Record<string, string> = {
  days: '连续未打卡天数',
  level: '风险等级',
  threshold: 'WROM 阈值 (分)',
  notify_admin: '通知营养师',
  days_remaining: '剩余库存天数',
  auto_push: '自动推送给客户'
};

const valueMap: Record<string, string> = {
  high: '高风险 🔴',
  medium: '中风险 🟡',
  low: '低风险 🟢',
  true: '是',
  false: '否'
};

const getIcon = (type: string) => {
  switch (type) {
    case 'missing_checkin': return '📅';
    case 'low_wrom': return '📉';
    case 'low_inventory': return '📦';
    default: return '⚡';
  }
};

const formatKey = (key: string) => keyMap[key] || key;
const formatValue = (val: any) => {
  if (typeof val === 'boolean') return val ? '是' : '否';
  return valueMap[String(val)] || val;
};
const getUserId = () => {
  const userInfo = getUserInfo();
  return userInfo ? userInfo._id : '';
};
const getApiErrorMessage = (code?: number, msg?: string, fallback = '操作失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};
const fetchTriggers = async () => {
  loading.value = true;
  try {
    const userId = getUserId();
    const res = await callCloud('client-api', {
      action: 'getTriggers',
      payload: { userId }
    });
    if (res.ok && Array.isArray(res.data)) {
      triggers.value = res.data;
      return;
    }
    uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '触发器加载失败'), icon: 'none' });
  } catch (e) {
    console.error('fetch triggers failed:', e);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const openEditModal = (trigger: any) => {
  editData.value = JSON.parse(JSON.stringify(trigger));
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const updateTrigger = async (trigger: any) => {
  const userId = getUserId();
  const res = await callCloud('client-api', {
    action: 'updateTrigger',
    payload: {
      userId,
      id: trigger._id,
      enabled: !!trigger.enabled,
      config: trigger.config || {}
    }
  });
  if (!res.ok) {
    throw new Error(getApiErrorMessage(res.code, res.msg, '触发器更新失败'));
  }
};

const toggleTrigger = async (trigger: any, value: boolean) => {
  const prev = !!trigger.enabled;
  trigger.enabled = value;
  try {
    await updateTrigger(trigger);
    uni.showToast({ title: value ? '已启用' : '已停用', icon: 'none' });
  } catch (e: any) {
    trigger.enabled = prev;
    uni.showToast({ title: e?.message || '更新失败', icon: 'none' });
  }
};

const handleSave = async () => {
  if (!editData.value?._id) return;
  submitting.value = true;
  try {
    await updateTrigger(editData.value);
    const idx = triggers.value.findIndex(t => t._id === editData.value._id);
    if (idx !== -1) {
      triggers.value[idx] = { ...editData.value };
    }
    showModal.value = false;
    uni.showToast({ title: '配置已更新', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
};

// --- Scoring Config Functions ---
const fetchScoringConfig = async () => {
  loadingScoring.value = true;
  try {
    const userId = getUserId();
    const res = await callCloud('client-api', {
      action: 'getScoringConfig',
      payload: { userId }
    });
    if (res.ok && (res.data as any)?.config) {
      scoringConfig.value = (res.data as any).config;
    } else {
      scoringConfig.value = {
        wrom: {
          weights: { adherence: 40, inventory: 30, symptom: 20, engagement: 10 },
          inventory: { low_days: 7, high_days: 45 },
          symptom: { progress_multiplier: 5, regression_multiplier: 10 },
          engagement: { base_score: 8, daily_increment: 0.5 }
        },
        rps: {
          weights: { cancel_rate: 30, receipt_delay: 25, repurchase_cycle: 30, effect: 15 },
          thresholds: { low_score: 60 }
        }
      };
    }
  } catch (e) {
    console.error('Fetch scoring config failed:', e);
  } finally {
    loadingScoring.value = false;
  }
};

const openScoringModal = (type: 'wrom' | 'rps') => {
  currentEditingType.value = type;
  scoringEditData.value = JSON.parse(JSON.stringify(scoringConfig.value[type] || {}));
  showScoringModal.value = true;
};

const closeScoringModal = () => {
  showScoringModal.value = false;
};

const handleScoringSave = async () => {
  scoringSubmitting.value = true;
  try {
    const userId = getUserId();
    const newConfig = {
      ...scoringConfig.value,
      [currentEditingType.value]: scoringEditData.value
    };
    
    const res = await callCloud('client-api', {
      action: 'updateScoringConfig',
      payload: { userId, config: newConfig }
    });
    
    if (res.ok) {
      scoringConfig.value = newConfig;
      showScoringModal.value = false;
      uni.showToast({ title: '评分配置已更新', icon: 'success' });
    } else {
      throw new Error(res.msg || '更新失败');
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' });
  } finally {
    scoringSubmitting.value = false;
  }
};

onMounted(() => {
  fetchTriggers();
  fetchScoringConfig();
});
</script>
