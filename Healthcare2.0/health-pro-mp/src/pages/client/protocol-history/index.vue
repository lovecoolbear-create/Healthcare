<template>
  <div class="mp-page-shell min-h-screen bg-slate-50 pb-8">
    <!-- 顶部标题栏 -->
    <div class="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
      <div class="flex items-center gap-3">
        <button @click="goBack" class="w-8 h-8 flex items-center justify-center text-slate-600">
          <span>←</span>
        </button>
        <h1 class="text-lg font-bold text-slate-900">我的配方历史</h1>
      </div>
    </div>

    <!-- 当前方案卡片 -->
    <div v-if="currentProtocol" class="mx-4 mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-medium bg-white/20 px-2 py-1 rounded">当前使用中</span>
        <span class="text-xs opacity-80">第 {{ currentDay }} 天</span>
      </div>
      <h2 class="text-lg font-bold mb-1">{{ currentProtocol.name }}</h2>
      <p class="text-sm opacity-90 mb-3">{{ currentProtocol.description || '暂无描述' }}</p>
      
      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-1">
          <span>📅</span>
          <span>{{ formatDate(currentProtocol.start_date) }} 开始</span>
        </div>
        <div v-if="currentProtocol.end_date" class="flex items-center gap-1">
          <span>🏁</span>
          <span>{{ formatDate(currentProtocol.end_date) }} 结束</span>
        </div>
      </div>
    </div>

    <!-- 即将生效的方案 -->
    <div v-if="upcomingProtocol" class="mx-4 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-orange-200">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-lg">⏰</span>
        <span class="text-sm font-bold text-orange-800">新方案即将生效</span>
      </div>
      <h3 class="text-base font-bold text-orange-900 mb-1">{{ upcomingProtocol.name }}</h3>
      <p class="text-xs text-orange-700">
        将在 <strong>{{ upcomingProtocol.days_until }}天后</strong>（{{ formatDate(upcomingProtocol.start_date) }}）自动切换
      </p>
    </div>

    <!-- 配方历史时间线 -->
    <div class="mx-4 mt-6">
      <h2 class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <span>📋</span>
        <span>历史配方记录</span>
      </h2>

      <!-- 时间线 -->
      <div class="relative">
        <!-- 时间线主线 -->
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>

        <!-- 历史配方项 -->
        <div 
          v-for="(protocol, index) in protocolHistory" 
          :key="protocol._id"
          class="relative pl-10 pb-6 last:pb-0"
        >
          <!-- 时间节点图标 -->
          <div 
            class="absolute left-2 w-4 h-4 rounded-full border-2"
            :class="getStatusColor(protocol.status)"
          ></div>

          <!-- 配方卡片 -->
          <div 
            class="bg-white rounded-xl p-4 border shadow-sm"
            :class="protocol.status === 'active' ? 'border-emerald-300' : 'border-slate-200'"
            @click="showProtocolDetail(protocol)"
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <h3 class="font-bold text-slate-900">{{ protocol.name }}</h3>
                <p class="text-xs text-slate-500 mt-1">
                  {{ formatDate(protocol.start_date) }} ~ {{ protocol.end_date ? formatDate(protocol.end_date) : '至今' }}
                </p>
              </div>
              <span 
                class="text-xs px-2 py-1 rounded font-medium"
                :class="getStatusBadgeClass(protocol.status)"
              >
                {{ getStatusText(protocol.status) }}
              </span>
            </div>

            <!-- 效果摘要（如果有报告） -->
            <div v-if="protocol.effectiveness_report" class="mt-3 pt-3 border-t border-slate-100">
              <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div class="text-lg font-bold" :class="getScoreColor(protocol.effectiveness_report.adherence.avg_completion_rate)">
                    {{ protocol.effectiveness_report.adherence.avg_completion_rate }}%
                  </div>
                  <div class="text-[10px] text-slate-500">依从性</div>
                </div>
                <div>
                  <div class="text-lg font-bold" :class="protocol.effectiveness_report.wrom_progress.change >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                    {{ protocol.effectiveness_report.wrom_progress.change > 0 ? '+' : '' }}{{ protocol.effectiveness_report.wrom_progress.change }}
                  </div>
                  <div class="text-[10px] text-slate-500">健康分</div>
                </div>
                <div>
                  <div class="text-lg font-bold" :class="getImprovementColor(protocol.effectiveness_report.symptom_improvement.improvement_level)">
                    {{ getImprovementEmoji(protocol.effectiveness_report.symptom_improvement.improvement_level) }}
                  </div>
                  <div class="text-[10px] text-slate-500">体感</div>
                </div>
              </div>
              
              <p v-if="protocol.effectiveness_report.advisor_evaluation?.notes" class="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                💬 {{ protocol.effectiveness_report.advisor_evaluation.notes }}
              </p>
            </div>

            <!-- 进行中方案显示当前进度 -->
            <div v-else-if="protocol.status === 'active'" class="mt-3 pt-3 border-t border-slate-100">
              <div class="flex items-center justify-between text-xs text-slate-600">
                <span>进行中，点击查看详情</span>
                <span class="text-emerald-500">→</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="protocolHistory.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl text-slate-300">📋</span>
          </div>
          <p class="text-slate-500 text-sm">暂无配方历史记录</p>
          <p class="text-slate-400 text-xs mt-1">您的营养顾问将为您制定个性化方案</p>
        </div>
      </div>
    </div>

    <!-- 配方详情弹窗 -->
    <div v-if="selectedProtocol" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end" @click.self="closeDetail">
      <div class="bg-white w-full rounded-t-[32px] p-6 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <!-- 关闭按钮 -->
        <div class="flex justify-center mb-4">
          <div class="w-12 h-1 bg-slate-200 rounded-full"></div>
        </div>

        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-900">{{ selectedProtocol.name }}</h2>
          <button @click="closeDetail" class="w-8 h-8 flex items-center justify-center text-slate-400">
            <span>✕</span>
          </button>
        </div>

        <!-- 基本信息 -->
        <div class="bg-slate-50 rounded-xl p-4 mb-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-xs text-slate-500 mb-1">使用周期</div>
              <div class="font-medium text-slate-900">
                {{ formatDate(selectedProtocol.start_date) }} ~ {{ selectedProtocol.end_date ? formatDate(selectedProtocol.end_date) : '至今' }}
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500 mb-1">状态</div>
              <div class="font-medium" :class="getStatusTextColor(selectedProtocol.status)">
                {{ getStatusText(selectedProtocol.status) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 产品清单 -->
        <div class="mb-4">
          <h3 class="text-sm font-bold text-slate-700 mb-3">配方产品</h3>
          <div class="space-y-2">
            <div 
              v-for="(item, idx) in selectedProtocol.items" 
              :key="idx"
              class="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3"
            >
              <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 text-xs font-bold">
                {{ Number(idx) + 1 }}
              </div>
              <div class="flex-1">
                <div class="font-medium text-slate-900">{{ item.product_name }}</div>
                <div class="text-xs text-slate-500">
                  每日 {{ item.daily_usage }}{{ item.unit || '粒' }} · {{ getTimingText(item.timing) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 效果报告（如果有） -->
        <div v-if="selectedProtocol.effectiveness_report" class="mb-4">
          <h3 class="text-sm font-bold text-slate-700 mb-3">使用效果总结</h3>
          
          <div class="space-y-3">
            <!-- 依从性 -->
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-slate-500">依从性</span>
                <span class="text-sm font-bold" :class="getScoreColor(selectedProtocol.effectiveness_report.adherence.avg_completion_rate)">
                  {{ selectedProtocol.effectiveness_report.adherence.avg_completion_rate }}%
                </span>
              </div>
              <div class="w-full bg-slate-200 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all"
                  :class="getProgressColor(selectedProtocol.effectiveness_report.adherence.avg_completion_rate)"
                  :style="{ width: selectedProtocol.effectiveness_report.adherence.avg_completion_rate + '%' }"
                ></div>
              </div>
            </div>

            <!-- WROM变化 -->
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500">WROM评分变化</span>
                <span 
                  class="text-sm font-bold"
                  :class="selectedProtocol.effectiveness_report.wrom_progress.change >= 0 ? 'text-emerald-500' : 'text-rose-500'"
                >
                  {{ selectedProtocol.effectiveness_report.wrom_progress.initial_score }} → {{ selectedProtocol.effectiveness_report.wrom_progress.final_score }}
                  ({{ selectedProtocol.effectiveness_report.wrom_progress.change > 0 ? '+' : '' }}{{ selectedProtocol.effectiveness_report.wrom_progress.change }})
                </span>
              </div>
            </div>

            <!-- 体感改善 -->
            <div class="bg-slate-50 rounded-lg p-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-slate-500">体感改善</span>
                <span class="text-sm font-bold" :class="getImprovementColor(selectedProtocol.effectiveness_report.symptom_improvement.improvement_level)">
                  {{ selectedProtocol.effectiveness_report.symptom_improvement.improvement_level }}
                </span>
              </div>
              <p class="text-xs text-slate-600">
                体感评分：{{ selectedProtocol.effectiveness_report.symptom_improvement.initial_avg }} → {{ selectedProtocol.effectiveness_report.symptom_improvement.final_avg }}
                ({{ selectedProtocol.effectiveness_report.symptom_improvement.improvement_rate > 0 ? '+' : '' }}{{ selectedProtocol.effectiveness_report.symptom_improvement.improvement_rate }}%)
              </p>
            </div>
          </div>
        </div>

        <!-- 顾问评价 -->
        <div v-if="selectedProtocol.effectiveness_report?.advisor_evaluation" class="mb-4">
          <h3 class="text-sm font-bold text-slate-700 mb-3">顾问评价</h3>
          <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">👨‍⚕️</span>
              <span class="text-sm font-bold text-emerald-800">营养顾问建议</span>
            </div>
            <p class="text-sm text-emerald-700">
              {{ selectedProtocol.effectiveness_report.advisor_evaluation.notes || '暂无评价' }}
            </p>
            <div v-if="selectedProtocol.effectiveness_report.advisor_evaluation.recommendation" class="mt-2">
              <span 
                class="inline-block text-xs px-2 py-1 rounded"
                :class="getRecommendationClass(selectedProtocol.effectiveness_report.advisor_evaluation.recommendation)"
              >
                {{ getRecommendationText(selectedProtocol.effectiveness_report.advisor_evaluation.recommendation) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud } from '@/utils/cloud';
import { ref, onMounted, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';

// 数据
const currentProtocol = ref<any>(null);
const upcomingProtocol = ref<any>(null);
const protocolHistory = ref<any[]>([]);
const selectedProtocol = ref<any>(null);
const currentDay = ref(1);

const userId = getUserInfo()?._id || uni.getStorageSync('userId');

// 获取配方历史
const fetchProtocolHistory = async () => {
  if (!userId) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  try {
    const res = await callCloud('protocol-effectiveness', {
      action: 'getClientProtocolHistory',
      payload: { userId }
    });

    if (res.code === 0) {
      const protocols = res.data || [];
      
      // 分离当前方案和即将生效的方案
      currentProtocol.value = protocols.find((p: any) => p.status === 'active') || null;
      upcomingProtocol.value = protocols.find((p: any) => p.status === 'pending') || null;
      
      // 计算当前天数
      if (currentProtocol.value) {
        const startDate = new Date(currentProtocol.value.start_date);
        const today = new Date();
        currentDay.value = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }
      
      // 历史方案（已完成或按时间排序）
      protocolHistory.value = protocols
        .filter((p: any) => p.status !== 'pending')
        .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }
  } catch (error) {
    console.error('获取配方历史失败:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

// 显示配方详情
const showProtocolDetail = (protocol: any) => {
  selectedProtocol.value = protocol;
};

// 关闭详情
const closeDetail = () => {
  selectedProtocol.value = null;
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'active': 'bg-emerald-500 border-emerald-500',
    'pending': 'bg-amber-400 border-amber-400',
    'completed': 'bg-slate-400 border-slate-400',
    'expired': 'bg-slate-300 border-slate-300',
    'cancelled': 'bg-rose-300 border-rose-300'
  };
  return colors[status] || 'bg-slate-300 border-slate-300';
};

// 获取状态文字
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'active': '进行中',
    'pending': '待开始',
    'completed': '已完成',
    'expired': '已过期',
    'cancelled': '已取消'
  };
  return texts[status] || status;
};

// 获取状态文字颜色
const getStatusTextColor = (status: string) => {
  const colors: Record<string, string> = {
    'active': 'text-emerald-600',
    'pending': 'text-amber-600',
    'completed': 'text-slate-600',
    'expired': 'text-slate-400',
    'cancelled': 'text-rose-500'
  };
  return colors[status] || 'text-slate-500';
};

// 获取状态标签样式
const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'active': 'bg-emerald-100 text-emerald-700',
    'pending': 'bg-amber-100 text-amber-700',
    'completed': 'bg-slate-100 text-slate-600',
    'expired': 'bg-slate-100 text-slate-500',
    'cancelled': 'bg-rose-100 text-rose-600'
  };
  return classes[status] || 'bg-slate-100 text-slate-600';
};

// 获取服用时间文字
const getTimingText = (timing: string) => {
  const texts: Record<string, string> = {
    'morning': '早晨',
    'afternoon': '下午',
    'evening': '晚上',
    'before_meal': '饭前',
    'after_meal': '饭后'
  };
  return texts[timing] || timing;
};

// 获取分数颜色
const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 70) return 'text-amber-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-rose-500';
};

// 获取进度条颜色
const getProgressColor = (score: number) => {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 70) return 'bg-amber-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-rose-500';
};

// 获取改善程度颜色
const getImprovementColor = (level: string) => {
  const colors: Record<string, string> = {
    '显著改善': 'text-emerald-500',
    '轻微改善': 'text-amber-500',
    '无变化': 'text-slate-500',
    '恶化': 'text-rose-500'
  };
  return colors[level] || 'text-slate-500';
};

// 获取改善程度表情
const getImprovementEmoji = (level: string) => {
  const emojis: Record<string, string> = {
    '显著改善': '😃',
    '轻微改善': '🙂',
    '无变化': '😐',
    '恶化': '😔'
  };
  return emojis[level] || '-';
};

// 获取建议样式
const getRecommendationClass = (rec: string) => {
  const classes: Record<string, string> = {
    'continue': 'bg-emerald-100 text-emerald-700',
    'upgrade': 'bg-blue-100 text-blue-700',
    'adjust': 'bg-amber-100 text-amber-700',
    'stop': 'bg-rose-100 text-rose-700'
  };
  return classes[rec] || 'bg-slate-100 text-slate-700';
};

// 获取建议文字
const getRecommendationText = (rec: string) => {
  const texts: Record<string, string> = {
    'continue': '建议继续',
    'upgrade': '建议升级',
    'adjust': '建议调整',
    'stop': '建议停用'
  };
  return texts[rec] || rec;
};

onShow(() => {
  fetchProtocolHistory();
});
</script>

<style scoped>
/* 页面壳样式 */
.mp-page-shell {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

/* 动画 */
.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}

.slide-in-from-bottom {
  animation-name: slideInFromBottom;
}

@keyframes slideInFromBottom {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
